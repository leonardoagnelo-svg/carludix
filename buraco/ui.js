/* Buraco — CARLUDIX · telas */
(function () {
  'use strict';
  const M = window.BuracoMotor, B = window.BuracoBot, R = window.BuracoRede;
  const app = document.getElementById('app');
  const URL_UNIVERSO = 'https://carludix.com/cartas/';
  const URL_SUG = 'https://carludix.com/contato/?jogo=Buraco';
  const NOMES_BOT = ['Bia', 'Duda', 'Tonho', 'Lia', 'Caco', 'Nina', 'Juca', 'Rosa', 'Teco', 'Mel'];
  const VALORES = ['★', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  const store = {
    get(k, d) { try { const v = localStorage.getItem('buraco:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('buraco:' + k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem('buraco:' + k); } catch (e) {} },
  };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = s => app.querySelector(s);

  let P = null;           // partida aberta
  let limpeza = [];       // ouvintes da tela atual
  function limpar() { limpeza.forEach(f => { try { f(); } catch (e) {} }); limpeza = []; }
  function tela(html) { limpar(); fecharVeu(); document.body.classList.remove('em-jogo'); app.innerHTML = html; window.scrollTo(0, 0); }

  let toastT = null;
  function toast(msg, tipo) {
    document.querySelectorAll('.toast').forEach(t => t.remove());
    const d = document.createElement('div');
    d.className = 'toast' + (tipo ? ' ' + tipo : '');
    d.textContent = msg;
    document.body.appendChild(d);
    clearTimeout(toastT);
    toastT = setTimeout(() => d.remove(), tipo === 'festa' ? 1900 : tipo === 'erro' ? 2600 : 2200);
  }
  function veu(html, aoFechar) {
    fecharVeu();
    const d = document.createElement('div');
    d.className = 'veu'; d.id = 'veu';
    d.innerHTML = html;
    document.body.appendChild(d);
    if (aoFechar) d.addEventListener('click', e => { if (e.target === d) { fecharVeu(); aoFechar(); } });
    return d;
  }
  function fecharVeu() { const v = document.getElementById('veu'); if (v) v.remove(); }

  function rodape() {
    return `<div class="cdx"><a href="${URL_UNIVERSO}">← CARLUDIX</a><a href="https://carludix.com/privacidade/">Privacidade</a><a href="${URL_SUG}" target="_blank" rel="noopener">💡 Enviar sugestão</a></div>`;
  }
  const logoHTML = `<img class="logo" src="logo.png" alt="Buraco" onerror="this.outerHTML='<div class=&quot;logo-txt&quot;>Buraco</div>'">`;

  function cartaHTML(id, cls, selo) {
    cls = cls || '';
    const sl = selo ? `<b class="selo-cor">${selo}</b>` : '';
    if (id === null || id === undefined) return `<div class="carta verso ${cls}"></div>`;
    const c = M.carta(id);
    if (c.cur) return `<div class="carta cur ${cls}" data-id="${id}"><span class="v">★</span><span class="g">★</span><span class="nn">CURINGÃO</span>${sl}</div>`;
    const red = c.n === 1 || c.n === 2;
    return `<div class="carta np${c.n} ${red ? 'verm' : ''} ${cls}" data-id="${id}"><span class="v">${VALORES[c.v]}</span><span class="n">${M.NAIPES[c.n]}</span><span class="g">${M.NAIPES[c.n]}</span>${sl}</div>`;
  }

  /* =================== INÍCIO =================== */
  const svgOuro = d => `<svg class="ic-ouro" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICONE_MENU = {
    continuar: svgOuro('<path d="M8 5l11 7-11 7z"/>'),
    bots: svgOuro('<rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01M9 16h6"/><circle cx="12" cy="3.5" r="1"/>'),
    online: svgOuro('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>'),
    local: svgOuro('<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>'),
    regras: svgOuro('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M9 8h7M9 11h5"/>'),
  };
  function telaInicio() {
    P = null;
    const salvo = store.get('salvo', null);
    tela(`<div class="inicio">
      ${logoHTML}
      <div class="menu">
        ${salvo ? `<button class="btn ouro grande" data-a="continuar">${ICONE_MENU.continuar} Continuar partida</button>` : ''}
        <button class="btn verm grande" data-a="bots">${ICONE_MENU.bots} Contra o computador</button>
        <button class="btn" data-a="online">${ICONE_MENU.online} Jogar online</button>
        <button class="btn" data-a="local">${ICONE_MENU.local} No mesmo aparelho</button>
        <button class="btn claro" data-a="regras">${ICONE_MENU.regras} Como jogar</button>
      </div>
      ${rodape()}
    </div>`);
    app.onclick = e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      const a = b.dataset.a;
      if (a === 'continuar') continuarSalvo();
      if (a === 'bots') telaConfig('bots');
      if (a === 'local') telaConfig('local');
      if (a === 'online') pedirPerfil(() => telaSalas());
      if (a === 'regras') mostrarRegras();
    };
  }

  /* =================== CONFIGURAR =================== */
  function telaConfig(modo) {
    const salvo = store.get('cfg', {});
    const C = Object.assign({ variante: 'fechado', n: 4, meta: 1500, fim: 'pontos', maos: 3, nivel: 'medio', publica: true, velocidade: store.get('velocidade', 'normal') }, salvo);
    const base = M.configPadrao(C.variante);
    ['lixo', 'trincas', 'batida', 'curingoes'].forEach(k => { if (C[k] === undefined) C[k] = base[k]; });
    let assentos = store.get('assentos', null) || [
      { nome: 'Jogador 1', tipo: 'humano' }, { nome: 'Jogador 2', tipo: 'humano' }, { nome: 'Jogador 3', tipo: 'bot' }, { nome: 'Jogador 4', tipo: 'bot' }];
    const meuNome = store.get('nome', '') || ((perfil() || {}).apelido || '');

    const op = (campo, valor, rot, sub) => `<button class="opcao ${C[campo] === valor ? 'on' : ''}" data-c="${campo}" data-v="${esc(JSON.stringify(valor))}">${rot}${sub ? '<small>' + sub + '</small>' : ''}</button>`;
    function desenhar() {
      const titulo = modo === 'bots' ? 'Contra o computador' : modo === 'local' ? 'No mesmo aparelho' : 'Criar sala';
      const lugares = [];
      if (modo === 'local') {
        for (let i = 0; i < C.n; i++) {
          const a = assentos[i];
          lugares.push(`<div class="linha" style="margin-bottom:8px">
            <span style="width:62px;font-size:12px;color:var(--dim)">${C.n === 4 ? (i % 2 === 0 ? 'Dupla A' : 'Dupla B') : 'Jogador ' + (i + 1)}</span>
            <input class="txt" style="flex:1;padding:9px 10px" data-nome="${i}" maxlength="12" value="${esc(a.nome)}">
            <button class="opcao ${a.tipo === 'bot' ? 'on' : ''}" style="flex:none;min-width:0" data-tipo="${i}">${a.tipo === 'bot' ? '🤖 Bot' : '👤 Pessoa'}</button>
          </div>`);
        }
      }
      tela(`<button class="voltar" data-a="voltar">← Voltar</button>
      <div class="painel" style="max-width:560px;margin:0 auto">
        <h2 class="titulo centro">${titulo}</h2>
        ${modo === 'bots' ? `<label class="rot">Seu nome</label><input class="txt" id="meunome" maxlength="14" value="${esc(meuNome)}" placeholder="Seu nome">` : ''}
        <label class="rot">Formato</label>
        <div class="opcoes">${op('n', 2, '1 x 1', 'mano a mano')}${op('n', 4, 'Duplas', '2 x 2')}</div>
        <label class="rot">Variante</label>
        <div class="opcoes">${op('variante', 'fechado', 'Fechado', 'lixo fechado, vale trinca')}${op('variante', 'aberto', 'Aberto', 'pega o lixo inteiro')}${op('variante', 'stbl', 'STBL', 'sem trinca, bate limpo')}</div>
        <label class="rot">Como a partida termina</label>
        <div class="opcoes">${op('fim', 'pontos', 'Por pontos', 'quem chegar primeiro')}${op('fim', 'maos', 'Por mãos', 'número fixo de mãos')}</div>
        ${C.fim === 'maos' ? `<label class="rot">Quantas mãos</label>
        <div class="opcoes">${op('maos', 1, '1 mão')}${op('maos', 3, '3 mãos')}${op('maos', 5, '5 mãos')}</div>`
        : `<label class="rot">Pontos para vencer</label>
        <div class="opcoes">${op('meta', 1500, '1.500')}${op('meta', 2000, '2.000')}${op('meta', 3000, '3.000')}</div>`}
        ${modo === 'bots' || modo === 'local' ? `<label class="rot">Dificuldade dos bots</label>
        <div class="opcoes">${op('nivel', 'facil', 'Fácil')}${op('nivel', 'medio', 'Médio')}${op('nivel', 'dificil', 'Difícil')}</div>` : ''}
        ${modo !== 'criar' ? `<label class="rot">Velocidade dos bots</label>
        <div class="opcoes">${op('velocidade', 'lenta', 'Lenta')}${op('velocidade', 'normal', 'Normal')}${op('velocidade', 'rapida', 'Rápida')}</div>` : ''}
        ${modo === 'local' ? `<label class="rot">Jogadores</label>${lugares.join('')}<p class="nota">Nas duplas, quem está na Dupla A joga junto. Na vez de cada pessoa, o jogo pede para passar o aparelho.</p>` : ''}
        ${modo === 'criar' ? `<label class="rot">Quem pode entrar</label>
        <div class="opcoes">${op('publica', true, 'Pública', 'aparece na lista de salas')}${op('publica', false, 'Privada', 'só com o código')}</div>` : ''}
        <details class="avanc"><summary>Regras da mesa (avançado)</summary>
          <label class="rot">Lixo</label>
          <div class="opcoes">${op('lixo', 'fechado', 'Fechado', 'só a carta de cima')}${op('lixo', 'aberto', 'Aberto', 'pega tudo à vontade')}</div>
          <label class="rot">Trincas (cartas do mesmo valor)</label>
          <div class="opcoes">${op('trincas', true, 'Valem')}${op('trincas', false, 'Não valem')}</div>
          <label class="rot">Para bater precisa de</label>
          <div class="opcoes">${op('batida', 'limpa', 'Canastra limpa')}${op('batida', 'qualquer', 'Qualquer canastra')}</div>
          <label class="rot">Curingões (jokers)</label>
          <div class="opcoes">${op('curingoes', true, 'Com', '108 cartas')}${op('curingoes', false, 'Sem', '104 cartas')}</div>
        </details>
        <div style="margin-top:18px"><button class="btn ouro grande larg" data-a="ir">${modo === 'criar' ? '➕ Criar sala' : 'Começar'}</button></div>
      </div>`);
    }
    desenhar();
    app.onclick = e => {
      const o = e.target.closest('[data-c]');
      if (o) {
        lerCampos();
        const campo = o.dataset.c, v = JSON.parse(o.dataset.v);
        C[campo] = v;
        if (campo === 'variante') { const b2 = M.configPadrao(v); ['lixo', 'trincas', 'batida', 'curingoes'].forEach(k => { C[k] = b2[k]; }); }
        const aberto = app.querySelector('details.avanc') && app.querySelector('details.avanc').open;
        desenhar();
        if (aberto) app.querySelector('details.avanc').open = true;
        return;
      }
      const t = e.target.closest('[data-tipo]');
      if (t) { lerCampos(); const i = +t.dataset.tipo; assentos[i].tipo = assentos[i].tipo === 'bot' ? 'humano' : 'bot'; desenhar(); return; }
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'voltar') return modo === 'criar' ? telaSalas() : telaInicio();
      if (b.dataset.a === 'ir') ir();
    };
    function lerCampos() {
      const mn = $('#meunome'); if (mn && mn.value.trim()) store.set('nome', mn.value.trim());
      app.querySelectorAll('[data-nome]').forEach(inp => { assentos[+inp.dataset.nome].nome = inp.value.trim() || ('Jogador ' + (+inp.dataset.nome + 1)); });
    }
    function ir() {
      lerCampos();
      const nome = store.get('nome', '') || 'Você';
      store.set('cfg', C);
      store.set('velocidade', C.velocidade || 'normal');
      const cfg = { variante: C.variante, lixo: C.lixo, trincas: C.trincas, batida: C.batida, meta: C.meta, fim: C.fim || 'pontos', maos: C.maos || 3, curingoes: C.curingoes, reais: true };
      if (modo === 'bots') {
        const nomes = M.embaralhar(NOMES_BOT.slice());
        const jog = [{ nome, tipo: 'humano' }];
        for (let i = 1; i < C.n; i++) jog.push({ nome: nomes[i], tipo: 'bot', nivel: C.nivel });
        iniciarLocal('bots', M.novoJogo(cfg, jog));
      } else if (modo === 'local') {
        store.set('assentos', assentos);
        const jog = assentos.slice(0, C.n).map(a => ({ nome: a.nome, tipo: a.tipo, nivel: C.nivel }));
        if (!jog.some(j => j.tipo === 'humano')) { toast('Coloque pelo menos uma pessoa na mesa'); return; }
        iniciarLocal('local', M.novoJogo(cfg, jog));
      } else {
        criarSalaOnline({ cfg, n: C.n, publica: C.publica });
      }
    }
  }

  /* =================== PARTIDA LOCAL =================== */
  function humanos(st) { return st.jogadores.map((j, i) => j.tipo === 'humano' ? i : -1).filter(i => i >= 0); }
  function iniciarLocal(modo, st, eu) {
    const hs = humanos(st);
    P = novaPartida(modo, st, eu !== undefined ? eu : (hs.length ? hs[0] : 0));
    if (modo === 'local' && hs.length > 1 && hs.includes(st.vez)) { P.eu = st.vez; P.passando = st.vez; }
    telaJogo();
    salvar();
    agendar();
  }
  function continuarSalvo() {
    const s = store.get('salvo', null);
    if (!s || !s.st) { telaInicio(); return; }
    iniciarLocal(s.modo, s.st, s.eu);
  }
  function salvar() {
    if (!P || P.modo === 'online') return;
    if (P.st.fase === 'fimJogo') store.del('salvo');
    else store.set('salvo', { modo: P.modo, st: P.st, eu: P.eu });
  }
  function novaPartida(modo, st, eu) {
    return { modo, st, eu, sel: [], ordem: store.get('ordem', 'naipe'), timer: null, passando: null, seqVisto: st.seq, ocupado: false, verMesa: false, mesa: null };
  }

  /* =================== TELA DO JOGO =================== */
  function telaJogo() {
    limpar(); fecharVeu();
    app.innerHTML = '<div class="jogo" id="jogo"></div>';
    document.body.classList.add('em-jogo');
    app.onclick = cliqueJogo;
    const onR = () => P && desenharJogo();
    let arr = null;
    const marcarCarta = (el, id, marcar) => {
      if (marcar && !P.sel.includes(id)) P.sel.push(id);
      if (!marcar) P.sel = P.sel.filter(x => x !== id);
      el.classList.toggle('sel', marcar);
    };
    const pdown = e => {
      const c = e.target.closest && e.target.closest('.mao2 .carta');
      if (!c || !P || P.passando !== null || c.dataset.id === undefined) return;
      const id = +c.dataset.id;
      arr = { marcar: !P.sel.includes(id), vistos: new Set([id]) };
      P.dica = null; P.confirmarLixo = false;
      marcarCarta(c, id, arr.marcar);
      P.ultimoToque = Date.now();
    };
    const pmove = e => {
      if (!arr) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const c = el && el.closest('.mao2 .carta');
      if (!c || c.dataset.id === undefined) return;
      const id = +c.dataset.id;
      if (arr.vistos.has(id)) return;
      arr.vistos.add(id);
      marcarCarta(c, id, arr.marcar);
    };
    const pup = () => { if (!arr) return; arr = null; P.ultimoToque = Date.now(); desenharJogo(); };
    app.addEventListener('pointerdown', pdown);
    window.addEventListener('pointermove', pmove);
    window.addEventListener('pointerup', pup);
    window.addEventListener('pointercancel', pup);
    limpeza.push(() => { app.removeEventListener('pointerdown', pdown); window.removeEventListener('pointermove', pmove); window.removeEventListener('pointerup', pup); window.removeEventListener('pointercancel', pup); });
    window.addEventListener('resize', onR);
    limpeza.push(() => window.removeEventListener('resize', onR));
    desenharJogo();
  }

  function minhaVez() {
    if (!P) return false;
    const st = P.st;
    return st.vez === P.eu && st.jogadores[P.eu].tipo === 'humano' && P.passando === null && !P.ocupado && (st.fase === 'comprar' || st.fase === 'jogar');
  }
  function ausente(s) {
    if (!P || P.modo !== 'online') return false;
    const j = P.st.jogadores[s];
    return j.tipo === 'humano' && j.uid && !P.mesa.presente(j.uid);
  }

  /* ---------- sons curtinhos (Web Audio, sem arquivos) ---------- */
  let audioCtx = null;
  function som(tipo) {
    if (!store.get('som', true)) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtx, t0 = ctx.currentTime;
      const nota = (f, ini, dur, vol, forma) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = forma || 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0, t0 + ini); g.gain.linearRampToValueAtTime(vol, t0 + ini + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + ini + dur);
        o.connect(g); g.connect(ctx.destination); o.start(t0 + ini); o.stop(t0 + ini + dur + 0.05);
      };
      const ruido = (ini, dur, vol) => {
        const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate), d = b.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
        const s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
        f.type = 'highpass'; f.frequency.value = 1800; g.gain.value = vol;
        s.buffer = b; s.connect(f); f.connect(g); g.connect(ctx.destination); s.start(t0 + ini);
      };
      if (tipo === 'carta') ruido(0, 0.09, 0.25);
      if (tipo === 'baixar') { ruido(0, 0.08, 0.2); ruido(0.07, 0.08, 0.2); }
      if (tipo === 'vez') { nota(660, 0, 0.12, 0.12); nota(880, 0.1, 0.16, 0.12); }
      if (tipo === 'canastra') [523, 659, 784, 1047].forEach((f, i) => nota(f, i * 0.09, 0.25, 0.14));
      if (tipo === 'morto') { nota(392, 0, 0.2, 0.12, 'sine'); nota(523, 0.15, 0.3, 0.12, 'sine'); }
      if (tipo === 'erro') nota(180, 0, 0.18, 0.1, 'square');
      if (tipo === 'fim') [523, 659, 784, 659, 1047].forEach((f, i) => nota(f, i * 0.12, 0.3, 0.14));
    } catch (e) {}
  }

  /* ---------- desenho da mesa ---------- */
  const svg = d => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICONE = {
    comprar: svg('<rect x="4" y="3" width="11" height="16" rx="2"/><path d="M19 9v8M15 13h8"/>'),
    lixo: svg('<rect x="7" y="2" width="10" height="13" rx="2"/><path d="M3 15l4 5h10l4-5"/><path d="M12 6v6"/>'),
    baixar: svg('<path d="M12 3v11M7 9l5 5 5-5"/><path d="M4 17v3h16v-3"/>'),
    descartar: svg('<rect x="3" y="6" width="10" height="14" rx="2"/><path d="M15 9h6M18 6l3 3-3 3"/>'),
  };
  function avatarDe(st, s) {
    const j = st.jogadores[s];
    if (j.tipo === 'bot') { let h = 0; for (const ch of String(j.nome)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return AVATARES[h % 16]; }
    return j.avatar || (j.nome || '?').trim().charAt(0).toUpperCase();
  }
  function rotuloJogo(j) {
    if (!M.ehCanastra(j)) return { txt: 'Jogo', cls: '' };
    if (M.ehLimpa(j)) return j.c.length >= 13 ? { txt: '👑 Canastra real', cls: 'real' } : { txt: '👑 Canastra limpa', cls: 'limpa' };
    return { txt: 'Canastra suja', cls: 'suja' };
  }
  function registrarAcao(st, u) {
    if (!u || !u.texto) return;
    P.historico = P.historico || [];
    if (P.historico[0] !== u.texto) { P.historico.unshift(u.texto); P.historico.length = Math.min(P.historico.length, 30); }
    if (u.s === undefined) { if (u.tipo === 'inicio') P.falas = {}; return; }
    P.falas = P.falas || {};
    const f = P.falas[u.s] = (u.tipo === 'comprar' || u.tipo === 'lixo') ? { itens: [] } : (P.falas[u.s] || { itens: [] });
    const it = { comprar: 'comprou', lixo: 'pegou o lixo', baixar: 'baixou', canastra: 'canastra!', morto: 'pegou o morto', batida: 'bateu!', descartar: 'descartou' }[u.tipo];
    if (!it) return;
    if (u.tipo === 'baixar' && f.itens[f.itens.length - 1] && f.itens[f.itens.length - 1].startsWith('baixou')) {
      const n = (+(f.itens[f.itens.length - 1].split('×')[1] || 1)) + 1; f.itens[f.itens.length - 1] = 'baixou ×' + n;
    } else f.itens.push(it);
    if (u.tipo === 'descartar') f.carta = u.carta;
  }
  function falaHTML(s) {
    const f = P.falas && P.falas[s]; if (!f || !f.itens.length) return '';
    return `<div class="fala">${esc(f.itens.join(' · '))}${f.carta !== undefined ? ' ' + cartaHTML(f.carta, 'mini') : ''}</div>`;
  }
  function valorDoCoringa(j) {
    if (j.w === null || j.w === undefined) return '';
    const NOME = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    if (j.t === 'trinca') { const nat = j.c.find(c => c !== j.w); return nat !== undefined ? '=' + NOME[M.valorDe(nat)] : ''; }
    const iw = j.c.indexOf(j.w);
    for (let i = 0; i < j.c.length; i++) {
      const c = j.c[i];
      if (c === j.w) continue;
      let v = M.valorDe(c);
      if (v === 1) v = i === 0 ? 1 : 14; // Ás no começo vale 1, no fim vale 14
      const alvo = v + (iw - i);
      if (alvo >= 1 && alvo <= 14) return '=' + NOME[alvo];
    }
    return '';
  }
  // carta voando de quem descartou até o lixo
  function animarDescarte(raiz, v) {
    try {
      if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const alvoEl = raiz.querySelector('.lixo2 .lixo-aberto .carta:last-child') || raiz.querySelector('.lixo2 .pilha-cartas > .carta:last-child');
      const origemEl = v.s === P.eu ? raiz.querySelector('.mao2') : raiz.querySelector('.assento[data-s="' + v.s + '"] .avatar');
      if (!alvoEl || !origemEl) return;
      const a = alvoEl.getBoundingClientRect(), o = origemEl.getBoundingClientRect();
      const d = document.createElement('div');
      d.className = 'voo';
      d.style.cssText = `left:${a.left}px;top:${a.top}px;width:${a.width}px;--cw:${a.width}px`;
      d.innerHTML = cartaHTML(v.carta);
      document.body.appendChild(d);
      alvoEl.style.visibility = 'hidden';
      const dx = (o.left + o.width / 2) - (a.left + a.width / 2), dy = (o.top + o.height / 2) - (a.top + a.height / 2);
      const an = d.animate([{ transform: `translate(${dx}px,${dy}px) scale(.6) rotate(-20deg)`, opacity: .6 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.2,.8,.3,1)' });
      an.onfinish = () => { d.remove(); alvoEl.style.visibility = ''; };
      setTimeout(() => { if (d.isConnected) { d.remove(); alvoEl.style.visibility = ''; } }, 900);
    } catch (e) {}
  }
  function pontosNaMesa(st, t) { return st.jogos[t].reduce((a, j) => a + j.c.reduce((b, c) => b + M.pontos(c), 0), 0); }

  function cartasQueCabem(st, t, sel) {
    // índices dos jogos da dupla onde as cartas escolhidas encaixam
    const r = [];
    st.jogos[t].forEach((j, i) => { if (M.analisarJogo(j.c.concat(sel), j.t, st.cfg)) r.push(i); });
    return r;
  }

  function desenharJogo() {
    const raiz = document.getElementById('jogo'); if (!raiz || !P) return;
    const st = P.st, n = st.n, eu = P.eu, meuT = eu % 2, advT = 1 - meuT;
    const mao = st.maos[eu] || [];
    P.sel = P.sel.filter(id => mao.includes(id));
    const vez = minhaVez();
    const fim = st.fase === 'fimMao' || st.fase === 'fimJogo';
    const ant = P.ant || {};

    // eventos novos: som, festa, falas e histórico
    if (st.seq !== P.seqVisto) {
      const u = st.ultimo || {};
      registrarAcao(st, u);
      if (u.tipo === 'descartar' || (u.tipo === 'morto' && u.texto.includes('descartou')) || u.tipo === 'batida') {
        const cartaVoo = st.lixo.length ? st.lixo[st.lixo.length - 1] : null;
        if (cartaVoo !== null && u.s !== undefined) P.voo = { s: u.s, carta: cartaVoo };
      }
      if (u.tipo === 'canastra') { toast('🎉 ' + (u.texto.split(' — ')[1] || 'Canastra!').replace('CANASTRA', 'Canastra').replace('LIMPA', 'limpa').replace('SUJA', 'suja') + ' · ' + st.jogadores[u.s].nome, 'festa'); som('canastra'); }
      else if (u.tipo === 'morto') { toast('💀 ' + u.texto, 'festa'); som('morto'); }
      else if (u.tipo === 'baixar') som('baixar');
      else if (u.tipo === 'comprar' || u.tipo === 'descartar' || u.tipo === 'lixo') som('carta');
      if (u.tipo === 'batida' || st.fase === 'fimJogo') som('fim');
      if (vez && !ant.vez) setTimeout(() => som('vez'), 250);
      P.seqVisto = st.seq;
    }

    const nomeT = t => n === 2 ? (t === meuT ? (P.modo === 'local' ? st.jogadores[t].nome : 'Você') : st.jogadores[t].nome) : (t === meuT ? 'Nós' : 'Eles');
    const canastras = t => st.jogos[t].filter(M.ehCanastra).length;

    // assentos dos outros
    const assento = (s, pos) => {
      const k = st.maos[s].length, ehVez = st.vez === s && !fim;
      const leque = Array.from({ length: Math.min(k, 9) }, (_, i) => `<i style="--i:${i - (Math.min(k, 9) - 1) / 2}"></i>`).join('');
      const sub = ausente(s) ? 'saiu · 🤖 no lugar' : ehVez ? (st.fase === 'comprar' ? 'vai comprar…' : 'jogando…') : '';
      return `<div data-s="${s}" class="assento ${pos} ${ehVez ? 'vez' : ''} ${s % 2 === meuT ? 'parc' : 'adv'} ${ausente(s) ? 'ausente' : ''}">
        <div class="leque-costas">${leque}</div>
        <div class="avatar">${esc(avatarDe(st, s))}${st.jogadores[s].tipo === 'bot' ? '<i class="selo-bot">🤖</i>' : ''}<b class="qt-cartas">${k}</b></div>
        <div class="nome-assento">${esc(st.jogadores[s].nome)}${s % 2 === meuT && n === 4 ? '<span class="chip-parc">parceiro</span>' : ''}</div>${sub ? `<div class="sub-assento">${sub}</div>` : (falaHTML(s) || '<div class="sub-assento">&nbsp;</div>')}</div>`;
    };
    // cada um numa ponta da mesa: adversários nas laterais, parceiro em cima (no 1x1 o adversário fica em cima)
    const assentosHTML = n === 2
      ? assento((eu + 1) % 2, 'topo')
      : assento((eu + 1) % 4, 'esq') + assento((eu + 2) % 4, 'topo') + assento((eu + 3) % 4, 'dir');

    // jogos
    const topo = st.lixo.length ? st.lixo[st.lixo.length - 1] : null;
    let cabe = [];
    if (vez && st.fase === 'jogar' && P.sel.length) cabe = cartasQueCabem(st, meuT, P.sel);
    else if (vez && st.fase === 'comprar' && st.cfg.lixo === 'fechado' && topo !== null && !M.ehCoringa(topo)) cabe = cartasQueCabem(st, meuT, P.sel.concat([topo]));
    if (P.dica && P.dica.jogo >= 0) cabe = [P.dica.jogo];
    const formaNovo = vez && st.fase === 'jogar' && P.sel.length >= 3 && !!M.analisarJogo(P.sel, null, st.cfg);
    const vagaNova = `<div class="vaga-nova" data-a="baixar-mesa">＋ Toque aqui para baixar</div>`;
    const jogosHTML = (t, meus) => {
      const js = st.jogos[t];
      if (!js.length) return meus && formaNovo ? vagaNova : `<div class="sem-jogos">${meus ? 'Nenhum jogo baixado ainda' : 'Nada baixado ainda'}</div>`;
      const antes = (ant.jogos || [[], []])[t] || [];
      return js.map((j, i) => {
        const r = rotuloJogo(j);
        const mudou = antes[i] !== j.c.length;
        const selo = valorDoCoringa(j);
        const compacto = (P.compacto || {})[t] && j.c.length >= 5;
        let cartasH;
        if (compacto) {
          const iw = j.w === null ? -1 : j.c.indexOf(j.w);
          const vis = new Set([0, j.c.length - 2, j.c.length - 1]); if (iw >= 0) vis.add(iw);
          cartasH = ''; let ultimo = -1;
          j.c.forEach((c, k) => { if (!vis.has(k)) return; if (ultimo >= 0 && k - ultimo > 1) cartasH += `<span class="reticencias">…</span>`; cartasH += cartaHTML(c, c === j.w ? 'coringa' : '', c === j.w ? selo : ''); ultimo = k; });
        } else cartasH = j.c.map(c => cartaHTML(c, c === j.w ? 'coringa' : '', c === j.w ? selo : '')).join('');
        return `<button class="jg ${r.cls} ${compacto ? 'compacto' : ''} ${meus && cabe.includes(i) ? 'cabe' : ''} ${mudou && ant.jogos ? 'brilha' : ''}" data-jogo="${i}">
          <span class="etq ${r.cls}">${r.txt}<em>${M.ehCanastra(j) ? j.c.length : j.c.length + '/7'}</em></span>
          <span class="cartas-jg">${cartasH}</span></button>`;
      }).join('') + (meus && formaNovo ? vagaNova : '');
    };

    // centro da mesa
    const podeComprar = vez && st.fase === 'comprar';
    const opcaoLixo = podeComprar && st.lixo.length ? (st.cfg.lixo === 'aberto' ? { t: 'lixo' } : B.opcaoLixo(st, eu)) : null;
    const podeLixo = !!opcaoLixo || (podeComprar && st.lixo.length > 0 && P.sel.length > 0);
    const podeDescartarNoLixo = vez && st.fase === 'jogar' && P.sel.length === 1;
    const mortoHTML = (t, rot) => {
      const pego = st.pegouMorto[t];
      const existe = !pego && st.mortos.length > 0;
      return `<div class="morto ${pego ? 'pego' : ''}" title="${esc(rot)}${pego ? ' (já pegou)' : ''}"><div class="pilha-cartas">${existe ? cartaHTML(null) + cartaHTML(null) : '<div class="vazio-l">✓</div>'}</div><span class="rotulo">${rot}</span></div>`;
    };
    const lixoTopoMudou = ant.lixoTopo !== topo;
    let lixoHTML;
    if (st.cfg.lixo === 'aberto' && st.lixo.length > 1) {
      lixoHTML = `<div class="lixo-aberto">${st.lixo.map((c, i) => cartaHTML(c, i === st.lixo.length - 1 && lixoTopoMudou ? 'cai' : '')).join('')}</div>`;
    } else lixoHTML = `<div class="pilha-cartas">${st.lixo.length > 1 ? cartaHTML(st.lixo[st.lixo.length - 2], 'baixo') : ''}${topo !== null ? cartaHTML(topo, lixoTopoMudou ? 'cai' : '') : '<div class="vazio-l"></div>'}</div>`;
    const rotMortoMeu = n === 2 ? (P.modo === 'local' ? st.jogadores[meuT].nome : 'Seu') : 'Nosso';
    const rotMortoDeles = n === 2 ? (P.modo === 'local' ? st.jogadores[advT].nome : 'Dele') : 'Deles';

    // faixa da vez
    let faixa, faixaCls = '';
    if (fim) faixa = 'Fim da mão';
    else if (P.ocupado) faixa = 'Enviando jogada…';
    else if (vez) { faixa = (n === 4 ? 'Nossa vez' : 'Sua vez') + (st.fase === 'comprar' ? ' · compre' : ' · jogue'); faixaCls = 'minha' + (st.fase === 'jogar' && M.podeBater(st, meuT) ? ' bate' : ''); if (st.fase === 'jogar' && M.podeBater(st, meuT)) faixa += ' · já pode bater!'; }
    else if (n === 4 && st.vez % 2 === meuT) faixa = 'Vez do parceiro · ' + esc(st.jogadores[st.vez].nome);
    else faixa = 'Vez de ' + esc(st.jogadores[st.vez].nome);

    // mão
    const ordem = M.ordenarMao(mao, P.ordem);
    const esconder = P.passando !== null;
    const antMao = ant.mao || [];
    if (vez) { P.novas = P.novas || []; if (ant.mao) mao.forEach(id => { if (!antMao.includes(id) && !P.novas.includes(id)) P.novas.push(id); }); } else P.novas = [];
    const dicaSel = P.dica ? P.dica.cartas || [] : [];
    const maoHTML = ordem.map(id => esconder ? cartaHTML(null) : cartaHTML(id, (P.sel.includes(id) ? 'sel ' : '') + (dicaSel.includes(id) ? 'sugerida ' : '') + ((P.novas || []).includes(id) || (id === st.comprada && st.vez === eu) ? 'nova ' : '') + (ant.mao && !antMao.includes(id) ? 'chega' : ''))).join('');

    // botões
    const k = P.sel.length;
    const emJogo = vez && st.fase === 'jogar';
    const podeBaixar = emJogo && k >= 1 && (cabe.length > 0 || (k >= 3 && !!M.analisarJogo(P.sel, null, st.cfg)));
    const botoes = esconder || fim ? '' : `
      <button class="bt bt-comprar" data-a="comprar" ${podeComprar ? '' : 'disabled'}>${ICONE.comprar}Comprar</button>
      <button class="bt bt-lixo" data-a="lixo" ${podeLixo ? '' : 'disabled'}>${ICONE.lixo}${P.confirmarLixo ? 'Confirmar' : 'Pegar lixo'}</button>
      <button class="bt bt-baixar" data-a="baixar" ${podeBaixar ? '' : 'disabled'}>${ICONE.baixar}Baixar</button>
      <button class="bt bt-descartar" data-a="descartar" ${emJogo && k === 1 ? '' : 'disabled'}>${ICONE.descartar}Descartar</button>`;

    // dica de texto
    let dica = '';
    if (P.dica && P.dica.texto) dica = P.dica.texto;
    else if (vez && st.fase === 'comprar') {
      if (!st.lixo.length) dica = 'Toque no monte para comprar.';
      else if (st.cfg.lixo === 'aberto') dica = 'Compre do monte ou pegue o lixo inteiro.';
      else if (P.confirmarLixo) dica = 'As cartas destacadas formam jogo com ' + M.nomeCarta(topo) + ': toque em Confirmar.';
      else dica = opcaoLixo ? 'O ' + M.nomeCarta(topo) + ' do lixo serve para você: toque em Pegar lixo, ou compre do monte.' : 'O ' + M.nomeCarta(topo) + ' do lixo não serve para você agora: compre do monte.';
    } else if (emJogo) {
      if (!k) dica = 'Escolha cartas e toque na mesa para baixar, ou toque no lixo para descartar.' + (M.podeBater(st, meuT) ? ' Já pode bater!' : '');
      else if (cabe.length > 1) dica = 'Encaixa em mais de um jogo: toque no jogo que você quer.';
      else if (cabe.length) dica = 'Encaixa no jogo destacado: toque nele (ou em Baixar).';
      else if (k >= 3) dica = M.analisarJogo(P.sel, null, st.cfg) ? 'Forma um jogo: toque na mesa para baixar.' : 'Essas cartas não formam jogo.';
      else dica = k === 1 ? 'Descarte (botão ou toque no lixo) para passar a vez.' : 'Escolha pelo menos 3 cartas para um jogo novo.';
    } else if (P.modo === 'online' && !fim) dica = 'Sala ' + esc(P.mesa.codigo) + (ausente(st.vez) ? ' · ' + esc(st.jogadores[st.vez].nome) + ' saiu: um bot joga no lugar.' : '');

    raiz.innerHTML = `
      <div class="placar2">
        <button class="ic-btn" data-a="menu" aria-label="Menu">☰</button>
        <div class="pl"><small>${esc(nomeT(meuT))}</small><b>${st.placar[meuT]}</b><i>${canastras(meuT) ? '👑' + canastras(meuT) + ' · ' : ''}mesa +${pontosNaMesa(st, meuT)}</i></div>
        ${st.cfg.fim === 'maos' ? `<div class="pl meta"><small>mão</small><b>${st.mao} de ${st.cfg.maos || 3}</b><i>${esc(M.descreverConfig(st.cfg))}</i></div>` : `<div class="pl meta"><small>meta</small><b>${st.cfg.meta.toLocaleString('pt-BR')}</b><i>mão ${st.mao} · ${esc(M.descreverConfig(st.cfg))}</i></div>`}
        <div class="pl"><small>${esc(nomeT(advT))}</small><b>${st.placar[advT]}</b><i>${canastras(advT) ? '👑' + canastras(advT) + ' · ' : ''}mesa +${pontosNaMesa(st, advT)}</i></div>
        ${P.modo === 'online' ? '<button class="ic-btn" data-a="reagir" aria-label="Reações">😊</button>' : `<button class="ic-btn" data-a="som" aria-label="Som">${store.get('som', true) ? '🔊' : '🔇'}</button>`}
      </div>
      <div class="faixa">${mao.length > 1 && !esconder ? `<button class="tx-btn" data-a="ordem" title="Ordenar ${P.ordem === 'naipe' ? 'por valor' : 'por naipe'}">↕ Ordem</button>` : '<span></span>'}<b class="${faixaCls}">${faixa}</b>${vez && !esconder ? '<button class="tx-btn" data-a="dica">💡 Dica</button>' : '<span></span>'}</div>
      <div class="mesa ${n === 2 ? 'mesa-dois' : 'mesa-quatro'}">
        ${assentosHTML}
        <div class="area-deles"><div class="fita pequena">Jogos ${n === 4 ? 'deles' : 'de ' + esc(st.jogadores[advT].nome)}</div><div class="lista-jogos deles">${jogosHTML(advT, false)}</div></div>
        <div class="mortos-canto"><span class="tit-mortos">Mortos</span><div class="dupla-mortos">${mortoHTML(meuT, rotMortoMeu)}${mortoHTML(advT, rotMortoDeles)}</div></div>
        <div class="centro2">
          <button class="monte2 ${podeComprar ? 'pode' : ''}" data-a="comprar"><div class="pilha-cartas">${st.monte.length ? cartaHTML(null, 'baixo') + cartaHTML(null) : '<div class="vazio-l"></div>'}</div><span class="rotulo">Monte <b>${st.monte.length}</b></span></button>
          <button class="lixo2 ${podeLixo || podeDescartarNoLixo ? 'pode' : ''}" data-a="lixo-mesa">${lixoHTML}<span class="rotulo">Lixo <b>${st.lixo.length}</b>${st.cfg.lixo === 'aberto' && st.lixo.length > 1 ? ' 🔍' : ''}</span></button>
        </div>
        <div class="area-nossa meus ${formaNovo || (vez && st.fase === 'jogar' && cabe.length === 1) ? 'alvo' : ''}" data-a="baixar-mesa"><div class="fita">${n === 4 ? 'Nossas canastras e jogos' : 'Suas canastras e jogos'}</div><div class="lista-jogos">${jogosHTML(meuT, true)}</div></div>
        <div class="linha-balao"><div class="balao ${vez ? 'fixo' : ''}">${esc((P.dica && P.dica.texto) || (vez && dica ? dica : ((st.ultimo && st.ultimo.texto) || dica || '')))}</div>${k && !esconder ? '<button class="tx-btn" data-a="limpar">✕ Desmarcar</button>' : ''}</div>
        <div class="mao-wrap"><div class="mao2" id="mao">${maoHTML}</div></div>
      </div>
      <div class="botoes">${botoes}</div>`;
    ajustarMao();
    const la = raiz.querySelector('.lixo-aberto'); if (la) la.scrollLeft = la.scrollWidth;
    // jogos compactos quando a mesa enche (vale até o fim da mão)
    if (P.compactoMao !== st.mao) { P.compacto = {}; P.compactoMao = st.mao; }
    let recompor = false;
    [[meuT, '.area-nossa .lista-jogos'], [advT, '.area-deles .lista-jogos']].forEach(([t, sel]) => {
      const el = raiz.querySelector(sel);
      if (el && !(P.compacto[t]) && el.scrollHeight > el.clientHeight + 6) { P.compacto[t] = true; recompor = true; }
    });
    if (recompor && !P.recompondo) { P.recompondo = true; desenharJogo(); P.recompondo = false; return; }
    if (P.voo) { const v = P.voo; P.voo = null; animarDescarte(raiz, v); }

    P.ant = { mao: mao.slice(), lixoTopo: topo, jogos: [st.jogos[0].map(j => j.c.length), st.jogos[1].map(j => j.c.length)], vez };

    // sobreposições
    if (P.passando !== null && !fim) {
      const s = P.passando;
      veu(`<div class="painel centro"><div class="avatar-grande">${esc(avatarDe(st, s))}</div><h2 class="titulo">Vez de ${esc(st.jogadores[s].nome)}</h2>
        <p class="sub">Passe o aparelho para ${esc(st.jogadores[s].nome)}. Os outros não olham! 🙈</p>
        <button class="btn ouro grande" data-v="ver">Sou ${esc(st.jogadores[s].nome)}, mostrar cartas</button></div>`)
        .onclick = e => { if (e.target.closest('[data-v="ver"]')) { P.eu = s; P.passando = null; P.sel = []; P.ant = null; fecharVeu(); salvar(); desenharJogo(); } };
    } else if (fim && !P.verMesa) {
      mostrarResultado();
    } else if (!document.querySelector('.veu.menu-jogo-veu')) fecharVeu();
    if (fim && P.verMesa) {
      const b = raiz.querySelector('.botoes');
      if (b) b.innerHTML = '<button class="bt bt-baixar" data-a="placar" style="grid-column:1/-1">📋 Ver placar</button>';
    }
  }

  // mão em leque: sobreposição que cabe na largura e leve arco
  function ajustarMao() {
    const el = document.getElementById('mao'); if (!el) return;
    const cartas = Array.from(el.children); if (!cartas.length) return;
    const cw = cartas[0].getBoundingClientRect().width || 60;
    const w = el.clientWidth - 10;
    const k = cartas.length;
    const duas = k > 12 && (w - cw) / (k - 1) < 26; // duas fileiras quando a parte tocável de cada carta ficaria estreita demais
    const porLinha = duas ? Math.ceil(k / 2) : k;
    const passo = porLinha > 1 ? Math.min(cw * 0.8, (w - cw) / (porLinha - 1)) : cw;
    el.classList.toggle('duas', duas);
    el.style.height = duas ? '' : '';
    cartas.forEach((c, i) => {
      const linha = Math.floor(i / porLinha), j = i % porLinha;
      const meio = (Math.min(porLinha, k - linha * porLinha) - 1) / 2;
      const d = j - meio;
      const lim = window.innerWidth < 500 ? 4 : 10;
      const ang = duas ? 0 : Math.max(-lim, Math.min(lim, d * Math.min(2.6, 30 / k)));
      const y = duas ? 0 : Math.min(8, Math.pow(Math.abs(d), 2) * Math.min(0.8, 9 / k) * (lim / 10));
      c.style.marginLeft = j === 0 ? '0px' : (passo - cw) + 'px';
      c.style.setProperty('--r', ang + 'deg');
      c.style.setProperty('--y', y + 'px');
      c.style.zIndex = String(i + 1);
    });
    if (duas) {
      const br = document.createElement('div'); br.style.flexBasis = '100%'; br.style.height = '0';
      el.insertBefore(br, cartas[porLinha]);
    }
  }

  function verLixo() {
    const st = P.st;
    const cartas = M.ordenarMao(st.lixo, 'naipe');
    const v = veu(`<div class="painel"><h2 class="titulo centro">Lixo · ${st.lixo.length} cartas</h2>
      <p class="sub centro">Em ordem de naipe. A última descartada foi ${esc(M.nomeCarta(st.lixo[st.lixo.length - 1]))}.</p>
      <div class="grade-lixo">${cartas.map(c => cartaHTML(c, c === st.lixo[st.lixo.length - 1] ? 'ultima' : '')).join('')}</div>
      <div class="linha c" style="margin-top:12px"><button class="btn ouro" data-x="ok">Voltar ao jogo</button></div></div>`, () => desenharJogo());
    v.querySelector('[data-x="ok"]').onclick = () => { fecharVeu(); desenharJogo(); };
  }

  function darDica() {
    const st = P.st, s = P.eu, t = s % 2;
    const a = B.proxima(st, s);
    if (!a) return;
    let texto = '', cartas = [], jogo = -1;
    if (a.t === 'comprar') texto = '💡 Compre do monte: o lixo não ajuda agora.';
    else if (a.t === 'lixo') {
      cartas = a.cartas || []; jogo = a.jogo === undefined ? -1 : a.jogo;
      texto = st.cfg.lixo === 'aberto' ? '💡 Pegue o lixo: tem cartas que servem para você.' : '💡 Dá para pegar o lixo' + (cartas.length ? ' usando as cartas destacadas' : ' encaixando a carta de cima no jogo destacado') + '.';
    } else if (a.t === 'baixar') {
      cartas = a.cartas; jogo = a.jogo;
      texto = jogo >= 0 ? '💡 Encaixe a carta destacada no jogo que está piscando.' : '💡 As cartas destacadas formam um jogo novo.';
    } else if (a.t === 'descartar') { cartas = [a.carta]; texto = '💡 Uma boa carta para descartar: ' + M.nomeCarta(a.carta) + '.'; }
    P.dica = { texto, cartas, jogo: a.t === 'baixar' || a.t === 'lixo' ? jogo : -1 };
    P.sel = cartas.slice();
    desenharJogo();
  }

  function cliqueJogo(e) {
    if (!P) return;
    const st = P.st;
    const cartaEl = e.target.closest('.mao2 .carta');
    if (cartaEl && cartaEl.dataset.id !== undefined) {
      if (P.passando !== null) return;
      if (Date.now() - (P.ultimoToque || 0) < 700) return; // já tratado pelo toque/arrasto
      const id = +cartaEl.dataset.id;
      P.dica = null; P.confirmarLixo = false;
      P.sel = P.sel.includes(id) ? P.sel.filter(x => x !== id) : P.sel.concat([id]);
      desenharJogo();
      return;
    }
    const jg = e.target.closest('.meus .jg');
    if (jg) {
      if (!minhaVez()) return;
      const idx = +jg.dataset.jogo;
      if (st.fase === 'jogar') {
        if (!P.sel.length) { toast('Escolha na sua mão as cartas que quer encaixar neste jogo.'); return; }
        agir({ t: 'baixar', cartas: P.sel.slice(), jogo: idx });
      } else if (st.fase === 'comprar' && st.cfg.lixo === 'fechado' && st.lixo.length) {
        agir({ t: 'lixo', cartas: P.sel.slice(), jogo: idx });
      }
      return;
    }
    const b = e.target.closest('[data-a]'); if (!b) return;
    const a = b.dataset.a;
    if (a === 'menu') return menuJogo();
    if (a === 'reagir') return abrirReacoes();
    if (a === 'som') { store.set('som', !store.get('som', true)); return desenharJogo(); }
    if (a === 'placar') { P.verMesa = false; return desenharJogo(); }
    if (a === 'ordem') { P.ordem = P.ordem === 'naipe' ? 'valor' : 'naipe'; store.set('ordem', P.ordem); return desenharJogo(); }
    if (a === 'limpar') { P.sel = []; P.dica = null; P.confirmarLixo = false; return desenharJogo(); }
    if (a === 'lixo-mesa' && st.cfg.lixo === 'aberto' && st.lixo.length > 1 && !(minhaVez() && st.fase === 'comprar')) return verLixo();
    if (!minhaVez()) return;
    if (a === 'dica') return darDica();
    if (a === 'comprar' && st.fase === 'comprar') agir({ t: 'comprar' });
    if ((a === 'lixo' || a === 'lixo-mesa') && st.fase === 'jogar' && a === 'lixo-mesa') {
      if (P.sel.length === 1) return agir({ t: 'descartar', carta: P.sel[0] });
      if (st.cfg.lixo === 'aberto' && st.lixo.length > 1) return verLixo();
      return;
    }
    if ((a === 'lixo' || a === 'lixo-mesa') && st.fase === 'comprar') {
      if (!st.lixo.length) return;
      if (st.cfg.lixo === 'aberto') return agir({ t: 'lixo' });
      const topo = st.lixo[st.lixo.length - 1];
      const t = P.eu % 2;
      if (P.confirmarLixo && P.confirmarLixo.t) { const op = P.confirmarLixo; P.confirmarLixo = false; return agir(op); }
      if (P.dica && P.dica.jogo >= 0 && !P.sel.length) return agir({ t: 'lixo', cartas: [], jogo: P.dica.jogo });
      if (!P.sel.length) {
        const op = B.opcaoLixo(st, P.eu);
        if (!op) { som('erro'); toast(M.nomeCarta(topo) + ' não serve para você agora. Compre do monte.'); return; }
        if (!op.cartas.length) return agir(op);
        P.confirmarLixo = op; P.sel = op.cartas.slice(); P.dica = { texto: '', cartas: op.cartas, jogo: op.jogo };
        return desenharJogo();
      }
      if (P.sel.length) {
        // tenta jogo novo; se não der, tenta encaixar num jogo existente
        if (M.analisarJogo(P.sel.concat([topo]), null, st.cfg)) return agir({ t: 'lixo', cartas: P.sel.slice(), jogo: -1 });
        const idx = M.ehCoringa(topo) ? -1 : st.jogos[t].findIndex(j => M.analisarJogo(j.c.concat(P.sel, [topo]), j.t, st.cfg));
        return agir({ t: 'lixo', cartas: P.sel.slice(), jogo: idx });
      }
      const idx = M.ehCoringa(topo) ? -1 : st.jogos[t].findIndex(j => M.analisarJogo(j.c.concat([topo]), j.t, st.cfg));
      if (idx >= 0) return agir({ t: 'lixo', cartas: [], jogo: idx });
      som('erro');
      toast(M.nomeCarta(topo) + ' não forma jogo com essas cartas.');
    }
    if (a === 'baixar-mesa' && st.fase === 'jogar') {
      if (!P.sel.length) return;
      const t = P.eu % 2;
      if (P.sel.length >= 3 && M.analisarJogo(P.sel, null, st.cfg)) return agir({ t: 'baixar', cartas: P.sel.slice(), jogo: -1 });
      const cabem = cartasQueCabem(st, t, P.sel);
      if (cabem.length === 1) return agir({ t: 'baixar', cartas: P.sel.slice(), jogo: cabem[0] });
      if (cabem.length > 1) { toast('Toque no jogo onde quer encaixar (os que piscam).'); return; }
      som('erro'); toast(P.sel.length < 3 ? 'Para um jogo novo, escolha pelo menos 3 cartas.' : 'Essas cartas não formam jogo.');
      return;
    }
    if (a === 'baixar' && st.fase === 'jogar') {
      const t = P.eu % 2;
      if (P.dica && P.dica.jogo >= 0) return agir({ t: 'baixar', cartas: P.sel.slice(), jogo: P.dica.jogo });
      if (P.sel.length >= 3 && M.analisarJogo(P.sel, null, st.cfg)) return agir({ t: 'baixar', cartas: P.sel.slice(), jogo: -1 });
      const cabem = cartasQueCabem(st, t, P.sel);
      if (cabem.length > 1) { toast('Toque no jogo onde quer encaixar (os que piscam).'); return; }
      if (cabem.length) return agir({ t: 'baixar', cartas: P.sel.slice(), jogo: cabem[0] });
      agir({ t: 'baixar', cartas: P.sel.slice(), jogo: -1 });
    }
    if (a === 'descartar' && st.fase === 'jogar') {
      if (P.sel.length !== 1) { toast('Escolha 1 carta para descartar.'); return; }
      agir({ t: 'descartar', carta: P.sel[0] });
    }
  }

  /* ---------- executar jogadas ---------- */
  function agir(a) {
    if (!P) return;
    if (P.modo === 'online' && !P.mesa.souAnfitriao()) {
      P.ocupado = true; desenharJogo();
      P.mesa.pedir(a).catch(() => { P.ocupado = false; toast('Sem conexão. Tente de novo.', 'erro'); desenharJogo(); });
      clearTimeout(P.ocupT); P.ocupT = setTimeout(() => { if (P && P.ocupado) { P.ocupado = false; desenharJogo(); } }, 6000);
      return;
    }
    executar(P.eu, a, false);
  }

  function executar(s, a, deBot) {
    const st = P.st;
    const res = M.aplicar(st, s, a);
    if (!res.ok) {
      if (!deBot) { som('erro'); toast(res.erro, 'erro'); return res; }
      // segurança: se o bot errar, compra ou descarta qualquer carta válida
      console.warn('bot', a, res.erro);
      const alt = st.fase === 'comprar' ? { t: 'comprar' } : B.decidirDescarte(st, s);
      const r2 = M.aplicar(st, s, alt);
      if (!r2.ok) return r2;
    }
    if (s === P.eu) { P.sel = []; P.dica = null; P.confirmarLixo = false; }
    depoisDaJogada();
    return res;
  }

  function depoisDaJogada() {
    const st = P.st;
    if (P.modo === 'local') {
      const hs = humanos(st);
      if (hs.length > 1 && st.fase === 'comprar' && st.jogadores[st.vez].tipo === 'humano' && st.vez !== P.eu) P.passando = st.vez;
      if (st.fase === 'fimMao' || st.fase === 'fimJogo') P.passando = null;
    }
    if (st.fase === 'comprar' || st.fase === 'jogar') P.verMesa = false;
    salvar();
    if (P.modo === 'online' && P.mesa.souAnfitriao()) P.mesa.publicar(st).catch(e => console.error(e));
    desenharJogo();
    agendar();
  }

  function agendar() {
    if (!P) return;
    clearTimeout(P.timer);
    const st = P.st;
    if (st.fase !== 'comprar' && st.fase !== 'jogar') return;
    const s = st.vez, j = st.jogadores[s];
    let atraso = null;
    const fator = { lenta: 1.6, normal: 1, rapida: 0.5 }[store.get('velocidade', 'normal')] || 1;
    if (P.modo === 'online') {
      if (!P.mesa.souAnfitriao()) return;
      if (j.tipo === 'bot') atraso = st.fase === 'comprar' ? 1100 : 850;
      else if (ausente(s)) atraso = 2500;
    } else if (j.tipo === 'bot') atraso = st.fase === 'comprar' ? 1000 : 800;
    if (atraso === null) return;
    if (j.tipo === 'bot') atraso = Math.round(atraso * fator);
    const seq = st.seq;
    P.timer = setTimeout(() => {
      if (!P || P.st.seq !== seq || P.st.vez !== s) return;
      if (P.modo === 'online' && j.tipo === 'humano' && !ausente(s)) return;
      const a = B.proxima(P.st, s);
      if (a) executar(s, a, true);
    }, atraso);
  }

  /* ---------- resultado ---------- */
  function mostrarResultado() {
    const st = P.st, r = st.resultado; if (!r) return;
    const meuT = P.eu % 2, advT = 1 - meuT;
    const nomeT = t => st.n === 2 ? st.jogadores[t].nome : M.nomeTime(st, t);
    const linha = (rot, k, fmt) => `<tr><td>${rot}</td><td>${fmt(r.times[meuT], k)}</td><td>${fmt(r.times[advT], k)}</td></tr>`;
    const num = (x, k) => (x[k] > 0 ? '+' : '') + x[k];
    const qtd = (x, k) => x[k] ? x[k] + '×' : '—';
    const fim = st.fase === 'fimJogo';
    const host = P.modo !== 'online' || P.mesa.souAnfitriao();
    let titulo = '';
    if (fim && r.vencedor === null) titulo = '🤝 Empate!';
    else if (fim) {
      const v = r.vencedor;
      if (P.modo === 'local' && humanos(st).length > 1) titulo = '🏆 ' + esc(nomeT(v)) + (st.n === 2 ? ' venceu!' : ' venceram!');
      else titulo = v === meuT ? '🏆 ' + (st.n === 2 ? 'Você venceu!' : 'Vocês venceram!') : '😬 ' + esc(nomeT(v)) + (st.n === 2 ? ' venceu' : ' venceram');
    } else titulo = r.bateu === null ? 'Fim da mão' : esc(st.jogadores[st.ultimo && st.ultimo.s !== undefined ? st.ultimo.s : 0].nome) + ' bateu!';
    const btns = [];
    if (!fim) btns.push(host ? '<button class="btn ouro grande larg" data-r="proxima">Próxima mão ▶</button>' : '<p class="nota centro">Aguardando o anfitrião começar a próxima mão…</p>');
    else {
      if (host) btns.push('<button class="btn ouro grande larg" data-r="denovo">🔁 Jogar de novo</button>');
      else btns.push('<p class="nota centro">O anfitrião pode começar outra partida.</p>');
      btns.push(`<button class="btn larg" data-r="sair">${P.modo === 'online' ? 'Sair da sala' : 'Início'}</button>`);
    }
    btns.push('<button class="btn claro larg" data-r="mesa">👀 Ver a mesa</button>');
    const v = veu(`<div class="painel">
      <h2 class="${fim ? 'ganhou' : 'titulo centro'}">${titulo}</h2>
      <table class="tab-res">
        <tr><th></th><th>${esc(st.n === 2 ? nomeT(meuT) : 'Nós')}</th><th>${esc(st.n === 2 ? nomeT(advT) : 'Eles')}</th></tr>
        ${linha('Cartas baixadas', 'cartas', num)}
        ${linha('Canastras limpas', 'limpas', qtd)}
        ${linha('Canastras sujas', 'sujas', qtd)}
        ${(r.times[0].reais || r.times[1].reais) ? linha('Canastras reais (13+)', 'reais', qtd) : ''}
        ${linha('Bônus de canastras', 'bonus', num)}
        ${linha('Batida', 'batida', num)}
        ${linha('Morto não pego', 'morto', num)}
        ${linha('Cartas na mão', 'mao', num)}
        <tr class="tot"><td>Total da mão</td><td>${num(r.times[meuT], 'total')}</td><td>${num(r.times[advT], 'total')}</td></tr>
        ${st.historico.length > 1 ? `<tr class="ant"><td>Mãos anteriores</td><td>${st.historico.slice(0, -1).map(h => (h[meuT] > 0 ? '+' : '') + h[meuT]).join(' · ')}</td><td>${st.historico.slice(0, -1).map(h => (h[advT] > 0 ? '+' : '') + h[advT]).join(' · ')}</td></tr>` : ''}
        <tr class="ger"><td>Placar (${esc(M.descreverFim(st.cfg))})</td><td>${st.placar[meuT]}</td><td>${st.placar[advT]}</td></tr>
      </table>
      ${!fim && st.cfg.fim === 'maos' ? `<p class="nota centro">${(st.cfg.maos || 3) - st.mao === 1 ? 'Falta 1 mão' : 'Faltam ' + ((st.cfg.maos || 3) - st.mao) + ' mãos'}. No fim, vence quem tiver mais pontos.</p>` : ''}
      ${!fim && st.cfg.fim !== 'maos' ? `<p class="nota centro">Faltam ${Math.max(0, st.cfg.meta - st.placar[meuT])} pontos para ${st.n === 2 ? (P.modo === 'local' ? esc(nomeT(meuT)) : 'você') : 'nós'} e ${Math.max(0, st.cfg.meta - st.placar[advT])} para ${esc(st.n === 2 ? nomeT(advT) : 'eles')}.</p>` : ''}
      <div class="pilha">${btns.join('')}</div>
      ${fim ? `<div class="cdx-ad" data-ad="jogo-resultado"></div><div class="cdx" style="margin-top:12px"><a href="${URL_SUG}" target="_blank" rel="noopener">💡 Enviar sugestão</a></div>` : ''}
    </div>`);
    if (fim) { try { window.CarludixAds && window.CarludixAds.render(); } catch (e) {} }
    v.onclick = e => {
      const b = e.target.closest('[data-r]'); if (!b) return;
      const a = b.dataset.r;
      if (a === 'mesa') { P.verMesa = true; fecharVeu(); desenharJogo(); }
      if (a === 'proxima') { fecharVeu(); executar(st.vez, { t: 'proxima' }, false); if (P.modo === 'local') ajustarPasseInicio(); }
      if (a === 'denovo') {
        fecharVeu();
        const novo = M.novoJogo(st.cfg, st.jogadores);
        if (P.modo === 'online') { P.st = novo; P.mesa.publicar(novo); desenharJogo(); agendar(); }
        else { const modo = P.modo; iniciarLocal(modo, novo); }
      }
      if (a === 'sair') { fecharVeu(); if (P.modo === 'online') { sairOnline(); } else { store.del('salvo'); telaInicio(); } }
    };
  }
  function ajustarPasseInicio() {
    const st = P.st, hs = humanos(st);
    if (hs.length > 1 && st.jogadores[st.vez].tipo === 'humano') { P.passando = st.vez; desenharJogo(); }
  }

  function abrirReacoes() {
    const v = veu(`<div class="painel centro"><h2 class="titulo">Reagir</h2><div class="reacoes">${REACOES.map(r => `<button class="reac" data-r="${esc(r)}">${esc(r)}</button>`).join('')}</div></div>`, () => desenharJogo());
    v.onclick = e => {
      if (e.target === v) { fecharVeu(); desenharJogo(); return; }
      const b = e.target.closest('[data-r]'); if (!b) return;
      if (!P.mesa.reagir(b.dataset.r)) toast('Calma! Uma reação a cada 2 segundos.');
      fecharVeu(); desenharJogo();
    };
  }

  function aplicarPreferencias() {
    document.body.classList.toggle('grande', !!store.get('grande', false));
    document.body.classList.toggle('cores4', !!store.get('cores4', false));
    if (P) desenharJogo();
  }

  function menuJogo() {
    const online = P.modo === 'online';
    const v = veu(`<div class="painel menu-jogo centro">
      <h2 class="titulo">Menu</h2>
      ${online ? `<p class="sub">Sala <b style="color:var(--ouro);letter-spacing:3px">${esc(P.mesa.codigo)}</b></p>` : ''}
      <button class="btn" data-m="regras">📖 Como jogar</button>
      <button class="btn" data-m="historico">📜 O que aconteceu</button>
      <button class="btn" data-m="grande">🔎 Letras e cartas grandes: ${store.get('grande', false) ? 'ligado' : 'desligado'}</button>
      <button class="btn" data-m="cores">🎨 Baralho 4 cores: ${store.get('cores4', false) ? 'ligado' : 'desligado'}</button>
      <button class="btn" data-m="vel">🐢 Velocidade dos bots: ${({ lenta: 'lenta', normal: 'normal', rapida: 'rápida' })[store.get('velocidade', 'normal')]}</button>
      <button class="btn" data-m="som">${store.get('som', true) ? '🔊 Som: ligado' : '🔇 Som: desligado'}</button>
      <button class="btn verm" data-m="sair">${online ? 'Sair da mesa' : 'Sair (a partida fica salva)'}</button>
      <button class="btn claro" data-m="fechar">Voltar ao jogo</button>
    </div>`, () => desenharJogo());
    v.classList.add('menu-jogo-veu');
    v.onclick = e => {
      if (e.target === v) { fecharVeu(); desenharJogo(); return; }
      const b = e.target.closest('[data-m]'); if (!b) return;
      const m = b.dataset.m;
      if (m === 'fechar') { fecharVeu(); desenharJogo(); }
      if (m === 'ordem') { P.ordem = P.ordem === 'naipe' ? 'valor' : 'naipe'; store.set('ordem', P.ordem); fecharVeu(); desenharJogo(); }
      if (m === 'regras') mostrarRegras(() => desenharJogo());
      if (m === 'grande') { store.set('grande', !store.get('grande', false)); aplicarPreferencias(); fecharVeu(); menuJogo(); }
      if (m === 'cores') { store.set('cores4', !store.get('cores4', false)); aplicarPreferencias(); fecharVeu(); menuJogo(); }
      if (m === 'som') { store.set('som', !store.get('som', true)); fecharVeu(); menuJogo(); }
      if (m === 'vel') { const v = store.get('velocidade', 'normal'); store.set('velocidade', v === 'normal' ? 'lenta' : v === 'lenta' ? 'rapida' : 'normal'); fecharVeu(); menuJogo(); }
      if (m === 'historico') {
        const h = (P.historico || []).slice(0, 20);
        const v2 = veu(`<div class="painel"><h2 class="titulo centro">O que aconteceu</h2><ol class="historico">${h.map(x => `<li>${esc(x)}</li>`).join('') || '<li>Nada ainda.</li>'}</ol><div class="linha c"><button class="btn ouro" data-x="ok">Voltar ao jogo</button></div></div>`, () => desenharJogo());
        v2.querySelector('[data-x="ok"]').onclick = () => { fecharVeu(); desenharJogo(); };
      }
      if (m === 'sair') { fecharVeu(); if (online) sairOnline(); else { clearTimeout(P.timer); salvar(); telaInicio(); } }
    };
  }

  function mostrarRegras(depois) {
    const v = veu(`<div class="painel regras">
      <h2 class="titulo centro">Como jogar Buraco</h2>
      <p>Jogo de cartas com 2 baralhos e 4 curingões (108 cartas), mano a mano (1x1) ou em duplas (2x2). Cada um recebe 11 cartas e há 2 <b>mortos</b> de 11 cartas separados.</p>
      <h3>Sua vez</h3>
      <ul><li><b>Compre</b> 1 carta do monte <b>ou</b> pegue o lixo.</li>
      <li><b>Baixe</b> jogos: sequências de 3 ou mais cartas seguidas do mesmo naipe (o Ás pode ser antes do 2 ou depois do Rei). No Fechado também valem <b>trincas</b> (3+ cartas do mesmo valor).</li>
      <li>Você pode <b>encaixar</b> cartas nos jogos da sua dupla.</li>
      <li>Termine a vez <b>descartando</b> 1 carta no lixo.</li></ul>
      <h3>Coringas</h3>
      <p>O curingão (★) e todos os <b>2</b> são coringas. Cada jogo aceita no máximo 1 coringa. O 2 do mesmo naipe também pode ser usado como 2 normal (A-2-3).</p>
      <h3>Canastras</h3>
      <p>Jogo com 7 ou mais cartas é <b>canastra</b>: <b>limpa</b> (sem coringa) vale +200, <b>suja</b> (com coringa) +100. Limpa de 13 cartas vale +500 e de 14 (Ás a Ás) +1000.</p>
      <h3>Morto e batida</h3>
      <p>Quem fica sem cartas pela primeira vez pega o morto da dupla e continua. Para <b>bater</b> (acabar a mão) a dupla precisa ter pegado o morto e ter uma canastra (limpa, no Aberto e no STBL). Bater vale +100. Dupla que não pegou o morto perde 100.</p>
      <h3>Pontos das cartas</h3>
      <p>Curingão 20 · Ás 15 · 2 10 · 8 a Rei 10 · 3 a 7 5. Cartas baixadas somam; as que ficaram na mão descontam. Vence quem chegar primeiro aos pontos da mesa.</p>
      <h3>Variantes</h3>
      <ul><li><b>Fechado:</b> só a carta de cima do lixo aparece. Para pegar o lixo, essa carta tem que entrar num jogo na hora (aí você leva o resto do lixo). Vale trinca. Bate com qualquer canastra.</li>
      <li><b>Aberto:</b> o lixo fica todo à mostra e você pega ele inteiro quando quiser. Sem trinca. Bate com canastra limpa.</li>
      <li><b>STBL</b> (Sem Trinca, Bate Limpo): lixo fechado, sem trinca e só bate com canastra limpa.</li></ul>
      <p class="nota">Em “Regras da mesa (avançado)” dá para misturar essas regras do seu jeito.</p>
      <div class="linha c" style="margin-top:12px"><button class="btn ouro" data-x="ok">Entendi</button></div>
    </div>`, depois || (() => {}));
    v.querySelector('[data-x="ok"]').onclick = () => { fecharVeu(); if (depois) depois(); };
  }

  /* =================== PERFIL (apelido e avatar, compartilhados entre os jogos) =================== */
  const AVATARES = ['🦊', '🐶', '🐱', '🐼', '🐸', '🐯', '🦁', '🐵', '🐧', '🦉', '🐢', '🐙', '🦄', '🐝', '🐞', '🐬', '⚽', '🏀', '🎾', '🃏', '♠️', '♥️', '♦️', '♣️', '🎲', '⭐', '🚀', '🌻'];
  const REACOES = ['👏', '😂', '🔥', '😮', '🙏', 'Boa jogada!', 'Boa sorte!', 'GG!'];
  const PROIBIDAS = ['porra', 'caralho', 'karalho', 'krl', 'merda', 'merd', 'bosta', 'puta', 'puto', 'putinha', 'putaria', 'prostitut', 'buceta', 'boceta', 'bct', 'xereca', 'xoxota', 'cu', 'cuzao', 'cusao', 'foda', 'fode', 'foder', 'fuder', 'fdp', 'pqp', 'vsf', 'tnc', 'kct', 'cacete', 'kacete', 'piroca', 'penis', 'vagina', 'bunda', 'sexo', 'porno', 'punheta', 'siririca', 'tesao', 'gostosa', 'safad', 'vagabund', 'vadia', 'piranha', 'arromb', 'otario', 'idiota', 'imbecil', 'babaca', 'retardad', 'corno', 'chifrud', 'viado', 'bicha', 'boiola', 'baitola', 'traveco', 'sapatao', 'crioulo', 'nazi', 'hitler', 'estupr', 'pedofil', 'maconha', 'cocaina', 'desgraca', 'lixo humano'];
  const TESTE = (new URLSearchParams(location.search).get('teste') || '').replace(/[^a-z0-9]/gi, '').slice(0, 8);
  function perfil() {
    if (TESTE) return { apelido: 'Teste ' + TESTE.toUpperCase(), avatar: '🐸' };
    try { const p = JSON.parse(localStorage.getItem('carludix:jogador') || 'null'); if (p && p.apelido && p.avatar && !apelidoInvalido(p.apelido)) return p; } catch (e) {}
    return null;
  }
  function salvarPerfil(p) { if (TESTE) return; try { localStorage.setItem('carludix:jogador', JSON.stringify(p)); } catch (e) {} }
  const semAcento = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  function apelidoInvalido(a) {
    a = String(a || '');
    if (!/^[A-Za-zÀ-ÖØ-öø-ÿ0-9 ]+$/.test(a) || a.trim().length < 2 || a.length > 14) return 'Use de 2 a 14 caracteres: só letras, números e espaço.';
    const n = semAcento(a);
    const palavras = n.split(/[^a-z0-9]+/).filter(Boolean);
    const PERMITIDAS = /computa|disputa|reputa|imputa/g; // palavras comuns que contêm um termo proibido
    const junto = n.replace(/[^a-z0-9]/g, '').replace(PERMITIDAS, '');
    const leet = n.replace(/[^a-z0-9]/g, '').replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't').replace(PERMITIDAS, '');
    const ruim = PROIBIDAS.some(p => {
      const q = p.replace(/ /g, '');
      if (q.length <= 3) return palavras.includes(q) || junto === q || leet === q;
      return junto.includes(q) || leet.includes(q);
    });
    return ruim ? 'Esse apelido não é permitido. Escolha outro.' : null;
  }
  function pedirPerfil(depois, trocar) {
    const atual = perfil();
    if (atual && !trocar) return depois(atual);
    let av = (atual && atual.avatar) || AVATARES[Math.floor(Math.random() * 16)];
    tela(`<button class="voltar" data-a="voltar">← Voltar</button>
      <div class="painel centro" style="max-width:460px;margin:20px auto">
        <h2 class="titulo">Seu apelido</h2>
        <p class="sub">É assim que os outros jogadores vão te ver. Não use seu nome completo.</p>
        <input class="txt" id="apelido" maxlength="14" placeholder="Apelido" autocomplete="off" value="${esc((atual && atual.apelido) || '')}">
        <p class="nota" id="erro-ap" style="color:#ffb3b3;min-height:18px;margin:6px 0 0"></p>
        <label class="rot">Escolha seu avatar</label>
        <div class="avatares">${AVATARES.map(a => `<button class="av-op ${a === av ? 'on' : ''}" data-av="${a}">${a}</button>`).join('')}</div>
        <div class="linha c" style="margin-top:16px"><button class="btn ouro grande" data-a="ok">Continuar</button></div>
      </div>`);
    const inp = $('#apelido'); inp.focus();
    const ok = () => {
      const v = inp.value.replace(/\s+/g, ' ').trim();
      const err = apelidoInvalido(v);
      if (err) { $('#erro-ap').textContent = err; return; }
      const p = { apelido: v, avatar: av };
      salvarPerfil(p); depois(p);
    };
    inp.onkeydown = e => { if (e.key === 'Enter') ok(); };
    app.onclick = e => {
      const x = e.target.closest('[data-av]');
      if (x) { av = x.dataset.av; app.querySelectorAll('.av-op').forEach(b => b.classList.toggle('on', b.dataset.av === av)); return; }
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'ok') ok();
      if (b.dataset.a === 'voltar') telaInicio();
    };
  }

  /* =================== ONLINE: SALA DE ESPERA =================== */
  function erroOnline(e) {
    const m = String((e && (e.code || e.message)) || e);
    if (/permission|PERMISSION/i.test(m)) return 'O online do Buraco ainda não foi liberado no servidor' + (e && e.caminho ? ' (' + e.caminho + ')' : '') + '. Enquanto isso, jogue contra o computador ou no mesmo aparelho.';
    if (/nao-existe/.test(m)) return 'Não achei essa sala. Confira o código.';
    if (/cheia/.test(m)) return 'Essa sala está cheia.';
    if (/jogando/.test(m)) return 'Essa sala já começou a jogar. Escolha outra.';
    return 'Não deu para conectar ao servidor. Confira a internet e tente de novo.';
  }
  const textoModo = (cfg, n) => (M.VARIANTES[cfg.variante] || M.VARIANTES.fechado).nome + (M.descreverConfig(cfg).includes('personalizado') ? '*' : '') + ' · ' + (n === 2 ? '1x1' : 'Duplas') + ' · ' + M.descreverFim(cfg);

  async function telaSalas() {
    P = null;
    const eu = perfil();
    tela(`<button class="voltar" data-a="voltar">← Voltar</button>
      <div class="painel" style="max-width:560px;margin:0 auto">
        <h2 class="titulo centro">🌐 Jogar online</h2>
        <p class="sub centro" id="contador">&nbsp;</p>
        <div class="pilha">
          <button class="btn verm grande" data-a="rapido">⚡ Jogo rápido</button>
          <button class="btn ouro" data-a="criar">➕ Criar sala</button>
          <div class="linha" style="flex-wrap:nowrap"><input class="txt" id="cod" maxlength="4" placeholder="CÓDIGO" style="flex:0 0 120px;text-align:center;letter-spacing:3px;text-transform:uppercase;font-weight:900;padding-left:6px;padding-right:6px"><button class="btn" data-a="entrar" style="flex:1">🔑 Entrar com código</button></div>
        </div>
        <label class="rot" style="margin-top:18px">Salas abertas</label>
        <div class="mesas" id="mesas"><div class="vazio">Conectando…</div></div>
        <p class="nota centro">Você: <b>${esc(eu.avatar + ' ' + eu.apelido)}</b> · <a href="#" data-a="perfil">trocar</a></p>
      </div>${rodape()}`);
    app.onclick = e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      const a = b.dataset.a;
      if (a === 'voltar') { R.desmarcarOnline(); telaInicio(); }
      if (a === 'criar') telaConfig('criar');
      if (a === 'rapido') jogoRapido();
      if (a === 'perfil') { e.preventDefault(); pedirPerfil(() => telaSalas(), true); }
      if (a === 'entrar') { const c = $('#cod').value.trim().toUpperCase(); if (/^[A-Z0-9]{4}$/.test(c)) entrarSala(c); else toast('Digite as 4 letras do código'); }
      if (a === 'sentar') entrarSala(b.dataset.cod);
      if (a === 'bots-agora') { R.desmarcarOnline(); telaConfig('bots'); }
    };
    try {
      R.marcarOnline().catch(() => {});
      const offC = await R.ouvirContador(n => { const el = document.getElementById('contador'); if (el && n !== null) el.textContent = '🟢 ' + n + (n === 1 ? ' pessoa jogando' : ' pessoas jogando') + ' online agora'; });
      limpeza.push(offC);
      const off = await R.ouvirSalas((lista, err) => {
        const el = document.getElementById('mesas'); if (!el) return;
        if (!lista) { el.innerHTML = `<div class="vazio">${esc(erroOnline(err))}<div style="margin-top:10px"><button class="btn peq verm" data-a="bots-agora">🤖 Jogar contra o computador</button></div></div>`; return; }
        if (!lista.length) { el.innerHTML = '<div class="vazio">Nenhuma sala aberta agora. Crie uma ou toque em “Jogo rápido”.</div>'; return; }
        el.innerHTML = lista.map(m => {
          const h = (m.jogadores || {})[m.anfitriao] || {};
          return `<div class="mesa-item"><div style="font-size:26px">${esc(h.avatar || '🃏')}</div><div class="info"><b>${esc(h.apelido || 'Sala')}</b><span>${esc(m.modo || '')}</span></div><div class="lugares">${m.ocupadas}/${m.max}</div><button class="btn peq ouro" data-a="sentar" data-cod="${esc(m.codigo)}">Entrar</button></div>`;
        }).join('');
      });
      limpeza.push(off);
    } catch (e) {
      const el = document.getElementById('mesas'); if (el) el.innerHTML = `<div class="vazio">${esc(erroOnline(e))}</div>`;
    }
  }

  async function jogoRapido() {
    tela(`<div class="painel centro" style="max-width:420px;margin:40px auto"><h2 class="titulo">Procurando sala…</h2><p class="sub" id="msg">Conectando ao servidor.</p><button class="btn claro" data-a="voltar">Cancelar</button></div>`);
    let cancelado = false;
    app.onclick = e => { if (e.target.closest('[data-a="voltar"]')) { cancelado = true; telaSalas(); } };
    try {
      const lista = await new Promise((res, rej) => {
        let feito = false, off = null;
        R.ouvirSalas((l, err) => {
          if (feito) return; feito = true;
          if (off) off();
          if (!l) rej(err); else res(l);
        }).then(o => { off = o; if (feito) o(); }).catch(rej);
      });
      if (cancelado) return;
      if (lista.length) return entrarSala(lista[0].codigo, true);
      const C = store.get('cfg', {});
      const cfg = Object.assign(M.configPadrao(C.variante || 'fechado'), { meta: C.meta || 1500, fim: C.fim || 'pontos', maos: C.maos || 3 });
      criarSalaOnline({ cfg, n: C.n === 4 ? 4 : 2, publica: true }, true);
    } catch (e) {
      const box = app.querySelector('.painel');
      if (box) box.innerHTML = `<h2 class="titulo">Online indisponível</h2><p class="sub">${esc(erroOnline(e))}</p><div class="pilha"><button class="btn verm" data-a="bots-agora">🤖 Jogar contra o computador</button><button class="btn" data-a="tentar">Tentar de novo</button><button class="btn claro" data-a="voltar">Voltar</button></div>`;
      app.onclick = ev => { const b = ev.target.closest('[data-a]'); if (!b) return; if (b.dataset.a === 'bots-agora') telaConfig('bots'); if (b.dataset.a === 'tentar') jogoRapido(); if (b.dataset.a === 'voltar') telaSalas(); };
    }
  }

  async function criarSalaOnline(o, rapido) {
    try {
      tela(`<div class="painel centro" style="max-width:420px;margin:40px auto"><h2 class="titulo">Criando sala…</h2></div>`);
      const cod = await R.criarSala({ cfg: o.cfg, publica: o.publica, modo: textoModo(o.cfg, o.n), min: o.n, max: o.n, perfil: perfil() });
      entrarSala(cod, rapido, true);
    } catch (e) { toast(erroOnline(e), 'erro'); telaSalas(); }
  }

  let mesaAtual = null;
  async function entrarSala(codigo, rapido, criei) {
    const eu = perfil();
    if (!eu) return pedirPerfil(() => entrarSala(codigo, rapido, criei));
    // só uma sala por vez
    if (mesaAtual && mesaAtual.codigo !== codigo) { await mesaAtual.sair(); mesaAtual = null; }
    tela(`<div class="painel centro" style="max-width:420px;margin:40px auto"><h2 class="titulo">Entrando na sala ${esc(codigo)}…</h2></div>`);
    let mesa;
    try { mesa = mesaAtual && mesaAtual.codigo === codigo ? mesaAtual : await R.abrirSala(codigo, eu); }
    catch (e) { toast(erroOnline(e), 'erro'); try { history.replaceState(null, '', location.pathname); } catch (e2) {} return telaSalas(); }
    mesaAtual = mesa;
    R.marcarOnline().catch(() => {});
    try { history.replaceState(null, '', location.pathname + '?sala=' + codigo + (TESTE ? '&teste=' + TESTE : '')); } catch (e) {}
    mesa.onEstado(st => receberEstado(mesa, st));
    mesa.onErro(msg => { if (P) { P.ocupado = false; desenharJogo(); } som('erro'); toast(msg, 'erro'); });
    mesa.onReacao(v => mostrarReacao(mesa, v));
    mesa.onSaiu(motivo => {
      if (mesaAtual !== mesa) return;
      if (P && P.mesa === mesa && motivo === 'removido') return;
      mesaAtual = null; P = null;
      mesa.sair();
      toast(motivo === 'removido' ? 'O anfitrião tirou você da sala.' : 'Essa sala foi fechada.', 'erro');
      try { history.replaceState(null, '', location.pathname); } catch (e) {}
      telaSalas();
    });
    if (mesa.sala.status !== 'esperando') return; // a partida chega pelo onEstado
    telaSala(mesa, rapido);
  }

  function telaSala(mesa, rapido) {
    P = null;
    limpar();
    app.innerHTML = '<div id="espera"></div>';
    let rapidoDesde = rapido ? Date.now() : null, comecando = false;
    const relogio = setInterval(() => { if (mesa.souAnfitriao()) mesa.tocar(); }, 60000);
    limpeza.push(() => clearInterval(relogio));

    const ordenados = sala => Object.entries(sala.jogadores || {}).sort((a, b) => (a[1].entrouEm || 0) - (b[1].entrouEm || 0));
    const desenhar = () => {
      const raiz = document.getElementById('espera'); if (!raiz) return;
      const sala = mesa.sala; if (!sala || sala.status !== 'esperando') return;
      const host = mesa.souAnfitriao();
      const js = ordenados(sala);
      const n = sala.max || 4;
      const lugares = R.distribuirLugares(sala);
      const linhas = [];
      const ordemVis = n === 4 ? [0, 2, 1, 3] : [0, 1]; // mostra a dupla A junta e depois a dupla B
      for (const i of ordemVis) {
        const dupla = n === 4 ? `<span class="dupla ${i % 2 ? 'b' : 'a'}">${i % 2 ? 'Dupla B' : 'Dupla A'}</span>` : '';
        const x = lugares[i];
        if (!x) { linhas.push(`<button class="jogador-sala livre ${i % 2 ? 'tb' : 'ta'}" data-lugar="${i}"><div class="av">＋</div><div class="info"><b>Vaga livre</b><span>${n === 4 ? 'toque para sentar aqui' : 'esperando alguém…'}</span></div>${dupla}</button>`); continue; }
        const [u, j] = x;
        const eu = u === mesa.uid;
        const ehHost = u === sala.anfitriao;
        linhas.push(`<div class="jogador-sala ${eu ? 'eu' : ''} ${i % 2 ? 'tb' : 'ta'}"><div class="av">${esc(j.bot ? '🤖' : j.avatar)}</div>
          <div class="info"><b>${j.bot ? '🤖 ' : ''}${esc(j.apelido)}${ehHost ? ' 👑' : ''}${eu ? ' (você)' : ''}</b><span>${j.bot ? 'bot' : j.pronto || ehHost ? '✅ pronto' : '⏳ não está pronto'}</span></div>
          ${dupla}${host && !eu ? `<button class="ic-btn rem" data-rem="${esc(u)}" aria-label="Remover ${esc(j.apelido)}" title="Remover">✕</button>` : ''}</div>`);
      }
      const cheia = js.length >= n;
      const prontos = js.every(([u, j]) => j.bot || j.pronto || u === sala.anfitriao);
      const meu = (sala.jogadores || {})[mesa.uid] || {};
      let banner = '';
      if (host && rapidoDesde && !cheia) {
        const falta = Math.max(0, Math.ceil(30 - (Date.now() - rapidoDesde) / 1000));
        banner = falta <= 10 ? `<div class="banner-bots">Ninguém online agora. Completando com bots em ${falta}s… <button class="btn peq claro" data-a="esperar">Esperar mais</button></div>` : `<div class="banner-bots">Jogo rápido: se ninguém chegar, começa com bots em ${falta}s.</div>`;
      }
      raiz.innerHTML = `<button class="voltar" data-a="sair">← Sair da sala</button>
        <div class="painel" style="max-width:560px;margin:0 auto">
          <h2 class="titulo centro">Sala ${esc(mesa.codigo)}</h2>
          <p class="sub centro">${esc(sala.modo || '')} · ${sala.publica ? 'pública' : 'privada (só com código)'}</p>
          <div class="linha c"><div class="codigo-sala">código <b>${esc(mesa.codigo)}</b></div><button class="btn claro peq" data-a="convite">🔗 Convidar</button></div>
          <div class="lista-sala">${linhas.join('')}</div>
          ${banner}
          <div class="pilha" style="margin-top:12px">
            ${!host ? `<button class="btn ${meu.pronto ? 'claro' : 'ouro grande'}" data-a="pronto">${meu.pronto ? '✋ Pronto ✓ (toque para desfazer)' : '✋ Pronto'}</button>` : ''}
            ${host ? `${!cheia ? '<button class="btn" data-a="bots">🤖 Completar com bots</button>' : ''}
              <button class="btn ouro grande" data-a="comecar" ${cheia && prontos ? '' : 'disabled'}>▶ Começar</button>
              <p class="nota centro">${!cheia ? (n - js.length > 1 ? 'Faltam ' + (n - js.length) + ' jogadores' : 'Falta 1 jogador') + '. Espere ou complete com bots.' : prontos ? 'Todos prontos! Pode começar.' : 'Esperando todos tocarem em “Pronto”.'}${n === 4 ? ' Para trocar de dupla, toque numa vaga livre.' : ''}</p>`
            : '<p class="nota centro">Quando todos estiverem prontos, o anfitrião 👑 começa a partida.</p>'}
          </div>
          <div class="reacoes">${REACOES.map(r => `<button class="reac" data-r="${esc(r)}">${esc(r)}</button>`).join('')}</div>
        </div>${rodape()}`;
      // anfitrião saiu? quem entrou há mais tempo assume
      if (sala.anfitriao && !mesa.presente(sala.anfitriao)) setTimeout(() => mesa.conferirAnfitriao().then(ok => { if (ok) { toast('O anfitrião saiu. Agora você é o anfitrião 👑'); desenhar(); } }), 1500);
      if (host && cheia && rapidoDesde && !comecando) { comecando = true; setTimeout(() => comecarOnline(mesa), 1500); }
    };
    mesa.onSala(() => desenhar());
    const tique = setInterval(() => { if (rapidoDesde && mesa.souAnfitriao()) {
      const s = (Date.now() - rapidoDesde) / 1000;
      if (s >= 30 && !comecando) { comecando = true; completarBots(mesa).then(() => setTimeout(() => comecarOnline(mesa), 600)); }
      else desenhar();
    } }, 1000);
    limpeza.push(() => clearInterval(tique));
    app.onclick = async e => {
      const lg = e.target.closest('[data-lugar]');
      if (lg) { mesa.mudarLugar(+lg.dataset.lugar).then(ok => { if (!ok) toast('Esse lugar já foi ocupado.'); }).catch(err => toast(erroOnline(err), 'erro')); return; }
      const rem = e.target.closest('[data-rem]');
      if (rem) { if (mesa.souAnfitriao()) mesa.remover(rem.dataset.rem); return; }
      const rc = e.target.closest('[data-r]');
      if (rc) { if (!mesa.reagir(rc.dataset.r)) toast('Calma! Uma reação a cada 2 segundos.'); return; }
      const b = e.target.closest('[data-a]'); if (!b) return;
      const a = b.dataset.a;
      if (a === 'sair') { await mesa.sair(); mesaAtual = null; try { history.replaceState(null, '', location.pathname); } catch (e2) {} telaSalas(); }
      if (a === 'convite') convidar(mesa.codigo);
      if (a === 'pronto') { const meu = (mesa.sala.jogadores || {})[mesa.uid] || {}; mesa.pronto(!meu.pronto).catch(err => toast(erroOnline(err), 'erro')); }
      if (a === 'bots') completarBots(mesa).catch(err => toast(erroOnline(err), 'erro'));
      if (a === 'esperar') { rapidoDesde = Date.now(); desenhar(); }
      if (a === 'comecar') { comecando = true; comecarOnline(mesa).finally(() => { comecando = false; }); }
    };
  }

  function completarBots(mesa) {
    const usados = Object.values(mesa.sala.jogadores || {}).map(x => x.apelido);
    const nomes = M.embaralhar(NOMES_BOT.filter(x => !usados.includes(x)));
    return mesa.porBots(nomes, '🤖');
  }

  function convidar(codigo) {
    const url = location.origin + location.pathname + '?sala=' + codigo;
    const texto = 'Bora jogar Buraco no CARLUDIX! Sala ' + codigo + ': ' + url;
    if (navigator.share) navigator.share({ title: 'Buraco · CARLUDIX', text: texto, url }).catch(() => {});
    else if (navigator.clipboard) navigator.clipboard.writeText(texto).then(() => toast('Convite copiado! Cole no WhatsApp.')).catch(() => toast(url));
    else toast(url);
  }

  async function comecarOnline(mesa) {
    const sala = mesa.sala, n = sala.max || 4;
    const js = R.distribuirLugares(sala);
    if (js.some(x => !x)) { toast('Ainda falta gente na sala.'); return; }
    const jog = js.map(([u, j]) => j.bot ? { nome: j.apelido, tipo: 'bot', nivel: 'medio', avatar: '🤖' } : { nome: j.apelido, tipo: 'humano', uid: u, nivel: 'medio', avatar: j.avatar });
    const cfg = mesa.cfg || M.configPadrao('fechado');
    const st = M.novoJogo(cfg, jog);
    try { await mesa.comecar(st); } catch (e) { toast(erroOnline(e), 'erro'); }
  }

  function mostrarReacao(mesa, v) {
    if (!REACOES.includes(v.r)) return;
    const j = (mesa.sala.jogadores || {})[v.uid] || {};
    let box = document.getElementById('bolhas');
    if (!box) { box = document.createElement('div'); box.id = 'bolhas'; document.body.appendChild(box); }
    const d = document.createElement('div');
    d.className = 'bolha';
    d.textContent = (j.avatar || '🙂') + ' ' + (j.apelido || '') + ': ' + v.r;
    box.appendChild(d);
    setTimeout(() => d.remove(), 3200);
  }

  function ligarHost(mesa) {
    mesa.ouvirPedidos((a, de) => {
      if (!P || P.mesa !== mesa) return;
      const st = P.st;
      const s = st.jogadores.findIndex(j => j.uid === de);
      if (s < 0 || a.t === 'proxima') return;
      const res = M.aplicar(st, s, a);
      if (!res.ok) { mesa.avisarErro(de, res.erro); mesa.publicar(st); return; }
      depoisDaJogada();
    });
  }

  function receberEstado(mesa, st) {
    if (mesaAtual !== mesa) return;
    const eu = st.jogadores.findIndex(j => j.uid === mesa.uid);
    if (eu < 0) return;
    if (!P || P.mesa !== mesa) {
      limpar();
      P = novaPartida('online', st, eu);
      P.mesa = mesa;
      P.presentes = new Set(st.jogadores.filter(j => j.uid && mesa.presente(j.uid)).map(j => j.uid));
      telaJogo();
      mesa.onSala(sala => {
        if (!P || P.mesa !== mesa) return;
        // quem saiu no meio: bot assume
        P.st.jogadores.forEach(j => {
          if (!j.uid || j.uid === mesa.uid) return;
          const agora = mesa.presente(j.uid);
          if (P.presentes.has(j.uid) && !agora) toast(j.nome + ' saiu, um bot assumiu');
          if (!P.presentes.has(j.uid) && agora) toast(j.nome + ' voltou para a mesa');
          if (agora) P.presentes.add(j.uid); else P.presentes.delete(j.uid);
        });
        if (sala.anfitriao && !mesa.presente(sala.anfitriao)) setTimeout(() => mesa.conferirAnfitriao().then(ok => { if (ok && P && P.mesa === mesa) { toast('Agora você é o anfitrião 👑'); ligarHost(mesa); agendar(); desenharJogo(); } }), 1500);
        if (mesa.souAnfitriao()) ligarHost(mesa);
        desenharJogo(); agendar();
      });
      if (mesa.souAnfitriao()) ligarHost(mesa);
      agendar();
      return;
    }
    if (mesa.souAnfitriao() && st.seq <= P.st.seq && st.mao === P.st.mao) { P.ocupado = false; return; }
    const mudouFase = st.fase !== P.st.fase;
    P.st = st; P.eu = eu; P.ocupado = false;
    if (st.fase === 'comprar' || st.fase === 'jogar') P.verMesa = false;
    if (mudouFase) fecharVeu();
    desenharJogo();
    agendar();
  }

  async function sairOnline() {
    if (P) clearTimeout(P.timer);
    const m = mesaAtual; mesaAtual = null; P = null;
    if (m) await m.sair();
    try { history.replaceState(null, '', location.pathname); } catch (e) {}
    telaSalas();
  }

  /* =================== PARTIDA =================== */
  aplicarPreferencias();
  const q = new URLSearchParams(location.search);
  const cod = (q.get('sala') || '').toUpperCase();
  if (/^[A-Z0-9]{4}$/.test(cod)) pedirPerfil(() => entrarSala(cod));
  else telaInicio();

  window.addEventListener('beforeunload', () => { if (P && P.modo !== 'online') salvar(); });
})();
