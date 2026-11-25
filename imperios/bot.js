/* IMPÉRIOS — CARLUDIX · inteligência artificial dos bots
   Usa só as regras e as informações públicas do motor (nada de cartas ou objetivos alheios).
   Cada ação possível recebe uma nota (ganho territorial, produção futura, pontos, risco,
   custo, proteção da capital, proximidade da vitória e ameaças). O Mestre ainda simula
   combinações das ações restantes do turno antes de escolher. */
(function (G) {
  'use strict';
  const M = G.ImperiosMotor;
  const { UNIDADES, TIPOS_U, TERRESTRES, CONSTR, RECURSOS } = M;

  const NIVEIS = {
    iniciante: { ruido: 0.55, limiar: 0.72, mercado: false, preguica: 0.18, olhar: 0 },
    estrategico: { ruido: 0.12, limiar: 0.58, mercado: true, preguica: 0, olhar: 0 },
    mestre: { ruido: 0.05, limiar: 0.52, mercado: true, preguica: 0, olhar: 1 },
  };
  const PERSONALIDADES = {
    equilibrado: { atq: 1, exp: 1, cons: 1, def: 1, com: 1 },
    agressivo: { atq: 1.45, exp: 0.9, cons: 0.8, def: 0.85, com: 0.9, limiar: -0.08 },
    comerciante: { atq: 0.85, exp: 1, cons: 1.15, def: 1, com: 1.6 },
    defensivo: { atq: 0.75, exp: 0.9, cons: 1.1, def: 1.5, com: 1, limiar: 0.08 },
    expansionista: { atq: 1.05, exp: 1.5, cons: 0.9, def: 0.9, com: 1 },
    construtor: { atq: 0.8, exp: 1, cons: 1.45, def: 1, com: 1.1 },
  };
  const NOMES_PERS = { equilibrado: 'Equilibrado', agressivo: 'Agressivo', comerciante: 'Comerciante', defensivo: 'Defensivo', expansionista: 'Expansionista', construtor: 'Construtor' };

  const PACOTES = [
    { infantaria: 3 }, { infantaria: 2, arqueiro: 1 }, { infantaria: 1, arqueiro: 2 }, { arqueiro: 3 }, { infantaria: 2 }, { infantaria: 1 },
    { cavalaria: 1 }, { cavalaria: 1, infantaria: 1 }, { cavalaria: 1, infantaria: 2 }, { cavalaria: 2 }, { cavalaria: 2, infantaria: 1 },
    { catapulta: 1, infantaria: 2 }, { catapulta: 1, cavalaria: 1 }, { navio: 1 }, { navio: 1, infantaria: 2 },
  ];
  const VAL_REC = { ouro: 1.3, madeira: 1, pedra: 1, alimento: 1 };
  const valorRec = c => RECURSOS.reduce((s, k) => s + (c[k] || 0) * VAL_REC[k], 0);
  const valorProd = p => RECURSOS.reduce((s, k) => s + (p[k] || 0) * VAL_REC[k], 0);

  /* ---------- leitura do tabuleiro ---------- */
  function contexto(st, i) {
    const j = st.jogadores[i];
    const pers = PERSONALIDADES[j.personalidade] || PERSONALIDADES.equilibrado;
    const nivel = NIVEIS[j.nivel] || NIVEIS.estrategico;
    const meus = M.territoriosDe(st, i);
    const pts = st.jogadores.map((_, k) => M.pontos(st, k));
    const lider = pts.reduce((b, p, k) => (k !== i && !st.jogadores[k].eliminado && p > pts[b] ? k : b), i === 0 ? 1 : 0);
    const restante = Math.max(4, Math.min(20, st.cfg.maxRodadas - st.rodada));
    // ritmo: quantas rodadas até a meta no passo atual
    const horizonte = Math.max(3, Math.min(restante, Math.ceil((st.cfg.meta - pts[i]) / 2.5)));
    const ameaca = {};
    meus.forEach(t => { ameaca[t] = perigo(st, i, t); });
    return { j, pers, nivel, meus, pts, lider, horizonte, ameaca, prod: M.producao(st, i) };
  }
  const forcaAtq = u => TIPOS_U.reduce((s, k) => s + UNIDADES[k].a * (u[k] || 0), 0);
  function defesaDe(st, t) {
    const d = st.terr[t], info = M.infoT(st, t);
    let v = TIPOS_U.reduce((s, k) => s + UNIDADES[k].d * (d.u[k] || 0), 0) + M.TERRENOS[info.terreno].def + (d.def ? CONSTR[d.def].def : 0);
    if (d.dono != null) { const o = st.jogadores[d.dono]; if (o.reino === 'lobo' && o.capital === t) v += 3; }
    return v;
  }
  // maior força que um vizinho inimigo consegue trazer contra o território t
  function pressao(st, i, t) {
    const info = M.infoT(st, t);
    let max = 0;
    info.viz.forEach(x => {
      const o = st.terr[x];
      if (o.dono == null || o.dono === i) return;
      const u = Object.assign({}, o.u); u.navio = 0;
      max = Math.max(max, forcaAtq(u));
    });
    info.mar.forEach(x => {
      const o = st.terr[x];
      if (o.dono == null || o.dono === i || !o.u.navio) return;
      max = Math.max(max, forcaAtq(o.u));
    });
    return max;
  }
  function valorTerr(st, i, t, ctx) {
    const d = st.terr[t], info = M.infoT(st, t), ter = M.TERRENOS[info.terreno];
    let v = 1;
    if (d.eco) v += CONSTR[d.eco].pts;
    if (d.def) v += CONSTR[d.def].pts;
    if (d.porto) v += 2;
    if (d.maravilha) v += 12;
    const prod = ter.prod ? 2 + (d.eco === 'vila' ? 1 : d.eco === 'cidade' ? 2 : 0) : 0;
    v += prod * 0.35 * (ctx ? ctx.horizonte : 6) * 0.25;
    if (st.jogadores.some((o, k) => k !== i && o.capitalOriginal === t)) v += 8;
    if (st.jogadores[i].capital === t) v += 6;
    return v;
  }
  function perigo(st, i, t) {
    const p = pressao(st, i, t);
    if (!p) return 0;
    const diff = p - defesaDe(st, t);
    const prob = diff >= 2 ? 0.9 : diff >= 1 ? 0.67 : diff >= 0 ? 0.33 : diff >= -1 ? 0.11 : 0;
    return prob * valorTerr(st, i, t);
  }
  function eFronteira(st, i, t) {
    const info = M.infoT(st, t);
    return info.viz.some(x => st.terr[x].dono !== i) || info.mar.some(x => st.terr[x].dono != null && st.terr[x].dono !== i);
  }

  /* ---------- candidatos ---------- */
  function candidatos(st, i, ctx) {
    const lista = [];
    const j = ctx.j, rec = j.rec, P = ctx.pers;
    const add = (a, nota, rot) => { if (nota > 0) lista.push({ a, nota, rot }); };
    const precisaComida = M.manutencao(st, i) > rec.alimento;
    const comidaFolga = rec.alimento + ctx.prod.alimento - M.manutencao(st, i);

    // ---- construções
    ctx.meus.forEach(t => {
      M.TIPOS_C.forEach(k => {
        if (M.motivoNaoConstruir(st, i, t, k)) return;
        const c = M.custoConstr(st, i, k);
        const ok = M.temRec(rec, c);
        const info = M.infoT(st, t), d = st.terr[t];
        let ganhoPts = CONSTR[k].pts - (k === 'cidade' ? 1 : k === 'castelo' && d.def === 'fortaleza' ? 2 : 0);
        let ganhoProd = 0;
        if (k === 'vila' || k === 'cidade') ganhoProd = info.terreno === 'cidade' ? 1 : 1;
        let nota = ganhoPts * 3 + ganhoProd * 1.1 * ctx.horizonte;
        if (k === 'fortaleza' || k === 'castelo') nota += (ctx.ameaca[t] || 0) * 3 * P.def + (eFronteira(st, i, t) ? 1.5 : 0);
        if (k === 'castelo' && !j.capital) nota += 10;
        if (k === 'castelo') nota += 2; // novo ponto de recrutamento
        if (k === 'porto') nota += M.taxaMercado(st, i) === 3 ? 2 * P.com : 0;
        if (k === 'maravilha') nota += 4;
        nota *= P.cons;
        nota -= valorRec(c) * 0.35;
        // perto da vitória: pontos imediatos valem muito
        if (ctx.pts[i] + ganhoPts >= st.cfg.meta) nota += 25;
        if (ok) add({ t: 'construir', em: t, tipo: k }, nota, 'construir ' + k);
        else if (ctx.nivel.mercado) {
          const trocas = planejarTrocas(st, i, rec, c);
          const qtd = trocas ? trocas.reduce((x, t) => x + t.qtd, 0) : 99;
          if (trocas && qtd <= (st.turno && st.turno.mercadoProspero ? 4 : 2)) add({ t: 'mercado', trocas }, nota * 0.4 * P.com - 2.5 - qtd, 'mercado p/ ' + k);
        }
      });
    });

    // ---- recrutamento
    const perigoTotal = Object.values(ctx.ameaca).reduce((s, v) => s + v, 0);
    const exercito = M.unidadesDe(st, i);
    const alvoExercito = 4 + ctx.meus.length * 1.1 + st.rodada * 0.25;
    ctx.meus.forEach(t => {
      const tipos = M.tiposRecrutaveis(st, t);
      if (!tipos.length) return;
      PACOTES.forEach(pk => {
        if (Object.keys(pk).some(k => !tipos.includes(k))) return;
        const c = M.custoRecruta(st, i, pk);
        if (!M.temRec(rec, c)) return;
        const n = M.total(pk), nTerra = M.totalTerra(pk);
        const forca = TIPOS_U.reduce((s, k) => s + (UNIDADES[k].a * P.atq + UNIDADES[k].d * P.def) * (pk[k] || 0), 0);
        let nota = forca * 0.55;
        nota += Math.min(perigoTotal, 12) * 0.9 * P.def;
        nota += Math.max(0, alvoExercito - exercito) * 1.2;
        nota -= valorRec(c) * 0.45;
        if (comidaFolga - Math.ceil(nTerra / 3) < 0) nota -= 6;
        if (pk.navio) nota += temAlvoMar(st, i, t) ? 3 : -8;
        if (pk.catapulta) nota += temFortificadoPerto(st, i) ? 2 : -3;
        add({ t: 'recrutar', em: t, u: pk }, nota, 'recrutar');
      });
    });

    // ---- ataques
    ctx.meus.forEach(de => {
      const o = st.terr[de];
      if (!M.total(o.u)) return;
      M.alvosAtaque(st, i, de).forEach(para => {
        const porMar = !M.infoT(st, de).viz.includes(para);
        tamanhos(st, i, de, para, ctx, porMar).forEach(u => {
          const p = M.chance(st, i, de, para, u);
          const lim = ctx.nivel.limiar + (P.limiar || 0);
          const p2c = st.cfg.cartas && j.mao.includes('ataque-surpresa') ? M.chance(st, i, de, para, u, 'ataque-surpresa') : p;
          if (Math.max(p, p2c) < lim - 0.12) return;
          const d = st.terr[para];
          let ganho = valorTerr(st, i, para, ctx);
          if (d.dono != null) {
            ganho += valorTerr(st, d.dono, para) * 0.5; // o rival perde
            if (d.dono === ctx.lider && ctx.pts[d.dono] >= st.cfg.meta * 0.75) ganho *= 1.6;
          }
          const custoPerda = 2.2 * (1 + (1 - p));
          const fica = Object.assign({}, o.u); TIPOS_U.forEach(k => { fica[k] -= u[k]; });
          const exposicao = M.total(fica) === 0 && pressao(st, i, de) > 0 ? valorTerr(st, i, de, ctx) * 0.6 : 0;
          let nota = (p * ganho - custoPerda - exposicao) * P.atq + (p - lim) * 6;
          if (d.dono != null && ctx.pts[i] + ganho >= st.cfg.meta) nota += 8;
          add({ t: 'atacar', de, para, u }, nota, 'atacar');
          if (st.cfg.cartas && j.mao.includes('ataque-surpresa') && st.turno && st.turno.cartasUsadas < 2) {
            const p2 = M.chance(st, i, de, para, u, 'ataque-surpresa');
            if (p2 - p >= 0.2 && p2 >= lim) add({ t: 'atacar', de, para, u, carta: 'ataque-surpresa' }, (p2 * ganho - custoPerda - exposicao) * P.atq + (p2 - lim) * 6 - 1.5, 'atacar+carta');
          }
        });
      });
    });

    // ---- ocupar neutros vazios e reforçar fronteiras
    ctx.meus.forEach(de => {
      const o = st.terr[de];
      if (!M.totalTerra(o.u)) return;
      const umaU = escolherUma(o.u);
      if (!umaU) return;
      const dests = M.destinosTerra(st, i, de, umaU);
      Object.keys(dests).forEach(para => {
        const d = st.terr[para];
        if (d.dono == null) {
          const sobra = M.total(o.u) - 1;
          let nota = valorTerr(st, i, para, ctx) * 2.2 * P.exp + 2;
          if (sobra === 0 && ctx.ameaca[de] > 0) nota -= valorTerr(st, i, de, ctx);
          if (pressao(st, i, para) > 2) nota -= 1.5;
          add({ t: 'mover', de, para, u: umaU }, nota, 'ocupar');
        }
      });
    });
    // reforço: tira tropas de onde não há perigo e leva para a fronteira mais ameaçada ao alcance
    ctx.meus.forEach(de => {
      const o = st.terr[de];
      const u = Object.assign({}, o.u); u.navio = 0;
      if (!M.totalTerra(u)) return;
      const segura = !eFronteira(st, i, de);
      const manter = segura ? 0 : Math.ceil(M.totalTerra(u) / 2);
      if (M.totalTerra(u) - manter < 1) return;
      const leva = reduzir(u, M.totalTerra(u) - manter);
      const dests = M.destinosTerra(st, i, de, leva);
      Object.keys(dests).forEach(para => {
        if (st.terr[para].dono !== i) return;
        const ganho = (ctx.ameaca[para] || 0) - (ctx.ameaca[de] || 0) * 0.8;
        const frente = eFronteira(st, i, para) && segura ? 1.6 : 0;
        const nota = ganho * 2.2 * P.def + frente + (alvoAoLado(st, i, para) ? 1.4 * P.atq : 0) - 0.6;
        add({ t: 'mover', de, para, u: leva }, nota, 'reforçar');
      });
    });

    // ---- cartas especiais
    if (st.cfg.cartas) cartasCandidatas(st, i, ctx, add);
    // ---- objetivo secreto: pequenos empurrões
    if (j.objetivo && !j.objetivo.feito) lista.forEach(c => { c.nota += bonusObjetivo(j.objetivo.id, c.a, st); });

    // ---- comida para a manutenção
    if (ctx.nivel.mercado && precisaComida) {
      const trocas = planejarTrocas(st, i, rec, { alimento: M.manutencao(st, i) });
      if (trocas) add({ t: 'mercado', trocas }, 7, 'comida');
    }
    return lista;
  }

  function escolherUma(u) {
    for (const k of ['infantaria', 'arqueiro', 'catapulta', 'cavalaria']) if (u[k] > 0) { const r = M.vazioU(); r[k] = 1; return r; }
    return null;
  }
  function reduzir(u, n) {
    const r = M.vazioU();
    for (const k of ['cavalaria', 'infantaria', 'catapulta', 'arqueiro']) { const q = Math.min(n, u[k] || 0); r[k] = q; n -= q; }
    return r;
  }
  function tamanhos(st, i, de, para, ctx, porMar) {
    const o = st.terr[de], res = [];
    const tudo = Object.assign({}, o.u);
    if (porMar) {
      if (!tudo.navio) return res;
      const terra = Math.min(M.totalTerra(tudo), tudo.navio * 3);
      const u = reduzir(tudo, terra); u.navio = tudo.navio; res.push(u);
      return res;
    }
    tudo.navio = 0;
    if (!M.total(tudo)) return res;
    res.push(tudo);
    // deixar guarda se a origem corre perigo
    if (M.total(tudo) >= 3 && ((ctx.ameaca[de] || 0) > 0 || st.jogadores[i].capital === de)) {
      const g = Object.assign({}, tudo);
      if (g.arqueiro > 0) g.arqueiro--; else if (g.infantaria > 0) g.infantaria--; else return res;
      res.push(g);
    }
    return res;
  }
  function alvoAoLado(st, i, t) { return M.alvosAtaque(st, i, t).length > 0; }
  function temAlvoMar(st, i, t) {
    return M.infoT(st, t).mar.some(x => st.terr[x].dono !== i) || M.territoriosDe(st, i).some(x => M.infoT(st, x).mar.length && st.terr[x].porto === false && x === t);
  }
  function temFortificadoPerto(st, i) {
    return M.territoriosDe(st, i).some(t => M.infoT(st, t).viz.some(x => st.terr[x].dono != null && st.terr[x].dono !== i && st.terr[x].def));
  }
  // trocas no mercado para cobrir o que falta de um custo, usando sobras
  function planejarTrocas(st, i, rec, custo) {
    const taxa = M.taxaMercado(st, i);
    const sim = Object.assign({}, rec);
    let desc = st.turno && st.turno.trocaDesc && st.vez === i;
    const trocas = [];
    for (const k of RECURSOS) {
      let falta = (custo[k] || 0) - sim[k];
      while (falta > 0) {
        const dar = RECURSOS.filter(x => x !== k).sort((a, b) => (sim[b] - (custo[b] || 0)) - (sim[a] - (custo[a] || 0)))[0];
        const preco = desc ? Math.max(1, taxa - M.AJ.florDesc) : taxa;
        if (sim[dar] - (custo[dar] || 0) < preco) return null;
        sim[dar] -= preco; sim[k] += 1; falta--; desc = false;
        const ult = trocas.find(t => t.dar === dar && t.receber === k);
        if (ult) ult.qtd++; else trocas.push({ dar, receber: k, qtd: 1 });
        if (trocas.reduce((s, t) => s + t.qtd, 0) > 8) return null;
      }
    }
    return trocas.length ? trocas : null;
  }

  /* ---------- cartas especiais ---------- */
  function cartasCandidatas(st, i, ctx, add) {
    const j = ctx.j, mao = j.mao;
    if (mao.length < 3 && j.rec.ouro >= 4) add({ t: 'comprar' }, 2.6 + (j.rec.ouro >= 8 ? 1.5 : 0) - mao.length * 0.6, 'comprar');
    if (!mao.length || st.turno.cartasUsadas >= 2) return;
    const rivais = st.jogadores.map((_, k) => k).filter(k => k !== i && !st.jogadores[k].eliminado);
    const lider = rivais.slice().sort((a, b) => ctx.pts[b] - ctx.pts[a])[0];
    const deRival = k => M.territoriosDe(st, k);
    const vizinhoDeMim = t => M.infoT(st, t).viz.some(x => st.terr[x].dono === i);
    const cheia = mao.length >= 5 ? 1.5 : 0;
    new Set(mao).forEach(id => {
      const base = { t: 'carta', id };
      switch (id) {
        case 'grande-colheita': case 'tesouro-perdido': case 'extracao-de-madeira': case 'mina-descoberta': add(base, 6.5, 'carta'); break;
        case 'decreto-real': if (st.acoes >= 1) add(base, 8, 'carta'); break;
        case 'reforcos-militares': add(base, 6, 'carta'); break;
        case 'marcha-forcada': add(base, 2.5 + cheia, 'carta'); break;
        case 'engenheiros-reais': if (M.territoriosDe(st, i).some(t => M.TIPOS_C.some(k => !M.motivoNaoConstruir(st, i, t, k) && M.temRec(j.rec, M.custoConstr(st, i, k))))) add(base, 2 + cheia, 'carta'); else add(base, 0.5 + cheia, 'carta'); break;
        case 'recrutamento-real': if (M.territoriosDe(st, i).some(t => M.tiposRecrutaveis(st, t).length) && j.rec.ouro >= 6) add(base, 5, 'carta'); break;
        case 'mercado-prospero': add(base, 1.5 + cheia, 'carta'); break;
        case 'espionagem': if (rivais.some(k => st.jogadores[k].mao.length)) add(Object.assign({ jog: rivais.find(k => st.jogadores[k].mao.length) }, base), 0.4 + cheia, 'carta'); break;
        case 'tempestade': add(base, 0.3 + cheia, 'carta'); break;
        case 'expansao-territorial': {
          const t = Object.keys(st.terr).find(x => st.terr[x].dono == null && !M.total(st.terr[x].u) && vizinhoDeMim(x));
          if (t) add(Object.assign({ em: t }, base), 7, 'carta'); break;
        }
        case 'muralha-reforcada': {
          const t = Object.keys(ctx.ameaca).sort((a, b) => ctx.ameaca[b] - ctx.ameaca[a])[0];
          if (t && ctx.ameaca[t] > 0) add(Object.assign({ em: t }, base), 3 + ctx.ameaca[t], 'carta'); else add(Object.assign({ em: j.capital || M.territoriosDe(st, i)[0] }, base), 0.3 + cheia, 'carta'); break;
        }
        case 'tregua': {
          const k = rivais.filter(x => st.ultTregua[i] !== x && !M.emTratado(st, i, x)).sort((a, b) => pressaoDe(st, b, i) - pressaoDe(st, a, i))[0];
          if (k != null && pressaoDe(st, k, i) > 0) add(Object.assign({ jog: k }, base), 3.5, 'carta'); break;
        }
        case 'alianca': case 'tratado-de-paz': {
          const k = rivais.filter(x => x !== lider || rivais.length === 1).filter(x => !M.emTratado(st, i, x)).sort((a, b) => pressaoDe(st, b, i) - pressaoDe(st, a, i))[0];
          if (k != null) add(Object.assign({ jog: k }, base), 2.5 + cheia, 'carta'); break;
        }
        case 'bloqueio-naval': {
          const t = rivais.flatMap(deRival).find(x => M.infoT(st, x).costa && st.terr[x].u.navio > 0);
          if (t) add(Object.assign({ em: t }, base), 4, 'carta'); break;
        }
        case 'revolta': case 'peste': case 'desercao': case 'sabotagem': {
          if (lider == null) break;
          const alvos = [lider].concat(rivais.filter(x => x !== lider)).flatMap(deRival);
          let t = null;
          if (id === 'sabotagem') t = alvos.find(x => ['castelo', 'cidade'].includes(M.alvoSabotagem(st, x))) || alvos.find(x => M.alvoSabotagem(st, x));
          if (id === 'revolta') t = alvos.find(x => !M.ehCapital(st, x) && st.terr[x].def !== 'castelo' && st.terr[x].eco);
          if (id === 'peste') t = alvos.filter(x => !M.ehCapital(st, x) && M.total(st.terr[x].u) >= 3).sort((a, b) => M.total(st.terr[b].u) - M.total(st.terr[a].u))[0];
          if (id === 'desercao') t = alvos.find(x => vizinhoDeMim(x) && M.total(st.terr[x].u) >= 2);
          if (t) add(Object.assign({ em: t }, base), 4.5, 'carta'); break;
        }
      }
    });
  }
  function pressaoDe(st, k, i) { // força que o reino k pode trazer contra os territórios de i
    let max = 0;
    M.territoriosDe(st, i).forEach(t => M.infoT(st, t).viz.forEach(x => { if (st.terr[x].dono === k) { const u = Object.assign({}, st.terr[x].u); u.navio = 0; max = Math.max(max, forcaAtq(u)); } }));
    return max;
  }
  const OBJ_ACOES = {
    'grande-construtor': a => a.t === 'construir' && a.tipo === 'castelo' ? 6 : 0,
    'mestre-das-fortalezas': a => a.t === 'construir' && a.tipo === 'fortaleza' ? 6 : 0,
    'imperio-das-cidades': a => a.t === 'construir' && (a.tipo === 'cidade' || a.tipo === 'vila') ? 4 : 0,
    'senhor-dos-mares': a => a.t === 'construir' && a.tipo === 'porto' ? 6 : 0,
    'maravilha-do-mundo': a => a.t === 'construir' && (a.tipo === 'maravilha' ? 10 : a.tipo === 'cidade' ? 3 : 0),
    'legado-eterno': a => a.t === 'construir' ? 2 : 0,
    'mestre-da-cavalaria': a => a.t === 'recrutar' && a.u.cavalaria ? 4 : 0,
    'exercito-invencivel': a => a.t === 'atacar' ? 2 : 0,
    'conquistador-de-capitais': a => a.t === 'atacar' ? 1.5 : 0,
    'mestre-do-comercio': a => a.t === 'mercado' ? 3 : 0,
    'expansao-imperial': a => a.t === 'mover' || a.t === 'atacar' ? 1.5 : 0,
    'explorador-dos-reinos': a => a.t === 'mover' || a.t === 'atacar' ? 1.5 : 0,
    'celeiro-imperial': a => a.t === 'mover' || a.t === 'atacar' ? 1 : 0,
    'reino-prospero': a => a.t === 'mover' || a.t === 'atacar' ? 1 : 0,
    'dominio-continental': a => a.t === 'mover' || a.t === 'atacar' ? 1.5 : 0,
    'grande-diplomata': a => a.t === 'carta' && ['tregua', 'alianca', 'tratado-de-paz'].includes(a.id) ? 3 : 0,
    'alianca-dos-reis': a => a.t === 'carta' && a.id === 'alianca' ? 4 : 0,
  };
  function bonusObjetivo(id, a, st) { const f = OBJ_ACOES[id]; return f ? f(a) : 0; }

  // bots respondem na hora às propostas que recebem
  function responderPendentes(st) {
    st.propostas.slice().forEach(pr => {
      const k = pr.para, b = st.jogadores[k];
      if (!b || b.tipo !== 'bot' || !st.propostas.includes(pr)) return;
      let aceita = false;
      const ptsA = M.pontos(st, pr.de), ptsB = M.pontos(st, k);
      if (pr.tipo === 'troca') {
        const recebe = valorRec(pr.oferta), da = valorRec(pr.pede);
        aceita = M.temRec(b.rec, pr.pede) && recebe >= da * 1.05 && ptsA < st.cfg.meta * 0.85;
      } else {
        const ameaca = pressaoDe(st, pr.de, k);
        aceita = ptsA <= ptsB + 6 && (ameaca > 0 || M.rnd(st) < 0.5) && ptsA < st.cfg.meta * 0.8;
      }
      M.responderProposta(st, k, pr.id, aceita);
    });
  }

  /* ---------- valor de um estado (para o Mestre) ---------- */
  function valorEstado(st, i) {
    const ctx = contexto(st, i);
    let v = ctx.pts[i] * 4;
    v += valorProd(ctx.prod) * 0.55 * Math.min(ctx.horizonte, 8);
    v += M.totalRec(ctx.j.rec) * 0.25 + (ctx.j.mao ? ctx.j.mao.length * 1.2 : 0);
    v += M.territoriosDe(st, i).reduce((s, t) => s + TIPOS_U.reduce((a, k) => a + (UNIDADES[k].a + UNIDADES[k].d) * (st.terr[t].u[k] || 0), 0), 0) * 0.35;
    v -= Object.values(ctx.ameaca).reduce((s, x) => s + x, 0) * 2.2 * ctx.pers.def;
    const rival = Math.max(...ctx.pts.filter((_, k) => k !== i && !st.jogadores[k].eliminado), 0);
    v -= Math.max(0, rival - ctx.pts[i]) * 0.8;
    if (st.fase === 'fim') v += st.vencedores && st.vencedores.includes(i) ? 500 : -200;
    return v;
  }

  /* ---------- decisão ---------- */
  function decidir(st, i) {
    if (st.vez !== i || st.fase !== 'jogo') return null;
    const ctx = contexto(st, i);
    if (st.acoes <= 0 && !(st.turno && st.turno.movGratis)) return { t: 'fim' };
    if (ctx.nivel.preguica && M.rnd(st) < ctx.nivel.preguica && st.acoes < M.ACOES_TURNO) return { t: 'fim' };
    if (st.propostas && st.propostas.length) responderPendentes(st);
    let lista = candidatos(st, i, ctx).filter(c => M.validar(st, i, c.a).ok);
    // sem ações normais, só sobra a movimentação gratuita: usa apenas se ela realmente ajudar
    if (st.acoes <= 0) lista = lista.filter(c => (c.a.t === 'mover' && (c.rot === 'ocupar' || c.nota > 4)) || (c.a.t === 'carta' && c.nota > 2) || (c.a.t === 'recrutar' && st.turno.recrutaReal));
    if (!lista.length) return { t: 'fim' };
    lista.forEach(c => { c.nota *= 1 + (M.rnd(st) * 2 - 1) * ctx.nivel.ruido; });
    lista.sort((a, b) => b.nota - a.nota);
    if (ctx.nivel.olhar && lista.length > 1) {
      // Mestre: avalia as melhores opções jogando o resto do turno em simulação
      const top = lista.slice(0, 6);
      let melhor = null, mv = -Infinity;
      top.forEach(c => {
        const v = simularValor(st, i, c.a, 2);
        if (v > mv) { mv = v; melhor = c; }
      });
      const base = valorEstado(st, i);
      if (mv < base - 0.5 && lista[0].nota < 3) return { t: 'fim' };
      return melhor.a;
    }
    return lista[0].a;
  }
  // valor esperado após a ação + continuação gulosa do turno (batalhas por média de dados)
  function simularValor(st, i, a, prof) {
    const rotas = a.t === 'atacar' ? [true, false] : [null];
    const p = a.t === 'atacar' ? M.chance(st, i, a.de, a.para, a.u) : 1;
    let total = 0;
    rotas.forEach(vence => {
      const s = M.clonar(st);
      s.cfg = Object.assign({}, s.cfg, { fimAutomatico: false });
      const r = vence == null ? M.jogar(s, i, a) : forcarBatalha(s, i, a, vence);
      if (!r || !r.ok) return;
      let k = prof;
      while (k-- > 0 && s.acoes > 0 && s.fase === 'jogo') {
        const ctx = contexto(s, i);
        const l = candidatos(s, i, ctx).filter(c => c.a.t !== 'atacar' && M.validar(s, i, c.a).ok).sort((x, y) => y.nota - x.nota);
        if (!l.length || l[0].nota <= 0) break;
        M.jogar(s, i, l[0].a);
      }
      total += (vence == null ? 1 : vence ? p : 1 - p) * valorEstado(s, i);
    });
    return total;
  }
  // joga a batalha forçando o resultado (para calcular o valor esperado)
  function forcarBatalha(s, i, a, vence) {
    for (let tentativa = 0; tentativa < 12; tentativa++) {
      const c = M.clonar(s);
      c.rng = (c.rng + tentativa * 7919) | 0;
      const r = M.jogar(c, i, a);
      if (!r.ok) return r;
      const b = c.ultimaBatalha;
      if (b && b.venceu === vence) { Object.keys(c).forEach(k => { s[k] = c[k]; }); return r; }
    }
    return M.jogar(s, i, a);
  }

  G.ImperiosBot = { decidir, responderPendentes, pressaoDe, candidatos, contexto, valorEstado, NIVEIS, PERSONALIDADES, NOMES_PERS, planejarTrocas, perigo, pressao };
})(typeof window !== 'undefined' ? window : globalThis);
