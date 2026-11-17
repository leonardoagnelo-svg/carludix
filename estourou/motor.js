/* Estourou! — CARLUDIX · motor (regras puras, estado em JSON)
   Baralho de 100 cartas:
     ids 0..78  → números (0 x1, 1 x1, 2 x2 … 12 x12)
     ids 79..84 → modificadores +2 +4 +6 +8 +10 x2
     ids 85..99 → ações: gelo, rajada, escudo, troca, espiar (3 de cada)              */
(function (G) {
  'use strict';
  const ACOES = ['gelo', 'rajada', 'escudo', 'troca', 'espiar'];
  const MODS = [2, 4, 6, 8, 10, 'x2'];
  const INFO_ACAO = {
    gelo: { nome: 'Gelo', ic: '❄️', txt: 'O alvo é obrigado a parar e fica com os pontos que já tem.' },
    rajada: { nome: 'Rajada', ic: '💨', txt: 'O alvo tem que puxar 3 cartas seguidas.' },
    escudo: { nome: 'Escudo', ic: '🛡️', txt: 'Guarde: anula um estouro. Só pode ter um.' },
    troca: { nome: 'Troca', ic: '🔄', txt: 'Troque uma carta de número sua por uma de outro jogador.' },
    espiar: { nome: 'Espiar', ic: '👁️', txt: 'Veja as próximas 3 cartas do baralho e devolva na ordem que quiser.' },
  };
  const BONUS_CHEIO = 15;
  const META_CHEIO = 7;

  const CARTAS = [];
  CARTAS.push({ t: 'n', v: 0 });
  for (let v = 1; v <= 12; v++) for (let k = 0; k < v; k++) CARTAS.push({ t: 'n', v });
  MODS.forEach(m => CARTAS.push({ t: 'm', v: m }));
  ACOES.forEach(a => { for (let k = 0; k < 3; k++) CARTAS.push({ t: 'a', a }); });
  const carta = id => CARTAS[id];

  function embaralhar(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  /* ---------- criação ---------- */
  // jogadores: [{nome, tipo:'humano'|'bot', uid?, avatar, nivel?}]
  function novaPartida(cfg, jogadores) {
    const st = {
      v: 1, cfg: { meta: (cfg && cfg.meta) || 200 },
      fase: 'jogo', rodada: 0, dealer: Math.floor(Math.random() * jogadores.length), vez: 0,
      baralho: embaralhar(CARTAS.map((_, i) => i)), descarte: [],
      jogadores: jogadores.map(j => Object.assign({}, j, { total: 0, nums: [], mods: [], escudo: null, estado: 'ativo', pts: 0 })),
      dist: [], rajada: null, fila: [], pend: null, seq: 0, ev: [], log: [], vencedores: null, ultimaRodada: null,
    };
    iniciarRodada(st);
    return st;
  }

  function iniciarRodada(st) {
    // cartas da mesa vão para o descarte (o baralho não é reembaralhado entre rodadas)
    st.jogadores.forEach(j => {
      st.descarte.push(...j.nums, ...j.mods);
      if (j.escudo != null) st.descarte.push(j.escudo);
      Object.assign(j, { nums: [], mods: [], escudo: null, estado: 'ativo', pts: 0, cheio: false, congelado: null, perdeu: 0 });
    });
    st.rodada++;
    st.fase = 'jogo';
    st.dealer = (st.dealer + 1) % st.jogadores.length;
    st.dist = ordemDesde(st, st.dealer);
    st.vez = st.dealer;
    st.rajada = null; st.fila = []; st.pend = null; st.ultimaRodada = null;
    st.ev = [];
    evento(st, { tipo: 'rodada', n: st.rodada, txt: `🃏 Rodada ${st.rodada}: cartas na mesa!` });
    avancar(st);
  }

  const ordemDesde = (st, i) => st.jogadores.map((_, k) => (i + k) % st.jogadores.length);
  const ativos = st => st.jogadores.map((j, i) => i).filter(i => st.jogadores[i].estado === 'ativo');
  const ehAtivo = (st, i) => st.jogadores[i] && st.jogadores[i].estado === 'ativo';

  function evento(st, e) {
    st.seq++;
    e.seq = st.seq;
    st.ev.push(e);
    if (st.ev.length > 40) st.ev.splice(0, st.ev.length - 40);
    if (e.txt) { st.log.push(e.txt); if (st.log.length > 30) st.log.splice(0, st.log.length - 30); }
  }

  function tirar(st) {
    if (!st.baralho.length) {
      if (!st.descarte.length) return null;
      st.baralho = embaralhar(st.descarte.splice(0));
      evento(st, { tipo: 'reembaralhou', txt: 'O baralho acabou: o descarte foi embaralhado.' });
    }
    return st.baralho.shift();
  }

  /* ---------- pontuação ---------- */
  function pontos(j) {
    if (j.estado === 'estourou') return 0;
    let s = j.nums.reduce((a, id) => a + carta(id).v, 0);
    let soma = 0;
    j.mods.forEach(id => { const v = carta(id).v; if (v === 'x2') s *= 2; });
    j.mods.forEach(id => { const v = carta(id).v; if (v !== 'x2') soma += v; });
    return s + soma + (j.cheio ? BONUS_CHEIO : 0);
  }
  function detalhar(j) {
    const base = j.nums.reduce((a, id) => a + carta(id).v, 0);
    const x2 = j.mods.some(id => carta(id).v === 'x2');
    const mais = j.mods.reduce((a, id) => a + (carta(id).v === 'x2' ? 0 : carta(id).v), 0);
    return { base, x2, mais, cheio: !!j.cheio, total: pontos(j) };
  }

  /* ---------- receber uma carta ---------- */
  // devolve true se a rodada acabou (Sete Cheio)
  function receber(st, i, id, origem) {
    const j = st.jogadores[i], c = carta(id);
    if (c.t === 'n') {
      if (j.nums.some(x => carta(x).v === c.v)) {
        if (j.escudo != null) {
          st.descarte.push(j.escudo, id);
          j.escudo = null;
          evento(st, { tipo: 'salvo', j: i, id, txt: `${j.nome} tirou outro ${c.v}, mas o Escudo salvou!` });
          return false;
        }
        j.perdeu = pontos(j);
        j.nums.push(id);
        j.estado = 'estourou';
        j.pts = 0;
        evento(st, { tipo: 'estourou', j: i, id, txt: `💥 ${j.nome} tirou outro ${c.v} e ESTOUROU!` });
        return false;
      }
      j.nums.push(id);
      evento(st, { tipo: 'carta', j: i, id, origem });
      j.pts = pontos(j);
      if (new Set(j.nums.map(x => carta(x).v)).size >= META_CHEIO) {
        j.cheio = true; j.estado = 'parou'; j.pts = pontos(j);
        evento(st, { tipo: 'cheio', j: i, txt: `🎉 ${j.nome} fez o SETE CHEIO! +${BONUS_CHEIO}` });
        return true;
      }
      return false;
    }
    if (c.t === 'm') {
      j.mods.push(id);
      j.pts = pontos(j);
      evento(st, { tipo: 'carta', j: i, id, origem });
      return false;
    }
    // ação
    evento(st, { tipo: 'acao', j: i, id, a: c.a, txt: `${j.nome} tirou ${INFO_ACAO[c.a].ic} ${INFO_ACAO[c.a].nome}.` });
    if (c.a === 'escudo') { resolverEscudo(st, i, id); return false; }
    st.fila.push({ de: i, id, a: c.a });
    return false;
  }

  function resolverEscudo(st, i, id) {
    const j = st.jogadores[i];
    if (j.escudo == null) { j.escudo = id; return; }
    const ops = ativos(st).filter(k => k !== i && st.jogadores[k].escudo == null);
    if (!ops.length) { st.descarte.push(id); evento(st, { tipo: 'info', txt: 'Ninguém podia receber o Escudo extra: ele foi descartado.' }); return; }
    if (ops.length === 1) { darEscudo(st, i, ops[0], id); return; }
    st.fila.unshift({ de: i, id, a: 'escudoDar' });
  }
  function darEscudo(st, de, para, id) {
    st.jogadores[para].escudo = id;
    evento(st, { tipo: 'deuEscudo', j: para, de, id, txt: `${st.jogadores[de].nome} já tinha Escudo e deu um para ${st.jogadores[para].nome}.` });
  }

  /* ---------- opções de alvo de cada ação ---------- */
  function alvosDe(st, item) {
    const at = ativos(st);
    const i = item.de;
    if (item.a === 'gelo' || item.a === 'rajada') return at; // inclui a si mesmo (se ativo)
    if (item.a === 'escudoDar') return at.filter(k => k !== i && st.jogadores[k].escudo == null);
    if (item.a === 'troca') {
      if (!ehAtivo(st, i) || !st.jogadores[i].nums.length) return [];
      return at.filter(k => k !== i && st.jogadores[k].nums.length);
    }
    return [];
  }

  /* ---------- laço principal: roda até precisar de uma decisão ---------- */
  function avancar(st) {
    for (let guarda = 0; guarda < 500; guarda++) {
      if (st.pend || st.fase !== 'jogo') return;
      // 1) ações pendentes na fila
      if (st.fila.length && !(st.rajada && st.rajada.faltam > 0)) {
        const item = st.fila[0];
        if (item.a === 'espiar') {
          st.fila.shift();
          if (!ehAtivo(st, item.de)) { st.descarte.push(item.id); continue; }
          garantirBaralho(st, 3);
          const topo = st.baralho.slice(0, 3);
          if (!topo.length) { st.descarte.push(item.id); continue; }
          st.pend = { tipo: 'espiar', de: item.de, id: item.id, cartas: topo };
          return;
        }
        // quem estourou (ou fechou) antes de usar a ação perde a carta
        if (item.a !== 'escudoDar' && !ehAtivo(st, item.de)) { st.fila.shift(); st.descarte.push(item.id); continue; }
        const ops = alvosDe(st, item);
        if (!ops.length) {
          st.fila.shift();
          st.descarte.push(item.id);
          if (item.a !== 'escudoDar') evento(st, { tipo: 'info', txt: `${INFO_ACAO[item.a].nome} sem alvo possível: descartada.` });
          continue;
        }
        if (item.a === 'escudoDar' && ops.length === 1) { st.fila.shift(); darEscudo(st, item.de, ops[0], item.id); continue; }
        if ((item.a === 'gelo' || item.a === 'rajada') && ops.length === 1) { st.fila.shift(); if (aplicarAlvo(st, item, ops[0], true)) return fimRodada(st); continue; }
        st.pend = { tipo: item.a === 'troca' ? 'troca' : 'alvo', a: item.a, de: item.de, id: item.id, ops };
        return;
      }
      // 2) Rajada em andamento
      if (st.rajada && st.rajada.faltam > 0) {
        const r = st.rajada;
        if (!ehAtivo(st, r.alvo)) { st.rajada = null; continue; }
        const id = tirar(st);
        if (id == null) { st.rajada = null; continue; }
        r.faltam--;
        if (receber(st, r.alvo, id, 'rajada')) return fimRodada(st);
        if (r.faltam <= 0 || !ehAtivo(st, r.alvo)) st.rajada = null;
        continue;
      }
      // 3) distribuição inicial
      if (st.dist.length) {
        const i = st.dist.shift();
        if (!ehAtivo(st, i)) continue;
        const id = tirar(st);
        if (id == null) { st.dist = []; continue; }
        if (receber(st, i, id, 'dist')) return fimRodada(st);
        continue;
      }
      // 4) fim de rodada?
      const at = ativos(st);
      if (!at.length) return fimRodada(st);
      // 5) vez de alguém decidir
      if (!ehAtivo(st, st.vez)) st.vez = proximoAtivo(st, st.vez);
      st.pend = { tipo: 'vez', de: st.vez };
      return;
    }
  }

  function garantirBaralho(st, n) {
    if (st.baralho.length >= n || !st.descarte.length) return;
    const resto = st.baralho.splice(0);
    st.baralho = resto.concat(embaralhar(st.descarte.splice(0)));
    evento(st, { tipo: 'reembaralhou', txt: 'O descarte foi embaralhado para completar o baralho.' });
  }

  function proximoAtivo(st, i) {
    const n = st.jogadores.length;
    for (let k = 1; k <= n; k++) { const x = (i + k) % n; if (ehAtivo(st, x)) return x; }
    return i;
  }

  // aplica Gelo/Rajada no alvo; devolve true se a rodada acabou
  function aplicarAlvo(st, item, alvo, auto) {
    const de = st.jogadores[item.de], j = st.jogadores[alvo];
    st.descarte.push(item.id);
    if (item.a === 'gelo') {
      j.estado = 'parou'; j.pts = pontos(j); j.congelado = alvo === item.de ? (auto ? 'auto' : 'si') : de.nome;
      evento(st, { tipo: 'gelo', j: alvo, de: item.de, txt: alvo === item.de ? (auto ? `❄️ Só sobrou ${de.nome} na rodada: o Gelo o fez parar com ${j.pts}.` : `❄️ ${de.nome} usou o Gelo em si mesmo e parou com ${j.pts}.`) : `❄️ ${de.nome} congelou ${j.nome} com ${j.pts} pontos.` });
    } else if (item.a === 'rajada') {
      evento(st, { tipo: 'rajada', j: alvo, de: item.de, txt: alvo === item.de ? (auto ? `💨 Só sobrou ${de.nome}: a Rajada o faz puxar 3 cartas!` : `💨 ${de.nome} usou a Rajada em si mesmo!`) : `💨 ${de.nome} mandou ${j.nome} puxar 3 cartas!` });
      st.rajada = { alvo, faltam: 3 };
    }
    return false;
  }

  function fimRodada(st) {
    st.fila.forEach(item => st.descarte.push(item.id));
    if (st.pend && st.pend.id != null) st.descarte.push(st.pend.id);
    st.pend = null; st.fila = []; st.rajada = null; st.dist = [];
    // quem ainda estava ativo fica com os pontos
    st.jogadores.forEach(j => { if (j.estado === 'ativo') j.estado = 'parou'; j.pts = pontos(j); });
    const res = st.jogadores.map(j => ({ pts: j.pts, estado: j.estado, cheio: !!j.cheio, det: detalhar(j) }));
    st.jogadores.forEach(j => { j.total += j.pts; });
    st.ultimaRodada = res;
    const max = Math.max(...st.jogadores.map(j => j.total));
    if (max >= st.cfg.meta) {
      const lideres = st.jogadores.map((j, i) => i).filter(i => st.jogadores[i].total === max);
      if (lideres.length === 1) {
        st.fase = 'fimJogo'; st.vencedores = lideres;
        evento(st, { tipo: 'fimJogo', j: lideres[0], txt: `🏆 ${st.jogadores[lideres[0]].nome} venceu com ${max} pontos!` });
        return;
      }
      evento(st, { tipo: 'info', txt: 'Empate na liderança: mais uma rodada para desempatar!' });
    }
    st.fase = 'fimRodada';
    evento(st, { tipo: 'fimRodada', n: st.rodada });
  }

  /* ---------- jogadas ---------- */
  // a: {a:'puxar'|'parar'|'alvo'|'troca'|'espiar'|'proxima', ...}; quem: índice do jogador
  // devolve null se ok, ou texto de erro
  function jogar(st, quem, a) {
    if (!a || !a.a) return 'Jogada inválida.';
    if (a.a === 'proxima') {
      if (st.fase !== 'fimRodada') return 'A rodada ainda não acabou.';
      iniciarRodada(st);
      return null;
    }
    if (st.fase !== 'jogo' || !st.pend) return 'Agora não é hora de jogar.';
    const p = st.pend;
    if (p.de !== quem) return 'Não é a sua vez.';
    if (p.tipo === 'vez') {
      if (a.a === 'parar') {
        const j = st.jogadores[quem];
        j.estado = 'parou'; j.pts = pontos(j);
        st.pend = null;
        evento(st, { tipo: 'parou', j: quem, txt: `✋ ${j.nome} parou com ${j.pts} pontos.` });
        st.vez = proximoAtivo(st, quem);
        avancar(st);
        return null;
      }
      if (a.a === 'puxar') {
        st.pend = null;
        const id = tirar(st);
        if (id == null) { st.jogadores[quem].estado = 'parou'; avancar(st); return null; }
        if (receber(st, quem, id, 'vez')) { fimRodada(st); return null; }
        st.vez = proximoAtivo(st, quem);
        avancar(st);
        return null;
      }
      return 'Escolha puxar ou parar.';
    }
    if (p.tipo === 'alvo') {
      if (a.a !== 'alvo' || !p.ops.includes(a.i)) return 'Escolha um alvo válido.';
      const item = st.fila.shift();
      st.pend = null;
      if (item.a === 'escudoDar') darEscudo(st, item.de, a.i, item.id);
      else aplicarAlvo(st, item, a.i);
      avancar(st);
      return null;
    }
    if (p.tipo === 'troca') {
      if (a.a !== 'troca') return 'Escolha as cartas da troca.';
      if (!p.ops.includes(a.i)) return 'Escolha um jogador válido.';
      const eu = st.jogadores[quem], ele = st.jogadores[a.i];
      if (!eu.nums.includes(a.minha) || !ele.nums.includes(a.dele)) return 'Escolha uma carta sua e uma dele.';
      const item = st.fila.shift();
      st.pend = null;
      st.descarte.push(item.id);
      eu.nums.splice(eu.nums.indexOf(a.minha), 1);
      ele.nums.splice(ele.nums.indexOf(a.dele), 1);
      eu.pts = pontos(eu); ele.pts = pontos(ele);
      evento(st, { tipo: 'troca', j: quem, alvo: a.i, txt: `🔄 ${eu.nome} trocou o ${carta(a.minha).v} pelo ${carta(a.dele).v} de ${ele.nome}.` });
      // cada um recebe a carta nova (pode estourar, ser salvo pelo Escudo ou fechar o Sete Cheio)
      let acabou = receber(st, quem, a.dele, 'troca');
      if (!acabou) acabou = receber(st, a.i, a.minha, 'troca');
      if (acabou) { fimRodada(st); return null; }
      avancar(st);
      return null;
    }
    if (p.tipo === 'espiar') {
      if (a.a !== 'espiar') return 'Escolha a ordem das cartas.';
      const ordem = a.ordem || p.cartas;
      if (ordem.length !== p.cartas.length || ordem.slice().sort((x, y) => x - y).join() !== p.cartas.slice().sort((x, y) => x - y).join()) return 'Ordem inválida.';
      st.baralho.splice(0, p.cartas.length, ...ordem);
      st.descarte.push(p.id);
      st.pend = null;
      evento(st, { tipo: 'espiou', j: quem, txt: `👁️ ${st.jogadores[quem].nome} espiou as próximas cartas.` });
      avancar(st);
      return null;
    }
    return 'Jogada inválida.';
  }

  // probabilidade de estourar na próxima carta (contando só o que está no baralho agora)
  function riscoEstouro(st, i) {
    const j = st.jogadores[i];
    const tenho = new Set(j.nums.map(x => carta(x).v));
    const fonte = st.baralho.length ? st.baralho : st.descarte;
    if (!fonte.length) return 0;
    let ruins = 0;
    fonte.forEach(id => { const c = carta(id); if (c.t === 'n' && tenho.has(c.v)) ruins++; });
    return ruins / fonte.length;
  }

  G.EstourouMotor = { CARTAS, ACOES, INFO_ACAO, BONUS_CHEIO, META_CHEIO, carta, novaPartida, iniciarRodada, jogar, pontos, detalhar, ativos, riscoEstouro, alvosDe };
})(typeof window !== 'undefined' ? window : globalThis);
