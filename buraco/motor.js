/* Buraco — CARLUDIX · motor de regras (sem tela)
   Cartas são números: 0..103 = 2 baralhos (id = baralho*52 + naipe*13 + (valor-1)), 104..107 = curingões.
   Valor: 1=Ás … 13=Rei. Naipe: 0 ♠, 1 ♥, 2 ♦, 3 ♣. Curingão: valor 0, naipe 4.
   O estado do jogo é um objeto JSON simples, para salvar e mandar pela internet. */
(function (G) {
  'use strict';

  const NAIPES = ['♠', '♥', '♦', '♣'];
  const NOMES_VALOR = ['★', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  function carta(id) {
    if (id >= 104) return { id, v: 0, n: 4, cur: true };
    const x = id % 52;
    return { id, v: (x % 13) + 1, n: Math.floor(x / 13), cur: false };
  }
  const ehCuringao = id => id >= 104;
  const ehDois = id => id < 104 && (id % 52) % 13 === 1;
  const ehCoringa = id => ehCuringao(id) || ehDois(id);
  const valorDe = id => carta(id).v;
  const naipeDe = id => carta(id).n;
  function pontos(id) {
    if (ehCuringao(id)) return 20;
    const v = valorDe(id);
    if (v === 1) return 15;
    if (v === 2) return 10;
    if (v >= 8) return 10;
    return 5;
  }
  function nomeCarta(id) {
    if (ehCuringao(id)) return 'Curingão';
    const c = carta(id);
    return NOMES_VALOR[c.v] + NAIPES[c.n];
  }

  /* ---------- Variantes ---------- */
  const VARIANTES = {
    fechado: { nome: 'Fechado', lixo: 'fechado', trincas: true, batida: 'qualquer' },
    aberto: { nome: 'Aberto', lixo: 'aberto', trincas: false, batida: 'limpa' },
    stbl: { nome: 'STBL', lixo: 'fechado', trincas: false, batida: 'limpa' },
  };
  function configPadrao(variante) {
    const v = VARIANTES[variante] || VARIANTES.fechado;
    return { variante: VARIANTES[variante] ? variante : 'fechado', lixo: v.lixo, trincas: v.trincas, batida: v.batida, meta: 3000, curingoes: true, reais: true };
  }
  function descreverConfig(cfg) {
    const base = configPadrao(cfg.variante);
    const dif = ['lixo', 'trincas', 'batida', 'curingoes'].some(k => cfg[k] !== base[k]);
    return (VARIANTES[cfg.variante] || VARIANTES.fechado).nome + (dif ? ' (personalizado)' : '');
  }

  /* ---------- Jogos (sequências e trincas) ---------- */
  // Sequência: mesmo naipe, cartas seguidas, no máximo 1 coringa. Ás vale 1 ou 14. 2 do naipe pode ser natural.
  function analisarSequencia(ids) {
    if (ids.length < 3 || ids.length > 14) return null;
    const cur = ids.filter(ehCuringao), dois = ids.filter(ehDois), nat = ids.filter(i => !ehCoringa(i));
    if (!nat.length) return null;
    const n = naipeDe(nat[0]);
    if (nat.some(i => naipeDe(i) !== n)) return null;
    const doisNaipe = dois.filter(i => naipeDe(i) === n);
    const opcoes = [null].concat(doisNaipe.length ? [doisNaipe[0]] : []);
    let melhor = null;
    for (const nd of opcoes) {
      const coringas = cur.concat(dois.filter(i => i !== nd));
      if (coringas.length > 1) continue;
      const ases = nat.filter(i => valorDe(i) === 1);
      const outros = nat.filter(i => valorDe(i) !== 1);
      if (ases.length > 2) continue;
      const vs = outros.map(valorDe);
      if (nd !== null) vs.push(2);
      if (new Set(vs).size !== vs.length) continue;
      const atribs = ases.length === 0 ? [[]] : ases.length === 1 ? [[1], [14]] : [[1, 14]];
      for (const at of atribs) {
        const pos = vs.concat(at);
        if (new Set(pos).size !== pos.length) continue;
        const lo = Math.min(...pos), hi = Math.max(...pos);
        const buracos = (hi - lo + 1) - pos.length;
        const w = coringas.length;
        if (buracos > w) continue;
        let posCor = null;
        if (w === 1) {
          if (buracos === 1) { for (let p = lo; p <= hi; p++) if (!pos.includes(p)) posCor = p; }
          else if (hi < 14) posCor = hi + 1;
          else if (lo > 1) posCor = lo - 1;
          else continue;
        }
        // monta a ordem
        const porPos = {};
        outros.forEach(i => { porPos[valorDe(i)] = i; });
        if (nd !== null) porPos[2] = nd;
        ases.forEach((i, k) => { porPos[at[k]] = i; });
        if (w === 1) porPos[posCor] = coringas[0];
        const ordem = Object.keys(porPos).map(Number).sort((a, b) => a - b).map(p => porPos[p]);
        const r = { tipo: 'seq', ordem, coringa: w ? coringas[0] : null, limpa: w === 0 };
        if (!melhor || (melhor.coringa !== null && r.coringa === null)) melhor = r;
      }
    }
    return melhor;
  }
  // Trinca: 3+ cartas do mesmo valor (não pode ser 2), no máximo 1 coringa.
  function analisarTrinca(ids) {
    if (ids.length < 3) return null;
    const cor = ids.filter(ehCoringa), nat = ids.filter(i => !ehCoringa(i));
    if (cor.length > 1 || nat.length < 2) return null;
    const v = valorDe(nat[0]);
    if (nat.some(i => valorDe(i) !== v)) return null;
    const ordem = nat.slice().sort((a, b) => naipeDe(a) - naipeDe(b)).concat(cor);
    return { tipo: 'trinca', ordem, coringa: cor.length ? cor[0] : null, limpa: cor.length === 0 };
  }
  function analisarJogo(ids, tipo, cfg) {
    if (tipo === 'seq') return analisarSequencia(ids);
    if (tipo === 'trinca') return cfg && !cfg.trincas ? null : analisarTrinca(ids);
    return analisarSequencia(ids) || (cfg && !cfg.trincas ? null : analisarTrinca(ids));
  }
  const ehCanastra = j => j.c.length >= 7;
  const ehLimpa = j => j.w === null;

  /* ---------- Baralho e distribuição ---------- */
  function embaralhar(a, rnd) {
    rnd = rnd || Math.random;
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function novoJogo(cfg, jogadores) {
    const n = jogadores.length;
    if (n !== 2 && n !== 4) throw new Error('O Buraco é para 2 ou 4 jogadores');
    const st = {
      v: 1, cfg: Object.assign(configPadrao(cfg && cfg.variante), cfg || {}), n,
      jogadores: jogadores.map(j => Object.assign({ nome: j.nome, tipo: j.tipo || 'humano', nivel: j.nivel || 'medio' }, j.uid ? { uid: j.uid } : {}, j.avatar ? { avatar: j.avatar } : {})),
      placar: [0, 0], historico: [], mao: 0, carteador: Math.floor(Math.random() * n), seq: 0,
    };
    novaMao(st);
    return st;
  }
  function novaMao(st, rnd) {
    const total = st.cfg.curingoes ? 108 : 104;
    const baralho = embaralhar(Array.from({ length: total }, (_, i) => i), rnd);
    st.mao += 1;
    if (st.mao > 1) st.carteador = (st.carteador + 1) % st.n;
    st.mortos = [baralho.splice(0, 11), baralho.splice(0, 11)];
    st.maos = [];
    for (let i = 0; i < st.n; i++) st.maos.push(baralho.splice(0, 11));
    st.monte = baralho;
    st.lixo = [];
    st.jogos = [[], []];
    st.pegouMorto = [false, false];
    st.vez = (st.carteador + 1) % st.n;
    st.fase = 'comprar';
    st.comprada = null;
    st.resultado = null;
    st.ultimo = { tipo: 'inicio', texto: 'Cartas distribuídas. Começa ' + st.jogadores[st.vez].nome + '.' };
    st.seq += 1;
  }
  const timeDe = (st, s) => s % 2;
  const parceiros = (st, t) => st.n === 4 ? [t, t + 2] : [t];

  /* ---------- Regras de bater ---------- */
  function mortoDisponivel(st, t) { return !st.pegouMorto[t] && st.mortos.length > 0; }
  function temCanastraParaBater(st, t, jogos) {
    jogos = jogos || st.jogos[t];
    return jogos.some(j => ehCanastra(j) && (st.cfg.batida === 'qualquer' || ehLimpa(j)));
  }
  function podeBater(st, t, jogos) {
    const morto = st.pegouMorto[t] || st.mortos.length === 0;
    return morto && temCanastraParaBater(st, t, jogos);
  }
  function motivoNaoBate(st, t) {
    if (!(st.pegouMorto[t] || st.mortos.length === 0)) return 'pegar o morto primeiro';
    return st.cfg.batida === 'limpa' ? 'ter uma canastra limpa' : 'ter uma canastra';
  }

  /* ---------- Ações ---------- */
  function tirar(mao, ids) {
    const r = mao.slice();
    for (const id of ids) { const k = r.indexOf(id); if (k < 0) return null; r.splice(k, 1); }
    return r;
  }
  function erro(t) { return { ok: false, erro: t }; }

  // Monta o jogo resultante (novo ou somando a um existente). Devolve {jogo, idx} ou {erro}
  function montarJogo(st, t, ids, idx, tipo) {
    const cfg = st.cfg;
    if (idx !== undefined && idx !== null && idx >= 0) {
      const j = st.jogos[t][idx];
      if (!j) return { erro: 'Esse jogo não existe.' };
      const a = analisarJogo(j.c.concat(ids), j.t, cfg);
      if (!a) return { erro: 'Essas cartas não encaixam nesse jogo.' };
      return { jogo: { t: j.t, c: a.ordem, w: a.coringa }, idx };
    }
    if (ids.length < 3) return { erro: 'Um jogo novo precisa de pelo menos 3 cartas.' };
    const a = analisarJogo(ids, tipo, cfg);
    if (!a) {
      const ehTrincaPossivel = analisarTrinca(ids);
      if (ehTrincaPossivel && !cfg.trincas) return { erro: 'Nesta variante não vale trinca: só sequências do mesmo naipe.' };
      return { erro: 'Isso não forma um jogo: use 3 ou mais cartas seguidas do mesmo naipe' + (cfg.trincas ? ' ou do mesmo valor' : '') + ', com no máximo 1 coringa.' };
    }
    return { jogo: { t: a.tipo, c: a.ordem, w: a.coringa }, idx: -1 };
  }

  // Confere se, depois de baixar, a mão que sobra deixa o jogador numa situação permitida
  function conferirSobra(st, s, sobra, jogosDepois) {
    const t = timeDe(st, s);
    if (sobra === 0) {
      if (mortoDisponivel(st, t)) return null;
      if (podeBater(st, t, jogosDepois)) return null;
      return 'Você não pode ficar sem cartas: para bater precisa ' + motivoNaoBate(st, t) + '.';
    }
    if (sobra === 1 && !mortoDisponivel(st, t) && !podeBater(st, t, jogosDepois)) {
      return 'Se baixar isso, sobra 1 carta e você não poderia descartar: para bater precisa ' + motivoNaoBate(st, t) + '.';
    }
    return null;
  }

  function aplicar(st, s, a) {
    if (!a || !a.t) return erro('Jogada inválida.');
    if (st.fase === 'fimMao' || st.fase === 'fimJogo') {
      if (a.t === 'proxima' && st.fase === 'fimMao') { novaMao(st); return { ok: true }; }
      return erro('A mão já terminou.');
    }
    if (s !== st.vez) return erro('Não é a sua vez.');
    const t = timeDe(st, s);
    const nome = st.jogadores[s].nome;
    const mao = st.maos[s];

    if (a.t === 'comprar') {
      if (st.fase !== 'comprar') return erro('Você já comprou nesta rodada.');
      if (!st.monte.length) {
        if (st.mortos.length) { st.monte = st.mortos.pop(); st.ultimo = { tipo: 'aviso', texto: 'O monte acabou: um morto virou monte.' }; }
        else { encerrarMao(st, null); return { ok: true, fim: true }; }
      }
      const c = st.monte.pop();
      mao.push(c);
      st.comprada = c;
      st.fase = 'jogar';
      st.ultimo = { tipo: 'comprar', s, texto: nome + ' comprou do monte.' };
      st.seq += 1;
      return { ok: true, carta: c };
    }

    if (a.t === 'lixo') {
      if (st.fase !== 'comprar') return erro('Você já comprou nesta rodada.');
      if (!st.lixo.length) return erro('O lixo está vazio.');
      if (st.cfg.lixo === 'aberto') {
        const n = st.lixo.length;
        st.maos[s] = mao.concat(st.lixo);
        st.lixo = [];
        st.comprada = null;
        st.fase = 'jogar';
        st.ultimo = { tipo: 'lixo', s, texto: nome + ' pegou o lixo (' + n + (n === 1 ? ' carta' : ' cartas') + ').' };
        st.seq += 1;
        return { ok: true };
      }
      // Lixo fechado: precisa usar a carta de cima num jogo na hora
      const topo = st.lixo[st.lixo.length - 1];
      const ids = (a.cartas || []).slice();
      const resto = tirar(mao, ids);
      if (!resto) return erro('Essas cartas não estão na sua mão.');
      const idx = a.jogo === undefined ? -1 : a.jogo;
      if (ehCoringa(topo) && idx >= 0) return erro('Coringa pego do lixo precisa ir num jogo novo.');
      const m = montarJogo(st, t, ids.concat([topo]), idx, a.tipo);
      if (m.erro) return erro(nomeCarta(topo) + ' do lixo não forma jogo assim: ele precisa entrar num jogo na hora.');
      const jogosDepois = st.jogos[t].slice();
      if (m.idx >= 0) jogosDepois[m.idx] = m.jogo; else jogosDepois.push(m.jogo);
      const novaMaoJ = resto.concat(st.lixo.slice(0, -1));
      const err = conferirSobra(st, s, novaMaoJ.length, jogosDepois);
      if (err) return erro(err);
      const n = st.lixo.length;
      st.jogos[t] = jogosDepois;
      st.maos[s] = novaMaoJ;
      st.lixo = [];
      st.comprada = null;
      st.fase = 'jogar';
      st.ultimo = { tipo: 'lixo', s, texto: nome + ' pegou o lixo (' + n + (n === 1 ? ' carta' : ' cartas') + ') usando ' + nomeCarta(topo) + '.' };
      st.seq += 1;
      return aposMaoVazia(st, s, 'Pegou o morto!');
    }

    if (a.t === 'baixar') {
      if (st.fase !== 'jogar') return erro('Compre uma carta primeiro (monte ou lixo).');
      const ids = (a.cartas || []).slice();
      if (!ids.length) return erro('Escolha as cartas para baixar.');
      const resto = tirar(mao, ids);
      if (!resto) return erro('Essas cartas não estão na sua mão.');
      const m = montarJogo(st, t, ids, a.jogo, a.tipo);
      if (m.erro) return erro(m.erro);
      const jogosDepois = st.jogos[t].slice();
      if (m.idx >= 0) jogosDepois[m.idx] = m.jogo; else jogosDepois.push(m.jogo);
      const err = conferirSobra(st, s, resto.length, jogosDepois);
      if (err) return erro(err);
      st.jogos[t] = jogosDepois;
      st.maos[s] = resto;
      const virou = m.jogo.c.length >= 7 && m.jogo.c.length - ids.length < 7;
      st.ultimo = { tipo: virou ? 'canastra' : 'baixar', s, texto: nome + (m.idx >= 0 ? ' encaixou ' : ' baixou ') + ids.map(nomeCarta).join(' ') + (virou ? ' — CANASTRA ' + (ehLimpa(m.jogo) ? 'LIMPA!' : 'SUJA!') : '.') };
      st.seq += 1;
      return aposMaoVazia(st, s, 'Pegou o morto!');
    }

    if (a.t === 'descartar') {
      if (st.fase !== 'jogar') return erro('Compre uma carta primeiro (monte ou lixo).');
      const resto = tirar(mao, [a.carta]);
      if (!resto) return erro('Essa carta não está na sua mão.');
      if (resto.length === 0) {
        if (mortoDisponivel(st, t)) {
          st.lixo.push(a.carta);
          st.maos[s] = st.mortos.shift();
          st.pegouMorto[t] = true;
          st.ultimo = { tipo: 'morto', s, texto: nome + ' descartou ' + nomeCarta(a.carta) + ' e pegou o morto.' };
          proximaVez(st);
          return { ok: true, morto: true };
        }
        if (!podeBater(st, t)) return erro('Você não pode descartar a última carta: para bater precisa ' + motivoNaoBate(st, t) + '.');
        st.lixo.push(a.carta);
        st.maos[s] = [];
        st.ultimo = { tipo: 'batida', s, texto: nome + ' bateu!' };
        encerrarMao(st, t);
        return { ok: true, fim: true };
      }
      st.maos[s] = resto;
      st.lixo.push(a.carta);
      st.ultimo = { tipo: 'descartar', s, carta: a.carta, texto: nome + ' descartou ' + nomeCarta(a.carta) + '.' };
      proximaVez(st);
      return { ok: true };
    }
    return erro('Jogada desconhecida.');
  }

  function aposMaoVazia(st, s, msg) {
    const t = timeDe(st, s);
    if (st.maos[s].length) return { ok: true };
    if (mortoDisponivel(st, t)) {
      st.maos[s] = st.mortos.shift();
      st.pegouMorto[t] = true;
      st.ultimo = { tipo: 'morto', s, texto: st.jogadores[s].nome + ' ficou sem cartas e pegou o morto. Continua jogando!' };
      st.seq += 1;
      return { ok: true, morto: true };
    }
    st.ultimo = { tipo: 'batida', s, texto: st.jogadores[s].nome + ' bateu!' };
    encerrarMao(st, t);
    return { ok: true, fim: true };
  }

  function proximaVez(st) {
    st.vez = (st.vez + 1) % st.n;
    st.fase = 'comprar';
    st.comprada = null;
    st.seq += 1;
    if (!st.monte.length && !st.mortos.length) encerrarMao(st, null);
  }

  function contarTime(st, t, bateu) {
    const r = { cartas: 0, limpas: 0, sujas: 0, reais: 0, bonus: 0, mao: 0, batida: 0, morto: 0, total: 0 };
    for (const j of st.jogos[t]) {
      for (const c of j.c) r.cartas += pontos(c);
      if (ehCanastra(j)) {
        if (ehLimpa(j)) {
          if (st.cfg.reais && j.c.length >= 14) { r.bonus += 1000; r.reais += 1; }
          else if (st.cfg.reais && j.c.length === 13) { r.bonus += 500; r.reais += 1; }
          else { r.bonus += 200; r.limpas += 1; }
        } else { r.bonus += 100; r.sujas += 1; }
      }
    }
    for (const s of parceiros(st, t)) for (const c of st.maos[s]) r.mao -= pontos(c);
    if (bateu) r.batida = 100;
    if (!st.pegouMorto[t]) r.morto = -100; // dupla que não pegou o morto perde 100
    r.total = r.cartas + r.bonus + r.mao + r.batida + r.morto;
    return r;
  }

  function encerrarMao(st, timeBateu) {
    const res = [contarTime(st, 0, timeBateu === 0), contarTime(st, 1, timeBateu === 1)];
    st.placar[0] += res[0].total;
    st.placar[1] += res[1].total;
    st.historico.push([res[0].total, res[1].total]);
    st.resultado = { times: res, bateu: timeBateu };
    const meta = st.cfg.meta;
    if ((st.placar[0] >= meta || st.placar[1] >= meta) && st.placar[0] !== st.placar[1]) {
      st.fase = 'fimJogo';
      st.resultado.vencedor = st.placar[0] > st.placar[1] ? 0 : 1;
    } else st.fase = 'fimMao';
    if (timeBateu === null) st.ultimo = { tipo: 'fim', texto: 'Acabaram as cartas do monte. Fim da mão!' };
    st.seq += 1;
  }

  function nomeTime(st, t) {
    if (st.n === 2) return st.jogadores[t].nome;
    return st.jogadores[t].nome + ' e ' + st.jogadores[t + 2].nome;
  }

  /* ---------- Ordenar a mão ---------- */
  function ordenarMao(ids, modo) {
    const ordNaipe = [0, 1, 3, 2]; // ♠ ♥ ♣ ♦ alterna cor
    return ids.slice().sort((a, b) => {
      const ca = carta(a), cb = carta(b);
      if (ca.cur !== cb.cur) return ca.cur ? 1 : -1;
      const da = ehDois(a), db = ehDois(b);
      if (modo !== 'valor' && da !== db) return da ? 1 : -1;
      if (modo === 'valor') return (ca.v - cb.v) || (ordNaipe.indexOf(ca.n) - ordNaipe.indexOf(cb.n)) || a - b;
      return (ordNaipe.indexOf(ca.n) - ordNaipe.indexOf(cb.n)) || (ca.v === 1 ? 14 : ca.v) - (cb.v === 1 ? 14 : cb.v) || a - b;
    });
  }

  const Motor = {
    NAIPES, carta, ehCuringao, ehDois, ehCoringa, valorDe, naipeDe, pontos, nomeCarta,
    VARIANTES, configPadrao, descreverConfig,
    analisarSequencia, analisarTrinca, analisarJogo, ehCanastra, ehLimpa,
    novoJogo, novaMao, aplicar, timeDe, parceiros, mortoDisponivel, podeBater, motivoNaoBate,
    temCanastraParaBater, contarTime, nomeTime, ordenarMao, embaralhar, montarJogo, conferirSobra,
  };
  G.BuracoMotor = Motor;
  if (typeof module !== 'undefined' && module.exports) module.exports = Motor;
})(typeof window !== 'undefined' ? window : globalThis);
