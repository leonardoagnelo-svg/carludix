/* IMPÉRIOS — CARLUDIX · motor de regras (puro, sem HTML; estado em JSON)
   Fase 1: reinos, recursos, produção, construção, recrutamento, movimentação,
   batalhas, manutenção, mercado, capitais, pontuação e vitória.
   Toda ação é validada por inteiro antes de mexer no estado (nada fica pela metade). */
(function (G) {
  'use strict';

  /* ---------- tabelas ---------- */
  const RECURSOS = ['ouro', 'madeira', 'pedra', 'alimento'];
  const NOME_REC = { ouro: 'Ouro', madeira: 'Madeira', pedra: 'Pedra', alimento: 'Alimentos' };
  const IC_REC = { ouro: '🪙', madeira: '🪵', pedra: '🪨', alimento: '🌾' };

  const REINOS = {
    leao: { nome: 'Reino do Leão', curto: 'Leão', cor: '#2456c9', cor2: '#f2c14e', brasao: '🦁', governante: 'Rei Leônidas', perfil: 'Militar',
      hab: 'A primeira infantaria recrutada em cada turno custa 1 ouro a menos.' },
    aguia: { nome: 'Reino da Águia', curto: 'Águia', cor: '#c8283a', cor2: '#f2c14e', brasao: '🦅', governante: 'Rainha Aurora', perfil: 'Expansão territorial',
      hab: 'A primeira movimentação de cada turno não gasta ação.' },
    cervo: { nome: 'Reino do Cervo', curto: 'Cervo', cor: '#1f9a5a', cor2: '#f2c14e', brasao: '🦌', governante: 'Rei Cedric', perfil: 'Agricultura e produção',
      hab: 'Recebe 2 alimentos a mais a cada turno.' },
    flor: { nome: 'Reino da Flor-de-Lis', curto: 'Flor-de-Lis', cor: '#7b3fb8', cor2: '#f2c14e', brasao: '⚜️', governante: 'Rainha Isadora', perfil: 'Comércio e diplomacia',
      hab: 'A primeira troca com o mercado em cada turno custa 2 recursos a menos.' },
    lobo: { nome: 'Reino do Lobo', curto: 'Lobo', cor: '#3a3f4a', cor2: '#c9d1dc', brasao: '🐺', governante: 'Rei Magnus', perfil: 'Defesa',
      hab: '+3 de defesa na sua capital.' },
    dragao: { nome: 'Reino do Dragão', curto: 'Dragão', cor: '#e06a14', cor2: '#f2c14e', brasao: '🐉', governante: 'Rainha Valéria', perfil: 'Engenharia e construção',
      hab: 'A primeira construção de cada turno custa 1 pedra a menos.' },
  };
  const ORDEM_REINOS = ['leao', 'aguia', 'cervo', 'flor', 'lobo', 'dragao'];

  const UNIDADES = {
    infantaria: { nome: 'Infantaria', ic: '🛡️', a: 2, d: 2, m: 1, custo: { ouro: 3, alimento: 1 } },
    arqueiro: { nome: 'Arqueiro', ic: '🏹', a: 2, d: 3, m: 1, custo: { ouro: 2, madeira: 1, alimento: 1 } },
    cavalaria: { nome: 'Cavalaria', ic: '🐎', a: 4, d: 2, m: 2, custo: { ouro: 4, alimento: 2 } },
    catapulta: { nome: 'Catapulta', ic: '🪨', a: 3, d: 1, m: 1, custo: { ouro: 3, madeira: 3, alimento: 1 } },
    navio: { nome: 'Navio', ic: '⛵', a: 3, d: 3, m: 2, custo: { ouro: 4, madeira: 4, alimento: 1 } },
  };
  const TIPOS_U = Object.keys(UNIDADES);
  const TERRESTRES = ['infantaria', 'arqueiro', 'cavalaria', 'catapulta'];

  const CONSTR = {
    vila: { nome: 'Vila', ic: '🏘️', custo: { ouro: 1, madeira: 2, pedra: 1 }, pts: 1, slot: 'eco' },
    cidade: { nome: 'Cidade', ic: '🏙️', custo: { ouro: 3, madeira: 3, pedra: 2, alimento: 2 }, pts: 3, slot: 'eco' },
    fortaleza: { nome: 'Fortaleza', ic: '🏯', custo: { ouro: 2, madeira: 1, pedra: 4 }, pts: 2, slot: 'def', def: 3 },
    castelo: { nome: 'Castelo', ic: '🏰', custo: { ouro: 5, madeira: 4, pedra: 6, alimento: 2 }, pts: 5, slot: 'def', def: 4 },
    porto: { nome: 'Porto', ic: '⚓', custo: { ouro: 2, madeira: 4, pedra: 1 }, pts: 2, slot: 'porto' },
    maravilha: { nome: 'Maravilha', ic: '🗼', custo: { ouro: 10, madeira: 8, pedra: 10, alimento: 5 }, pts: 12, slot: 'maravilha' },
  };
  const TIPOS_C = Object.keys(CONSTR);

  const TERRENOS = {
    planicie: { nome: 'Planície', ic: '🌾', prod: 'alimento', def: 0, txt: 'Produz alimentos.' },
    floresta: { nome: 'Floresta', ic: '🌲', prod: 'madeira', def: 0, txt: 'Produz madeira.' },
    montanha: { nome: 'Montanha', ic: '⛰️', prod: 'pedra', def: 2, txt: 'Produz pedra. +2 de defesa.' },
    mina: { nome: 'Mina', ic: '⛏️', prod: 'ouro', def: 0, txt: 'Produz ouro.' },
    cidade: { nome: 'Cidade antiga', ic: '🏛️', prod: 'ouro', def: 0, txt: 'Comércio: produz ouro e alimento e melhora o mercado para 2 por 1.' },
    fortaleza: { nome: 'Fortificação natural', ic: '🗿', prod: null, def: 2, txt: 'Não produz. +2 de defesa.' },
  };
  // parâmetros de balanceamento (ajustados pelas simulações; ver BALANCEAMENTO.md)
  const AJ = { florDesc: 2, prodBase: 1, ptsTerritorio: 1, acoes: 3, taxaBase: 3, taxaPorto: 2, manutDiv: 3, capOuro: 2, capAli: 2 };
  const PTS_CAPITAL_RIVAL = 8;
  const MAX_RECRUTA = 3;
  const ACOES_TURNO = 3;
  const META_PADRAO = 50;
  const LIMITE_RODADAS = { 25: 30, 50: 45, 100: 70 };
  const INICIAL = { ouro: 5, madeira: 4, pedra: 3, alimento: 5 };
  const CA = () => G.ImperiosCartas, OBJ = () => G.ImperiosObjetivos, EVM = () => G.ImperiosEventos;
  const cartaInfo = id => CA().CARTAS.find(c => c.id === id);

  /* ---------- aleatoriedade com seed (mulberry32) ---------- */
  function rnd(st) {
    let t = (st.rng = (st.rng + 0x6D2B79F5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const rint = (st, n) => Math.floor(rnd(st) * n);
  function embaralhar(st, a) { for (let i = a.length - 1; i > 0; i--) { const j = rint(st, i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const dado = st => 1 + rint(st, 3);

  /* ---------- utilidades ---------- */
  const mapaDe = st => G.ImperiosMapas[st.cfg.mapa];
  const infoT = (st, id) => mapaDe(st).idx[id];
  function prepararMapa(m) {
    if (m.idx) return m;
    m.idx = {};
    m.territorios.forEach(t => { m.idx[t.id] = t; });
    return m;
  }
  const vazioU = () => ({ infantaria: 0, arqueiro: 0, cavalaria: 0, catapulta: 0, navio: 0 });
  const total = u => TIPOS_U.reduce((s, k) => s + (u[k] || 0), 0);
  const totalTerra = u => TERRESTRES.reduce((s, k) => s + (u[k] || 0), 0);
  const somaCusto = (c, n) => { const r = {}; RECURSOS.forEach(k => { r[k] = (c[k] || 0) * (n == null ? 1 : n); }); return r; };
  const temRec = (rec, c) => RECURSOS.every(k => (rec[k] || 0) >= (c[k] || 0));
  const pagar = (rec, c) => RECURSOS.forEach(k => { rec[k] -= (c[k] || 0); });
  const receber = (rec, c) => RECURSOS.forEach(k => { rec[k] += (c[k] || 0); });
  const totalRec = rec => RECURSOS.reduce((s, k) => s + rec[k], 0);
  const clonar = st => JSON.parse(JSON.stringify(st));
  function limparU(u) { const r = vazioU(); if (u) TIPOS_U.forEach(k => { const n = Math.floor(+u[k] || 0); if (n > 0) r[k] = n; }); return r; }
  const cabe = (tem, quer) => TIPOS_U.every(k => (quer[k] || 0) <= (tem[k] || 0));

  function log(st, txt, extra) {
    st.log.push(Object.assign({ r: st.rodada, txt }, extra || {}));
    if (st.log.length > 120) st.log.splice(0, st.log.length - 120);
  }
  function evento(st, e) { st.ev.push(e); }

  /* ---------- criação ---------- */
  // jogadores: [{nome, tipo:'humano'|'bot', nivel?, personalidade?, reino}]
  function novaPartida(cfg, jogadores) {
    cfg = Object.assign({ mapa: 'pequeno', meta: META_PADRAO, seed: (Math.random() * 2 ** 31) | 0, cartas: !!G.ImperiosCartas, objetivos: !!G.ImperiosObjetivos, eventos: !!G.ImperiosEventos }, cfg || {});
    if (!G.ImperiosCartas) cfg.cartas = false;
    if (!G.ImperiosObjetivos) cfg.objetivos = false;
    if (!G.ImperiosEventos) cfg.eventos = false;
    if (!cfg.maxRodadas) cfg.maxRodadas = LIMITE_RODADAS[cfg.meta] || Math.round(30 + cfg.meta * 0.6);
    const m = prepararMapa(G.ImperiosMapas[cfg.mapa]);
    const n = jogadores.length;
    if (n < 2 || n > 6) throw new Error('De 2 a 6 jogadores.');
    const st = {
      v: 1, id: 'imp-' + cfg.seed.toString(36) + '-' + Date.now().toString(36), cfg, rng: cfg.seed | 0,
      rodada: 0, ordemBase: [], ordem: [], pos: 0, vez: 0, acoes: 0, fase: 'jogo',
      jogadores: [], terr: {}, turno: null, ultimaRodada: false, vencedores: null, motivoFim: null, log: [], ev: [], seq: 0,
      baralho: [], descarte: [], tratados: [], propostas: [], efeitos: [], evento: null, baralhoEv: [], ultTregua: {}, propSeq: 0,
    };
    // reinos: escolhidos ou sorteados entre os livres
    const livres = embaralhar(st, ORDEM_REINOS.filter(r => !jogadores.some(j => j.reino === r)));
    const grupos = embaralhar(st, m.posicoes[String(n)].slice());
    m.territorios.forEach(t => {
      const u = vazioU(); u.infantaria = t.guarnicao || 0;
      st.terr[t.id] = { dono: null, u, eco: null, def: null, porto: false, maravilha: false };
    });
    jogadores.forEach((j, i) => {
      const reino = j.reino && REINOS[j.reino] ? j.reino : livres.shift();
      const g = m.grupos[grupos[i]];
      const p = {
        nome: j.nome || REINOS[reino].governante, tipo: j.tipo || 'humano', nivel: j.nivel || 'estrategico',
        personalidade: j.personalidade || 'equilibrado', reino, uid: j.uid || null, avatar: j.avatar || null,
        rec: Object.assign({}, INICIAL), capital: g.capital, capitalOriginal: g.capital, eliminado: false,
        st: { conquistas: 0, vitorias: 0, derrotas: 0, defesas: 0, construcoes: 0, recrutados: 0, produzidos: 0, trocas: 0, negocios: 0, castelos: 0, cartas: 0, capitalRival: false, aliancaCumprida: false },
        mao: [], objetivo: null,
      };
      st.jogadores.push(p);
      [g.capital].concat(g.extras).forEach(tid => { const t = st.terr[tid]; t.dono = i; t.u = vazioU(); });
      st.terr[g.capital].def = 'castelo';
      st.terr[g.capital].u.infantaria = 4; st.terr[g.capital].u.arqueiro = 1;
    });
    // baralho de cartas especiais, objetivos secretos e eventos mundiais
    if (cfg.cartas) {
      CA().CARTAS.forEach(c => { for (let k = 0; k < CA().REGRAS.copias; k++) st.baralho.push(c.id); });
      embaralhar(st, st.baralho);
      st.jogadores.forEach(p => { for (let k = 0; k < CA().REGRAS.iniciais; k++) comprarCarta(st, p); });
    }
    if (cfg.objetivos) {
      const pool = embaralhar(st, OBJ().OBJETIVOS.filter(o => objetivoPossivel(st, o, n)).map(o => o.id));
      st.jogadores.forEach(p => { p.objetivo = { id: pool.shift(), feito: false, rodada: null }; });
    }
    if (cfg.eventos) st.baralhoEv = embaralhar(st, EVM().EVENTOS.map(e => e.id));
    st.ordemBase = embaralhar(st, jogadores.map((_, i) => i));
    log(st, '👑 A partida começou! Ordem: ' + st.ordemBase.map(i => st.jogadores[i].nome).join(', ') + '.');
    novaRodada(st);
    return st;
  }

  /* ---------- rodadas e turnos ---------- */
  function ativosIdx(st) { return st.jogadores.map((j, i) => i).filter(i => !st.jogadores[i].eliminado); }
  function novaRodada(st) {
    st.rodada++;
    const k = (st.rodada - 1) % st.ordemBase.length;
    st.ordem = st.ordemBase.slice(k).concat(st.ordemBase.slice(0, k)).filter(i => !st.jogadores[i].eliminado);
    st.pos = 0;
    evento(st, { tipo: 'rodada', n: st.rodada });
    // tratados vencidos; aliança cumprida até o fim conta para o objetivo
    st.tratados = st.tratados.filter(t => {
      if (t.ate >= st.rodada) return true;
      if (t.tipo === 'alianca') [t.a, t.b].forEach(k => { st.jogadores[k].st.aliancaCumprida = true; });
      log(st, `📜 Terminou ${NOME_TRATADO[t.tipo]} entre ${st.jogadores[t.a].nome} e ${st.jogadores[t.b].nome}.`);
      return false;
    });
    st.efeitos = st.efeitos.filter(e => !(e.ateRodada != null && e.ateRodada < st.rodada));
    // propostas antigas expiram (a carta volta para a mão)
    st.propostas.slice().forEach(pr => { if (pr.rodada < st.rodada - 1) fecharProposta(st, pr, false, true); });
    if (st.cfg.eventos && st.rodada >= EVM().REGRAS.primeiroNaRodada && (st.rodada - EVM().REGRAS.primeiroNaRodada) % EVM().REGRAS.aCadaRodadas === 0) revelarEvento(st);
    iniciarTurno(st);
  }
  function iniciarTurno(st) {
    st.vez = st.ordem[st.pos];
    const j = st.jogadores[st.vez];
    st.acoes = AJ.acoes;
    st.turno = { movGratis: j.reino === 'aguia', infDesc: j.reino === 'leao', constDesc: j.reino === 'dragao', trocaDesc: j.reino === 'flor', recrutados: 0,
      cartasUsadas: 0, sabotagens: 0, movExtra: 0, mercadoProspero: false, engenheiros: 0, recrutaReal: false, atacouReino: false,
      recrEv: evAtivo(st, 'guerra-entre-reinos'), constrEv: evAtivo(st, 'grande-construcao') };
    // efeitos que duram "até o seu próximo turno" acabam agora
    st.efeitos = st.efeitos.filter(e => !(e.ateVez === st.vez));
    // capital perdida: refunda numa cidade ou castelo próprio
    if (j.capital == null || st.terr[j.capital].dono !== st.vez) {
      j.capital = null;
      const cand = territoriosDe(st, st.vez).filter(t => st.terr[t].def === 'castelo' || st.terr[t].eco === 'cidade')
        .sort((a, b) => (st.terr[b].def === 'castelo') - (st.terr[a].def === 'castelo'));
      if (cand.length) { j.capital = cand[0]; log(st, `🏰 ${j.nome} estabeleceu nova capital em ${infoT(st, cand[0]).nome}.`); }
    }
    const prod = producao(st, st.vez);
    if (evAtivo(st, 'descoberta-de-novas-rotas') && territoriosDe(st, st.vez).some(t => st.terr[t].porto)) prod.ouro += 2;
    // revoltas consumidas na produção
    st.efeitos = st.efeitos.filter(e => !(e.tipo === 'revolta' && st.terr[e.t].dono === st.vez));
    receber(j.rec, prod);
    j.st.produzidos += totalRec(prod);
    evento(st, { tipo: 'turno', j: st.vez, prod });
  }

  function producao(st, i) {
    const j = st.jogadores[i];
    const p = { ouro: 0, madeira: 0, pedra: 0, alimento: 0 };
    territoriosDe(st, i).forEach(tid => {
      const t = st.terr[tid], info = infoT(st, tid), ter = TERRENOS[info.terreno];
      if (!ter.prod) return;
      if (st.efeitos.some(e => e.tipo === 'revolta' && e.t === tid)) return;
      let n = AJ.prodBase + (t.eco === 'vila' ? 1 : t.eco === 'cidade' ? 2 : 0);
      if (t.eco === 'cidade' && evAtivo(st, 'revolta-popular')) n -= 1;
      if ((info.terreno === 'floresta' || info.terreno === 'montanha') && evAtivo(st, 'avanco-tecnologico')) n += 1;
      if (info.terreno === 'cidade') { p.ouro += n - 1; p.alimento += 1; } else p[ter.prod] += n;
      if (info.terreno === 'mina' && evAtivo(st, 'descoberta-de-riquezas')) p.ouro += 1;
    });
    if (j.capital != null && st.terr[j.capital].dono === i) { p.ouro += AJ.capOuro; p.alimento += AJ.capAli; }
    if (j.reino === 'cervo') p.alimento += 2;
    return p;
  }

  const territoriosDe = (st, i) => Object.keys(st.terr).filter(t => st.terr[t].dono === i);
  const unidadesDe = (st, i) => territoriosDe(st, i).reduce((s, t) => s + totalTerra(st.terr[t].u), 0);
  const manutencao = (st, i) => { const u = unidadesDe(st, i); return Math.ceil(u / AJ.manutDiv) + (u > 0 && evAtivo(st, 'fome-generalizada') ? 1 : 0); };

  /* ---------- pontuação ---------- */
  function pontos(st, i) { return detalhar(st, i).total; }
  function detalhar(st, i) {
    const d = { territorios: 0, construcoes: 0, capitais: 0, objetivos: 0, total: 0 };
    territoriosDe(st, i).forEach(tid => {
      const t = st.terr[tid];
      d.territorios += AJ.ptsTerritorio;
      ['eco', 'def'].forEach(s => { if (t[s]) d.construcoes += CONSTR[t[s]].pts; });
      if (t.porto) d.construcoes += CONSTR.porto.pts;
      if (t.maravilha) d.construcoes += CONSTR.maravilha.pts;
      st.jogadores.forEach((o, k) => { if (k !== i && o.capitalOriginal === tid) d.capitais += PTS_CAPITAL_RIVAL; });
    });
    const o = st.jogadores[i].objetivo;
    if (o && o.feito) d.objetivos = ptsObjetivo(st);
    d.total = d.territorios + d.construcoes + d.capitais + d.objetivos;
    return d;
  }
  function contar(st, i, f) { return territoriosDe(st, i).filter(t => f(st.terr[t], t)).length; }

  /* ---------- movimentação ---------- */
  const velocidade = u => Math.min(...TIPOS_U.filter(k => u[k] > 0).map(k => UNIDADES[k].m));
  // destinos alcançáveis por terra passando só por territórios próprios
  function destinosTerra(st, i, de, u) {
    const vel = velocidade(u);
    const res = {}; let fronteira = [de]; const visto = { [de]: 0 };
    for (let passo = 1; passo <= vel; passo++) {
      const prox = [];
      fronteira.forEach(x => {
        if (x !== de && st.terr[x].dono !== i && !(st.terr[x].dono != null && emTratado(st, i, st.terr[x].dono, 'alianca'))) return; // atravessa o que é seu ou de aliado
        infoT(st, x).viz.forEach(y => {
          if (visto[y] != null) return;
          visto[y] = passo; prox.push(y);
          const t = st.terr[y];
          if (t.dono === i || (t.dono == null && total(t.u) === 0)) res[y] = passo;
        });
      });
      fronteira = prox;
    }
    delete res[de];
    return res;
  }
  function podeMar(st, de, para, u) {
    if (!infoT(st, de).mar.includes(para)) return false;
    if (marFechado(st) || st.efeitos.some(e => e.tipo === 'bloqueio' && e.t === de)) return false;
    return u.navio > 0 && totalTerra(u) <= u.navio * 3;
  }

  /* ---------- validação + aplicação ---------- */
  function erro(msg) { return { ok: false, erro: msg }; }
  function custoAcao(st, a) {
    if (a.t === 'mover' && (st.turno.movGratis || st.turno.movExtra > 0)) return 0;
    if (a.t === 'recrutar' && st.turno.recrutaReal) return 0;
    if (a.t === 'carta') return 0;
    return 1;
  }

  function validar(st, i, a) {
    if (st.fase !== 'jogo') return erro('A partida já terminou.');
    if (i !== st.vez) return erro('Não é a sua vez.');
    if (!a || typeof a.t !== 'string') return erro('Ação inválida.');
    const j = st.jogadores[i];
    if (a.t === 'fim') return { ok: true, custo: 0 };
    const custo = custoAcao(st, a);
    if (st.acoes < custo) return erro('Você não tem mais pontos de ação neste turno.');

    if (a.t === 'mover' || a.t === 'atacar') {
      const o = st.terr[a.de], d = st.terr[a.para];
      if (!o || !d) return erro('Território inexistente.');
      if (o.dono !== i) return erro('O território de origem não é seu.');
      const u = limparU(a.u);
      if (!total(u)) return erro('Escolha as unidades.');
      if (!cabe(o.u, u)) return erro('Você não tem essas unidades na origem.');
      const porMar = infoT(st, a.de).mar.includes(a.para);
      const porTerra = infoT(st, a.de).viz.includes(a.para);
      if (u.navio > 0 && !porMar) return erro('Navios só navegam por rotas marítimas.');
      if (a.t === 'mover') {
        if (d.dono != null && d.dono !== i) return erro('Território inimigo: para entrar é preciso atacar.');
        if (d.dono == null && total(d.u) > 0) return erro('Território neutro com guarnição: para entrar é preciso atacar.');
        if (porMar && !porTerra) {
          if (!podeMar(st, a.de, a.para, u)) return erro('Para atravessar o mar leve 1 navio para cada 3 unidades terrestres.');
        } else if (!destinosTerra(st, i, a.de, u)[a.para]) return erro('Destino fora do alcance dessas unidades.');
        return { ok: true, custo, u, porMar: porMar && !porTerra };
      }
      if (d.dono === i) return erro('Esse território já é seu.');
      if (d.dono != null && emTratado(st, i, d.dono)) return erro(`Você tem ${NOME_TRATADO[emTratado(st, i, d.dono).tipo]} com ${st.jogadores[d.dono].nome}: não pode atacar.`);
      if (d.dono != null && evAtivo(st, 'alianca-global') && st.jogadores.some(o => o.capital === a.para || o.capitalOriginal === a.para)) return erro('Aliança Global: nenhuma capital pode ser atacada agora.');
      if (a.carta) {
        if (a.carta !== 'ataque-surpresa' || !j.mao.includes(a.carta)) return erro('Carta indisponível.');
        if (st.turno.cartasUsadas >= CA().REGRAS.maxPorTurno) return erro('Você já usou 2 cartas neste turno.');
      }
      if (d.dono == null && total(d.u) === 0) return erro('Território neutro desocupado: basta movimentar tropas para ocupar.');
      if (!porTerra && !porMar) return erro('Só é possível atacar territórios vizinhos.');
      if (!porTerra && !podeMar(st, a.de, a.para, u)) return erro('Para atacar pelo mar leve 1 navio para cada 3 unidades terrestres.');
      if (porTerra && u.navio > 0 && !porMar) return erro('Navios só atacam pelo mar.');
      if (!porTerra && (marFechado(st) || st.efeitos.some(e => e.tipo === 'bloqueio' && e.t === a.de))) return erro('As rotas marítimas estão fechadas.');
      return { ok: true, custo: 1, u };
    }

    if (a.t === 'recrutar') {
      const t = st.terr[a.em];
      if (!t || t.dono !== i) return erro('Recrute em um território seu.');
      const u = limparU(a.u), n = total(u);
      if (!n) return erro('Escolha as unidades.');
      const maxR = st.turno.recrutaReal ? 4 : MAX_RECRUTA;
      if (n > maxR) return erro(`No máximo ${maxR} unidades por recrutamento.`);
      if (u.navio && st.efeitos.some(e => e.tipo === 'bloqueio' && e.t === a.em)) return erro('Bloqueio naval: este porto não recruta navios agora.');
      const ok = tiposRecrutaveis(st, a.em);
      for (const k of TIPOS_U) if (u[k] && !ok.includes(k)) return erro(k === 'navio' ? 'Navios só podem ser recrutados em portos.' : t.eco === 'cidade' && !t.def ? 'Cidades recrutam só infantaria e arqueiros; o resto exige castelo.' : 'É preciso um castelo (ou cidade) para recrutar aqui.');
      const c = custoRecruta(st, i, u);
      if (!temRec(j.rec, c)) return erro('Recursos insuficientes.');
      return { ok: true, custo: 1, u, c };
    }

    if (a.t === 'construir') {
      const t = st.terr[a.em], k = a.tipo, def = CONSTR[k];
      if (!t || t.dono !== i) return erro('Construa em um território seu.');
      if (!def) return erro('Construção inválida.');
      const motivo = motivoNaoConstruir(st, i, a.em, k);
      if (motivo) return erro(motivo);
      const c = custoConstr(st, i, k);
      if (!temRec(j.rec, c)) return erro('Recursos insuficientes.');
      return { ok: true, custo: 1, c };
    }

    if (a.t === 'mercado') {
      if (st.turno.mercadoUsado) return erro('Você já foi ao mercado neste turno.');
      const tr = Array.isArray(a.trocas) ? a.trocas : [];
      if (!tr.length || tr.length > 8) return erro('Escolha as trocas.');
      const sim = Object.assign({}, j.rec);
      let desc = st.turno.trocaDesc;
      let prosp = st.turno.mercadoProspero ? 4 : 0;
      const taxa = taxaMercado(st, i);
      for (const x of tr) {
        const q = Math.floor(+x.qtd || 0);
        if (!RECURSOS.includes(x.dar) || !RECURSOS.includes(x.receber) || x.dar === x.receber || q < 1 || q > 20) return erro('Troca inválida.');
        // Mercado Próspero: até 4 unidades saem 1 por 1
        const baratas = Math.min(prosp, q); prosp -= baratas;
        // Flor-de-Lis: a primeira troca com o mercado em cada turno custa 1 recurso a menos (texto do cartão)
        let custo = baratas + taxa * (q - baratas);
        if (desc) { custo = Math.max(1, custo - AJ.florDesc); desc = false; }
        if (sim[x.dar] < custo) return erro('Recursos insuficientes para essa troca.');
        sim[x.dar] -= custo; sim[x.receber] += q;
      }
      return { ok: true, custo: 1, rec: sim };
    }

    if (a.t === 'comprar') {
      if (!st.cfg.cartas) return erro('As cartas especiais estão desligadas nesta partida.');
      if (j.mao.length >= CA().REGRAS.mao) return erro(`Limite de ${CA().REGRAS.mao} cartas na mão.`);
      if (j.rec.ouro < CA().REGRAS.compraOuro) return erro(`Comprar carta custa ${CA().REGRAS.compraOuro} ouros.`);
      if (!st.baralho.length && !st.descarte.length) return erro('Não há cartas para comprar.');
      return { ok: true, custo: 1 };
    }
    if (a.t === 'carta') return validarCarta(st, i, a);
    if (a.t === 'propor') {
      const k = a.para, o = st.jogadores[k];
      if (!o || k === i || o.eliminado) return erro('Escolha um reino.');
      const of = limparRec(a.oferta), pe = limparRec(a.pede);
      if (!totalRec(of) && !totalRec(pe)) return erro('Monte a proposta.');
      if (!temRec(j.rec, of)) return erro('Você não tem esses recursos.');
      if (st.propostas.some(pr => pr.tipo === 'troca' && pr.de === i && pr.para === k)) return erro('Já existe uma proposta sua esperando resposta desse reino.');
      return { ok: true, custo: 1, of, pe };
    }
    return erro('Ação desconhecida.');
  }

  function tiposRecrutaveis(st, tid) {
    const t = st.terr[tid], r = [];
    if (t.def === 'castelo') r.push('infantaria', 'arqueiro', 'cavalaria', 'catapulta');
    else if (t.eco === 'cidade') r.push('infantaria', 'arqueiro');
    if (t.porto) r.push('navio');
    return r;
  }
  function custoRecruta(st, i, u) {
    const c = { ouro: 0, madeira: 0, pedra: 0, alimento: 0 };
    TIPOS_U.forEach(k => { if (u[k]) receber(c, somaCusto(UNIDADES[k].custo, u[k])); });
    if (st.turno && st.vez === i && st.turno.infDesc && u.infantaria > 0) c.ouro -= 1;
    if (st.turno && st.vez === i && st.turno.recrEv && total(u) > 0 && c.ouro > 0) c.ouro -= 1;
    return c;
  }
  function custoConstr(st, i, k) {
    const c = Object.assign({ ouro: 0, madeira: 0, pedra: 0, alimento: 0 }, CONSTR[k].custo);
    if (st.turno && st.vez === i && st.turno.constDesc && c.pedra > 0) c.pedra -= 1;
    if (st.turno && st.vez === i && st.turno.constrEv) { if (c.madeira > 0) c.madeira -= 1; if (c.pedra > 0) c.pedra -= 1; }
    if (st.turno && st.vez === i && st.turno.engenheiros > 0) {
      for (let n = st.turno.engenheiros; n > 0; n--) { const k = RECURSOS.filter(r => c[r] > 0).sort((a, b) => c[b] - c[a])[0]; if (!k) break; c[k]--; }
    }
    return c;
  }
  function motivoNaoConstruir(st, i, tid, k) {
    const t = st.terr[tid], info = infoT(st, tid);
    if (k === 'vila') {
      if (t.eco) return 'Este território já tem ' + CONSTR[t.eco].nome.toLowerCase() + '.';
      if (!TERRENOS[info.terreno].prod) return 'Este terreno não produz recursos.';
    }
    if (k === 'cidade') {
      if (t.eco === 'cidade') return 'Já existe uma cidade aqui.';
      if (t.eco !== 'vila') return 'A cidade é a evolução da vila: construa uma vila primeiro.';
    }
    if (k === 'fortaleza' && t.def) return 'Já existe ' + CONSTR[t.def].nome.toLowerCase() + ' aqui.';
    if (k === 'castelo' && t.def === 'castelo') return 'Já existe um castelo aqui.';
    if (k === 'porto') {
      if (!info.costa) return 'Porto só em território costeiro.';
      if (t.porto) return 'Já existe um porto aqui.';
    }
    if (k === 'maravilha') {
      if (Object.keys(st.terr).some(x => st.terr[x].dono === i && st.terr[x].maravilha)) return 'Cada reino pode ter só uma maravilha.';
      if (st.jogadores[i].maravilhaFeita) return 'Seu reino já construiu a sua maravilha.';
      if (t.eco !== 'cidade') return 'A maravilha precisa de uma cidade no território.';
      if (t.maravilha) return 'Já existe uma maravilha aqui.';
    }
    return null;
  }
  function taxaMercado(st, i) {
    if (evAtivo(st, 'descoberta-de-novas-rotas')) return AJ.taxaPorto;
    return territoriosDe(st, i).some(t => st.terr[t].porto || infoT(st, t).terreno === 'cidade') ? AJ.taxaPorto : AJ.taxaBase;
  }

  // aplica uma ação; devolve {ok, erro?, ev:[...]}
  function jogar(st, i, a) {
    const v = validar(st, i, a);
    if (!v.ok) return v;
    st.ev = [];
    st.seq++;
    const j = st.jogadores[i];
    if (a.t === 'fim') { encerrarTurno(st); return { ok: true, ev: st.ev }; }
    st.acoes -= v.custo;
    if (a.t === 'mover') {
      if (v.custo === 0) { if (st.turno.movGratis) st.turno.movGratis = false; else st.turno.movExtra--; }
      const o = st.terr[a.de], d = st.terr[a.para];
      TIPOS_U.forEach(k => { o.u[k] -= v.u[k]; d.u[k] += v.u[k]; });
      const ocupou = d.dono == null;
      if (ocupou) { d.dono = i; j.st.conquistas++; }
      log(st, `${ocupou ? '🚩' : '➡️'} ${j.nome} ${ocupou ? 'ocupou' : 'moveu tropas para'} ${infoT(st, a.para).nome}${v.porMar ? ' pelo mar' : ''}.`, { j: i });
      evento(st, { tipo: 'mover', j: i, de: a.de, para: a.para, u: v.u, ocupou });
    } else if (a.t === 'atacar') {
      if (a.carta) descartarDaMao(st, i, a.carta, true);
      batalha(st, i, a.de, a.para, v.u, a.carta);
    } else if (a.t === 'recrutar') {
      pagar(j.rec, v.c);
      if (st.turno.infDesc && v.u.infantaria > 0) st.turno.infDesc = false;
      st.turno.recrEv = false; st.turno.recrutaReal = false;
      TIPOS_U.forEach(k => { st.terr[a.em].u[k] += v.u[k]; });
      j.st.recrutados += total(v.u);
      log(st, `⚔️ ${j.nome} recrutou ${descU(v.u)} em ${infoT(st, a.em).nome}.`, { j: i });
      evento(st, { tipo: 'recrutar', j: i, em: a.em, u: v.u });
    } else if (a.t === 'construir') {
      pagar(j.rec, v.c);
      if (st.turno.constDesc && CONSTR[a.tipo].custo.pedra > 0) st.turno.constDesc = false;
      st.turno.constrEv = false; st.turno.engenheiros = 0;
      if (a.tipo === 'castelo') j.st.castelos++;
      const t = st.terr[a.em], s = CONSTR[a.tipo].slot;
      if (s === 'eco' || s === 'def') t[s] = a.tipo; else t[s] = true;
      if (a.tipo === 'maravilha') j.maravilhaFeita = true;
      if (a.tipo === 'castelo' && (j.capital == null || st.terr[j.capital].dono !== i)) j.capital = a.em;
      j.st.construcoes++;
      log(st, `${CONSTR[a.tipo].ic} ${j.nome} construiu ${CONSTR[a.tipo].nome.toLowerCase()} em ${infoT(st, a.em).nome}.`, { j: i });
      evento(st, { tipo: 'construir', j: i, em: a.em, k: a.tipo });
    } else if (a.t === 'mercado') {
      j.rec = v.rec;
      st.turno.trocaDesc = false;
      st.turno.mercadoUsado = true; st.turno.mercadoProspero = false;
      j.st.trocas += a.trocas.length; j.st.negocios++;
      log(st, `⚖️ ${j.nome} negociou no mercado.`, { j: i });
      evento(st, { tipo: 'mercado', j: i, trocas: a.trocas });
    } else if (a.t === 'comprar') {
      j.rec.ouro -= CA().REGRAS.compraOuro;
      const c = comprarCarta(st, j);
      log(st, `🃏 ${j.nome} comprou uma carta especial.`, { j: i });
      evento(st, { tipo: 'comprar', j: i, carta: c });
    } else if (a.t === 'carta') {
      usarCarta(st, i, a);
    } else if (a.t === 'propor') {
      pagar(j.rec, {}); // os recursos só saem na aceitação (troca atômica)
      const pr = { id: ++st.propSeq, tipo: 'troca', de: i, para: a.para, oferta: v.of, pede: v.pe, rodada: st.rodada };
      st.propostas.push(pr);
      log(st, `🤝 ${j.nome} propôs uma troca a ${st.jogadores[a.para].nome}.`, { j: i });
      evento(st, { tipo: 'proposta', j: i, prop: pr });
    }
    verificarObjetivos(st, i, false);
    verificarEliminacoes(st);
    if (st.fase === 'jogo' && st.acoes <= 0 && !st.turno.movGratis && st.cfg.fimAutomatico) encerrarTurno(st);
    return { ok: true, ev: st.ev };
  }

  const descU = u => TIPOS_U.filter(k => u[k] > 0).map(k => u[k] + ' ' + UNIDADES[k].nome.toLowerCase() + (u[k] > 1 ? (k === 'cavalaria' ? 's' : k === 'infantaria' ? 's' : 's') : '')).join(', ');

  /* ---------- batalha ---------- */
  const ORDEM_BAIXA_ATQ = ['infantaria', 'arqueiro', 'catapulta', 'cavalaria', 'navio'];
  const ORDEM_BAIXA_DEF = ['infantaria', 'catapulta', 'cavalaria', 'arqueiro', 'navio'];
  function forcas(st, i, de, para, u, cartaAtq) {
    const d = st.terr[para], info = infoT(st, para);
    const bonusAtq = cartaAtq === 'ataque-surpresa' ? 3 : 0;
    const atq = TIPOS_U.reduce((s, k) => s + UNIDADES[k].a * (u[k] || 0), 0) + bonusAtq;
    const defU = TIPOS_U.reduce((s, k) => s + UNIDADES[k].d * (d.u[k] || 0), 0);
    const terreno = TERRENOS[info.terreno].def;
    let fort = d.def ? CONSTR[d.def].def : 0;
    const reducao = u.catapulta > 0 ? Math.min(2, fort) : 0;
    fort -= reducao;
    let lobo = 0;
    if (d.dono != null) { const dj = st.jogadores[d.dono]; if (dj.reino === 'lobo' && dj.capital === para) lobo = 3; }
    const muralha = st.efeitos.filter(e => e.tipo === 'muralha' && e.t === para).length * 3;
    return { atq, def: defU + terreno + fort + lobo + muralha, terreno, fort, reducao, lobo, defU, muralha, bonusAtq };
  }
  // probabilidade de o atacante vencer (dados 1–3 de cada lado; empate é do defensor)
  function chance(st, i, de, para, u, carta) {
    const f = forcas(st, i, de, para, limparU(u), carta);
    let w = 0;
    for (let x = 1; x <= 3; x++) for (let y = 1; y <= 3; y++) if (f.atq + x > f.def + y) w++;
    return w / 9;
  }
  function baixas(diff) { return diff >= 7 ? 3 : diff >= 4 ? 2 : diff >= 1 ? 1 : 1; }
  function remover(u, n, ordem) {
    const fora = vazioU();
    for (const k of ordem) { while (n > 0 && u[k] > 0) { u[k]--; fora[k]++; n--; } }
    return fora;
  }
  function batalha(st, i, de, para, u, cartaAtq) {
    const o = st.terr[de], d = st.terr[para];
    const atk = st.jogadores[i], dono = d.dono, defJ = dono != null ? st.jogadores[dono] : null;
    const f = forcas(st, i, de, para, u, cartaAtq);
    // Defesa Real entra sozinha quando o defensor corre risco de perder
    let defesaReal = false;
    if (defJ && defJ.mao && defJ.mao.includes('defesa-real') && f.atq + 3 > f.def + 1) {
      descartarDaMao(st, dono, 'defesa-real', false); f.def += 3; f.defesaReal = 3; defesaReal = true;
      log(st, `🛡️ ${defJ.nome} usou Defesa Real (+3 de defesa).`, { j: dono });
    }
    if (dono != null) st.turno.atacouReino = true;
    const eraCapitalRival = dono != null && st.jogadores.some((x, k) => k !== i && x.capitalOriginal === para);
    const da = dado(st), dd = dado(st);
    const A = f.atq + da, D = f.def + dd;
    const venceu = A > D;
    const diff = Math.abs(A - D);
    // tira as unidades da origem para a batalha
    TIPOS_U.forEach(k => { o.u[k] -= u[k]; });
    const atq = Object.assign({}, u), defe = Object.assign({}, d.u);
    let perdasA, perdasD;
    const nPerdedor = Math.max(1, baixas(diff));
    if (venceu) {
      perdasD = remover(defe, Math.min(nPerdedor, total(defe)), ORDEM_BAIXA_DEF);
      perdasA = remover(atq, D * 2 >= A ? 1 : 0, ORDEM_BAIXA_ATQ);
    } else {
      perdasA = remover(atq, Math.min(nPerdedor, total(atq)), ORDEM_BAIXA_ATQ);
      perdasD = remover(defe, A * 2 >= D && total(defe) > 0 ? 1 : 0, ORDEM_BAIXA_DEF);
    }
    let conquistou = false, recuo = null;
    if (venceu) {
      // sobreviventes do defensor recuam para território próprio vizinho (neutros se dispersam)
      if (dono != null && total(defe) > 0) {
        const opc = infoT(st, para).viz.filter(x => st.terr[x].dono === dono);
        if (opc.length) {
          recuo = opc.sort((x, y) => total(st.terr[y].u) - total(st.terr[x].u))[0];
          const viaTerra = Object.assign({}, defe); viaTerra.navio = 0;
          TIPOS_U.forEach(k => { st.terr[recuo].u[k] += viaTerra[k]; });
        }
      }
      d.u = vazioU();
      if (total(atq) > 0) {
        conquistou = true;
        d.dono = i;
        TIPOS_U.forEach(k => { d.u[k] = atq[k]; });
        atk.st.conquistas++;
        if (eraCapitalRival) atk.st.capitalRival = true;
      }
      atk.st.vitorias++;
      if (defJ) defJ.st.derrotas++;
    } else {
      TIPOS_U.forEach(k => { o.u[k] += atq[k]; });
      d.u = defe;
      atk.st.derrotas++;
      if (defJ) defJ.st.defesas++;
    }
    const nomeT = infoT(st, para).nome;
    const quem = defJ ? defJ.nome : 'a guarnição neutra';
    log(st, venceu
      ? `⚔️ ${atk.nome} venceu ${quem} em ${nomeT} (${A} × ${D})${conquistou ? ' e conquistou o território' : ''}.`
      : `🛡️ ${quem.charAt(0).toUpperCase() + quem.slice(1)} resistiu ao ataque de ${atk.nome} em ${nomeT} (${A} × ${D}).`, { j: i, batalha: true });
    const res = { tipo: 'batalha', j: i, dono, de, para, u, f, da, dd, A, D, venceu, conquistou, perdasA, perdasD, recuo, cartaAtq: cartaAtq || null, defesaReal };
    evento(st, res);
    st.ultimaBatalha = res;
    return res;
  }

  /* ---------- fim de turno ---------- */
  function encerrarTurno(st) {
    const i = st.vez, j = st.jogadores[i];
    // manutenção: 1 alimento para cada 3 unidades terrestres (arredonda para cima)
    let m = manutencao(st, i);
    const dispensados = vazioU();
    while (m > j.rec.alimento && unidadesDe(st, i) > 0) {
      const ts = territoriosDe(st, i).filter(t => totalTerra(st.terr[t].u) > 0)
        .sort((a, b) => totalTerra(st.terr[b].u) - totalTerra(st.terr[a].u));
      const fora = remover(st.terr[ts[0]].u, 1, ['infantaria', 'arqueiro', 'catapulta', 'cavalaria']);
      TIPOS_U.forEach(k => { dispensados[k] += fora[k]; });
      m = manutencao(st, i);
    }
    j.rec.alimento -= m;
    if (total(dispensados)) log(st, `🍂 ${j.nome} dispensou ${descU(dispensados)} por falta de alimentos.`, { j: i });
    evento(st, { tipo: 'manutencao', j: i, pago: m, dispensados });
    if (evAtivo(st, 'movimento-religioso') && !st.turno.atacouReino) { j.rec.ouro += 2; evento(st, { tipo: 'bonus', j: i, txt: '⛪ Movimento Religioso: +2 ouros por não atacar.' }); }
    verificarObjetivos(st, i, true);
    verificarEliminacoes(st);
    if (st.fase !== 'jogo') return;
    if (pontos(st, i) >= st.cfg.meta && !st.ultimaRodada) {
      st.ultimaRodada = true;
      log(st, `🏁 ${j.nome} alcançou ${st.cfg.meta} pontos! A rodada vai até o fim.`, { j: i });
      evento(st, { tipo: 'meta', j: i });
    }
    // próximo jogador
    let p = st.pos + 1;
    while (p < st.ordem.length && st.jogadores[st.ordem[p]].eliminado) p++;
    if (p >= st.ordem.length) {
      if (st.ultimaRodada) {
        // a meta precisa estar alcançada no fim da rodada; se quem chegou lá perdeu pontos, o jogo segue
        if (ativosIdx(st).some(k => pontos(st, k) >= st.cfg.meta)) return finalizar(st, 'meta');
        st.ultimaRodada = false;
        log(st, '⚔️ Ninguém terminou a rodada com a meta. A disputa continua!');
      }
      if (st.rodada >= st.cfg.maxRodadas) return finalizar(st, 'limite');
      novaRodada(st);
    } else { st.pos = p; iniciarTurno(st); }
  }

  function verificarEliminacoes(st) {
    st.jogadores.forEach((j, i) => {
      if (!j.eliminado && territoriosDe(st, i).length === 0) {
        j.eliminado = true;
        log(st, `☠️ ${j.nome} perdeu todos os territórios e foi eliminado.`, { j: i });
        evento(st, { tipo: 'eliminado', j: i });
      }
    });
    const vivos = ativosIdx(st);
    if (vivos.length === 1 && st.fase === 'jogo') finalizar(st, 'dominacao');
  }

  function classificacao(st) {
    return st.jogadores.map((j, i) => ({ i, pts: pontos(st, i), terr: territoriosDe(st, i).length, cid: contar(st, i, t => t.eco === 'cidade'), rec: totalRec(j.rec), elim: j.eliminado }))
      .sort((a, b) => (a.elim - b.elim) || b.pts - a.pts || b.terr - a.terr || b.cid - a.cid || b.rec - a.rec);
  }
  function finalizar(st, motivo) {
    st.fase = 'fim';
    st.motivoFim = motivo;
    let cand = classificacao(st).filter(c => !c.elim);
    if (motivo === 'meta') cand = cand.filter(c => c.pts >= st.cfg.meta);
    const top = cand[0];
    st.vencedores = cand.filter(c => c.pts === top.pts && c.terr === top.terr && c.cid === top.cid && c.rec === top.rec).map(c => c.i);
    log(st, '👑 Fim de partida! ' + st.vencedores.map(i => st.jogadores[i].nome).join(' e ') + (st.vencedores.length > 1 ? ' dividem a vitória.' : ' venceu.'));
    evento(st, { tipo: 'fim', vencedores: st.vencedores, motivo });
  }

  /* ---------- tratados, eventos, cartas, objetivos (Fase 2) ---------- */
  const NOME_TRATADO = { alianca: 'aliança', paz: 'tratado de paz', tregua: 'trégua' };
  function emTratado(st, a, b, tipo) {
    return st.tratados.find(t => ((t.a === a && t.b === b) || (t.a === b && t.b === a)) && t.ate >= st.rodada && (!tipo || t.tipo === tipo)) || null;
  }
  const tratadosDe = (st, i) => st.tratados.filter(t => (t.a === i || t.b === i) && t.ate >= st.rodada);
  const evAtivo = (st, id) => !!(st.evento && st.evento.id === id);
  const marFechado = st => evAtivo(st, 'desastre-natural') || st.efeitos.some(e => e.tipo === 'tempestade');
  const limparRec = r => { const o = { ouro: 0, madeira: 0, pedra: 0, alimento: 0 }; if (r) RECURSOS.forEach(k => { const n = Math.floor(+r[k] || 0); if (n > 0) o[k] = Math.min(n, 99); }); return o; };

  function revelarEvento(st) {
    if (!st.baralhoEv.length) st.baralhoEv = embaralhar(st, EVM().EVENTOS.map(e => e.id).filter(id => !st.evento || id !== st.evento.id));
    const id = st.baralhoEv.shift(), e = EVM().EVENTOS.find(x => x.id === id);
    st.evento = { id, desde: st.rodada };
    log(st, `🌍 Evento mundial: ${e.nome}. ${e.txt}`);
    if (id === 'era-de-prosperidade') ativosIdx(st).forEach(k => receber(st.jogadores[k].rec, { ouro: 1, madeira: 1, pedra: 1, alimento: 1 }));
    if (id === 'epidemia') ativosIdx(st).forEach(k => {
      const ts = territoriosDe(st, k).filter(t => totalTerra(st.terr[t].u) >= 2).sort((a, b) => totalTerra(st.terr[b].u) - totalTerra(st.terr[a].u));
      if (ts.length) remover(st.terr[ts[0]].u, 1, ['infantaria', 'arqueiro', 'catapulta', 'cavalaria']);
    });
    evento(st, { tipo: 'evento', id });
  }

  function comprarCarta(st, j) {
    if (!st.baralho.length) { st.baralho = embaralhar(st, st.descarte); st.descarte = []; }
    const c = st.baralho.shift();
    if (c) j.mao.push(c);
    return c;
  }
  function descartarDaMao(st, i, id, contaUso) {
    const j = st.jogadores[i], k = j.mao.indexOf(id);
    if (k >= 0) j.mao.splice(k, 1);
    st.descarte.push(id);
    if (contaUso) { st.turno.cartasUsadas++; j.st.cartas++; if (cartaInfo(id).cat === 'sabotagem') st.turno.sabotagens++; }
  }
  const rival = (st, i, k) => k != null && k !== i && st.jogadores[k] && !st.jogadores[k].eliminado;
  const ehCapital = (st, t) => st.jogadores.some(o => o.capital === t);
  function alvoSabotagem(st, t) {
    const x = st.terr[t], cap = ehCapital(st, t);
    if (x.def === 'castelo' && !cap) return 'castelo';
    if (x.eco === 'cidade') return 'cidade';
    if (x.def === 'fortaleza') return 'fortaleza';
    if (x.porto) return 'porto';
    if (x.eco === 'vila') return 'vila';
    return null;
  }
  // diz se a carta pode ser usada agora e com quais alvos
  function validarCarta(st, i, a) {
    const j = st.jogadores[i], c = cartaInfo(a.id);
    if (!st.cfg.cartas || !c) return erro('Carta inválida.');
    if (!j.mao.includes(a.id)) return erro('Essa carta não está na sua mão.');
    if (c.mom === 'ataque') return erro('Use esta carta na tela de ataque.');
    if (c.mom === 'defesa') return erro('Esta carta entra sozinha quando você é atacado.');
    if (st.turno.cartasUsadas >= CA().REGRAS.maxPorTurno) return erro('Você já usou 2 cartas neste turno.');
    if (c.cat === 'sabotagem' && st.turno.sabotagens >= CA().REGRAS.maxSabotagemPorTurno) return erro('Só 1 carta de sabotagem por turno.');
    const T = a.em != null ? st.terr[a.em] : null, k = a.jog;
    const precisaT = ['muralha-reforcada', 'expansao-territorial', 'bloqueio-naval', 'revolta', 'peste', 'desercao', 'sabotagem'];
    const precisaJ = ['alianca', 'tratado-de-paz', 'tregua', 'espionagem'];
    if (precisaT.includes(a.id) && !T) return erro('Escolha o território.');
    if (precisaJ.includes(a.id) && !rival(st, i, k)) return erro('Escolha o reino.');
    const sabot = c.cat === 'sabotagem';
    if (sabot || a.id === 'bloqueio-naval') {
      if (!rival(st, i, T.dono)) return erro('Escolha um território de outro reino.');
      if (sabot && (emTratado(st, i, T.dono, 'alianca') || emTratado(st, i, T.dono, 'paz'))) return erro('Aliança e paz impedem sabotagens contra esse reino.');
    }
    switch (a.id) {
      case 'muralha-reforcada': if (T.dono !== i) return erro('Escolha um território seu.'); break;
      case 'expansao-territorial':
        if (T.dono != null || total(T.u) > 0) return erro('Escolha um território neutro desprotegido.');
        if (!infoT(st, a.em).viz.some(x => st.terr[x].dono === i)) return erro('O território precisa ser vizinho de um seu.');
        break;
      case 'bloqueio-naval': if (!infoT(st, a.em).costa) return erro('Escolha um território costeiro.'); break;
      case 'revolta': if (ehCapital(st, a.em) || T.def === 'castelo') return erro('Revolta não vale em capital nem em território com castelo.'); break;
      case 'peste': if (ehCapital(st, a.em)) return erro('Peste não vale na capital.'); if (total(T.u) < 2) return erro('O território precisa ter pelo menos 2 unidades.'); break;
      case 'desercao':
        if (!infoT(st, a.em).viz.some(x => st.terr[x].dono === i)) return erro('Escolha um território que faça fronteira com você.');
        if (total(T.u) < 2) return erro('O território precisa ter pelo menos 2 unidades.'); break;
      case 'sabotagem': if (!alvoSabotagem(st, a.em)) return erro('Não há construção que possa ser sabotada aí.'); break;
      case 'reforcos-militares': if (!j.capital || st.terr[j.capital].dono !== i) return erro('Você precisa de uma capital.'); break;
      case 'mercado-prospero': if (st.turno.mercadoUsado) return erro('Você já foi ao mercado neste turno.'); break;
      case 'tempestade': if (st.efeitos.some(e => e.tipo === 'tempestade')) return erro('Já há uma tempestade.'); break;
      case 'tregua':
        if (st.ultTregua[i] === k) return erro('Não dá para pedir trégua ao mesmo reino duas vezes seguidas.');
        if (emTratado(st, i, k)) return erro('Vocês já têm um acordo.'); break;
      case 'alianca': case 'tratado-de-paz':
        if (emTratado(st, i, k)) return erro('Vocês já têm um acordo.');
        if (st.propostas.some(pr => (pr.de === i && pr.para === k) || (pr.de === k && pr.para === i))) return erro('Já existe uma proposta entre vocês.'); break;
      case 'espionagem': if (!st.jogadores[k].mao.length) return erro('Esse reino não tem cartas.'); break;
    }
    return { ok: true, custo: 0 };
  }
  function usarCarta(st, i, a) {
    const j = st.jogadores[i], c = cartaInfo(a.id), T = a.em != null ? st.terr[a.em] : null, k = a.jog;
    const nomeT = a.em != null ? infoT(st, a.em).nome : '', nomeJ = k != null ? st.jogadores[k].nome : '';
    const res = { tipo: 'carta', j: i, id: a.id, em: a.em, jog: k };
    if (a.id === 'alianca' || a.id === 'tratado-de-paz') {
      // a carta fica com a proposta: volta para a mão se for recusada
      const ix = j.mao.indexOf(a.id); j.mao.splice(ix, 1);
      st.turno.cartasUsadas++; j.st.cartas++;
      const pr = { id: ++st.propSeq, tipo: a.id === 'alianca' ? 'alianca' : 'paz', de: i, para: k, carta: a.id, rodada: st.rodada };
      st.propostas.push(pr);
      log(st, `📜 ${j.nome} propôs ${a.id === 'alianca' ? 'uma aliança' : 'um tratado de paz'} a ${nomeJ}.`, { j: i });
      res.prop = pr; evento(st, res); return;
    }
    descartarDaMao(st, i, a.id, true);
    let txt = '';
    switch (a.id) {
      case 'marcha-forcada': st.turno.movExtra++; txt = 'ganhou uma movimentação extra'; break;
      case 'decreto-real': st.acoes++; txt = 'ganhou 1 ponto de ação'; break;
      case 'grande-colheita': j.rec.alimento += 4; txt = 'recebeu 4 alimentos'; break;
      case 'tesouro-perdido': j.rec.ouro += 4; txt = 'recebeu 4 ouros'; break;
      case 'extracao-de-madeira': j.rec.madeira += 4; txt = 'recebeu 4 madeiras'; break;
      case 'mina-descoberta': j.rec.pedra += 4; txt = 'recebeu 4 pedras'; break;
      case 'muralha-reforcada': st.efeitos.push({ tipo: 'muralha', t: a.em, ateVez: i }); txt = `reforçou as muralhas de ${nomeT}`; break;
      case 'mercado-prospero': st.turno.mercadoProspero = true; txt = 'terá a próxima troca do mercado a 1 por 1'; break;
      case 'engenheiros-reais': st.turno.engenheiros = 2; txt = 'terá a próxima construção 2 recursos mais barata'; break;
      case 'recrutamento-real': st.turno.recrutaReal = true; txt = 'pode recrutar até 4 unidades sem gastar ação'; break;
      case 'reforcos-militares': st.terr[j.capital].u.cavalaria++; txt = 'recebeu 1 cavalaria na capital'; break;
      case 'expansao-territorial': T.dono = i; j.st.conquistas++; txt = `ocupou ${nomeT}`; break;
      case 'tregua':
        st.tratados.push({ tipo: 'tregua', a: i, b: k, ate: st.rodada + 1 }); st.ultTregua[i] = k;
        txt = `declarou trégua com ${nomeJ} até o fim da próxima rodada`; break;
      case 'espionagem': res.mao = st.jogadores[k].mao.slice(); txt = `espionou as cartas de ${nomeJ}`; break;
      case 'tempestade': st.efeitos.push({ tipo: 'tempestade', ateRodada: st.rodada }); txt = 'fechou as rotas marítimas até o fim da rodada'; break;
      case 'bloqueio-naval': st.efeitos.push({ tipo: 'bloqueio', t: a.em, ateVez: i }); txt = `bloqueou o porto de ${nomeT}`; break;
      case 'revolta': st.efeitos.push({ tipo: 'revolta', t: a.em }); txt = `provocou uma revolta em ${nomeT}`; break;
      case 'peste': { const fora = remover(T.u, Math.min(2, total(T.u) - 1), ORDEM_BAIXA_DEF); txt = `espalhou a peste em ${nomeT} (−${descU(fora)})`; break; }
      case 'desercao': { const fora = remover(T.u, 1, ORDEM_BAIXA_DEF); txt = `provocou deserção em ${nomeT} (−${descU(fora)})`; break; }
      case 'sabotagem': {
        const alvo = alvoSabotagem(st, a.em);
        if (alvo === 'castelo') T.def = 'fortaleza'; else if (alvo === 'cidade') T.eco = 'vila'; else if (alvo === 'fortaleza') T.def = null; else if (alvo === 'porto') T.porto = false; else if (alvo === 'vila') T.eco = null;
        txt = `sabotou ${CONSTR[alvo].nome.toLowerCase()} em ${nomeT}`; res.alvoC = alvo; break;
      }
    }
    log(st, `🃏 ${j.nome} usou ${c.nome} e ${txt}.`, { j: i });
    res.txt = txt; evento(st, res);
  }

  // responder a uma proposta (aceitar/recusar). Pode ser chamada fora da vez (bots respondem na hora).
  function responderProposta(st, k, id, aceitar) {
    const pr = st.propostas.find(x => x.id === id);
    if (!pr) return erro('Proposta não encontrada.');
    if (pr.para !== k) return erro('Essa proposta não é para você.');
    if (st.fase !== 'jogo') return erro('A partida já terminou.');
    if (aceitar && pr.tipo === 'troca') {
      const A = st.jogadores[pr.de], B = st.jogadores[pr.para];
      if (!temRec(A.rec, pr.oferta)) { fecharProposta(st, pr, false); return erro('Quem propôs não tem mais esses recursos.'); }
      if (!temRec(B.rec, pr.pede)) return erro('Você não tem os recursos pedidos.');
    }
    if (aceitar && pr.tipo !== 'troca' && emTratado(st, pr.de, pr.para)) { fecharProposta(st, pr, false); return erro('Vocês já têm um acordo.'); }
    st.ev = st.ev || [];
    fecharProposta(st, pr, aceitar);
    verificarObjetivos(st, pr.de, false); verificarObjetivos(st, pr.para, false);
    return { ok: true, ev: st.ev };
  }
  function fecharProposta(st, pr, aceitar, expirou) {
    st.propostas = st.propostas.filter(x => x !== pr);
    const A = st.jogadores[pr.de], B = st.jogadores[pr.para];
    if (aceitar) {
      if (pr.tipo === 'troca') {
        pagar(A.rec, pr.oferta); receber(B.rec, pr.oferta); pagar(B.rec, pr.pede); receber(A.rec, pr.pede);
        A.st.negocios++; B.st.negocios++;
        log(st, `🤝 ${B.nome} aceitou a troca de ${A.nome}.`);
      } else {
        st.tratados.push({ tipo: pr.tipo, a: pr.de, b: pr.para, ate: st.rodada + (pr.tipo === 'alianca' ? 2 : 3) });
        if (pr.tipo === 'paz') { A.rec.ouro += 2; B.rec.ouro += 2; }
        st.descarte.push(pr.carta);
        log(st, `📜 ${B.nome} aceitou ${pr.tipo === 'alianca' ? 'a aliança' : 'o tratado de paz'} de ${A.nome}.`);
      }
    } else {
      if (pr.carta) { if (A.mao.length < CA().REGRAS.mao) A.mao.push(pr.carta); else st.descarte.push(pr.carta); }
      log(st, expirou ? `⌛ A proposta de ${A.nome} para ${B.nome} expirou.` : `✋ ${B.nome} recusou a proposta de ${A.nome}.`);
    }
    if (st.ev) evento(st, { tipo: 'resposta', prop: pr, aceitar: !!aceitar, expirou: !!expirou });
  }

  /* objetivos secretos: valem 10 pontos; no Relâmpago (meta baixa) valem menos para não decidir sozinhos */
  const ptsObjetivo = st => Math.max(4, Math.min(OBJ().PONTOS, Math.round(st.cfg.meta * 0.24)));
  function objetivoPossivel(st, o, n) {
    const r = o.requer || {};
    if (r.cartas && !st.cfg.cartas) return false;
    if (r.minJogadores && n < r.minJogadores) return false;
    const m = mapaDe(st);
    if (o.id === 'senhor-dos-mares' && m.territorios.filter(t => t.costa).length < 4) return false;
    return true;
  }
  function progressoObjetivo(st, i) {
    const j = st.jogadores[i], o = j.objetivo;
    if (!o) return null;
    const ts = territoriosDe(st, i), T = t => st.terr[t], ter = t => infoT(st, t).terreno;
    const conta = f => ts.filter(f).length;
    const m = mapaDe(st);
    let atual = 0, alvo = 1;
    switch (o.id) {
      case 'expansao-imperial': atual = ts.length; alvo = 8; break;
      case 'dominio-continental': {
        let best = 0, tam = 1;
        Object.values(m.regioes).forEach(r => { const q = r.territorios.filter(t => st.terr[t].dono === i).length; if (q / r.territorios.length > best / tam) { best = q; tam = r.territorios.length; } });
        atual = best; alvo = tam; break;
      }
      case 'senhor-dos-mares': atual = conta(t => T(t).porto); alvo = 2; break;
      case 'mestre-das-fortalezas': atual = conta(t => T(t).def === 'fortaleza'); alvo = 3; break;
      case 'conquistador-de-capitais': atual = j.st.capitalRival ? 1 : 0; break;
      case 'reino-prospero': atual = ['planicie', 'floresta', 'montanha', 'mina'].filter(x => ts.some(t => ter(t) === x)).length; alvo = 4; break;
      case 'magnata-do-ouro': atual = Math.min(j.rec.ouro, 15); alvo = 15; break;
      case 'mestre-do-comercio': atual = j.st.negocios; alvo = 5; break;
      case 'celeiro-imperial': atual = conta(t => ter(t) === 'planicie'); alvo = 3; break;
      case 'grande-construtor': atual = j.st.castelos; alvo = 2; break;
      case 'exercito-invencivel': atual = j.st.vitorias; alvo = 3; break;
      case 'mestre-da-cavalaria': atual = ts.reduce((s, t) => s + T(t).u.cavalaria, 0); alvo = 4; break;
      case 'guardiao-do-reino': atual = j.st.defesas; alvo = 2; break;
      case 'grande-diplomata': atual = tratadosDe(st, i).length; alvo = 2; break;
      case 'alianca-dos-reis': atual = j.st.aliancaCumprida ? 1 : 0; break;
      case 'maravilha-do-mundo': atual = conta(t => T(t).maravilha); break;
      case 'mestre-dos-recursos': atual = RECURSOS.filter(r => j.rec[r] >= 8).length; alvo = 4; break;
      case 'imperio-das-cidades': atual = conta(t => T(t).eco === 'cidade'); alvo = 3; break;
      case 'explorador-dos-reinos': atual = new Set(ts.map(t => infoT(st, t).regiao)).size; alvo = 3; break;
      case 'legado-eterno': atual = detalharSemObj(st, i); alvo = 18; break;
    }
    return { atual: Math.min(atual, alvo), alvo, fimDeTurno: ['magnata-do-ouro', 'mestre-dos-recursos'].includes(o.id) };
  }
  function detalharSemObj(st, i) {
    let c = 0;
    territoriosDe(st, i).forEach(tid => { const t = st.terr[tid]; ['eco', 'def'].forEach(s => { if (t[s]) c += CONSTR[t[s]].pts; }); if (t.porto) c += CONSTR.porto.pts; if (t.maravilha) c += CONSTR.maravilha.pts; });
    return c;
  }
  function verificarObjetivos(st, i, fimTurno) {
    const j = st.jogadores[i];
    if (!j || !j.objetivo || j.objetivo.feito || j.eliminado) return;
    const p = progressoObjetivo(st, i);
    if (p.fimDeTurno && !fimTurno) return;
    if (p.atual >= p.alvo) {
      j.objetivo.feito = true; j.objetivo.rodada = st.rodada;
      const o = OBJ().OBJETIVOS.find(x => x.id === j.objetivo.id);
      log(st, `🎯 ${j.nome} concluiu o objetivo secreto "${o.nome}" (+${ptsObjetivo(st)} pontos)!`, { j: i });
      evento(st, { tipo: 'objetivo', j: i, id: o.id });
    }
  }

  /* ---------- consultas para interface e bots ---------- */
  function alvosAtaque(st, i, de) {
    const info = infoT(st, de), res = [];
    info.viz.concat(info.mar).forEach(x => {
      const t = st.terr[x];
      if (t.dono === i) return;
      if (t.dono == null && total(t.u) === 0) return;
      if (!res.includes(x)) res.push(x);
    });
    return res;
  }

  G.ImperiosMotor = {
    AJ, RECURSOS, NOME_REC, IC_REC, REINOS, ORDEM_REINOS, UNIDADES, TIPOS_U, TERRESTRES, CONSTR, TIPOS_C, TERRENOS,
    ACOES_TURNO, MAX_RECRUTA, PTS_CAPITAL_RIVAL, LIMITE_RODADAS, INICIAL,
    novaPartida, jogar, validar, pontos, detalhar, producao, manutencao, territoriosDe, unidadesDe, classificacao,
    destinosTerra, alvosAtaque, forcas, chance, tiposRecrutaveis, custoRecruta, custoConstr, motivoNaoConstruir, taxaMercado,
    infoT, mapaDe, prepararMapa, emTratado, tratadosDe, evAtivo, marFechado, validarCarta, responderProposta, progressoObjetivo, cartaInfo, alvoSabotagem, ehCapital, NOME_TRATADO, limparRec, verificarObjetivos, ptsObjetivo, total, totalTerra, totalRec, temRec, limparU, vazioU, clonar, descU, velocidade, podeMar, rnd, ativosIdx,
  };
})(typeof window !== 'undefined' ? window : globalThis);
