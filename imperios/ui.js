/* IMPÉRIOS — CARLUDIX · telas e interação (a interface só lê o estado e pede ações ao motor) */
(function () {
  'use strict';
  const M = window.ImperiosMotor, B = window.ImperiosBot;
  const { REINOS, UNIDADES, TIPOS_U, CONSTR, TIPOS_C, TERRENOS, RECURSOS, IC_REC, NOME_REC } = M;
  const app = document.getElementById('app');
  const URL_UNIVERSO = 'https://carludix.com/cartas/';
  const URL_SUG = 'https://carludix.com/contato/?jogo=Imp%C3%A9rios';
  const ARTE = { pequeno: 'img/tabuleiro-pequeno.webp', medio: 'img/tabuleiro-medio.webp', grande: 'img/tabuleiro-grande.webp' };
  const MAPAS = [
    { id: 'pequeno', nome: 'Pequeno', n: 24, min: 2, max: 6 },
    { id: 'medio', nome: 'Médio', n: 36, min: 2, max: 4 },
    { id: 'grande', nome: 'Grande', n: 48, min: 2, max: 6 },
  ];
  const METAS = [{ v: 25, nome: 'Relâmpago', t: '10–15 min' }, { v: 50, nome: 'Clássico', t: '20–40 min' }, { v: 100, nome: 'Grande Império', t: '45–90 min' }];
  const NIVEIS = [{ id: 'iniciante', nome: 'Iniciante' }, { id: 'estrategico', nome: 'Estratégico' }, { id: 'mestre', nome: 'Mestre' }];
  const NOMES_BOT = { leao: 'Rei Leônidas', aguia: 'Rainha Aurora', cervo: 'Rei Cedric', flor: 'Rainha Isadora', lobo: 'Rei Magnus', dragao: 'Rainha Valéria' };

  /* ---------- utilidades ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('imperios:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('imperios:' + k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem('imperios:' + k); } catch (e) {} },
  };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const brasao = r => `img/brasao-${r}.webp`;
  const imgU = k => `img/unidade-${k}.webp`;
  const imgC = k => `img/construcao-${k}.webp`;
  const icR = k => `<img class="icr" src="img/recurso-${k}.webp" alt="${NOME_REC[k]}">`;
  const fmtCusto = c => RECURSOS.filter(k => c[k]).map(k => `${c[k]}${icR(k)}`).join(' ') || 'grátis';
  const opcoes = Object.assign({ reduzir: window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches, velocidade: 'normal' }, store.get('opcoes', {}));
  function salvarOpcoes() { store.set('opcoes', opcoes); document.body.classList.toggle('reduzir', !!opcoes.reduzir); }
  document.body.classList.toggle('reduzir', !!opcoes.reduzir);
  const cdx = () => `<div class="cdx"><a href="${URL_UNIVERSO}">← CARLUDIX</a><a href="https://carludix.com/privacidade/">Privacidade</a><a href="${URL_SUG}" target="_blank" rel="noopener">💡 Enviar sugestão</a></div>`;

  let toastT = null;
  function toast(msg, tipo) {
    $$('.toast').forEach(t => t.remove());
    const d = document.createElement('div');
    d.className = 'toast' + (tipo ? ' ' + tipo : ''); d.setAttribute('role', 'status'); d.textContent = msg;
    document.body.appendChild(d);
    clearTimeout(toastT); toastT = setTimeout(() => d.remove(), tipo === 'erro' ? 3000 : 2300);
  }
  let aoFecharVeu = null;
  function veu(html, aoFechar, cls) {
    fecharVeu(true);
    const d = document.createElement('div');
    d.className = 'veu'; d.id = 'veu'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
    d.innerHTML = `<div class="modal ${cls || 'painel'}">${html}</div>`;
    document.body.appendChild(d);
    aoFecharVeu = aoFechar || null;
    d.addEventListener('click', e => { if (e.target === d && !d.dataset.preso) fecharVeu(); });
    const f = d.querySelector('button,select,input'); if (f) setTimeout(() => f.focus(), 30);
    return d;
  }
  function fecharVeu(silencioso) {
    const v = $('#veu'); if (v) v.remove();
    const cb = aoFecharVeu; aoFecharVeu = null;
    if (cb && !silencioso) cb();
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if ($('#veu') && !$('#veu').dataset.preso) fecharVeu(); else if (J && (J.modo || J.sel)) { cancelarModo(); fecharFolha(); } }
  });
  function perfil() {
    try { const p = JSON.parse(localStorage.getItem('carludix:jogador') || 'null'); if (p && p.apelido) return p.apelido; } catch (e) {}
    return store.get('nome', 'Você');
  }

  /* ================= INÍCIO ================= */
  const moldura = (miolo, cls) => `<div class="tela ${cls || ''}"><div class="tela-in">${miolo}</div></div>`;
  const rodapeCdx = () => `<div class="selo-cdx"><a href="${URL_UNIVERSO}" aria-label="Voltar ao CARLUDIX"><span>★</span>CARLUDIX</a></div>
    <div class="rodape-links"><a href="https://carludix.com/privacidade/">🛡️ Privacidade</a><span>|</span><a href="${URL_SUG}" target="_blank" rel="noopener">✉️ Enviar sugestão</a></div>`;
  function inicio() {
    pararBots();
    const salvo = store.get('partida', null);
    app.onclick = null; app.oninput = null;
    app.innerHTML = moldura(`
      <img class="logo-topo" src="img/titulo.webp" alt="Impérios" width="1100" height="378">
      <div class="cena"><img src="img/cena-bandeiras.webp" alt=""></div>
      <nav class="menu2" aria-label="Menu principal">
        ${salvo && salvo.st && salvo.st.fase === 'jogo' ? `<button class="bm ouro grande" data-a="continuar"><span class="ic">▶️</span>Continuar partida</button>` : ''}
        <button class="bm vermelho grande" data-a="bots"><span class="ic">⚔️</span>Jogar contra bots</button>
        <div class="par"><button class="bm azul" data-a="local"><span class="ic">👥</span>Mesmo aparelho</button>
          <button class="bm verde" data-a="online" disabled title="Em breve"><span class="ic">🌐</span>Jogar online<small>em breve</small></button></div>
        <button class="bm azul" data-a="regras"><span class="ic">📖</span>Como jogar</button>
        <div class="par"><button class="bm escuro peq" data-a="stats"><span class="ic">📊</span>Estatísticas</button>
          <button class="bm escuro peq" data-a="config"><span class="ic">⚙️</span>Configurações</button></div>
      </nav>
      ${rodapeCdx()}`, 'tela-menu');
    app.onclick = e => {
      const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
      const a = b.dataset.a;
      if (a === 'continuar') retomar(salvo);
      else if (a === 'bots' || a === 'local') configurar(a);
      else if (a === 'regras') comoJogar();
      else if (a === 'config') configuracoes();
      else if (a === 'stats') estatisticas();
    };
  }

  function registrarResultado(st) {
    const s = store.get('stats', { partidas: 0, vitorias: 0, porReino: {} });
    const h = st.jogadores.findIndex(j => j.tipo === 'humano');
    if (h < 0) return;
    const numH = st.jogadores.filter(j => j.tipo === 'humano').length;
    s.partidas++;
    const r = st.jogadores[h].reino, pr = s.porReino[r] || (s.porReino[r] = { p: 0, v: 0 });
    if (numH === 1) { pr.p++; if ((st.vencedores || []).includes(h)) { s.vitorias++; pr.v++; } }
    s.melhor = Math.max(s.melhor || 0, M.pontos(st, h));
    store.set('stats', s);
  }
  function estatisticas() {
    const s = store.get('stats', { partidas: 0, vitorias: 0, porReino: {} });
    veu(`<button class="fechar" aria-label="Fechar">×</button><h2 class="titulo">📊 Estatísticas</h2>
      <div class="est"><div><b>${s.partidas}</b>partidas</div><div><b>${s.vitorias}</b>vitórias contra bots</div><div><b>${s.melhor || 0}</b>melhor pontuação</div></div>
      <label class="rot">Por reino (contra bots)</label>
      <div class="ranking">${M.ORDEM_REINOS.map(r => { const x = s.porReino[r] || { p: 0, v: 0 }; return `<div class="rk"><span></span><img src="${brasao(r)}" alt=""><div>${esc(REINOS[r].nome)}<small>${x.p} partidas</small></div><span>${x.v} 🏆</span></div>`; }).join('')}</div>
      <p class="nota" style="text-align:center">Guardado só neste aparelho.</p>`);
    $('#veu').onclick = e => { if (e.target.id === 'veu' || e.target.closest('.fechar')) fecharVeu(); };
  }

  function configuracoes() {
    veu(`<button class="fechar" aria-label="Fechar">×</button><h2 class="titulo">Configurações</h2>
      <label class="rot">Animações</label>
      <div class="opcoes"><button class="op ${!opcoes.reduzir ? 'on' : ''}" data-red="0">Normais</button><button class="op ${opcoes.reduzir ? 'on' : ''}" data-red="1">Reduzidas</button></div>
      <label class="rot">Velocidade dos bots</label>
      <div class="opcoes">${[['lenta', 'Lenta'], ['normal', 'Normal'], ['rapida', 'Rápida']].map(([k, n]) => `<button class="op ${opcoes.velocidade === k ? 'on' : ''}" data-vel="${k}">${n}</button>`).join('')}</div>
      <p class="nota" style="margin-top:16px">As partidas são salvas automaticamente neste aparelho.</p>`);
    const v = $('#veu');
    v.onclick = e => {
      if (e.target === v || e.target.closest('.fechar')) return fecharVeu();
      const r = e.target.closest('[data-red]'), s = e.target.closest('[data-vel]');
      if (r) { opcoes.reduzir = r.dataset.red === '1'; salvarOpcoes(); configuracoes(); }
      if (s) { opcoes.velocidade = s.dataset.vel; salvarOpcoes(); configuracoes(); }
    };
  }

  /* ================= CONFIGURAÇÃO ================= */
  const DIFS = [{ id: 'iniciante', nome: 'Fácil', ic: '🍃', cls: 'verde' }, { id: 'estrategico', nome: 'Normal', ic: '👑', cls: 'vermelho' }, { id: 'mestre', nome: 'Difícil', ic: '⛑️', cls: 'vinho' }];
  function configurar(modo) {
    const c = Object.assign({ n: modo === 'bots' ? 4 : 3, mapa: 'pequeno', meta: 50, nivel: 'estrategico' }, store.get('cfg-' + modo, {}));
    c.modo = modo;
    function desenhar() {
      const mp = MAPAS.find(m => m.id === c.mapa);
      if (c.n > mp.max) c.n = mp.max;
      const metaInfo = METAS.find(m => m.v === c.meta);
      app.innerHTML = moldura(`
        <img class="logo-topo peq" src="img/titulo.webp" alt="Impérios">
        <div class="cena-faixa"><img src="img/cena-castelo.webp" alt=""></div>
        <h1 class="faixa-titulo"><span>${modo === 'bots' ? 'Configuração da partida' : 'Mesmo aparelho'}</span></h1>
        <section class="caixa"><h2><span class="ic">👥</span>${modo === 'bots' ? 'Quantidade de reinos' : 'Quantidade de jogadores'}</h2>
          <div class="nums">${[2, 3, 4, 5, 6].map(n => `<button class="num ${c.n === n ? 'on' : ''}" data-n="${n}" ${n > mp.max ? 'disabled' : ''}>${n}</button>`).join('')}</div>
          <p class="nota">${modo === 'bots' ? 'Você mais ' + (c.n - 1) + ' reino(s) controlados pelo computador.' : 'Todos revezam o mesmo aparelho, com tela de privacidade entre os turnos.'}</p></section>
        <section class="caixa"><h2><span class="ic">🗺️</span>Escolha o mapa</h2>
          <div class="mapas">${MAPAS.map(m => `<button class="mapa-op ${c.mapa === m.id ? 'on' : ''}" data-mapa="${m.id}"><b>${m.nome}</b><img src="${ARTE[m.id]}" alt="" loading="lazy"><span><strong>${m.n}</strong> territórios</span><small>${m.min}–${m.max} jogadores</small></button>`).join('')}</div></section>
        ${modo === 'bots' ? `<section class="caixa"><h2><span class="ic">⚔️</span>Dificuldade dos bots</h2>
          <div class="difs">${DIFS.map(d => `<button class="dif ${d.cls} ${c.nivel === d.id ? 'on' : ''}" data-nivel="${d.id}"><span>${d.ic}</span>${d.nome}</button>`).join('')}</div>
          <p class="info">ℹ️ A dificuldade define o nível de estratégia dos adversários controlados pelo computador (bots).</p></section>` : ''}
        <section class="caixa"><h2><span class="ic">👑</span>Meta de pontos</h2>
          <div class="opcoes">${METAS.map(m => `<button class="op ${c.meta === m.v ? 'on' : ''}" data-meta="${m.v}">${m.nome}<small>${m.v} pts · ${m.t}</small></button>`).join('')}
            <button class="op ${!metaInfo ? 'on' : ''}" data-meta="outra">Personalizada<small>${!metaInfo ? c.meta + ' pts' : 'você escolhe'}</small></button></div>
          </section>
        <section class="caixa"><h2><span class="ic">📜</span>Regras extras</h2>
          <div class="opcoes">${[['cartas', '🃏 Cartas especiais'], ['objetivos', '🎯 Objetivos secretos'], ['eventos', '🌍 Eventos mundiais']].map(([k, n]) => `<button class="op ${c[k] !== false ? 'on' : ''}" data-extra="${k}">${n}<small>${c[k] !== false ? 'ativado' : 'desativado'}</small></button>`).join('')}</div></section>
        <div class="botoes-rodape"><button class="bm azul" data-a="voltar">← Voltar</button><button class="bm vermelho" data-a="seguir">⚔️ Escolher reino</button></div>
      `, 'tela-config');
    }
    desenhar();
    app.onclick = e => {
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      if (b.dataset.a === 'voltar') return inicio();
      if (b.dataset.n) c.n = +b.dataset.n;
      if (b.dataset.mapa) c.mapa = b.dataset.mapa;
      if (b.dataset.nivel) c.nivel = b.dataset.nivel;
      if (b.dataset.extra) c[b.dataset.extra] = c[b.dataset.extra] === false;
      if (b.dataset.meta) {
        if (b.dataset.meta === 'outra') {
          const v = parseInt(prompt('Meta de pontos (de 15 a 200):', String(c.meta)), 10);
          if (v >= 15 && v <= 200) c.meta = v;
        } else c.meta = +b.dataset.meta;
      }
      if (b.dataset.a === 'seguir') { store.set('cfg-' + modo, c); return escolherReinos(c); }
      desenhar();
    };
  }

  /* ================= ESCOLHA DOS REINOS ================= */
  function escolherReinos(c) {
    const pers = Object.keys(B.PERSONALIDADES);
    const nomesSalvos = store.get('nomes-local', []);
    const assentos = Array.from({ length: c.n }, (_, k) => {
      const humano = c.modo === 'local' || k === 0;
      return { humano, nome: humano ? (c.modo === 'local' ? (nomesSalvos[k] || 'Jogador ' + (k + 1)) : perfil()) : '', reino: null, pers: pers[Math.floor(Math.random() * pers.length)] };
    });
    const humanos = assentos.filter(a => a.humano);
    let ativo = 0, foco = null;
    const livres = () => M.ORDEM_REINOS.filter(r => !assentos.some(a => a.reino === r));
    function desenhar() {
      const a = assentos[ativo];
      const fr = foco || a.reino;
      app.innerHTML = moldura(`
        <img class="logo-topo peq" src="img/titulo.webp" alt="Impérios">
        <h1 class="faixa-titulo azul"><span>${humanos.length > 1 ? 'Reino de ' + esc(a.nome) : 'Escolha o seu reino'}</span></h1>
        ${humanos.length > 1 ? `<div class="assentos">${assentos.map((s, k) => `<div class="assento ${k === ativo ? 'on' : ''}">
          ${s.reino ? `<img src="${brasao(s.reino)}" alt="">` : '<span>❔</span>'}
          <input class="txt" maxlength="16" value="${esc(s.nome)}" data-nome="${k}" aria-label="Nome do jogador ${k + 1}"></div>`).join('')}</div>`
          : `<label class="nome-jog">Seu nome <input class="txt" maxlength="16" value="${esc(a.nome)}" data-nome="0"></label>`}
        <div class="reinos2">${M.ORDEM_REINOS.map(r => {
          const dono = assentos.findIndex(s => s.reino === r);
          const ocupado = dono >= 0 && dono !== ativo;
          return `<button class="reino2 ${dono === ativo ? 'on' : ''} ${ocupado ? 'ocupado' : ''}" data-reino="${r}" style="--c:${REINOS[r].cor}" aria-pressed="${dono === ativo}" ${ocupado ? 'disabled' : ''}>
            <img class="busto" src="img/busto-${r}.webp" alt="" loading="lazy">
            <img class="band" src="img/bandeira-${r}.webp" alt="">
            <span class="placa"><img src="${brasao(r)}" alt=""><span>${REINOS[r].nome.replace(/^(Reino d[oa]) /, '$1<br>')}</span></span>
            ${ocupado ? `<span class="dono">${esc(assentos[dono].humano ? assentos[dono].nome : '🤖 Bot')}</span>` : ''}</button>`;
        }).join('')}</div>
        <div class="hab-reino">${fr ? `<b>${esc(REINOS[fr].governante)} · ${esc(REINOS[fr].perfil)}</b><span>${esc(REINOS[fr].hab)}</span>` : '<span>Toque num reino para ver o governante e a habilidade.</span>'}</div>
        <p class="nota" style="text-align:center">${c.modo === 'bots' ? 'Os bots recebem reinos por sorteio.' : 'Quem não escolher recebe um reino por sorteio.'}</p>
        <div class="botoes-rodape"><button class="bm azul" data-a="voltar">← Voltar</button>
          <button class="bm vermelho" data-a="confirmar">👑 ${humanos.length > 1 && assentos.slice(ativo + 1).some(s => s.humano) ? 'Confirmar e próximo' : 'Confirmar reino'}</button></div>
        ${humanos.length > 1 ? '<button class="bm escuro peq larga" data-a="sortear" style="margin-top:8px">🎲 Sortear para todos e começar</button>' : ''}
      `, 'tela-reinos');
    }
    desenhar();
    app.oninput = e => { const k = e.target.dataset.nome; if (k != null) assentos[+k].nome = e.target.value; };
    function comecar() {
      assentos.forEach(s => { if (!s.reino) { const l = livres(); s.reino = l[Math.floor(Math.random() * l.length)]; } });
      assentos.forEach((s, k) => { if (s.humano) s.nome = (s.nome || '').trim().slice(0, 16) || 'Jogador ' + (k + 1); });
      if (c.modo === 'local') store.set('nomes-local', assentos.map(s => s.nome)); else store.set('nome', assentos[0].nome);
      app.oninput = null;
      const jogs = assentos.map(s => s.humano ? { nome: s.nome, tipo: 'humano', reino: s.reino }
        : { nome: NOMES_BOT[s.reino], tipo: 'bot', nivel: c.nivel, personalidade: s.pers, reino: s.reino });
      const st = M.novaPartida({ mapa: c.mapa, meta: c.meta, cartas: c.cartas !== false, objetivos: c.objetivos !== false, eventos: c.eventos !== false }, jogs);
      st.t0 = Date.now();
      iniciarJogo({ st, modo: c.modo, cfg: c });
    }
    app.onclick = e => {
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      if (b.dataset.a === 'voltar') { app.oninput = null; return configurar(c.modo); }
      if (b.dataset.reino) { assentos[ativo].reino = b.dataset.reino; foco = b.dataset.reino; return desenhar(); }
      if (b.dataset.a === 'sortear') return comecar();
      if (b.dataset.a === 'confirmar') {
        const prox = assentos.findIndex((s, k) => k > ativo && s.humano);
        if (!assentos[ativo].reino) { const l = livres(); assentos[ativo].reino = l[Math.floor(Math.random() * l.length)]; }
        if (prox >= 0) { ativo = prox; foco = null; return desenhar(); }
        return comecar();
      }
    };
  }

  /* ================= JOGO ================= */
  let J = null; // { st, modo, cfg, sel, modo:'mover'|'atacar', origem, vb, ultimoHumano }
  function retomar(s) {
    try {
      M.prepararMapa(window.ImperiosMapas[s.st.cfg.mapa]);
      iniciarJogo({ st: s.st, modo: s.modo, cfg: s.cfg, ultimoHumano: s.ultimoHumano });
    } catch (e) { console.error(e); store.del('partida'); toast('Não foi possível continuar a partida salva.', 'erro'); inicio(); }
  }
  function salvar() {
    if (!J) return;
    if (J.st.fase === 'fim') store.del('partida');
    else store.set('partida', { st: J.st, modo: J.modo, cfg: J.cfg, ultimoHumano: J.ultimoHumano });
  }
  const humano = i => J.st.jogadores[i].tipo === 'humano';
  const vezHumana = () => J.st.fase === 'jogo' && humano(J.st.vez);
  const numHumanos = () => J.st.jogadores.filter(j => j.tipo === 'humano').length;

  function iniciarJogo(o) {
    pararBots(); fecharVeu(true);
    J = Object.assign({ sel: null, modo: null, origem: null, ultimoHumano: null, eventos: [] }, o);
    J.mapa = M.mapaDe(J.st);
    J.vb = { x: 0, y: 0, w: J.mapa.W || 1000, h: J.mapa.H || 700 };
    app.onclick = null;
    app.innerHTML = `<div class="jogo">
      <header class="topo" id="topo"></header>
      <main class="mapa" id="mapa">
        <svg id="svg" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid slice" role="application" aria-label="Mapa de ${esc(J.mapa.nome)}"></svg>
        <div class="zoom"><button data-z="in" aria-label="Aproximar">+</button><button data-z="out" aria-label="Afastar">−</button><button data-z="fit" aria-label="Ver o mapa inteiro">⤢</button></div>
        <div class="dica" id="dica" hidden></div>
        <div class="evento-mapa" id="evmapa" aria-live="polite"></div>
      </main>
      <div class="faixa-jog" id="fj" aria-label="Reinos na partida"></div>
      <nav class="barra" id="barra" aria-label="Ações"></nav>
    </div>`;
    montarMapa();
    ligarMapa();
    requestAnimationFrame(() => enquadrar(focoHumano()));
    window.onresize = () => { if (J && $('#mapa')) enquadrar(focoHumano()); };
    $('#barra').onclick = e => { const b = e.target.closest('button'); if (b && !b.disabled) acaoBarra(b.dataset.b); };
    $('#fj').onclick = e => { if (e.target.closest('.cj')) placar(); };
    $('#topo').onclick = e => { const b = e.target.closest('[data-t]'); if (b) acaoTopo(b.dataset.t); };
    $('.zoom').onclick = e => { const b = e.target.closest('[data-z]'); if (b) zoomBotao(b.dataset.z); };
    atualizar();
    salvar();
    proximo();
  }

  /* ---------- desenho do mapa ---------- */
  const pts = p => p.map(q => q[0] + ',' + q[1]).join(' ');
  const COR_TERRENO = { planicie: '#c9c46e', floresta: '#4f8a43', montanha: '#9a8f80', mina: '#c9a447', cidade: '#c98a5a', fortaleza: '#7d6a8a' };
  function escala() { return Math.sqrt(24 / J.mapa.territorios.length); }
  function montarMapa() {
    const m = J.mapa, arte = ARTE[m.id];
    let s = `<defs><filter id="sombra" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.4" flood-opacity=".65"/></filter></defs>`;
    s += `<rect x="-2000" y="-2000" width="5000" height="4700" fill="#0d3a6e"/>`;
    if (arte) s += `<image href="${arte}" x="0" y="0" width="1000" height="700" preserveAspectRatio="none"/>`;
    else {
      m.contorno.forEach(c => { s += `<polygon points="${pts(c)}" fill="#d9c99a" stroke="#6b5530" stroke-width="5"/>`; });
      m.territorios.forEach(t => { s += `<polygon points="${pts(t.poly)}" fill="${COR_TERRENO[t.terreno]}" stroke="#f6edd6" stroke-width="1.6"/>`; });
      m.territorios.forEach(t => t.mar.forEach(o => { if (t.id < o) { const b = m.idx[o]; s += `<line x1="${t.c[0]}" y1="${t.c[1]}" x2="${b.c[0]}" y2="${b.c[1]}" stroke="#fff" stroke-width="2.4" stroke-dasharray="8 6" opacity=".8"/>`; } }));
      m.territorios.forEach(t => { s += `<text x="${t.c[0]}" y="${t.c[1] + 26 * escala()}" font-size="${16 * escala()}" text-anchor="middle" opacity=".55" pointer-events="none">${TERRENOS[t.terreno].ic}</text>`; });
    }
    s += `<g id="g-dono"></g><g id="g-click">${m.territorios.map(t => `<polygon class="ter" data-id="${t.id}" points="${pts(t.poly)}" fill="#fff" fill-opacity="0" tabindex="0" role="button"></polygon>`).join('')}</g>`;
    s += `<g id="g-borda" pointer-events="none"></g><g id="g-marca" pointer-events="none"></g>`;
    $('#svg').innerHTML = s;
    aplicarVB();
  }
  function corDe(i) { return i == null ? null : REINOS[J.st.jogadores[i].reino].cor; }
  function desenharDinamico() {
    const st = J.st, m = J.mapa, k = escala();
    const alvos = J.alvos || {};
    let dono = '', borda = '', marca = '';
    m.territorios.forEach(t => {
      const d = st.terr[t.id], cor = corDe(d.dono);
      if (cor) dono += `<polygon points="${pts(t.poly)}" fill="${cor}" fill-opacity=".38"/>`;
      if (cor) borda += `<polygon class="ter-borda" points="${pts(t.poly)}" stroke="${cor}" stroke-width="${3.2 * k}" stroke-opacity=".95"/>`;
    });
    // destaque de seleção e alvos
    m.territorios.forEach(t => {
      if (alvos[t.id]) borda += `<polygon class="ter-borda" points="${pts(t.poly)}" stroke="${J.modo === 'atacar' ? '#ff5a5a' : '#7dffa0'}" stroke-width="${4.5 * k}" stroke-dasharray="${10 * k} ${6 * k}"/>`;
    });
    if (J.sel) { const t = m.idx[J.sel]; borda += `<polygon class="ter-borda" points="${pts(t.poly)}" stroke="#ffe08a" stroke-width="${6 * k}"/>`; }
    if (J.origem && J.origem !== J.sel) { const t = m.idx[J.origem]; borda += `<polygon class="ter-borda" points="${pts(t.poly)}" stroke="#ffe08a" stroke-width="${5 * k}" stroke-dasharray="4 4"/>`; }
    m.territorios.forEach(t => {
      const d = st.terr[t.id], cx = t.c[0], cy = t.c[1];
      const tam = 34 * k;
      // construções
      const cs = [d.maravilha && 'maravilha', d.def, d.eco, d.porto && 'porto'].filter(Boolean);
      cs.slice(0, 3).forEach((c, n) => {
        const dx = (n - (Math.min(cs.length, 3) - 1) / 2) * tam * 0.8;
        marca += `<image href="${imgC(c)}" x="${cx + dx - tam / 2}" y="${cy - tam * 1.05}" width="${tam}" height="${tam}" filter="url(#sombra)"/>`;
      });
      // capital: brasão do dono
      st.jogadores.forEach(j => {
        if (j.capital === t.id && d.dono === st.jogadores.indexOf(j)) marca += `<image href="${brasao(j.reino)}" x="${cx + tam * 0.55}" y="${cy - tam * 1.25}" width="${tam * 0.62}" height="${tam * 0.7}" filter="url(#sombra)"/>`;
      });
      // bandeira de quem controla o território (a capital já mostra o brasão)
      if (d.dono != null && st.jogadores[d.dono].capital !== t.id) {
        const r = st.jogadores[d.dono].reino;
        marca += `<image href="img/bandeira-${r}.webp" x="${cx - tam * 1.15}" y="${cy - tam * 0.55}" width="${tam * 0.62}" height="${tam * 0.62}" filter="url(#sombra)"/>`;
      }
      // tropas
      const n = M.total(d.u);
      if (n > 0 || d.dono != null) {
        const cor = corDe(d.dono) || '#5b5b5b';
        const r = 12 * k;
        marca += `<g filter="url(#sombra)"><circle cx="${cx}" cy="${cy + r * 0.6}" r="${r}" fill="${cor}" stroke="#ffe08a" stroke-width="${2 * k}"/>
          <text x="${cx}" y="${cy + r * 0.6 + 5.5 * k}" font-size="${15 * k}" font-weight="900" text-anchor="middle" fill="#fff" font-family="Nunito,sans-serif">${n}</text></g>`;
        if (d.u.navio) marca += `<text x="${cx + r * 1.2}" y="${cy + r * 1.3}" font-size="${13 * k}">⛵</text>`;
      }
    });
    $('#g-dono').innerHTML = dono; $('#g-borda').innerHTML = borda; $('#g-marca').innerHTML = marca;
    $$('#g-click .ter').forEach(p => {
      const t = m.idx[p.dataset.id], d = st.terr[t.id];
      const donoN = d.dono == null ? 'neutro' : st.jogadores[d.dono].nome;
      p.setAttribute('aria-label', `${t.nome}, ${TERRENOS[t.terreno].nome}, ${donoN}, ${M.total(d.u)} unidades${alvos[t.id] ? ', destino possível' : ''}`);
    });
  }

  /* ---------- zoom e arraste ---------- */
  function aplicarVB() { const v = J.vb; $('#svg').setAttribute('viewBox', `${v.x} ${v.y} ${v.w} ${v.h}`); }
  function aspecto() { const r = $('#mapa').getBoundingClientRect(); return r.width > 0 ? r.height / r.width : 0.7; }
  function limitarVB() {
    const v = J.vb, W = 1000, H = 700, asp = aspecto();
    const maxW = Math.max(W, H / asp) * 1.15;
    v.w = Math.max(200, Math.min(maxW, v.w)); v.h = v.w * asp;
    const folgaX = Math.max(0, (v.w - W) / 2) + v.w * 0.35, folgaY = Math.max(0, (v.h - H) / 2) + v.h * 0.35;
    v.x = Math.max(-folgaX, Math.min(W - v.w + folgaX, v.x));
    v.y = Math.max(-folgaY, Math.min(H - v.h + folgaY, v.y));
  }
  function zoomEm(f, px, py) {
    const v = J.vb, nw = v.w * f;
    v.x = px - (px - v.x) * nw / v.w; v.y = py - (py - v.y) * (nw * aspecto()) / v.h; v.w = nw; v.h = nw * aspecto();
    limitarVB(); aplicarVB();
  }
  // enquadra o mapa: inteiro na tela larga; no celular em pé, a altura toda centrada no seu reino
  function enquadrar(foco) {
    const asp = aspecto(), W = 1000, H = 700;
    if (asp <= H / W) { const w = H / asp; J.vb = { x: (W - w) / 2, y: 0, w, h: H }; }
    else {
      const w = Math.max(W * 0.6, H / asp), h = w * asp;
      const cx = foco ? foco[0] : W / 2;
      J.vb = { x: Math.max(0, Math.min(W - w, cx - w / 2)), y: (H - h) / 2, w, h };
    }
    limitarVB(); aplicarVB();
  }
  function zoomBotao(z) {
    const v = J.vb;
    if (z === 'fit') return enquadrar(focoHumano());
    zoomEm(z === 'in' ? 0.75 : 1.33, v.x + v.w / 2, v.y + v.h / 2);
  }
  function focoHumano() {
    const i = vezHumana() ? J.st.vez : J.st.jogadores.findIndex(j => j.tipo === 'humano');
    const c = i >= 0 && J.st.jogadores[i].capital; return c ? J.mapa.idx[c].c : null;
  }
  function svgPonto(ev) {
    const svg = $('#svg'), r = svg.getBoundingClientRect(), v = J.vb;
    // o SVG usa "xMidYMid meet": calcula a escala real
    const s = Math.min(r.width / v.w, r.height / v.h);
    const ox = (r.width - v.w * s) / 2, oy = (r.height - v.h * s) / 2;
    return { x: v.x + (ev.clientX - r.left - ox) / s, y: v.y + (ev.clientY - r.top - oy) / s, s };
  }
  function ligarMapa() {
    const svg = $('#svg');
    const ptrs = new Map();
    let arrastou = false, ini = null, pinca = null;
    svg.addEventListener('pointerdown', e => {
      svg.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      arrastou = false;
      ini = { x: e.clientX, y: e.clientY, vb: Object.assign({}, J.vb), alvo: e.target.closest('.ter') };
      if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()];
        pinca = { d: Math.hypot(a.x - b.x, a.y - b.y), vb: Object.assign({}, J.vb), c: svgPonto({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 }) };
      }
    });
    svg.addEventListener('pointermove', e => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size >= 2 && pinca) {
        const [a, b] = [...ptrs.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        J.vb = Object.assign({}, pinca.vb);
        zoomEm(pinca.d / Math.max(20, d), pinca.c.x, pinca.c.y);
        arrastou = true; return;
      }
      const dx = e.clientX - ini.x, dy = e.clientY - ini.y;
      if (!arrastou && Math.hypot(dx, dy) < 7) return;
      arrastou = true;
      const s = svgPonto(e).s;
      J.vb.x = ini.vb.x - dx / s; J.vb.y = ini.vb.y - dy / s;
      limitarVB(); aplicarVB();
    });
    const fim = e => {
      const tinha = ptrs.has(e.pointerId);
      ptrs.delete(e.pointerId);
      if (ptrs.size < 2) pinca = null;
      if (!tinha || ptrs.size) return;
      if (!arrastou && e.type === 'pointerup') {
        const alvo = ini && ini.alvo;
        if (alvo) tocarTerritorio(alvo.dataset.id); else { cancelarModo(); fecharFolha(); }
      }
    };
    svg.addEventListener('pointerup', fim); svg.addEventListener('pointercancel', fim);
    svg.addEventListener('wheel', e => { e.preventDefault(); const p = svgPonto(e); zoomEm(e.deltaY > 0 ? 1.15 : 0.87, p.x, p.y); }, { passive: false });
    svg.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('ter')) { e.preventDefault(); tocarTerritorio(e.target.dataset.id); } });
  }

  /* ---------- topo e barra ---------- */
  function atualizar() {
    if (!J) return;
    const st = J.st, i = st.vez, j = st.jogadores[i];
    // o topo mostra os recursos de quem está jogando (humano); na vez de bot mostra o humano principal
    const ver = vezHumana() ? i : (numHumanos() === 1 ? st.jogadores.findIndex(x => x.tipo === 'humano') : i);
    const jv = st.jogadores[ver];
    const pts = M.pontos(st, ver);
    const nAcoes = vezHumana() ? st.acoes : 0;
    $('#topo').innerHTML = `
      <button class="icone-btn" data-t="menu" aria-label="Menu da partida">☰</button>
      <div class="vez"><img src="${brasao(j.reino)}" alt=""><div><b>${esc(j.nome)}</b><span>Rodada ${st.rodada}${humano(i) ? '' : ' · pensando…'}</span></div></div>
      <div class="acoes" aria-label="${nAcoes} pontos de ação">${Array.from({ length: Math.max(M.AJ.acoes, nAcoes) }, (_, k) => `<i class="${k < nAcoes ? 'on' : ''}"></i>`).join('')}${vezHumana() && st.turno.movGratis && j.reino === 'aguia' ? '<span title="Movimentação gratuita disponível" style="font-size:14px">🦅</span>' : ''}</div>
      <div class="recs" aria-label="Recursos de ${esc(jv.nome)}">${RECURSOS.map(k => `<span class="rec" data-rec="${k}" title="${NOME_REC[k]}">${icR(k)} ${jv.rec[k]}</span>`).join('')}</div>
      ${st.evento ? `<button class="icone-btn ev" data-t="evento" title="Evento mundial: ${esc(eInfo(st.evento.id).nome)}" aria-label="Evento mundial">🌍</button>` : ''}
      ${jv.objetivo && humano(ver) ? `<button class="icone-btn ${jv.objetivo.feito ? 'feito' : ''}" data-t="objetivo" title="Objetivo secreto" aria-label="Objetivo secreto">🎯</button>` : ''}
      <button class="pts" data-t="reino" title="Pontos de império · meta ${st.cfg.meta}">👑 ${pts}/${st.cfg.meta}</button>`;
    const pode = vezHumana() && !J.ocupado;
    const sel = J.sel && st.terr[J.sel].dono === st.vez ? J.sel : null;
    const bt = (id, ic, nome, ok, extra) => `<button data-b="${id}" class="${J.modo === id ? 'on' : ''} ${extra || ''}" ${ok ? '' : 'disabled'}><span class="ic">${ic}</span>${nome}${extra === 'breve' ? '<span class="em-breve">EM BREVE</span>' : ''}</button>`;
    $('#barra').innerHTML = bt('mover', '🚶', 'Mover', pode) + bt('atacar', '⚔️', 'Atacar', pode) + bt('construir', '🏗️', 'Construir', pode) + bt('recrutar', '🛡️', 'Recrutar', pode)
      + bt('mercado', '⚖️', 'Mercado', pode && !st.turno.mercadoUsado) + bt('cartas', '🃏', 'Cartas' + (st.cfg.cartas && humano(ver) ? ` (${jv.mao.length})` : ''), st.cfg.cartas && (pode || numHumanos() === 1)) + bt('diplomacia', '🤝', 'Diplomacia' + (st.propostas.some(p => p.para === ver) ? ' ✉️' : ''), numHumanos() >= 1)
      + bt('fim', '⏭️', 'Encerrar', pode, 'fim');
    $('#fj').innerHTML = st.ordem.concat(st.jogadores.map((_, k) => k).filter(k => !st.ordem.includes(k))).map(k => {
      const x = st.jogadores[k];
      return `<button class="cj ${k === i ? 'vez' : ''} ${x.eliminado ? 'morto' : ''}" style="--c:${REINOS[x.reino].cor}" data-j="${k}" title="${esc(REINOS[x.reino].nome)}">
        <b>${esc(x.nome)}</b><img src="img/bandeira-${x.reino}.webp" alt=""><span class="nums-j"><span>⛑️${M.unidadesDe(st, k)}</span><span>🏰${M.territoriosDe(st, k).length}</span></span><span>👑 ${M.pontos(st, k)}</span></button>`;
    }).join('');
    desenharDinamico();
  }

  function dica(txt, cancelar) {
    const d = $('#dica');
    if (!txt) { d.hidden = true; return; }
    d.hidden = false;
    d.innerHTML = `<span>${txt}</span>${cancelar ? '<button data-cancelar>Cancelar</button>' : ''}`;
    d.onclick = e => { if (e.target.closest('[data-cancelar]')) { cancelarModo(); } };
  }
  function cancelarModo() { if (!J) return; J.modo = null; J.origem = null; J.alvos = null; dica(null); atualizar(); }

  function acaoTopo(t) {
    if (t === 'reino') return gestaoReino();
    if (t === 'objetivo') return telaObjetivo();
    if (t === 'evento') return telaEvento(J.st.evento.id, false);
    if (t === 'menu') {
      veu(`<button class="fechar" aria-label="Fechar">×</button><h2 class="titulo">Menu</h2>
        <div class="menu" style="margin:auto">
          <button class="btn" data-m="reino"><span class="ic">👑</span>Meu reino</button>
          <button class="btn" data-m="hist"><span class="ic">📜</span>Histórico</button>
          <button class="btn" data-m="placar"><span class="ic">🏆</span>Placar</button>
          <button class="btn claro" data-m="regras"><span class="ic">📖</span>Como jogar</button>
          <button class="btn claro" data-m="tut"><span class="ic">🧭</span>Primeiros passos</button>
          <button class="btn claro" data-m="config"><span class="ic">⚙️</span>Configurações</button>
          <button class="btn vinho" data-m="sair"><span class="ic">🚪</span>Sair (a partida fica salva)</button>
        </div>`);
      $('#veu').onclick = e => {
        if (e.target.id === 'veu' || e.target.closest('.fechar')) return fecharVeu();
        const b = e.target.closest('[data-m]'); if (!b) return;
        const m = b.dataset.m;
        if (m === 'reino') gestaoReino();
        else if (m === 'hist') historico();
        else if (m === 'placar') placar();
        else if (m === 'regras') comoJogar(true);
        else if (m === 'tut') tutorial(true);
        else if (m === 'config') configuracoes();
        else if (m === 'sair') { fecharVeu(true); salvar(); J = null; inicio(); }
      };
    }
  }

  function acaoBarra(b) {
    const st = J.st;
    if (b === 'diplomacia') return telaDiplomacia();
    if (b === 'cartas' && !vezHumana()) return telaCartas();
    if (!vezHumana()) return;
    const meu = J.sel && st.terr[J.sel].dono === st.vez ? J.sel : null;
    if (b === 'fim') return confirmarFim();
    if (b === 'mercado') return mercado();
    if (b === 'cartas') return telaCartas();
    if (b === 'diplomacia') return telaDiplomacia();
    if (b === 'mover' || b === 'atacar') {
      if (J.modo === b) return cancelarModo();
      if (meu) return iniciarModo(b, meu);
      J.modo = b; J.origem = null; J.alvos = null;
      dica(b === 'mover' ? 'Toque no território de onde as tropas vão sair.' : 'Toque no território de onde vai sair o ataque.', true);
      return atualizar();
    }
    if (b === 'construir' || b === 'recrutar') {
      if (meu) return b === 'construir' ? construir(meu) : recrutar(meu);
      J.modo = b; dica(b === 'construir' ? 'Toque no território seu onde quer construir.' : 'Toque num castelo, cidade ou porto seu para recrutar.', true);
      return atualizar();
    }
  }

  function iniciarModo(tipo, de) {
    const st = J.st, i = st.vez, o = st.terr[de];
    if (!M.total(o.u)) { toast('Não há tropas neste território.', 'erro'); return; }
    J.modo = tipo; J.origem = de; J.sel = de;
    const alvos = {};
    if (tipo === 'mover') {
      const terra = Object.assign({}, o.u); terra.navio = 0;
      if (M.total(terra)) {
        // maior alcance possível: só a cavalaria, se houver; senão o grupo todo
        const grupo = terra.cavalaria ? { cavalaria: terra.cavalaria } : terra;
        Object.keys(M.destinosTerra(st, i, de, grupo)).forEach(x => { alvos[x] = 1; });
        Object.keys(M.destinosTerra(st, i, de, terra)).forEach(x => { alvos[x] = 1; });
      }
      if (o.u.navio) M.infoT(st, de).mar.forEach(x => { const t = st.terr[x]; if (t.dono === i || (t.dono == null && !M.total(t.u))) alvos[x] = 1; });
    } else M.alvosAtaque(st, i, de).forEach(x => { if (M.infoT(st, de).viz.includes(x) || o.u.navio) alvos[x] = 1; });
    J.alvos = alvos;
    fecharFolha();
    if (!Object.keys(alvos).length) {
      toast(tipo === 'mover' ? 'Nenhum destino ao alcance destas tropas.' : 'Nenhum alvo vizinho para atacar daqui.', 'erro');
      J.modo = null; J.origem = null; J.alvos = null; atualizar(); return;
    }
    dica(tipo === 'mover' ? '🟢 Toque no destino (território seu ou neutro livre).' : '🔴 Toque no território que quer atacar.', true);
    atualizar();
  }

  function tocarTerritorio(id) {
    const st = J.st;
    if (J.modo && vezHumana()) {
      if ((J.modo === 'mover' || J.modo === 'atacar')) {
        if (!J.origem) {
          if (st.terr[id].dono !== st.vez) { toast('Escolha um território seu.', 'erro'); return; }
          return iniciarModo(J.modo, id);
        }
        if (J.alvos && J.alvos[id]) return escolherUnidades(J.modo, J.origem, id);
        if (st.terr[id].dono === st.vez && id !== J.origem) return iniciarModo(J.modo, id);
        if (id === J.origem) { cancelarModo(); return abrirFolha(id); }
        toast(J.modo === 'mover' ? 'Esse destino não está ao alcance.' : 'Esse território não pode ser atacado daqui.', 'erro');
        return;
      }
      if (J.modo === 'construir' || J.modo === 'recrutar') {
        if (st.terr[id].dono !== st.vez) { toast('Escolha um território seu.', 'erro'); return; }
        const m = J.modo; cancelarModo(); J.sel = id; atualizar();
        return m === 'construir' ? construir(id) : recrutar(id);
      }
    }
    J.sel = id; atualizar(); abrirFolha(id);
  }

  /* ---------- folha do território ---------- */
  function fecharFolha() { const f = $('#folha'); if (f) f.remove(); if (J && J.sel && !J.modo) { J.sel = null; atualizar(); } }
  function abrirFolha(id) {
    const st = J.st, t = J.mapa.idx[id], d = st.terr[id], ter = TERRENOS[t.terreno];
    const dono = d.dono == null ? null : st.jogadores[d.dono];
    const meu = d.dono === st.vez && vezHumana();
    const prodN = ter.prod ? M.AJ.prodBase + (d.eco === 'vila' ? 1 : d.eco === 'cidade' ? 2 : 0) : 0;
    const prodTxt = !ter.prod ? 'nenhuma' : t.terreno === 'cidade' ? `${prodN - 1}${IC_REC.ouro} + 1${IC_REC.alimento}` : `${prodN} ${IC_REC[ter.prod]}`;
    const f = M.forcas(st, -1, id, id, M.vazioU());
    const bonus = [ter.def ? `${ter.nome} +${ter.def}` : '', d.def ? `${CONSTR[d.def].nome} +${CONSTR[d.def].def}` : '', f.lobo ? 'Capital do Lobo +3' : ''].filter(Boolean).join(' · ') || 'nenhum';
    const capitalDe = st.jogadores.find(j => j.capital === id && st.terr[id].dono === st.jogadores.indexOf(j));
    const origDe = st.jogadores.find(j => j.capitalOriginal === id);
    const cons = [d.eco, d.def, d.porto && 'porto', d.maravilha && 'maravilha'].filter(Boolean);
    let acoes = '';
    if (meu) {
      const temTropa = M.total(d.u) > 0;
      const rec = M.tiposRecrutaveis(st, id).length > 0;
      acoes = `<div class="acoes-t">
        <button class="btn" data-f="mover" ${temTropa ? '' : 'disabled'}>🚶 Mover tropas</button>
        <button class="btn vinho" data-f="atacar" ${temTropa && M.alvosAtaque(st, st.vez, id).length ? '' : 'disabled'}>⚔️ Atacar</button>
        <button class="btn" data-f="recrutar" ${rec ? '' : 'disabled'}>🛡️ Recrutar</button>
        <button class="btn" data-f="construir">🏗️ Construir</button></div>
        ${!temTropa ? '<p class="motivo">Sem tropas: o território está vulnerável.</p>' : ''}
        ${!rec ? '<p class="motivo">Recrutamento só em castelo, cidade (infantaria e arqueiro) ou porto (navio).</p>' : ''}`;
    } else if (vezHumana()) {
      const origens = M.territoriosDe(st, st.vez).filter(x => M.total(st.terr[x].u) && M.alvosAtaque(st, st.vez, x).includes(id));
      if (origens.length) acoes = `<p class="meta" style="margin:8px 0 4px">Atacar a partir de:</p><div class="acoes-t">${origens.map(x => `<button class="btn vinho" data-atq="${x}">⚔️ ${esc(J.mapa.idx[x].nome)}</button>`).join('')}</div>`;
      else if (d.dono == null && !M.total(d.u)) {
        const vizinhos = M.territoriosDe(st, st.vez).filter(x => M.total(st.terr[x].u) && M.infoT(st, x).viz.includes(id));
        if (vizinhos.length) acoes = `<p class="meta" style="margin:8px 0 4px">Território livre. Ocupar a partir de:</p><div class="acoes-t">${vizinhos.map(x => `<button class="btn" data-ocupar="${x}">🚩 ${esc(J.mapa.idx[x].nome)}</button>`).join('')}</div>`;
      }
    }
    const el = document.createElement('section');
    el.className = 'folha'; el.id = 'folha'; el.setAttribute('aria-label', 'Detalhes do território');
    el.innerHTML = `<button class="fechar" aria-label="Fechar">×</button>
      <h2>${ter.ic} ${esc(t.nome)}</h2>
      <div class="meta">${dono ? `<img src="${brasao(dono.reino)}" alt="" style="width:18px;vertical-align:-4px"> ${esc(dono.nome)} · ${esc(REINOS[dono.reino].curto)}` : (M.total(d.u) ? 'Neutro com guarnição' : 'Neutro e livre')}
        ${capitalDe ? ' · 👑 Capital' : ''}${origDe && (!capitalDe || origDe !== capitalDe) ? ` · capital original de ${esc(origDe.nome)}` : ''}${t.costa ? ' · 🌊 costeiro' : ''}</div>
      <div class="grade">
        <div class="cx"><b>Terreno</b>${ter.nome}</div>
        <div class="cx"><b>Produção por turno</b>${prodTxt}</div>
        <div class="cx"><b>Bônus de defesa</b>${bonus}</div>
        <div class="cx"><b>Defesa total</b>${f.def} + dado</div>
      </div>
      <div class="cx" style="margin-bottom:8px"><b>Unidades</b>${M.total(d.u) ? `<div class="unidades">${TIPOS_U.filter(k => d.u[k]).map(k => `<span class="uni"><img src="${imgU(k)}" alt="">${d.u[k]} ${UNIDADES[k].nome}</span>`).join('')}</div>` : 'nenhuma'}</div>
      ${(() => { const ef = J.st.efeitos.filter(x => x.t === id).map(x => ({ muralha: '🧱 Muralha Reforçada (+3 de defesa)', revolta: '🔥 Revolta: não produz no próximo turno', bloqueio: '⛓️ Bloqueio naval' })[x.tipo]).filter(Boolean);
        const tr = d.dono != null && d.dono !== st.vez && vezHumana() ? M.emTratado(st, st.vez, d.dono) : null;
        return ef.length || tr ? `<div class="cx" style="margin-bottom:8px"><b>Situação</b>${ef.join('<br>')}${tr ? `${ef.length ? '<br>' : ''}📜 Você tem ${M.NOME_TRATADO[tr.tipo]} com este reino` : ''}</div>` : ''; })()}
      <div class="cx"><b>Construções</b>${cons.length ? `<div class="constrs">${cons.map(c => `<img src="${imgC(c)}" alt="${CONSTR[c].nome}" title="${CONSTR[c].nome}">`).join('')}</div>` : 'nenhuma'}</div>
      ${acoes}`;
    fecharFolhaSo();
    document.body.appendChild(el);
    el.onclick = e => {
      if (e.target.closest('.fechar')) return fecharFolha();
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      if (b.dataset.f === 'mover' || b.dataset.f === 'atacar') iniciarModo(b.dataset.f, id);
      else if (b.dataset.f === 'recrutar') recrutar(id);
      else if (b.dataset.f === 'construir') construir(id);
      else if (b.dataset.atq) { J.modo = 'atacar'; J.origem = b.dataset.atq; J.alvos = { [id]: 1 }; fecharFolhaSo(); escolherUnidades('atacar', b.dataset.atq, id); }
      else if (b.dataset.ocupar) { J.modo = 'mover'; J.origem = b.dataset.ocupar; J.alvos = { [id]: 1 }; fecharFolhaSo(); escolherUnidades('mover', b.dataset.ocupar, id); }
    };
  }
  function fecharFolhaSo() { const f = $('#folha'); if (f) f.remove(); }

  /* ---------- escolher unidades (mover / atacar) ---------- */
  // lado do confronto: governante, placa do reino e papel (atacante/defensor)
  function ladoVS(jIdx, papel) {
    if (jIdx == null) return `<div class="vs-lado" style="--c:#555"><div class="busto" style="display:flex;align-items:center;justify-content:center;font-size:54px;background:#2b2f3a">🏳️</div><div class="placa-vs">Guarnição neutra</div><em>${papel}</em></div>`;
    const r = J.st.jogadores[jIdx].reino;
    return `<div class="vs-lado" style="--c:${REINOS[r].cor}"><img class="busto" src="img/busto-${r}.webp" alt=""><div class="placa-vs"><img src="${brasao(r)}" alt="">${esc(REINOS[r].curto)}</div><em>${papel} · ${esc(J.st.jogadores[jIdx].nome)}</em></div>`;
  }
  function escolherUnidades(tipo, de, para) {
    const st = J.st, i = st.vez, o = st.terr[de];
    const porMar = !M.infoT(st, de).viz.includes(para);
    const disp = TIPOS_U.filter(k => o.u[k] > 0 && (porMar || k !== 'navio'));
    const q = {};
    disp.forEach(k => { q[k] = o.u[k]; });
    if (tipo === 'mover' && st.terr[para].dono == null && !porMar) { disp.forEach(k => { q[k] = 0; }); q[disp.find(k => k !== 'navio') || disp[0]] = 1; }
    const nomeDe = J.mapa.idx[de].nome, nomePara = J.mapa.idx[para].nome;
    let carta = null;
    const temSurpresa = tipo === 'atacar' && st.cfg.cartas && st.jogadores[i].mao.includes('ataque-surpresa') && st.turno.cartasUsadas < 2;
    function html() {
      const u = M.limparU(q);
      const v = M.validar(st, i, carta ? { t: tipo, de, para, u, carta } : { t: tipo, de, para, u });
      let extra = '';
      if (tipo === 'atacar' && M.total(u)) {
        const f = M.forcas(st, i, de, para, u), p = M.chance(st, i, de, para, u);
        extra = `<div class="chance">Ataque ${f.atq} + dado × Defesa ${f.def} + dado · <span style="color:${p >= .6 ? '#4cc36b' : p >= .35 ? '#f0c75e' : '#e5484d'}">${Math.round(p * 100)}% de vitória</span>
          <div class="barra-c"><i style="width:${Math.round(p * 100)}%"></i></div></div>
          <p class="nota">Defesa: unidades ${f.defU}${f.terreno ? ` · terreno +${f.terreno}` : ''}${f.fort || f.reducao ? ` · fortificação +${f.fort}${f.reducao ? ` (catapulta −${f.reducao})` : ''}` : ''}${f.lobo ? ' · Lobo +3' : ''}. Empate favorece o defensor.</p>`;
      }
      const ficam = M.total(o.u) - M.total(u);
      if (tipo === 'mover') {
        const td = J.mapa.idx[para], dd = st.terr[para], ter = TERRENOS[td.terreno];
        const dist = porMar ? 1 : (M.destinosTerra(st, i, de, M.total(u) ? u : { infantaria: 1 })[para] || 1);
        const ocupa = dd.dono == null;
        const cartaoT = (rot, id, cls) => { const t = J.mapa.idx[id], x = st.terr[id]; return `<div class="mv-t ${cls}"><span class="ic">${TERRENOS[t.terreno].ic}</span><div><b>${rot}</b><strong>${esc(t.nome)}</strong><small>${M.total(x.u)} tropa(s)${x.dono == null ? ' · neutro' : ''}</small></div></div>`; };
        return `<button class="fechar" aria-label="Fechar">×</button>
        <div class="faixa-modal"><span>👣 Movimentação de tropas</span></div><small>Escolha a quantidade de tropas para mover</small>
        <div class="mv-od">${cartaoT('Origem (A)', de, 'a')}<span class="seta">»</span>${cartaoT('Destino (B)', para, 'b')}</div>
        <div class="mv-sub">Tropas disponíveis em ${esc(nomeDe)}</div>
        <div class="escolha">${disp.map(k => `<div class="esc ${q[k] ? 'on' : ''}"><img src="${imgU(k)}" alt="">
          <div class="info"><b>${UNIDADES[k].nome}</b>${o.u[k]} disponível(is) · anda ${UNIDADES[k].m}</div>
          <div class="passo"><button data-m="${k}" aria-label="Menos ${UNIDADES[k].nome}">−</button><span>${q[k]}</span><button data-p="${k}" aria-label="Mais ${UNIDADES[k].nome}">+</button></div></div>`).join('')}</div>
        <div class="mv-res">
          <div><b>ℹ️ Resumo da ação</b><span>👣 Distância: ${dist} território(s)${porMar ? ' pelo mar' : ''}</span><span>⏳ Custo: ${v.ok && v.custo === 0 ? 'grátis (Águia)' : '1 ponto de ação'}</span><span>🚩 ${ocupa ? 'Ocupa o território neutro' : 'Chegada imediata'}</span><span>🛡️ Ficam ${ficam} em ${esc(nomeDe)}</span></div>
          <div><b>⛰️ Terreno do destino</b><strong>${ter.nome}</strong><span>${ter.def ? '+' + ter.def + ' de defesa' : 'sem bônus de defesa'}</span>${td.costa ? '<span>🌊 costeiro</span>' : ''}</div></div>
        ${porMar ? '<p class="nota" style="text-align:center">Pelo mar: 1 navio leva até 3 unidades terrestres.</p>' : ''}
        ${ficam === 0 ? '<p class="motivo" style="color:#ffb3b3;text-align:center">⚠️ A origem vai ficar sem tropas.</p>' : ''}
        ${!v.ok ? `<p class="motivo" style="color:#ff8a8a;text-align:center">${esc(v.erro)}</p>` : ''}
        <div class="linha" style="justify-content:center;margin-bottom:8px"><button class="btn claro peq" data-tudo>Mover todas</button></div>
        <div class="botoes-rodape"><button class="bm azul" data-x>↩ Cancelar</button><button class="bm verde" data-ok ${v.ok ? '' : 'disabled'}>✥ Confirmar movimentação</button></div>`;
      }
      if (tipo === 'atacar') {
        const f = M.forcas(st, i, de, para, u, carta), p = M.chance(st, i, de, para, u, carta), pc = Math.round(p * 100);
        const dono = st.terr[para].dono, du = st.terr[para].u;
        return `<button class="fechar" aria-label="Fechar">×</button>
        <div class="faixa-modal"><span>⚔️ Batalha</span></div>
        <div class="vs-topo">${ladoVS(i, 'Atacante')}<div class="vs">VS</div>${ladoVS(dono, 'Defensor')}</div>
        <div class="local-b">⛰️ Confronto em ${esc(nomePara)}${porMar ? ' · 🌊 pelo mar' : ''}</div>
        <div class="escolha">${disp.map(k => `<div class="esc"><img src="${imgU(k)}" alt="">
          <div class="info"><b>${UNIDADES[k].nome}</b>Ataque ${UNIDADES[k].a} · Defesa ${UNIDADES[k].d}</div>
          <div class="passo"><button data-m="${k}" aria-label="Menos ${UNIDADES[k].nome}">−</button><span>${q[k]}</span><button data-p="${k}" aria-label="Mais ${UNIDADES[k].nome}">+</button></div></div>`).join('')}</div>
        <p class="nota" style="text-align:center">Defensores: ${M.total(du) ? M.descU(du) : 'nenhum'} · ficam ${ficam} unidade(s) em ${esc(nomeDe)}</p>
        <div class="forcas"><div><b>Força de ataque</b><strong>${f.atq}</strong>
            <div class="bonus"><div><span>Unidades</span><span>${f.atq - (f.bonusAtq || 0)}</span></div>${f.bonusAtq ? `<div><span>Ataque Surpresa</span><span>+${f.bonusAtq}</span></div>` : ''}<div><span>Dado</span><span>+1 a 3</span></div>${f.reducao ? `<div><span>Catapulta</span><span>−${f.reducao} fortif.</span></div>` : ''}</div></div>
          <div class="def"><b>Força de defesa</b><strong>${f.def}</strong>
            <div class="bonus"><div><span>Unidades</span><span>${f.defU}</span></div><div><span>Terreno</span><span>+${f.terreno}</span></div><div><span>Fortificação</span><span>+${f.fort}</span></div>${f.lobo ? '<div><span>Capital do Lobo</span><span>+3</span></div>' : ''}${f.muralha ? `<div><span>Muralha Reforçada</span><span>+${f.muralha}</span></div>` : ''}<div><span>Dado</span><span>+1 a 3</span></div></div></div></div>
        <div class="prob"><b>ℹ️ Probabilidade de vitória</b><div class="bar"><i style="width:${Math.max(pc, 14)}%">${pc}%</i><i>${100 - pc}%</i></div></div>
        <p class="nota" style="text-align:center">Empate favorece o defensor.</p>
        ${!v.ok ? `<p class="motivo" style="color:#ff8a8a;text-align:center">${esc(v.erro)}</p>` : ''}
        <div class="acoes-b"><button class="bm ${carta ? 'ouro' : 'azul'}" data-surpresa ${temSurpresa ? '' : 'disabled'} title="${temSurpresa ? 'Ataque Surpresa: +3 de ataque' : 'Você não tem Ataque Surpresa'}">🃏 ${carta ? 'Surpresa ✔' : 'Usar carta'}</button><button class="bm vermelho" data-ok ${v.ok ? '' : 'disabled'}>⚔️ Atacar</button><button class="bm azul" data-x>↩ Cancelar</button></div>`;
      }
      return `<button class="fechar" aria-label="Fechar">×</button>
        <h2 class="titulo">${tipo === 'mover' ? '🚶 Mover tropas' : '⚔️ Atacar'}</h2>
        <p class="sub">${esc(nomeDe)} → <b>${esc(nomePara)}</b>${porMar ? ' · 🌊 pelo mar' : ''}</p>
        <div class="escolha">${disp.map(k => `<div class="esc"><img src="${imgU(k)}" alt="">
          <div class="info"><b>${UNIDADES[k].nome}</b>Ataque ${UNIDADES[k].a} · Defesa ${UNIDADES[k].d} · Mov. ${UNIDADES[k].m}</div>
          <div class="passo"><button data-m="${k}" aria-label="Menos ${UNIDADES[k].nome}">−</button><span>${q[k]}</span><button data-p="${k}" aria-label="Mais ${UNIDADES[k].nome}">+</button></div></div>`).join('')}</div>
        ${porMar ? '<p class="nota">Pelo mar: 1 navio leva até 3 unidades terrestres.</p>' : ''}
        ${extra}
        <p class="nota">${ficam === 0 && tipo === 'mover' ? '⚠️ A origem vai ficar sem tropas.' : `Ficam ${ficam} unidade(s) em ${esc(nomeDe)}.`}</p>
        ${!v.ok ? `<p class="motivo" style="color:#ff8a8a">${esc(v.erro)}</p>` : ''}
        <div class="linha"><button class="btn claro" data-tudo>Todas</button>
          <button class="btn ${tipo === 'atacar' ? 'vinho' : 'ouro'}" style="flex:1" data-ok ${v.ok ? '' : 'disabled'}>${tipo === 'mover' ? 'Confirmar movimento' : 'Atacar!'} ${v.custo === 0 ? '(grátis)' : '(1 ação)'}</button></div>`;
    }
    const d = veu(html(), () => {}, 'real');
    const redesenhar = () => { d.querySelector('.modal').innerHTML = html(); };
    d.onclick = e => {
      if (e.target === d || e.target.closest('.fechar') || e.target.closest('[data-x]')) return fecharVeu();
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      if (b.dataset.surpresa != null) { carta = carta ? null : 'ataque-surpresa'; return redesenhar(); }
      if (b.dataset.m) { q[b.dataset.m] = Math.max(0, q[b.dataset.m] - 1); redesenhar(); }
      else if (b.dataset.p) { q[b.dataset.p] = Math.min(o.u[b.dataset.p], q[b.dataset.p] + 1); redesenhar(); }
      else if (b.dataset.tudo != null) { disp.forEach(k => { q[k] = o.u[k]; }); redesenhar(); }
      else if (b.dataset.ok != null) {
        fecharVeu(true);
        J.modo = null; J.origem = null; J.alvos = null; dica(null);
        executar(carta ? { t: tipo, de, para, u: M.limparU(q), carta } : { t: tipo, de, para, u: M.limparU(q) });
      }
    };
  }

  /* ---------- recrutar ---------- */
  const DESC_U = {
    infantaria: 'Tropa versátil e barata. Boa para conquistar e defender.',
    arqueiro: 'Especialista em defesa: protege bem os territórios.',
    cavalaria: 'Ataque forte; sozinha anda 2 territórios.',
    catapulta: 'Arma de cerco: reduz em até 2 o bônus de fortaleza e castelo.',
    navio: 'Leva até 3 unidades terrestres pelas rotas marítimas.',
  };
  function recrutar(em) {
    const st = J.st, i = st.vez, j = st.jogadores[i];
    const tipos = M.tiposRecrutaveis(st, em);
    if (!tipos.length) { toast('Recrute em castelo, cidade (infantaria e arqueiro) ou porto (navio).', 'erro'); return; }
    const q = {}; tipos.forEach(k => { q[k] = 0; });
    function html() {
      const u = M.limparU(q), c = M.custoRecruta(st, i, u), n = M.total(u);
      const v = M.validar(st, i, { t: 'recrutar', em, u });
      const manut = Math.ceil((M.unidadesDe(st, i) + M.totalTerra(u)) / 3);
      return `<button class="fechar" aria-label="Fechar">×</button>
        <div class="faixa-modal"><span>Recrutamento de tropas</span></div><small>${esc(J.mapa.idx[em].nome)} · até ${M.MAX_RECRUTA} unidades por recrutamento</small>
        <div class="recs" style="justify-content:center">${RECURSOS.map(k => `<span class="rec">${icR(k)} ${j.rec[k]}</span>`).join('')}</div>
        <div class="linha" style="justify-content:space-between;margin:8px 0;font-weight:900;font-size:13px"><span class="pa">⚡ Pontos de ação: <b style="color:var(--ouro)">${st.acoes}</b></span><span class="nota">Cada recrutamento consome 1 ponto de ação.</span></div>
        <div class="lista-rec">${tipos.map(k => `<div class="lr ${q[k] ? 'on' : ''}">
          <img src="${imgU(k)}" alt="">
          <div class="lr-info"><b>${UNIDADES[k].nome}</b><p>${DESC_U[k]}</p><span>⚔️ ${UNIDADES[k].a} · 🛡️ ${UNIDADES[k].d} · 👣 ${UNIDADES[k].m}</span></div>
          <div class="lr-qtd"><small>Custo por unidade</small><span class="custo">${fmtCusto(UNIDADES[k].custo)}</span>
            <div class="passo"><button data-m="${k}" aria-label="Menos ${UNIDADES[k].nome}">−</button><span>${q[k]}</span><button data-p="${k}" aria-label="Mais ${UNIDADES[k].nome}">+</button></div></div></div>`).join('')}</div>
        ${j.reino === 'leao' && st.turno.infDesc ? '<p class="nota">🦁 Leão: a primeira infantaria deste turno custa 1 ouro a menos.</p>' : ''}
        <div class="resumo-rec"><span>🛒 <b>Resumo</b></span><span>Unidades: <b>${n}</b>/${M.MAX_RECRUTA}</span><span>Total: <b class="custo ${n && !M.temRec(j.rec, c) ? 'falta' : ''}">${n ? fmtCusto(c) : '—'}</b></span></div>
        <p class="nota" style="text-align:center">Manutenção depois: ${manut} ${icR('alimento')} por turno</p>
        ${n && !v.ok ? `<p class="motivo" style="color:#ff8a8a;text-align:center">${esc(v.erro)}</p>` : ''}
        <div class="botoes-rodape"><button class="bm azul" data-x>↩ Cancelar</button><button class="bm vermelho" data-ok ${n && v.ok ? '' : 'disabled'}>⚔️ Confirmar recrutamento</button></div>`;
    }
    const d = veu(html(), null, 'real');
    const red = () => { d.querySelector('.modal').innerHTML = html(); };
    d.onclick = e => {
      if (e.target === d || e.target.closest('.fechar') || e.target.closest('[data-x]')) return fecharVeu();
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      const tot = M.total(M.limparU(q));
      if (b.dataset.m) { q[b.dataset.m] = Math.max(0, q[b.dataset.m] - 1); red(); }
      else if (b.dataset.p) { if (tot < M.MAX_RECRUTA) q[b.dataset.p]++; else toast(`Máximo de ${M.MAX_RECRUTA} unidades por recrutamento.`, 'erro'); red(); }
      else if (b.dataset.ok != null) { fecharVeu(true); executar({ t: 'recrutar', em, u: M.limparU(q) }); }
    };
  }

  /* ---------- construir ---------- */
  const INFO_C = {
    vila: { txt: 'Aumenta a produção do território.', antes: t => `Produção ${prodDe(t)}`, depois: t => `Produção ${prodDe(t, 1)}` },
    cidade: { txt: 'Evolução da vila: mais produção, mais pontos e recruta infantaria e arqueiros.', antes: t => `Produção ${prodDe(t)}`, depois: t => `Produção ${prodDe(t, 2)}` },
    fortaleza: { txt: 'Muralhas que dão +3 de defesa ao território.', antes: () => 'Defesa +0', depois: () => 'Defesa +3' },
    castelo: { txt: 'A grande defesa (+4) e o único lugar que recruta cavalaria e catapultas. Substitui a fortaleza.', antes: t => `Defesa +${t.def ? CONSTR[t.def].def : 0}`, depois: () => 'Defesa +4' },
    porto: { txt: 'Recruta navios, abre as rotas marítimas e melhora o mercado para 2 por 1.', antes: () => 'Mercado 3 por 1', depois: () => 'Mercado 2 por 1' },
    maravilha: { txt: 'Monumento de prestígio: 12 pontos de império. Apenas uma por reino, em território com cidade.', antes: () => '—', depois: () => '+12 pontos' },
  };
  let J_em = null;
  function prodDe(t, extra) {
    const info = J.mapa.idx[J_em], ter = TERRENOS[info.terreno];
    if (!ter.prod) return 'nenhuma';
    const n = M.AJ.prodBase + (extra != null ? extra : (t.eco === 'vila' ? 1 : t.eco === 'cidade' ? 2 : 0));
    return info.terreno === 'cidade' ? `${n - 1}${icR('ouro')}+1${icR('alimento')}` : `${n} ${icR(ter.prod)}`;
  }
  function construir(em) {
    const st = J.st, i = st.vez, j = st.jogadores[i], t = st.terr[em];
    J_em = em;
    const dispo = k => !M.motivoNaoConstruir(st, i, em, k) && M.temRec(j.rec, M.custoConstr(st, i, k));
    let sel = TIPOS_C.find(k => dispo(k)) || TIPOS_C.find(k => !M.motivoNaoConstruir(st, i, em, k)) || 'vila';
    function html() {
      const c = M.custoConstr(st, i, sel), mot = M.motivoNaoConstruir(st, i, em, sel), tem = M.temRec(j.rec, c), ok = !mot && tem;
      const jaTem = { vila: t.eco === 'vila' || t.eco === 'cidade', cidade: t.eco === 'cidade', fortaleza: t.def === 'fortaleza' || t.def === 'castelo', castelo: t.def === 'castelo', porto: t.porto, maravilha: t.maravilha };
      return `<button class="fechar" aria-label="Fechar">×</button>
        <div class="faixa-modal"><span>🏰 Construção e melhorias</span></div><small>${esc(J.mapa.idx[em].nome)} · desenvolva seus territórios e fortaleça seu império</small>
        <div class="recs" style="justify-content:center">${RECURSOS.map(k => `<span class="rec">${icR(k)} ${j.rec[k]}</span>`).join('')}</div>
        <div class="cons-grade">
          <div class="cons-lista">${TIPOS_C.map(k => `<button class="cl ${k === sel ? 'on' : ''} ${dispo(k) ? '' : 'indisp'}" data-c="${k}">
            <img src="${imgC(k)}" alt=""><span><b>${CONSTR[k].nome}</b><small>${jaTem[k] ? '✅ construída' : M.motivoNaoConstruir(st, i, em, k) ? '🔒 indisponível' : dispo(k) ? '✨ disponível' : '💰 faltam recursos'}</small></span></button>`).join('')}</div>
          <div class="cons-det">
            <div class="cd-topo"><img src="${imgC(sel)}" alt=""><div><h3>${CONSTR[sel].nome}</h3><p>${INFO_C[sel].txt}</p></div></div>
            <div class="cd-box"><b>Agora → Depois</b><div class="niveis"><span class="n1">${INFO_C[sel].antes(t)}</span><span class="set">»»</span><span class="n2">${INFO_C[sel].depois(t)}</span></div></div>
            <div class="cd-box"><b>Custo</b><div class="custo-g ${tem ? '' : 'falta'}">${fmtCusto(c)}</div></div>
            <div class="cd-box"><b>Pré-requisito</b><div>${mot ? '🔒 ' + esc(mot) : tem ? '✅ Nenhum (disponível)' : '💰 Recursos insuficientes'}</div></div>
            <div class="cd-box"><b>Pontos de império</b><div>👑 ${CONSTR[sel].pts}${sel === 'cidade' ? ' (substitui o ponto da vila)' : sel === 'castelo' && t.def === 'fortaleza' ? ' (substitui os 2 da fortaleza)' : ''}</div></div>
          </div>
        </div>
        ${j.reino === 'dragao' && st.turno.constDesc ? '<p class="nota" style="text-align:center">🐉 Dragão: a primeira construção deste turno custa 1 pedra a menos.</p>' : ''}
        <div class="botoes-rodape"><button class="bm azul" data-x>↩ Voltar</button><button class="bm verde" data-ok ${ok ? '' : 'disabled'}>🔨 Construir (1 ação)</button></div>`;
    }
    const d = veu(html(), null, 'real');
    d.onclick = e => {
      if (e.target === d || e.target.closest('.fechar') || e.target.closest('[data-x]')) return fecharVeu();
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      if (b.dataset.c) { sel = b.dataset.c; d.querySelector('.modal').innerHTML = html(); }
      else if (b.dataset.ok != null) { fecharVeu(true); executar({ t: 'construir', em, tipo: sel }); }
    };
  }

  /* ---------- mercado ---------- */
  function mercado() {
    const st = J.st, i = st.vez, j = st.jogadores[i];
    const taxa = M.taxaMercado(st, i);
    let dar = RECURSOS.slice().sort((a, b) => j.rec[b] - j.rec[a])[0], receber = RECURSOS.find(k => k !== dar), qtd = 1;
    const trocas = [];
    const precoDe = (lista) => { // custo total de uma lista de trocas, aplicando o desconto da Flor-de-Lis na primeira
      let d = st.turno.trocaDesc; return lista.map(t => { let c = taxa * t.qtd; if (d) { c = Math.max(1, c - 1); d = false; } return c; });
    };
    function html() {
      const lista = trocas.concat([{ dar, receber, qtd }]);
      const v = M.validar(st, i, { t: 'mercado', trocas: lista });
      const precos = precoDe(lista), custoAtual = precos[precos.length - 1];
      const sobra = Object.assign({}, j.rec); trocas.forEach((t, k) => { sobra[t.dar] -= precos[k]; sobra[t.receber] += t.qtd; });
      // ofertas rápidas: trocar o recurso que mais sobra pelos que mais faltam
      const ordem = RECURSOS.slice().sort((a, b) => sobra[b] - sobra[a]);
      const ofertas = ordem.slice(1).reverse().map(r => ({ dar: ordem[0], receber: r, qtd: 1 })).filter(o => sobra[o.dar] >= taxa).slice(0, 3);
      const sel = (lado, val) => `<div class="rec-sel">${RECURSOS.map(k => `<button class="${k === val ? 'on' : ''}" data-${lado}="${k}" aria-label="${NOME_REC[k]}" ${lado === 'receber' && k === dar ? 'disabled' : ''}><img src="img/recurso-${k}.webp" alt=""></button>`).join('')}</div>`;
      return `<button class="fechar" aria-label="Fechar">×</button>
        <div class="faixa-modal"><span>⚖️ Comércio e mercado</span></div><small>Negocie recursos e fortaleça o seu reino</small>
        <div class="recs" style="justify-content:center">${RECURSOS.map(k => `<span class="rec">${icR(k)} ${sobra[k]}</span>`).join('')}</div>
        <div class="abas"><button disabled>🤝 Comércio<small>em breve</small></button><button class="on">🏪 Mercado</button><button disabled>📜 Acordos<small>em breve</small></button></div>
        <div class="troca2">
          <div class="lado-t"><b>Você oferece</b><img class="grande" src="img/recurso-${dar}.webp" alt=""><span class="nome-r">${NOME_REC[dar]}</span>${sel('dar', dar)}<div class="custo-t">${custoAtual} ${icR(dar)}</div></div>
          <span class="seta2">⇄</span>
          <div class="lado-t"><b>Você recebe</b><img class="grande" src="img/recurso-${receber}.webp" alt=""><span class="nome-r">${NOME_REC[receber]}</span>${sel('receber', receber)}
            <div class="passo"><button data-q="-1" aria-label="Menos">−</button><span>${qtd}</span><button data-q="1" aria-label="Mais">+</button></div></div>
        </div>
        <div class="taxa"><span>Taxa do mercado: <b>${taxa} por 1</b>${taxa === 2 ? ' (porto ou cidade antiga)' : ''}</span>${st.turno.trocaDesc ? '<span>⚜️ Flor-de-Lis: a primeira troca custa 1 a menos</span>' : ''}</div>
        ${trocas.length ? `<div class="nota" style="text-align:center">Nesta ida: ${trocas.map((t, k) => `${precos[k]}${icR(t.dar)} → ${t.qtd}${icR(t.receber)}`).join(' · ')}</div>` : ''}
        ${!v.ok ? `<p class="motivo" style="color:#ff8a8a;text-align:center">${esc(v.erro)}</p>` : ''}
        <div class="botoes-rodape"><button class="bm azul" data-mais ${v.ok && trocas.length < 7 ? '' : 'disabled'}>＋ Outra troca</button><button class="bm verde" data-ok ${v.ok ? '' : 'disabled'}>⚖️ Realizar troca</button></div>
        ${ofertas.length ? `<div class="mv-sub" style="margin-top:10px">👥 Ofertas do mercado</div><div class="ofertas">${ofertas.map(o => `<div class="of">
          <span>${icR(o.dar)} ${NOME_REC[o.dar]} <b>${taxa}</b></span><span class="set">»</span><span>${icR(o.receber)} ${NOME_REC[o.receber]} <b>1</b></span>
          <button class="btn peq" data-of="${o.dar}|${o.receber}">Escolher</button></div>`).join('')}</div>` : ''}
        <div class="mv-res"><div><b>ℹ️ Informações</b><span>• Uma ida ao mercado por turno, com várias trocas.</span><span>• A ida ao mercado gasta 1 ponto de ação.</span><span>• Porto ou cidade antiga baixam a taxa para 2 por 1.</span></div>
          <div style="align-items:center;justify-content:center"><b>⚡ Pontos de ação</b><strong style="font-size:34px;color:var(--ouro)">${st.acoes}</strong></div></div>`;
    }
    const d = veu(html(), null, 'real');
    const red = () => { d.querySelector('.modal').innerHTML = html(); };
    d.onclick = e => {
      if (e.target === d || e.target.closest('.fechar')) return fecharVeu();
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      if (b.dataset.dar) { dar = b.dataset.dar; if (receber === dar) receber = RECURSOS.find(k => k !== dar); red(); }
      else if (b.dataset.receber) { receber = b.dataset.receber; red(); }
      else if (b.dataset.q) { qtd = Math.max(1, Math.min(20, qtd + +b.dataset.q)); red(); }
      else if (b.dataset.of) { [dar, receber] = b.dataset.of.split('|'); qtd = 1; red(); }
      else if (b.dataset.mais != null) { trocas.push({ dar, receber, qtd }); qtd = 1; red(); }
      else if (b.dataset.ok != null) { fecharVeu(true); executar({ t: 'mercado', trocas: trocas.concat([{ dar, receber, qtd }]) }); }
    };
  }

  /* ---------- encerrar turno ---------- */
  function confirmarFim() {
    const st = J.st, i = st.vez, j = st.jogadores[i];
    const m = M.manutencao(st, i);
    const avisos = [];
    if (st.acoes > 0) avisos.push(`Você ainda tem ${st.acoes} ${st.acoes > 1 ? 'ações' : 'ação'}.`);
    if (m > j.rec.alimento) avisos.push(`⚠️ A manutenção custa ${m}${IC_REC.alimento} e você tem ${j.rec.alimento}: algumas unidades serão dispensadas. O mercado pode ajudar.`);
    if (!avisos.length) return executar({ t: 'fim' });
    const d = veu(`<h2 class="titulo">Encerrar o turno?</h2>${avisos.map(a => `<p class="sub">${a}</p>`).join('')}
      <p class="nota" style="text-align:center">Manutenção no fim do turno: 1${IC_REC.alimento} para cada 3 unidades terrestres (${m}${IC_REC.alimento}).</p>
      <div class="linha"><button class="btn claro" style="flex:1" data-n>Voltar</button><button class="btn vinho" style="flex:1" data-s>Encerrar turno</button></div>`);
    d.onclick = e => {
      if (e.target === d || e.target.closest('[data-n]')) return fecharVeu();
      if (e.target.closest('[data-s]')) { fecharVeu(true); executar({ t: 'fim' }); }
    };
  }

  /* ---------- execução e eventos ---------- */
  function executar(a) {
    const st = J.st, i = st.vez;
    const antes = Object.assign({}, st.jogadores[i].rec);
    const r = M.jogar(st, i, a);
    if (!r.ok) { toast(r.erro, 'erro'); atualizar(); return; }
    if (st.propostas.length) { st.ev = r.ev; B.responderPendentes(st); r.ev = st.ev; }
    fecharFolhaSo();
    J.sel = a.t === 'atacar' || a.t === 'mover' ? a.para : J.sel;
    salvar();
    processarEventos(r.ev, i, antes, () => { atualizar(); proximo(); });
  }

  function processarEventos(evs, quem, recAntes, depois) {
    const fila = (evs || []).slice();
    function passo() {
      const e = fila.shift();
      if (!e) return depois();
      if (e.tipo === 'batalha') {
        const envolveHumano = humano(e.j) || (e.dono != null && humano(e.dono));
        atualizar();
        if (envolveHumano) return mostrarBatalha(e, passo);
        noMapa(`⚔️ ${J.st.jogadores[e.j].nome} ${e.venceu ? 'conquistou' : 'atacou'} ${J.mapa.idx[e.para].nome}`);
        return passo();
      }
      if (e.tipo === 'turno' && humano(e.j)) {
        const p = e.prod, txt = RECURSOS.filter(k => p[k]).map(k => `+${p[k]}${IC_REC[k]}`).join(' ');
        noMapa(`🌅 Produção de ${J.st.jogadores[e.j].nome}: ${txt || 'nada'}`);
      }
      if (e.tipo === 'rodada') noMapa(`📯 Rodada ${e.n}`);
      if (e.tipo === 'evento') { atualizar(); return telaEvento(e.id, true, passo); }
      if (e.tipo === 'objetivo') {
        const x = J.st.jogadores[e.j], o = oInfo(e.id);
        if (humano(e.j)) return objetivoConcluido(e, passo);
        toast(`🎯 ${x.nome} concluiu o objetivo secreto "${o.nome}" (+${OBJ.PONTOS})!`);
      }
      if (e.tipo === 'carta') {
        const x = J.st.jogadores[e.j], c = cInfo(e.id);
        if (e.id === 'espionagem' && humano(e.j)) return espiar(e, passo);
        if (!humano(e.j)) { noMapa(`🃏 ${x.nome} usou ${c.nome}`); if ((e.jog != null && humano(e.jog)) || (e.em && J.st.terr[e.em].dono != null && humano(J.st.terr[e.em].dono))) toast(`🃏 ${x.nome} usou ${c.nome}: ${e.txt || ''}`, c.cat === 'sabotagem' ? 'erro' : ''); }
        else if (e.txt) toast(`🃏 ${c.nome}: você ${e.txt}.`);
        else if (e.prop) toast(`📜 Proposta enviada a ${J.st.jogadores[e.jog].nome}.`);
      }
      if (e.tipo === 'comprar' && humano(e.j) && e.carta) toast(`🃏 Você comprou: ${cInfo(e.carta).nome}`);
      if (e.tipo === 'proposta' && humano(e.j)) toast(`🤝 Proposta enviada a ${J.st.jogadores[e.prop.para].nome}.`);
      if (e.tipo === 'resposta' && (humano(e.prop.de) || humano(e.prop.para))) toast(e.expirou ? '⌛ Uma proposta expirou.' : `${J.st.jogadores[e.prop.para].nome} ${e.aceitar ? 'aceitou ✅' : 'recusou ✋'} a proposta de ${J.st.jogadores[e.prop.de].nome}.`);
      if (e.tipo === 'bonus' && humano(e.j)) toast(e.txt);
      if (e.tipo === 'meta') toast(`🏁 ${J.st.jogadores[e.j].nome} alcançou ${J.st.cfg.meta} pontos! A rodada vai até o fim.`);
      if (e.tipo === 'eliminado') toast(`☠️ ${J.st.jogadores[e.j].nome} foi eliminado.`);
      if (e.tipo === 'manutencao' && M.total(e.dispensados) && humano(e.j)) toast(`🍂 Faltou alimento: ${M.descU(e.dispensados)} dispensada(s).`, 'erro');
      if (e.tipo === 'construir' && !humano(e.j)) noMapa(`🏗️ ${J.st.jogadores[e.j].nome} construiu ${CONSTR[e.k].nome.toLowerCase()}`);
      if (e.tipo === 'mover' && e.ocupou && !humano(e.j)) noMapa(`🚩 ${J.st.jogadores[e.j].nome} ocupou ${J.mapa.idx[e.para].nome}`);
      passo();
    }
    passo();
  }
  function noMapa(txt) {
    const box = $('#evmapa'); if (!box) return;
    const d = document.createElement('div'); d.textContent = txt; box.appendChild(d);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => d.remove(), 4500);
  }

  function mostrarBatalha(e, depois) {
    const st = J.st, A = st.jogadores[e.j], D = e.dono != null ? st.jogadores[e.dono] : null;
    const lado = (quem, img, forcaBase, dadoV, det, venceu, perdas) => `<div class="lado ${venceu ? 'venceu' : 'perdeu'}" data-lado>
      ${img ? `<img class="b" src="${img}" alt="">` : '<div style="font-size:42px">🏳️</div>'}
      <div class="nome">${esc(quem)}</div><div class="forca" data-forca="${forcaBase + dadoV}">${forcaBase}</div>
      <div class="det">${det}</div><div class="dado rola" data-dado="${dadoV}">?</div>
      <div class="baixas" data-baixas hidden>${M.total(perdas) ? '−' + M.descU(perdas) : 'sem baixas'}</div></div>`;
    const f = e.f;
    const detA = `${M.descU(e.u)}<br>ataque ${f.atq}${f.bonusAtq ? ' (🃏 Surpresa +3)' : ''}`;
    const detD = `unidades ${f.defU}${f.terreno ? ` · terreno +${f.terreno}` : ''}${f.fort ? ` · fortif. +${f.fort}` : ''}${f.reducao ? ` (catapulta −${f.reducao})` : ''}${f.lobo ? ' · Lobo +3' : ''}${f.muralha ? ` · muralha +${f.muralha}` : ''}${f.defesaReal ? ' · 🃏 Defesa Real +3' : ''}`;
    const titulo = e.venceu ? (e.conquistou ? `🚩 ${esc(J.mapa.idx[e.para].nome)} conquistado!` : '⚔️ Vitória do atacante, mas sem tropas para ocupar') : `🛡️ ${esc(J.mapa.idx[e.para].nome)} resistiu!`;
    const d = veu(`<div class="batalha"><div class="faixa-modal"><span>⚔️ Batalha</span></div>
      <div class="vs-topo">${ladoVS(e.j, 'Atacante')}<div class="vs">VS</div>${ladoVS(e.dono, 'Defensor')}</div>
      <div class="local-b">⛰️ Confronto em ${esc(J.mapa.idx[e.para].nome)}</div>
      <div class="lados">${lado(A.nome, brasao(A.reino), f.atq, e.da, detA, e.venceu, e.perdasA)}<div class="x">×</div>${lado(D ? D.nome : 'Guarnição neutra', D ? brasao(D.reino) : null, f.def, e.dd, detD, !e.venceu, e.perdasD)}</div>
      <div class="resultado-b" data-res hidden>${titulo}</div>
      <p class="nota" data-res hidden>${e.recuo ? `Os sobreviventes recuaram para ${esc(J.mapa.idx[e.recuo].nome)}.` : ''} Empate favorece o defensor.</p>
      <button class="bm vermelho larga" data-ok>${opcoes.reduzir ? 'Continuar' : 'Pular animação'}</button></div>`, null, 'real');
    d.dataset.preso = '1';
    let pronto = false;
    const revelar = () => {
      if (pronto) return; pronto = true;
      $$('[data-dado]', d).forEach(x => { x.classList.remove('rola'); x.textContent = x.dataset.dado; });
      $$('[data-forca]', d).forEach(x => { x.textContent = x.dataset.forca; });
      $$('[data-baixas],[data-res]', d).forEach(x => { x.hidden = false; });
      $('[data-ok]', d).textContent = 'Continuar';
    };
    const tm = setTimeout(revelar, opcoes.reduzir ? 0 : 1100);
    d.onclick = ev => {
      if (!ev.target.closest('[data-ok]')) return;
      if (!pronto) { clearTimeout(tm); revelar(); return; }
      fecharVeu(true); depois();
    };
  }

  /* ================= FASE 2: cartas, objetivos, eventos e diplomacia ================= */
  const CAR = window.ImperiosCartas, OBJ = window.ImperiosObjetivos, EVM = window.ImperiosEventos;
  const imgCarta = id => `img/carta-${id}.webp`;
  const cInfo = id => CAR.CARTAS.find(c => c.id === id);
  const oInfo = id => OBJ.OBJETIVOS.find(o => o.id === id);
  const eInfo = id => EVM.EVENTOS.find(e => e.id === id);
  const eu = () => vezHumana() ? J.st.vez : Math.max(0, J.st.jogadores.findIndex(j => j.tipo === 'humano'));
  const ALVO_T = ['muralha-reforcada', 'expansao-territorial', 'bloqueio-naval', 'revolta', 'peste', 'desercao', 'sabotagem'];
  const ALVO_J = ['alianca', 'tratado-de-paz', 'tregua', 'espionagem'];

  function telaCartas(selInicial) {
    const st = J.st, i = st.vez, j = st.jogadores[i];
    if (!st.cfg.cartas) return toast('As cartas especiais estão desligadas nesta partida.', 'erro');
    let sel = selInicial || j.mao[0] || null;
    function html() {
      if (sel && !j.mao.includes(sel)) sel = j.mao[0] || null;
      const c = sel && cInfo(sel);
      const podeComprar = M.validar(st, i, { t: 'comprar' });
      const usoDireto = c && c.mom === 'turno' && !ALVO_T.includes(c.id) && !ALVO_J.includes(c.id);
      const vUso = c && c.mom === 'turno' ? (usoDireto ? M.validar(st, i, { t: 'carta', id: c.id }) : (st.turno.cartasUsadas >= 2 ? { ok: false, erro: 'Você já usou 2 cartas neste turno.' } : { ok: true })) : { ok: false, erro: c ? (c.mom === 'ataque' ? 'Use esta carta na tela de ataque.' : 'Esta carta entra sozinha quando você for atacado.') : '' };
      return `<button class="fechar" aria-label="Fechar">×</button>
        <div class="faixa-modal"><span>🃏 Cartas especiais</span></div><small>Use cartas estratégicas para mudar o rumo da partida</small>
        ${j.mao.length ? `<div class="mao">${j.mao.map((id, k) => `<button class="mao-c ${id === sel ? 'on' : ''}" data-sel="${id}" style="--k:${k - (j.mao.length - 1) / 2}" aria-label="${esc(cInfo(id).nome)}"><img src="${imgCarta(id)}" alt=""></button>`).join('')}</div>`
          : '<p class="sub" style="margin:16px 0">Você não tem cartas na mão. Compre uma por 2 ouros.</p>'}
        ${c ? `<div class="carta-det"><img src="${imgCarta(c.id)}" alt=""><div><h3>${esc(c.nome)}</h3>
          <div class="tags"><span>${CAR.CAT[c.cat]}</span><span>${CAR.MOM[c.mom]}</span></div><p>${esc(c.txt)}</p></div></div>` : ''}
        <div class="monte"><div><img src="img/verso-especiais.webp" alt=""><span>Monte<b>${st.baralho.length}</b></span></div>
          <div><span>Usadas no turno<b>${st.turno.cartasUsadas} / ${CAR.REGRAS.maxPorTurno}</b></span></div>
          <div><span>Descarte<b>${st.descarte.length}</b></span></div></div>
        <div class="mv-res"><div><b>ℹ️ Regras das cartas</b><span>• Até ${CAR.REGRAS.maxPorTurno} cartas por turno (1 de sabotagem).</span><span>• Usar carta não gasta ação.</span><span>• Até ${CAR.REGRAS.mao} cartas na mão.</span><span>• Sabotagem nunca atinge a capital.</span></div>
          <div style="align-items:center;justify-content:center"><b>🛒 Comprar carta</b><span>${CAR.REGRAS.compraOuro} ${icR('ouro')} + 1 ação</span></div></div>
        ${c && !vUso.ok && vUso.erro ? `<p class="motivo" style="color:#ffb3b3;text-align:center">${esc(vUso.erro)}</p>` : ''}
        ${!podeComprar.ok ? `<p class="nota" style="text-align:center">${esc(podeComprar.erro)}</p>` : ''}
        <div class="acoes-b"><button class="bm azul" data-x>↩ Voltar</button><button class="bm verde" data-comprar ${podeComprar.ok && vezHumana() ? '' : 'disabled'}>🛒 Comprar carta</button><button class="bm vermelho" data-usar ${c && vUso.ok && vezHumana() ? '' : 'disabled'}>⚔️ Usar carta</button></div>`;
    }
    const d = veu(html(), null, 'real');
    const red = () => { d.querySelector('.modal').innerHTML = html(); };
    d.onclick = e => {
      if (e.target === d || e.target.closest('.fechar') || e.target.closest('[data-x]')) return fecharVeu();
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      if (b.dataset.sel) { sel = b.dataset.sel; red(); }
      else if (b.dataset.comprar != null) { fecharVeu(true); executar({ t: 'comprar' }); }
      else if (b.dataset.usar != null) {
        const c = cInfo(sel);
        if (ALVO_T.includes(c.id) || ALVO_J.includes(c.id)) escolherAlvoCarta(c.id);
        else { fecharVeu(true); executar({ t: 'carta', id: c.id }); }
      }
    };
  }
  function escolherAlvoCarta(id) {
    const st = J.st, i = st.vez, c = cInfo(id);
    let ops = [];
    if (ALVO_J.includes(id)) ops = st.jogadores.map((x, k) => k).filter(k => k !== i && !st.jogadores[k].eliminado)
      .map(k => ({ a: { t: 'carta', id, jog: k }, html: `<img src="${brasao(st.jogadores[k].reino)}" alt=""><span><b>${esc(st.jogadores[k].nome)}</b><small>${esc(REINOS[st.jogadores[k].reino].nome)}</small></span>` }));
    else ops = Object.keys(st.terr).map(t => ({ t, a: { t: 'carta', id, em: t } }))
      .map(o => { const T = st.terr[o.t], inf = J.mapa.idx[o.t]; const dono = T.dono == null ? 'neutro' : st.jogadores[T.dono].nome;
        o.html = `<span class="ic">${TERRENOS[inf.terreno].ic}</span><span><b>${esc(inf.nome)}</b><small>${esc(dono)} · ${M.total(T.u)} tropa(s)${id === 'sabotagem' && M.alvoSabotagem(st, o.t) ? ' · ' + CONSTR[M.alvoSabotagem(st, o.t)].nome.toLowerCase() : ''}</small></span>`; return o; });
    ops = ops.map(o => Object.assign(o, { v: M.validar(st, i, o.a) }));
    const validas = ops.filter(o => o.v.ok);
    const d = veu(`<button class="fechar" aria-label="Fechar">×</button>
      <div class="faixa-modal"><span>${esc(c.nome)}</span></div><small>${esc(c.txt)}</small>
      ${validas.length ? `<div class="alvos">${validas.map((o, k) => `<button class="alvo" data-k="${ops.indexOf(o)}">${o.html}</button>`).join('')}</div>`
        : `<p class="sub">Nenhum alvo possível agora.${ops[0] ? '<br><small>' + esc(ops.find(o => !o.v.ok).v.erro) + '</small>' : ''}</p>`}
      <button class="bm azul larga" data-x style="margin-top:10px">↩ Voltar às cartas</button>`, null, 'real');
    d.onclick = e => {
      if (e.target === d || e.target.closest('.fechar')) return fecharVeu();
      if (e.target.closest('[data-x]')) return telaCartas(id);
      const b = e.target.closest('[data-k]'); if (!b) return;
      fecharVeu(true); executar(ops[+b.dataset.k].a);
    };
  }

  function telaObjetivo() {
    const st = J.st, i = eu(), j = st.jogadores[i];
    if (!j.objetivo) return toast('Os objetivos secretos estão desligados nesta partida.', 'erro');
    const o = oInfo(j.objetivo.id), p = M.progressoObjetivo(st, i);
    const pc = Math.round(100 * p.atual / p.alvo);
    veu(`<button class="fechar" aria-label="Fechar">×</button>
      <div class="faixa-modal"><span>🎯 Objetivo secreto</span></div><small>Sua missão secreta nesta partida</small>
      <div class="obj-perg">
        <div class="selo">${j.objetivo.feito ? '✅' : '🔒'}</div>
        <div class="obj-topo"><img src="img/objetivo-${o.id}.webp" alt=""><div><h3>${esc(o.nome)}</h3><p>${esc(o.txt)}</p>${!j.objetivo.feito ? '<span class="conf">Confidencial</span>' : ''}</div></div>
        <b class="rot-obj">Progresso do objetivo</b>
        <div class="prog"><i style="width:${pc}%"></i><span>${p.atual} / ${p.alvo}</span></div>
        ${p.fimDeTurno ? '<p class="nota" style="color:#5b4424">Conferido no fim do seu turno.</p>' : ''}
        <div class="recompensa"><b>🏆 Recompensa</b><strong>+${OBJ.PONTOS}</strong><span>pontos de império</span></div>
      </div>
      <div class="mv-res"><div><b>ℹ️ Informações</b><span>• Só você vê esta missão.</span><span>• Ao concluir, ela é revelada e os ${OBJ.PONTOS} pontos são seus para sempre.</span></div>
        <div style="align-items:center;justify-content:center"><b>🎯 Status</b><span class="status ${j.objetivo.feito ? 'ok' : ''}">${j.objetivo.feito ? 'CONCLUÍDO' : 'EM ANDAMENTO'}</span></div></div>
      <button class="bm azul larga" data-x>↩ Voltar ao tabuleiro</button>`, null, 'real');
    $('#veu').onclick = e => { if (e.target.id === 'veu' || e.target.closest('.fechar') || e.target.closest('[data-x]')) fecharVeu(); };
  }

  function telaEvento(id, novo, depois) {
    const e = eInfo(id);
    const d = veu(`${novo ? '' : '<button class="fechar" aria-label="Fechar">×</button>'}
      <div class="faixa-modal"><span>🌍 ${novo ? 'Novo evento mundial' : 'Evento mundial'}</span></div><small>Acontecimento que afeta todos os reinos</small>
      <div class="evento-c"><img src="img/evento-${id}.webp" alt=""><div><h3>${esc(e.nome)}</h3>
        <span class="tag-ev ${e.sinal === '+' ? 'bom' : 'ruim'}">${e.sinal === '+' ? 'Favorável' : 'Desfavorável'} · ${e.tipo === 'imediato' ? 'efeito imediato' : 'vale até o próximo evento'}</span>
        <p>${esc(e.txt)}</p><p class="nota">Um novo evento é revelado a cada ${EVM.REGRAS.aCadaRodadas} rodadas.</p></div></div>
      <button class="bm vermelho larga" data-ok>${novo ? 'Continuar' : '↩ Voltar'}</button>`, null, 'real');
    d.dataset.preso = novo ? '1' : '';
    d.onclick = ev => { if (ev.target.closest('[data-ok]') || ev.target.closest('.fechar') || (!novo && ev.target === d)) { fecharVeu(true); if (depois) depois(); } };
  }

  /* ---------- diplomacia ---------- */
  function statusCom(st, i, k) {
    const t = M.emTratado(st, i, k);
    if (!t) return { txt: 'Sem acordo', cls: 'neutro', ic: '⚖️' };
    const base = { alianca: { txt: 'Aliado', cls: 'aliado', ic: '🤝' }, paz: { txt: 'Em paz', cls: 'paz', ic: '🕊️' }, tregua: { txt: 'Em trégua', cls: 'tregua', ic: '⏳' } }[t.tipo];
    return Object.assign({ resta: t.ate - st.rodada + 1 }, base);
  }
  function telaDiplomacia(aba) {
    const st = J.st, i = eu();
    aba = aba || (st.propostas.some(p => p.para === i) ? 'propostas' : 'relacoes');
    const rivais = st.jogadores.map((_, k) => k).filter(k => k !== i);
    const recebidas = st.propostas.filter(p => p.para === i), enviadas = st.propostas.filter(p => p.de === i);
    const descP = p => p.tipo === 'troca' ? `Oferece: ${fmtCusto(p.oferta)}<br>Pede: ${fmtCusto(p.pede)}` : (p.tipo === 'alianca' ? 'Aliança por 2 rodadas: não se atacam e as tropas podem passar pelos territórios um do outro.' : 'Tratado de paz por 3 rodadas; ao aceitar, os dois recebem 2 ouros.');
    const tem = id => st.jogadores[i].mao.includes(id);
    let corpo = '';
    if (aba === 'relacoes') corpo = `<div class="relacoes">${rivais.map(k => { const x = st.jogadores[k], s = statusCom(st, i, k);
      return `<div class="rel ${x.eliminado ? 'morto' : ''}" style="--c:${REINOS[x.reino].cor}"><img class="b" src="${brasao(x.reino)}" alt=""><img class="busto" src="img/busto-${x.reino}.webp" alt="">
        <div class="rel-i"><b>${esc(REINOS[x.reino].nome)}</b><small>${esc(x.nome)} · 👑 ${M.pontos(st, k)}</small><span class="st-rel ${s.cls}">${s.ic} ${s.txt}${s.resta ? ` · ${s.resta} rodada(s)` : ''}</span></div>
        ${x.eliminado ? '' : `<button class="btn peq" data-neg="${k}" ${vezHumana() ? '' : 'disabled'}>🤝 Negociar</button>`}</div>`; }).join('')}</div>
      <div class="mv-sub" style="margin-top:10px">📜 Tipos de acordo</div>
      <div class="tipos-ac">
        <div><b>🤝 Aliança</b><span>Não se atacam e as tropas passam pelos territórios do aliado (2 rodadas). Carta Aliança.</span>${tem('alianca') ? '<button class="btn peq" data-carta="alianca">Usar carta</button>' : ''}</div>
        <div><b>🕊️ Tratado de paz</b><span>Não se atacam por 3 rodadas e os dois ganham 2 ouros. Carta Tratado de Paz.</span>${tem('tratado-de-paz') ? '<button class="btn peq" data-carta="tratado-de-paz">Usar carta</button>' : ''}</div>
        <div><b>⏳ Trégua</b><span>Sem ataques até o fim da próxima rodada, sem precisar de aceite. Carta Trégua.</span>${tem('tregua') ? '<button class="btn peq" data-carta="tregua">Usar carta</button>' : ''}</div>
        <div><b>⚖️ Troca de recursos</b><span>Proponha uma troca a outro reino (1 ação). Só acontece se ele aceitar.</span></div>
      </div>`;
    if (aba === 'propostas') corpo = `${recebidas.length ? recebidas.map(p => `<div class="prop"><img src="${brasao(st.jogadores[p.de].reino)}" alt=""><div><b>${esc(st.jogadores[p.de].nome)}</b><small>${descP(p)}</small></div>
        <div class="prop-b"><button class="btn peq" data-aceitar="${p.id}" ${vezHumana() ? '' : 'disabled'}>✅ Aceitar</button><button class="btn claro peq" data-recusar="${p.id}" ${vezHumana() ? '' : 'disabled'}>✋ Recusar</button></div></div>`).join('') : '<p class="sub">Nenhuma proposta recebida.</p>'}
      ${enviadas.length ? `<div class="mv-sub" style="margin-top:8px">Enviadas, esperando resposta</div>${enviadas.map(p => `<div class="prop"><img src="${brasao(st.jogadores[p.para].reino)}" alt=""><div><b>Para ${esc(st.jogadores[p.para].nome)}</b><small>${descP(p)}</small></div><span class="st-rel neutro">Pendente</span></div>`).join('')}` : ''}
      <p class="nota" style="text-align:center">Propostas não respondidas expiram depois de uma rodada.</p>`;
    if (aba === 'acordos') { const ts = st.tratados.filter(t => t.ate >= st.rodada);
      corpo = ts.length ? ts.map(t => `<div class="prop"><img src="${brasao(st.jogadores[t.a].reino)}" alt=""><img src="${brasao(st.jogadores[t.b].reino)}" alt=""><div><b>${M.NOME_TRATADO[t.tipo][0].toUpperCase() + M.NOME_TRATADO[t.tipo].slice(1)}</b><small>${esc(st.jogadores[t.a].nome)} e ${esc(st.jogadores[t.b].nome)}</small></div><span class="st-rel tregua">⏳ ${t.ate - st.rodada + 1} rodada(s)</span></div>`).join('') : '<p class="sub">Nenhum acordo ativo entre os reinos.</p>'; }
    const d = veu(`<button class="fechar" aria-label="Fechar">×</button>
      <div class="faixa-modal"><span>🤝 Diplomacia entre reinos</span></div><small>Negocie alianças, tratados, tréguas e trocas</small>
      <div class="abas abas4">${[['relacoes', '👥 Relações'], ['propostas', '✉️ Propostas' + (recebidas.length ? ` <em>${recebidas.length}</em>` : '')], ['acordos', '📜 Acordos ativos']].map(([k, n]) => `<button class="${aba === k ? 'on' : ''}" data-aba="${k}">${n}</button>`).join('')}</div>
      ${corpo}
      <button class="bm azul larga" data-x style="margin-top:10px">↩ Voltar</button>`, null, 'real');
    d.onclick = e => {
      if (e.target === d || e.target.closest('.fechar') || e.target.closest('[data-x]')) return fecharVeu();
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      if (b.dataset.aba) return telaDiplomacia(b.dataset.aba);
      if (b.dataset.neg) return negociar(+b.dataset.neg);
      if (b.dataset.carta) return escolherAlvoCarta(b.dataset.carta);
      if (b.dataset.aceitar || b.dataset.recusar) {
        const id = +(b.dataset.aceitar || b.dataset.recusar);
        const r = M.responderProposta(st, i, id, !!b.dataset.aceitar);
        if (!r.ok) toast(r.erro, 'erro'); else toast(b.dataset.aceitar ? '🤝 Proposta aceita!' : 'Proposta recusada.');
        salvar(); atualizar(); telaDiplomacia('propostas');
      }
    };
  }
  function negociar(k) {
    const st = J.st, i = st.vez, j = st.jogadores[i], o = st.jogadores[k];
    const of = { ouro: 0, madeira: 0, pedra: 0, alimento: 0 }, pe = { ouro: 0, madeira: 0, pedra: 0, alimento: 0 };
    function html() {
      const v = M.validar(st, i, { t: 'propor', para: k, oferta: of, pede: pe });
      const lado = (nome, obj, chave, lim) => `<div class="neg-lado"><b>${nome}</b>${RECURSOS.map(r => `<div class="neg-l">${icR(r)}<span>${NOME_REC[r]}</span>
        <div class="passo"><button data-${chave}m="${r}" aria-label="Menos">−</button><span>${obj[r]}</span><button data-${chave}p="${r}" aria-label="Mais" ${lim && obj[r] >= lim[r] ? 'disabled' : ''}>+</button></div></div>`).join('')}</div>`;
      return `<button class="fechar" aria-label="Fechar">×</button>
        <div class="faixa-modal"><span>⚖️ Negociar</span></div><small>Troca de recursos entre reinos</small>
        <div class="mv-od"><div class="mv-t a"><img src="${brasao(j.reino)}" alt="" style="width:34px"><div><b>Seu reino</b><strong>${esc(REINOS[j.reino].curto)}</strong></div></div><span class="seta">⇄</span>
          <div class="mv-t b"><img src="${brasao(o.reino)}" alt="" style="width:34px"><div><b>Reino alvo</b><strong>${esc(REINOS[o.reino].curto)}</strong></div></div></div>
        <div class="neg">${lado('Você oferece', of, 'o', j.rec)}${lado('Você recebe', pe, 'p', null)}</div>
        <div class="mv-res"><div><b>📜 Resumo da proposta</b><span>Você oferece: ${totalRec(of) ? fmtCusto(of) : '—'}</span><span>Você recebe: ${totalRec(pe) ? fmtCusto(pe) : '—'}</span><span>Só acontece se ${esc(o.nome)} aceitar${o.tipo === 'bot' ? ' (bots respondem na hora)' : ' (no turno dele)'}.</span></div>
          <div style="align-items:center;justify-content:center"><b>⚡ Custo</b><strong style="font-size:28px;color:var(--ouro)">1</strong><span>ponto de ação</span></div></div>
        ${!v.ok && (totalRec(of) || totalRec(pe)) ? `<p class="motivo" style="color:#ffb3b3;text-align:center">${esc(v.erro)}</p>` : ''}
        <div class="botoes-rodape"><button class="bm azul" data-x>↩ Cancelar</button><button class="bm verde" data-ok ${v.ok ? '' : 'disabled'}>🤝 Enviar proposta</button></div>`;
    }
    const totalRec = r => RECURSOS.reduce((s, x) => s + r[x], 0);
    const d = veu(html(), null, 'real');
    const red = () => { d.querySelector('.modal').innerHTML = html(); };
    d.onclick = e => {
      if (e.target === d || e.target.closest('.fechar')) return fecharVeu();
      if (e.target.closest('[data-x]')) return telaDiplomacia('relacoes');
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      const ds = b.dataset;
      if (ds.om) of[ds.om] = Math.max(0, of[ds.om] - 1); if (ds.op) of[ds.op] = Math.min(j.rec[ds.op], of[ds.op] + 1);
      if (ds.pm) pe[ds.pm] = Math.max(0, pe[ds.pm] - 1); if (ds.pp) pe[ds.pp] = Math.min(30, pe[ds.pp] + 1);
      if (ds.ok != null) { fecharVeu(true); executar({ t: 'propor', para: k, oferta: Object.assign({}, of), pede: Object.assign({}, pe) }); return; }
      red();
    };
  }
  function avisarPropostas(i) {
    const n = J.st.propostas.filter(p => p.para === i).length;
    if (n) setTimeout(() => toast(`✉️ Você tem ${n} proposta(s) de outros reinos. Abra a Diplomacia.`), 400);
  }

  function objetivoConcluido(e, depois) {
    const o = oInfo(e.id);
    const d = veu(`<div class="faixa-modal"><span>🎯 Objetivo concluído!</span></div>
      <div class="evento-c"><img src="img/objetivo-${o.id}.webp" alt=""><div><h3>${esc(o.nome)}</h3><p>${esc(o.txt)}</p>
      <div class="recompensa" style="margin-top:8px"><b>🏆 Recompensa</b><strong>+${OBJ.PONTOS}</strong><span>pontos para sempre</span></div></div></div>
      <button class="bm vermelho larga" data-ok>Continuar</button>`, null, 'real');
    d.dataset.preso = '1';
    d.onclick = ev => { if (ev.target.closest('[data-ok]')) { fecharVeu(true); depois(); } };
  }
  function espiar(e, depois) {
    const x = J.st.jogadores[e.jog];
    const d = veu(`<div class="faixa-modal"><span>🕵️ Espionagem</span></div><small>Cartas na mão de ${esc(x.nome)}</small>
      <div class="mao">${(e.mao || []).map(id => `<div class="mao-c"><img src="${imgCarta(id)}" alt="${esc(cInfo(id).nome)}" title="${esc(cInfo(id).nome)}"></div>`).join('') || '<p class="sub">Nenhuma carta.</p>'}</div>
      <p class="nota" style="text-align:center">${(e.mao || []).map(id => esc(cInfo(id).nome)).join(' · ')}</p>
      <button class="bm vermelho larga" data-ok>Continuar</button>`, null, 'real');
    d.dataset.preso = '1';
    d.onclick = ev => { if (ev.target.closest('[data-ok]')) { fecharVeu(true); depois(); } };
  }
  /* tutorial da primeira partida */
  const PASSOS_TUT = [
    ['👑 Bem-vindo a Impérios!', 'Você governa um reino. Conquiste territórios, construa e chegue à meta de pontos antes dos rivais. Toque em qualquer território para ver os detalhes.'],
    ['⚡ Três ações por turno', 'Cada turno você tem 3 pontos de ação (as bolinhas douradas no topo). Mover, atacar, recrutar, construir, ir ao mercado e comprar carta gastam 1 cada.'],
    ['🚩 Expanda primeiro', 'Territórios neutros sem tropas são ocupados só movendo uma unidade para lá. Os que têm guarnição exigem batalha. Mais territórios = mais produção e pontos.'],
    ['🏘️ Construa para pontuar', 'Vila, cidade, fortaleza, castelo, porto e maravilha dão pontos de império. Falta recurso? Use o mercado (3 por 1).'],
    ['🃏 Cartas, 🎯 objetivo e 🌍 eventos', 'Suas cartas ficam no botão Cartas; o seu objetivo secreto vale +10 pontos (botão 🎯 no topo); a cada 2 rodadas um evento mundial muda as regras.'],
    ['🍞 Alimente o exército', 'No fim do turno você paga 1 alimento a cada 3 unidades. Quando terminar, toque em Encerrar. Bom jogo!'],
  ];
  function tutorial(forcar) {
    if (!forcar && store.get('tutorial-visto', false)) return;
    let k = 0;
    const d = veu('', null, 'real');
    const desenhar = () => { d.querySelector('.modal').innerHTML = `<div class="faixa-modal"><span>📖 Primeiros passos</span></div><small>${k + 1} de ${PASSOS_TUT.length}</small>
      <div class="tut"><h3>${PASSOS_TUT[k][0]}</h3><p>${PASSOS_TUT[k][1]}</p></div>
      <div class="pontos-tut">${PASSOS_TUT.map((_, n) => `<i class="${n === k ? 'on' : ''}"></i>`).join('')}</div>
      <div class="botoes-rodape"><button class="bm azul" data-pular>Pular</button><button class="bm vermelho" data-prox>${k < PASSOS_TUT.length - 1 ? 'Próximo →' : 'Começar!'}</button></div>`; };
    desenhar();
    d.onclick = e => {
      if (e.target.closest('[data-pular]') || (e.target.closest('[data-prox]') && k === PASSOS_TUT.length - 1)) { store.set('tutorial-visto', true); return fecharVeu(); }
      if (e.target.closest('[data-prox]')) { k++; desenhar(); }
    };
  }

  /* ---------- fluxo dos turnos e bots ---------- */
  let botT = null;
  function pararBots() { clearTimeout(botT); botT = null; }
  const atraso = () => ({ lenta: 1300, normal: 700, rapida: 260 }[opcoes.velocidade] || 700);
  function proximo() {
    if (!J) return;
    const st = J.st;
    if (st.fase === 'fim') { pararBots(); setTimeout(resultado, 600); return; }
    const i = st.vez;
    if (!humano(i)) {
      J.ocupado = true; atualizar();
      pararBots(); botT = setTimeout(passoBot, atraso());
      return;
    }
    J.ocupado = false;
    // mesmo aparelho: tela de privacidade quando muda o humano
    if (J.modo === undefined) J.modo = null;
    if (numHumanos() > 1 && J.ultimoHumano !== i) { privacidade(i); return; }
    if (J.avisado !== st.rodada + ':' + i) { J.avisado = st.rodada + ':' + i; avisarPropostas(i); tutorial(); }
    J.ultimoHumano = i;
    atualizar();
  }
  function passoBot() {
    if (!J || J.st.fase !== 'jogo') return proximo();
    const st = J.st, i = st.vez;
    if (humano(i)) return proximo();
    let a = B.decidir(st, i) || { t: 'fim' };
    let r = M.jogar(st, i, a);
    if (!r.ok) { r = M.jogar(st, i, { t: 'fim' }); a = { t: 'fim' }; }
    if (a.t === 'atacar' || (a.t === 'mover')) J.sel = a.para;
    else if (a.t === 'construir' || a.t === 'recrutar') J.sel = a.em;
    salvar();
    processarEventos(r.ev, i, null, () => { atualizar(); proximo(); });
  }

  function privacidade(i) {
    const j = J.st.jogadores[i];
    const el = document.createElement('div');
    el.className = 'privacidade'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML = `<img src="${brasao(j.reino)}" alt="">
      <h1 class="titulo">Vez de ${esc(j.nome)}</h1>
      <p class="sub">Passe o aparelho para <b style="color:var(--ouro)">${esc(j.nome)}</b> · ${esc(REINOS[j.reino].nome)}.<br>As informações do jogador anterior ficam escondidas.</p>
      <button class="btn vinho" style="font-size:20px">👑 Iniciar meu turno</button>`;
    document.body.appendChild(el);
    el.querySelector('button').focus();
    el.querySelector('button').onclick = () => { el.remove(); J.ultimoHumano = i; J.avisado = J.st.rodada + ':' + i; salvar(); atualizar(); avisarPropostas(i); };
  }

  /* ---------- painéis ---------- */
  function gestaoReino() {
    const st = J.st;
    const i = vezHumana() ? st.vez : Math.max(0, st.jogadores.findIndex(j => j.tipo === 'humano'));
    const j = st.jogadores[i], d = M.detalhar(st, i), p = M.producao(st, i);
    const ts = M.territoriosDe(st, i);
    const conts = {}; ts.forEach(t => { const x = st.terr[t]; [x.eco, x.def, x.porto && 'porto', x.maravilha && 'maravilha'].filter(Boolean).forEach(c => { conts[c] = (conts[c] || 0) + 1; }); });
    veu(`<button class="fechar" aria-label="Fechar">×</button>
      <div style="text-align:center"><img src="img/governante-${j.reino}.webp" alt="" style="width:min(100%,260px);border-radius:12px"></div>
      <h2 class="titulo">${esc(j.nome)}</h2>
      <p class="sub">${j.capital ? `👑 Capital: ${esc(J.mapa.idx[j.capital].nome)}` : '⚠️ Sem capital: construa um castelo ou conquiste uma cidade.'}</p>
      <div class="est">
        <div><b>${d.total}</b>pontos (meta ${st.cfg.meta})</div><div><b>${d.territorios}</b>de territórios</div>
        <div><b>${d.construcoes}</b>de construções</div><div><b>${d.capitais}</b>de capitais rivais</div>
        <div><b>${ts.length}</b>territórios</div><div><b>${M.unidadesDe(st, i)}</b>unidades em terra</div>
      </div>
      <label class="rot">Produção por turno</label><div class="recs">${RECURSOS.map(k => `<span class="rec">${icR(k)} +${p[k]}</span>`).join('')}<span class="rec">🍖 −${M.manutencao(st, i)} manutenção</span></div>
      <label class="rot">Recursos</label><div class="recs">${RECURSOS.map(k => `<span class="rec">${icR(k)} ${j.rec[k]}</span>`).join('')}</div>
      <label class="rot">Construções</label><div class="constrs">${Object.keys(conts).length ? Object.entries(conts).map(([c, n]) => `<span class="uni" style="background:rgba(255,255,255,.08)"><img src="${imgC(c)}" alt="">${n}× ${CONSTR[c].nome}</span>`).join('') : '<span class="nota">nenhuma ainda</span>'}</div>
      <label class="rot">Custos</label>
      <div class="nota">${TIPOS_C.map(k => `${CONSTR[k].nome}: ${fmtCusto(CONSTR[k].custo)} (${CONSTR[k].pts} pts)`).join(' · ')}</div>`);
    $('#veu').onclick = e => { if (e.target.id === 'veu' || e.target.closest('.fechar')) fecharVeu(); };
  }
  function placar() {
    const st = J.st;
    veu(`<button class="fechar" aria-label="Fechar">×</button><h2 class="titulo"><img src="img/premio-coroa.webp" alt="" style="width:40px;vertical-align:-8px"> Placar</h2>
      <div class="ranking">${M.classificacao(st).map((c, k) => { const j = st.jogadores[c.i]; return `<div class="rk"><span>${k + 1}º</span><img src="${brasao(j.reino)}" alt=""><div>${esc(j.nome)}<small>${c.terr} territórios${j.eliminado ? ' · eliminado' : ''}</small></div><span>${c.pts} pts</span></div>`; }).join('')}</div>
      <p class="nota" style="text-align:center">Meta: ${st.cfg.meta} pontos. Quando alguém chega lá, a rodada vai até o fim e vence a maior pontuação.</p>`);
    $('#veu').onclick = e => { if (e.target.id === 'veu' || e.target.closest('.fechar')) fecharVeu(); };
  }
  function historico() {
    const st = J.st;
    veu(`<button class="fechar" aria-label="Fechar">×</button><h2 class="titulo">📜 Histórico</h2>
      <div class="historico">${st.log.slice().reverse().map(l => `<div><span class="r">Rodada ${l.r}</span><br>${esc(l.txt)}</div>`).join('')}</div>`);
    $('#veu').onclick = e => { if (e.target.id === 'veu' || e.target.closest('.fechar')) fecharVeu(); };
  }

  /* ================= RESULTADO ================= */
  function resultado() {
    if (!J) return;
    const st = J.st;
    store.del('partida');
    if (!J.registrado) { J.registrado = true; registrarResultado(st); }
    fecharVeu(true); fecharFolhaSo();
    const cl = M.classificacao(st);
    const v = st.vencedores || [];
    const nomesV = v.map(i => st.jogadores[i].nome).join(' e ');
    const humanoVenceu = v.some(i => humano(i));
    const motivo = { meta: `Alcançou a meta de ${st.cfg.meta} pontos.`, limite: `Limite de ${st.cfg.maxRodadas} rodadas: venceu a maior pontuação.`, dominacao: 'Todos os outros reinos foram eliminados.' }[st.motivoFim] || '';
    const jv = st.jogadores[v[0]];
    app.onclick = null;
    const vitoriaHumana = numHumanos() !== 1 || humanoVenceu;
    const faixa = vitoriaHumana ? (v.length > 1 ? 'VITÓRIA COMPARTILHADA' : 'VITÓRIA IMPERIAL') : 'FIM DA GUERRA';
    const frase = v.length > 1 ? `${v.map(i => esc(REINOS[st.jogadores[i].reino].nome)).join(' e ')} dividiram a vitória!` : `O ${esc(REINOS[jv.reino].nome)} conquistou os impérios!`;
    const medalha = k => k < 3 ? `<span class="med m${k + 1}">${k + 1}º</span>` : `<span class="med">${k + 1}º</span>`;
    const hEst = (() => { const h = humanoVenceu ? v.find(i => humano(i)) : st.jogadores.findIndex(j => j.tipo === 'humano'); return st.jogadores[h >= 0 ? h : v[0]]; })();
    app.innerHTML = `<div class="resultado" style="--cor:${REINOS[jv.reino].cor}">
      <div class="res-topo"><img class="res-logo" src="img/titulo.webp" alt="Impérios"></div>
      <div class="res-heroi">
        <img class="res-trofeu" src="img/premio-trofeu.webp" alt="Troféu">
        <img class="res-gov" src="img/busto-${jv.reino}.webp" alt="${esc(REINOS[jv.reino].governante)}">
        <img class="res-band" src="img/bandeira-${jv.reino}.webp" alt="">
      </div>
      <div class="res-faixa"><span>${faixa}</span></div>
      <p class="res-frase">${frase}<small>${esc(nomesV)} · ${motivo}</small></p>
      <div class="res-tabela" role="table" aria-label="Ranking final">
        <div class="res-lin res-cab" role="row"><span>Pos.</span><span>Reino</span><span>Jogador</span><span>Pontos</span></div>
        ${cl.map((c, k) => { const j = st.jogadores[c.i]; return `<div class="res-lin ${v.includes(c.i) ? 'v' : ''}" role="row">${medalha(k)}
          <span class="res-reino"><img src="${brasao(j.reino)}" alt=""><span class="longo">${esc(REINOS[j.reino].nome)}</span><span class="curto">${esc(REINOS[j.reino].curto)}</span></span>
          <span class="res-jog">${v.includes(c.i) ? '<img src="img/premio-coroa.webp" alt="vencedor">' : ''}${esc(j.nome)}${j.eliminado ? ' <small>eliminado</small>' : ''}${j.objetivo ? ` <small title="${esc(oInfo(j.objetivo.id).nome)}">${j.objetivo.feito ? '🎯✅' : '🎯✖'}</small>` : ''}</span>
          <b>${c.pts}</b></div>`; }).join('')}
      </div>
      <div class="res-faixa-est"><div>⏳<span>Duração da partida<b>${st.t0 ? (m => m >= 60 ? Math.floor(m / 60) + 'h ' + (m % 60) + 'min' : m + ' min')(Math.max(1, Math.round((Date.now() - st.t0) / 60000))) : '—'}</b></span></div>
        <div>🃏<span>Rodadas<b>${st.rodada}</b></span></div><div>👥<span>Jogadores<b>${st.jogadores.length}</b></span></div></div>
      ${st.jogadores.some(x => x.objetivo) ? `<div class="mv-sub" style="margin-top:12px">🎯 Objetivos secretos revelados</div><div class="obj-rev">${st.jogadores.map(x => x.objetivo ? `<div class="${x.objetivo.feito ? 'ok' : ''}"><img src="img/objetivo-${x.objetivo.id}.webp" alt=""><span><b>${esc(x.nome)}</b>${esc(oInfo(x.objetivo.id).nome)}<small>${x.objetivo.feito ? '✅ concluído (+' + OBJ.PONTOS + ')' : '✖ não concluído'}</small></span></div>` : '').join('')}</div>` : ''}
      <div class="est res-est">
        <div><b>${hEst.st.conquistas}</b>territórios conquistados</div><div><b>${hEst.st.vitorias}</b>batalhas vencidas</div><div><b>${hEst.st.defesas}</b>defesas bem-sucedidas</div>
        <div><b>${hEst.st.construcoes}</b>construções</div><div><b>${hEst.st.produzidos}</b>recursos produzidos</div><div><b>${st.rodada}</b>rodadas</div>
      </div>
      <div class="cdx-ad" data-ad="jogo-resultado"></div>
      <div class="res-botoes">
        <button class="res-btn vermelho" data-r="denovo">🔁 Jogar novamente</button>
        <button class="res-btn azul" data-r="menu">🏠 Voltar ao menu</button>
        <div class="linha"><button class="btn claro" style="flex:1" data-r="compartilhar">📤 Compartilhar</button><a class="btn claro" style="flex:1" href="${URL_SUG}" target="_blank" rel="noopener">💡 Enviar sugestão</a></div>
      </div>
      ${cdx()}
    </div>`;
    if (window.CarludixAds) window.CarludixAds.render();
    const cfg = J.cfg, modo = J.modo, jogs = st.jogadores.map(j => ({ nome: j.nome, tipo: j.tipo, nivel: j.nivel, personalidade: j.personalidade, reino: j.reino }));
    app.onclick = e => {
      const b = e.target.closest('[data-r]'); if (!b) return;
      if (b.dataset.r === 'menu') { J = null; inicio(); }
      if (b.dataset.r === 'denovo') { const ns = M.novaPartida({ mapa: st.cfg.mapa, meta: st.cfg.meta, cartas: st.cfg.cartas, objetivos: st.cfg.objetivos, eventos: st.cfg.eventos }, jogs); ns.t0 = Date.now(); iniciarJogo({ st: ns, modo, cfg }); }
      if (b.dataset.r === 'compartilhar') {
        const url = location.origin + location.pathname;
        const txt = `👑 ${nomesV} venceu uma partida de Impérios com ${M.pontos(st, v[0])} pontos! Construa seu reino também: ${url}`;
        if (navigator.share) navigator.share({ title: 'Impérios · CARLUDIX', text: txt, url }).catch(() => {});
        else if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => toast('Resultado copiado!'), () => toast(txt));
        else toast(txt);
      }
    };
  }

  /* ================= COMO JOGAR ================= */
  function comoJogar(dentro) {
    const html = `<div class="regras">
      <h2 class="titulo">📜 Como jogar</h2>
      <p>Impérios é um jogo de estratégia medieval para 2 a 6 reinos, contra bots ou no mesmo aparelho. Cada jogador governa um dos seis reinos. Conquiste territórios, construa e defenda seu império até alcançar a <b>meta de pontos</b>. Quando alguém chega lá, a rodada vai até o fim e vence quem tiver mais pontos.</p>
      <h3>O turno</h3>
      <p>No início do seu turno você recebe a produção dos seus territórios. Depois tem <b>3 pontos de ação</b>: mover, atacar, recrutar, construir ou ir ao mercado custam 1 ação cada. Olhar o mapa não gasta nada. No fim do turno você paga a manutenção do exército: <b>1 🌾 a cada 3 unidades</b> terrestres (arredondando para cima).</p>
      <h3>Recursos</h3>
      <ul><li>🌾 Planície → alimentos · 🪵 Floresta → madeira · 🪨 Montanha → pedra · 🪙 Mina → ouro</li>
      <li>Cada território produz ${M.AJ.prodBase}; vila +1; cidade +2. A capital dá +2🪙 e +1🌾.</li>
      <li>Cidade antiga produz ouro e alimento e melhora o mercado. Fortificação natural não produz, mas defende +2.</li>
      <li>Mercado: troque 3 de um recurso por 1 de outro (2 por 1 com porto ou cidade antiga).</li></ul>
      <h3>Movimentação e expansão</h3>
      <p>Tropas andam pelas fronteiras e só atravessam territórios seus. A cavalaria sozinha anda 2; exércitos mistos andam na velocidade do mais lento. Territórios neutros livres são ocupados só movendo tropas para lá; neutros com guarnição exigem batalha. Pelo mar (linhas tracejadas) é preciso 1 navio para cada 3 unidades.</p>
      <h3>Batalhas</h3>
      <p>Ataque = soma do ataque das unidades + dado (1 a 3). Defesa = soma da defesa + terreno (montanha +2) + fortificação (fortaleza +3, castelo +4) + dado. Catapultas reduzem a fortificação em até 2. <b>Empate favorece o defensor.</b> O perdedor perde 1, 2 ou 3 unidades conforme a diferença; o vencedor perde 1 se a batalha foi equilibrada. Se o atacante vence com sobreviventes, conquista o território.</p>
      <h3>Pontos de império</h3>
      <table><tr><th>Elemento</th><th>Pontos</th></tr>
        <tr><td>Território</td><td>${M.AJ.ptsTerritorio}</td></tr>${TIPOS_C.map(k => `<tr><td>${CONSTR[k].nome}</td><td>${CONSTR[k].pts}</td></tr>`).join('')}
        <tr><td>Capital rival sob seu controle</td><td>${M.PTS_CAPITAL_RIVAL}</td></tr></table>
      <p>Perdeu a capital? Você continua no jogo e refunda a capital num castelo ou cidade seus. Sem nenhum território, o reino é eliminado.</p>
      <h3>🃏 Cartas especiais</h3>
      <p>O baralho tem ${CAR.CARTAS.length} tipos de carta, 2 de cada. Cada reino começa com ${CAR.REGRAS.iniciais}; comprar uma custa ${CAR.REGRAS.compraOuro} ouros e 1 ação. Até ${CAR.REGRAS.mao} na mão, no máximo ${CAR.REGRAS.maxPorTurno} por turno (só 1 de sabotagem). Usar carta não gasta ação. Nenhuma carta conquista território de outro reino, e sabotagens nunca atingem a capital.</p>
      <table><tr><th>Carta</th><th>Efeito</th></tr>${CAR.CARTAS.map(c => `<tr><td>${esc(c.nome)}</td><td>${esc(c.txt)}</td></tr>`).join('')}</table>
      <h3>🎯 Objetivos secretos</h3>
      <p>Cada reino recebe 1 objetivo secreto. Ao concluí-lo, ele é revelado e dá ${OBJ.PONTOS} pontos para sempre. Só aparecem objetivos possíveis na partida.</p>
      <ul>${OBJ.OBJETIVOS.map(o => `<li><b>${esc(o.nome)}</b>: ${esc(o.txt)}</li>`).join('')}</ul>
      <h3>🌍 Eventos mundiais</h3>
      <p>A partir da rodada ${EVM.REGRAS.primeiroNaRodada}, a cada ${EVM.REGRAS.aCadaRodadas} rodadas é revelado um evento que vale para todos até o próximo.</p>
      <ul>${EVM.EVENTOS.map(e => `<li><b>${esc(e.nome)}</b>: ${esc(e.txt)}</li>`).join('')}</ul>
      <h3>🤝 Diplomacia e comércio</h3>
      <p><b>Aliança</b> (2 rodadas): não se atacam e as tropas atravessam os territórios do aliado. <b>Tratado de paz</b> (3 rodadas): não se atacam e os dois ganham 2 ouros. Os dois precisam de aceite. <b>Trégua</b>: ninguém ataca até o fim da próxima rodada, sem aceite. Aliança e paz também bloqueiam sabotagens entre os dois. Pela Diplomacia você ainda pode propor uma <b>troca de recursos</b> (1 ação): ela só acontece se o outro aceitar, e de uma vez só.</p>
      <h3>Os reinos</h3>
      <ul>${M.ORDEM_REINOS.map(r => `<li>${REINOS[r].brasao} <b>${REINOS[r].nome}</b> (${REINOS[r].perfil}): ${REINOS[r].hab}</li>`).join('')}</ul>
      <h3>Unidades</h3>
      <table><tr><th>Unidade</th><th>Atq</th><th>Def</th><th>Mov</th><th>Custo</th></tr>${TIPOS_U.map(k => `<tr><td>${UNIDADES[k].nome}</td><td>${UNIDADES[k].a}</td><td>${UNIDADES[k].d}</td><td>${UNIDADES[k].m}</td><td>${fmtCusto(UNIDADES[k].custo)}</td></tr>`).join('')}</table>
      <p class="nota">Castelos recrutam todas as unidades terrestres; cidades recrutam infantaria e arqueiros; portos recrutam navios. Até 3 unidades por recrutamento.</p>
    </div>`;
    if (dentro) {
      veu(`<button class="fechar" aria-label="Fechar">×</button>${html}`);
      $('#veu').onclick = e => { if (e.target.id === 'veu' || e.target.closest('.fechar')) fecharVeu(); };
      return;
    }
    app.innerHTML = `<div class="pagina"><button class="voltar" data-a="voltar">← Voltar</button><div class="painel">${html}</div>${cdx()}</div>`;
    app.onclick = e => { if (e.target.closest('[data-a="voltar"]')) inicio(); };
  }

  inicio();
})();
