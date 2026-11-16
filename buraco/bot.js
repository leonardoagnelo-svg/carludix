/* Buraco — CARLUDIX · jogadores do computador (bots)
   BuracoBot.proxima(st, s) devolve UMA jogada por vez, para a tela poder animar. */
(function (G) {
  'use strict';
  const M = G.BuracoMotor || (typeof require !== 'undefined' ? require('./motor.js') : null);
  const clone = o => JSON.parse(JSON.stringify(o));
  const testa = (st, s, a) => M.aplicar(clone(st), s, a).ok;

  function rnd(st) { return Math.random(); }

  // Corridas de cartas naturais do mesmo naipe (Ás pode ser 1 ou 14)
  function sequenciasNaturais(ids, comCoringa) {
    const res = [];
    const nat = ids.filter(i => !M.ehCoringa(i));
    for (let n = 0; n < 4; n++) {
      const porValor = {};
      nat.filter(i => M.naipeDe(i) === n).forEach(i => { const v = M.valorDe(i); if (!porValor[v]) porValor[v] = i; });
      // 2 natural do naipe ajuda na ponta baixa
      const doisN = ids.find(i => M.ehDois(i) && M.naipeDe(i) === n);
      if (doisN && !porValor[2]) porValor[2] = doisN;
      if (porValor[1]) porValor[14] = porValor[1];
      let atual = [];
      for (let v = 1; v <= 15; v++) {
        if (v <= 14 && porValor[v] && !atual.includes(porValor[v])) atual.push(porValor[v]);
        else { if (atual.length >= 2) res.push(atual.slice()); atual = porValor[v] && v <= 14 ? [porValor[v]] : []; }
      }
      // pares com 1 buraco (para usar coringa)
      if (comCoringa) {
        for (let v = 1; v <= 12; v++) {
          if (porValor[v] && !porValor[v + 1] && porValor[v + 2]) {
            const run = [];
            let a = v; while (porValor[a - 1] && a - 1 >= 1) a--;
            for (let x = a; x <= v; x++) run.push(porValor[x]);
            let b = v + 2; for (let x = b; x <= 14 && porValor[x]; x++) run.push(porValor[x]);
            res.push(Array.from(new Set(run)));
          }
        }
      }
    }
    return res.map(r => Array.from(new Set(r)));
  }
  function trincasNaturais(ids) {
    const porV = {};
    ids.filter(i => !M.ehCoringa(i)).forEach(i => { const v = M.valorDe(i); (porV[v] = porV[v] || []).push(i); });
    return Object.values(porV);
  }

  function coringasDaMao(mao) { return mao.filter(M.ehCoringa); }

  /* ---- Compra ---- */
  function decidirCompra(st, s) {
    const nivel = st.jogadores[s].nivel;
    const t = M.timeDe(st, s);
    const mao = st.maos[s];
    if (!st.lixo.length) return { t: 'comprar' };
    if (nivel === 'facil' && rnd() < 0.4) return { t: 'comprar' };
    if (st.cfg.lixo === 'aberto') {
      const util = st.lixo.filter(c => serve(st, t, mao, c)).length;
      if (util >= 1 || st.lixo.length >= 3) return { t: 'lixo' };
      return { t: 'comprar' };
    }
    const topo = st.lixo[st.lixo.length - 1];
    // 1) encaixar a carta de cima num jogo já baixado
    if (!M.ehCoringa(topo)) {
      for (let i = 0; i < st.jogos[t].length; i++) {
        const a = { t: 'lixo', cartas: [], jogo: i };
        if (testa(st, s, a)) return a;
      }
    }
    // 2) jogo novo com 2 cartas da mão (preferindo sem coringa)
    let comCor = null;
    for (let i = 0; i < mao.length; i++) for (let j = i + 1; j < mao.length; j++) {
      const ids = [mao[i], mao[j]];
      const a = { t: 'lixo', cartas: ids, jogo: -1 };
      if (!M.analisarJogo(ids.concat([topo]), null, st.cfg)) continue;
      if (!testa(st, s, a)) continue;
      if (ids.some(M.ehCoringa) || M.ehCoringa(topo)) { if (!comCor) comCor = a; continue; }
      return a;
    }
    if (comCor && (nivel !== 'facil') && st.lixo.length >= 3) return comCor;
    return { t: 'comprar' };
  }

  function serve(st, t, mao, c) {
    if (M.ehCoringa(c)) return true;
    if (st.jogos[t].some(j => M.analisarJogo(j.c.concat([c]), j.t, st.cfg))) return true;
    const v = M.valorDe(c), n = M.naipeDe(c);
    let viz = 0;
    for (const x of mao) {
      if (M.ehCoringa(x)) continue;
      if (M.naipeDe(x) === n && Math.abs(M.valorDe(x) - v) <= 2 && x !== c && M.valorDe(x) !== v) viz++;
      if (st.cfg.trincas && M.valorDe(x) === v && x !== c) viz++;
    }
    return viz >= 2;
  }

  /* ---- Baixar ---- */
  function decidirBaixa(st, s) {
    const nivel = st.jogadores[s].nivel;
    const t = M.timeDe(st, s);
    const mao = st.maos[s];
    const jogos = st.jogos[t];
    const temCanastraBoa = M.temCanastraParaBater(st, t);

    // 1) encaixar cartas naturais em jogos existentes
    for (const c of mao) {
      if (M.ehCoringa(c)) continue;
      for (let i = 0; i < jogos.length; i++) {
        const a = { t: 'baixar', cartas: [c], jogo: i };
        if (M.analisarJogo(jogos[i].c.concat([c]), jogos[i].t, st.cfg) && testa(st, s, a)) return a;
      }
    }
    // 2) jogos novos só com cartas naturais
    if (!(nivel === 'facil' && rnd() < 0.3)) {
      const cands = sequenciasNaturais(mao, false).filter(r => r.length >= 3);
      if (st.cfg.trincas) trincasNaturais(mao).filter(r => r.length >= 3).forEach(r => cands.push(r));
      cands.sort((a, b) => b.length - a.length);
      for (const r of cands) {
        const a = { t: 'baixar', cartas: r, jogo: -1 };
        if (M.analisarJogo(r, null, st.cfg) && testa(st, s, a)) return a;
        // tenta com menos cartas (deixar sobra para descartar)
        if (r.length > 3) { const a2 = { t: 'baixar', cartas: r.slice(0, r.length - 1), jogo: -1 }; if (M.analisarJogo(a2.cartas, null, st.cfg) && testa(st, s, a2)) return a2; }
      }
    }
    // 3) coringas
    const cors = coringasDaMao(mao);
    if (cors.length) {
      const w = cors.find(M.ehDois) || cors[0];
      // completar canastra (jogo de 6 sem coringa) quando já dá para bater ou a batida aceita suja
      for (let i = 0; i < jogos.length; i++) {
        const j = jogos[i];
        if (j.w !== null) continue;
        const pode = j.c.length === 6 && (temCanastraBoa || st.cfg.batida === 'qualquer' || mao.length <= 4);
        const fimDeJogo = mao.length <= 3 && j.c.length >= 3;
        if (pode || fimDeJogo) {
          const a = { t: 'baixar', cartas: [w], jogo: i };
          if (M.analisarJogo(j.c.concat([w]), j.t, st.cfg) && testa(st, s, a)) return a;
        }
      }
      // jogo novo com coringa quando a mão está pesada ou acabando
      if (mao.length <= 7 || cors.length >= 2 || nivel === 'facil') {
        const cands = sequenciasNaturais(mao, true).filter(r => r.length >= 2);
        if (st.cfg.trincas) trincasNaturais(mao).filter(r => r.length === 2).forEach(r => cands.push(r));
        cands.sort((a, b) => b.length - a.length);
        for (const r of cands) {
          const ids = r.concat([w]);
          const a = { t: 'baixar', cartas: ids, jogo: -1 };
          if (M.analisarJogo(ids, null, st.cfg) && testa(st, s, a)) return a;
        }
      }
    }
    return null;
  }

  /* ---- Descarte ---- */
  function decidirDescarte(st, s) {
    const nivel = st.jogadores[s].nivel;
    const t = M.timeDe(st, s), adv = 1 - t;
    const mao = st.maos[s];
    const validas = mao.filter((c, k) => mao.indexOf(c) === k && testa(st, s, { t: 'descartar', carta: c }));
    if (!validas.length) return { t: 'descartar', carta: mao[0] };
    if (nivel === 'facil') {
      const naoCor = validas.filter(c => !M.ehCoringa(c));
      const lista = naoCor.length ? naoCor : validas;
      return { t: 'descartar', carta: lista[Math.floor(rnd() * lista.length)] };
    }
    let melhor = null, mp = Infinity;
    for (const c of validas) {
      let p = 0;
      if (M.ehCoringa(c)) p += 100;
      else {
        const v = M.valorDe(c), n = M.naipeDe(c);
        for (const x of mao) {
          if (x === c || M.ehCoringa(x)) continue;
          const vx = M.valorDe(x);
          if (M.naipeDe(x) === n) {
            const d = Math.min(Math.abs(vx - v), (v === 1 || vx === 1) ? Math.abs((vx === 1 ? 14 : vx) - (v === 1 ? 14 : v)) : 99);
            if (d === 1) p += 4; else if (d === 2) p += 2; else if (d === 0) p -= 1;
          }
          if (st.cfg.trincas && vx === v) p += 2;
        }
        // perigo: carta que encaixa nos jogos do adversário
        if (st.jogos[adv].some(j => M.analisarJogo(j.c.concat([c]), j.t, st.cfg))) p += nivel === 'dificil' ? 14 : 7;
        // no difícil, evita soltar carta vizinha da última descartada pelo adversário (ele pode estar juntando)
        if (nivel === 'dificil' && st.cfg.lixo === 'aberto' && st.lixo.some(x => !M.ehCoringa(x) && M.naipeDe(x) === n && Math.abs(M.valorDe(x) - v) <= 1)) p += 3;
        p -= M.pontos(c) / 20; // prefere largar carta que vale mais quando empata
      }
      p += rnd() * 0.5;
      if (p < mp) { mp = p; melhor = c; }
    }
    return { t: 'descartar', carta: melhor };
  }

  function proxima(st, s) {
    if (st.vez !== s) return null;
    if (st.fase === 'comprar') return decidirCompra(st, s);
    if (st.fase === 'jogar') return decidirBaixa(st, s) || decidirDescarte(st, s);
    return null;
  }

  const Bot = { proxima, decidirCompra, decidirBaixa, decidirDescarte };
  G.BuracoBot = Bot;
  if (typeof module !== 'undefined' && module.exports) module.exports = Bot;
})(typeof window !== 'undefined' ? window : globalThis);
