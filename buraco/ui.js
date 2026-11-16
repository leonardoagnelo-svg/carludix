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
  function tela(html) { limpar(); fecharVeu(); app.innerHTML = html; window.scrollTo(0, 0); }

  let toastT = null;
  function toast(msg, tipo) {
    document.querySelectorAll('.toast').forEach(t => t.remove());
    const d = document.createElement('div');
    d.className = 'toast' + (tipo ? ' ' + tipo : '');
    d.textContent = msg;
    document.body.appendChild(d);
    clearTimeout(toastT);
    toastT = setTimeout(() => d.remove(), tipo === 'festa' ? 2600 : 3400);
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

  function cartaHTML(id, cls) {
    cls = cls || '';
    if (id === null || id === undefined) return `<div class="carta verso ${cls}"></div>`;
    const c = M.carta(id);
    if (c.cur) return `<div class="carta cur ${cls}" data-id="${id}"><span class="v">★</span><span class="g">🃏</span><span class="nn">CURINGÃO</span></div>`;
    const red = c.n === 1 || c.n === 2;
    return `<div class="carta ${red ? 'verm' : ''} ${c.v === 2 ? 'dois' : ''} ${cls}" data-id="${id}"><span class="v">${VALORES[c.v]}</span><span class="n">${M.NAIPES[c.n]}</span><span class="g">${M.NAIPES[c.n]}</span></div>`;
  }

  /* =================== INÍCIO =================== */
  function telaInicio() {
    P = null;
    const salvo = store.get('salvo', null);
    tela(`<div class="inicio">
      ${logoHTML}
      <div class="menu">
        ${salvo ? '<button class="btn ouro grande" data-a="continuar"><span class="ic">▶</span> Continuar partida</button>' : ''}
        <button class="btn verm grande" data-a="online"><span class="ic">🌐</span> Jogar online</button>
        <button class="btn" data-a="bots"><span class="ic">🤖</span> Contra o computador</button>
        <button class="btn" data-a="local"><span class="ic">📱</span> No mesmo aparelho</button>
        <button class="btn claro" data-a="regras">📖 Como jogar</button>
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
    const C = Object.assign({ variante: 'fechado', n: 4, meta: 3000, nivel: 'medio', publica: true }, salvo);
    const base = M.configPadrao(C.variante);
    ['lixo', 'trincas', 'batida', 'curingoes'].forEach(k => { if (C[k] === undefined) C[k] = base[k]; });
    let assentos = store.get('assentos', null) || [
      { nome: 'Jogador 1', tipo: 'humano' }, { nome: 'Jogador 2', tipo: 'humano' }, { nome: 'Jogador 3', tipo: 'humano' }, { nome: 'Jogador 4', tipo: 'humano' }];
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
        <label class="rot">Pontos para vencer</label>
        <div class="opcoes">${op('meta', 1500, '1.500')}${op('meta', 2000, '2.000')}${op('meta', 3000, '3.000')}</div>
        ${modo === 'bots' || modo === 'local' ? `<label class="rot">Dificuldade dos bots</label>
        <div class="opcoes">${op('nivel', 'facil', 'Fácil')}${op('nivel', 'medio', 'Médio')}${op('nivel', 'dificil', 'Difícil')}</div>` : ''}
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
        <div class="linha c" style="margin-top:18px"><button class="btn ouro grande" data-a="ir">${modo === 'criar' ? '➕ Criar sala' : 'Começar'}</button></div>
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
      const cfg = { variante: C.variante, lixo: C.lixo, trincas: C.trincas, batida: C.batida, meta: C.meta, curingoes: C.curingoes, reais: true };
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
    app.onclick = cliqueJogo;
    const onR = () => P && desenharJogo();
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

  function desenharJogo() {
    const raiz = document.getElementById('jogo'); if (!raiz || !P) return;
    const st = P.st, n = st.n, eu = P.eu, meuT = eu % 2, advT = 1 - meuT;
    const mao = st.maos[eu] || [];
    P.sel = P.sel.filter(id => mao.includes(id));
    const vez = minhaVez();

    // festa (canastra, morto, batida) para jogadas novas
    if (st.seq !== P.seqVisto) {
      const u = st.ultimo || {};
      if (u.tipo === 'canastra') toast('🎉 ' + u.texto.split(' — ')[1].replace('CANASTRA', 'Canastra').replace('LIMPA', 'limpa').replace('SUJA', 'suja') + ' (' + st.jogadores[u.s].nome + ')', 'festa');
      else if (u.tipo === 'morto') toast('💀 ' + u.texto, 'festa');
      P.seqVisto = st.seq;
    }

    const nomeT = t => n === 2 ? (t === meuT ? (P.modo === 'local' ? st.jogadores[t].nome : 'Você') : st.jogadores[t].nome) : (t === meuT ? 'Nós' : 'Eles');
    const subT = t => n === 4 ? esc(st.jogadores[t].nome + ' e ' + st.jogadores[t + 2].nome) : (st.pegouMorto[t] ? 'pegou o morto' : 'sem morto');
    const mortoT = t => st.pegouMorto[t] ? ' 💀' : '';

    // jogadores ao redor
    const outros = n === 2 ? [(eu + 1) % 2] : [(eu + 1) % 4, (eu + 2) % 4, (eu + 3) % 4];
    const chips = outros.map(s => `<div class="jog ${st.vez === s && st.fase !== 'fimMao' && st.fase !== 'fimJogo' ? 'vez' : ''} ${s % 2 === meuT ? 'parc' : ''} ${ausente(s) ? 'ausente' : ''}">
        <div class="mini"><b>${st.maos[s].length}</b></div>
        <div style="min-width:0"><div class="nm">${st.jogadores[s].tipo === 'bot' ? '🤖 ' : esc(st.jogadores[s].avatar ? st.jogadores[s].avatar + ' ' : '')}${esc(st.jogadores[s].nome)}</div>
        <div class="st">${ausente(s) ? 'saiu · 🤖 bot no lugar' : st.vez === s ? (st.fase === 'comprar' ? 'vai comprar…' : 'jogando…') : st.maos[s].length + ' cartas'}</div></div></div>`).join('');

    const jogosHTML = (t, meus) => {
      const js = st.jogos[t];
      if (!js.length) return `<div class="sem-jogos">${meus ? 'Nenhum jogo baixado ainda.' : 'Nada baixado.'}</div>`;
      return js.map((j, i) => {
        const can = M.ehCanastra(j);
        let cabe = false;
        if (meus && vez && P.sel.length) {
          if (st.fase === 'jogar') cabe = !!M.analisarJogo(j.c.concat(P.sel), j.t, st.cfg);
          else if (st.fase === 'comprar' && st.cfg.lixo === 'fechado' && st.lixo.length) cabe = !!M.analisarJogo(j.c.concat(P.sel, [st.lixo[st.lixo.length - 1]]), j.t, st.cfg);
        } else if (meus && vez && st.fase === 'comprar' && st.cfg.lixo === 'fechado' && st.lixo.length && !P.sel.length) {
          const topo = st.lixo[st.lixo.length - 1];
          cabe = !M.ehCoringa(topo) && !!M.analisarJogo(j.c.concat([topo]), j.t, st.cfg);
        }
        return `<button class="jg ${can ? 'canastra ' + (M.ehLimpa(j) ? 'limpa' : 'suja') : ''} ${cabe ? 'cabe' : ''}" data-jogo="${i}">${j.c.map(c => cartaHTML(c)).join('')}<span class="qt">${j.c.length}</span></button>`;
      }).join('');
    };
    const canastras = t => st.jogos[t].filter(M.ehCanastra).length;

    // centro: mortos, monte, lixo
    const topo = st.lixo.length ? st.lixo[st.lixo.length - 1] : null;
    const podeComprar = vez && st.fase === 'comprar';
    let lixoHTML;
    if (st.cfg.lixo === 'aberto') {
      lixoHTML = `<button class="lixo ${podeComprar && st.lixo.length ? 'pode-clicar' : ''}" data-a="lixo"><div class="lixo-aberto">${st.lixo.length ? st.lixo.map(c => cartaHTML(c)).join('') : '<div class="lixo-pilha"><div class="vazio-l"></div></div>'}</div><span class="rotulo">Lixo <b>${st.lixo.length}</b></span></button>`;
    } else {
      lixoHTML = `<button class="lixo ${podeComprar && st.lixo.length ? 'pode-clicar' : ''}" data-a="lixo"><div class="lixo-pilha">${topo !== null ? cartaHTML(topo) : '<div class="vazio-l"></div>'}</div><span class="rotulo">Lixo <b>${st.lixo.length}</b></span></button>`;
    }
    const mortosHTML = `<div class="mortos"><div class="ms">${[0, 1].map(i => cartaHTML(null, i < st.mortos.length ? '' : 'pego')).join('')}</div><span class="rotulo">Mortos <b>${st.mortos.length}</b></span></div>`;

    // aviso da vez
    let aviso = '', avisoCls = '';
    if (st.fase === 'fimMao' || st.fase === 'fimJogo') aviso = 'Fim da mão';
    else if (P.ocupado) aviso = 'Enviando jogada…';
    else if (vez) { avisoCls = 'vez'; aviso = st.fase === 'comprar' ? 'Sua vez: compre uma carta' : 'Sua vez: baixe jogos e descarte'; }
    else aviso = 'Vez de ' + esc(st.jogadores[st.vez].nome) + (st.jogadores[st.vez].tipo === 'bot' ? ' 🤖' : '') + '…';

    // mão
    const ordem = M.ordenarMao(mao, P.ordem);
    const esconder = P.passando !== null;
    const maoHTML = ordem.map(id => esconder ? cartaHTML(null) : cartaHTML(id, (P.sel.includes(id) ? 'sel ' : '') + (id === st.comprada && st.vez === eu ? 'nova' : ''))).join('');

    // ações e dica
    let acoes = '', dica = '';
    if (vez && st.fase === 'comprar') {
      acoes = `<button class="btn" data-a="comprar">🂠 Comprar do monte</button><button class="btn verm" data-a="lixo" ${st.lixo.length ? '' : 'disabled'}>🗑️ Pegar lixo</button>`;
      if (!st.lixo.length) dica = 'Toque no monte para comprar.';
      else if (st.cfg.lixo === 'aberto') dica = 'Compre do monte ou pegue o lixo inteiro.';
      else dica = 'Lixo fechado: para pegar, a carta de cima tem que virar jogo na hora. Selecione as cartas da sua mão que formam jogo com ela e toque em “Pegar lixo” (ou toque num jogo seu que fique destacado).';
    } else if (vez && st.fase === 'jogar') {
      const k = P.sel.length;
      acoes = `<button class="btn ouro" data-a="baixar" ${k >= 3 ? '' : 'disabled'}>⬇ Baixar jogo novo</button><button class="btn verm" data-a="descartar" ${k === 1 ? '' : 'disabled'}>Descartar</button>`;
      if (!k) dica = 'Toque nas cartas para escolher. Com 3+ cartas: baixe um jogo novo. Para encaixar, toque num jogo seu. Para terminar a vez, descarte 1 carta.';
      else {
        const cabem = st.jogos[meuT].filter(j => M.analisarJogo(j.c.concat(P.sel), j.t, st.cfg)).length;
        dica = cabem ? 'Toque no jogo destacado para encaixar ' + (k === 1 ? 'a carta' : 'as cartas') + '.' : (k >= 3 ? (M.analisarJogo(P.sel, null, st.cfg) ? 'Essas cartas formam um jogo: toque em “Baixar jogo novo”.' : 'Essas cartas não formam jogo.') : (k === 1 ? 'Descarte esta carta para passar a vez.' : 'Escolha mais cartas para formar um jogo.'));
      }
      if (!M.podeBater(st, meuT)) dica += ' Para bater: ' + M.motivoNaoBate(st, meuT) + '.';
    } else if (P.modo === 'online' && st.fase !== 'fimMao' && st.fase !== 'fimJogo') {
      dica = 'Sala ' + esc(P.mesa.codigo) + (ausente(st.vez) ? ' · ' + esc(st.jogadores[st.vez].nome) + ' saiu: um bot está jogando no lugar.' : '');
    }

    raiz.innerHTML = `
      <div class="topo">
        <button class="menu-btn" data-a="menu" aria-label="Menu">☰</button>
        ${P.modo === 'online' ? '<button class="menu-btn" data-a="reagir" aria-label="Reações">😊</button>' : ''}
        <div class="placar">
          <div class="tm"><small>${esc(nomeT(meuT))}${mortoT(meuT)}</small><b>${st.placar[meuT]}</b></div>
          <div class="meta">${esc(M.descreverConfig(st.cfg))}<br>até ${st.cfg.meta}<br>mão ${st.mao}</div>
          <div class="tm"><small>${esc(nomeT(advT))}${mortoT(advT)}</small><b>${st.placar[advT]}</b></div>
        </div>
      </div>
      <div class="oponentes">${chips}</div>
      <div class="area-jogos"><h4><span>Jogos ${n === 4 ? 'deles' : 'de ' + esc(st.jogadores[advT].nome)}</span><b>${canastras(advT) ? canastras(advT) + ' canastra' + (canastras(advT) > 1 ? 's' : '') : ''}</b></h4><div class="lista-jogos">${jogosHTML(advT, false)}</div></div>
      <div class="centro-mesa">
        ${mortosHTML}
        <button class="monte ${podeComprar ? 'pode-clicar' : ''}" data-a="comprar">${st.monte.length ? cartaHTML(null) : '<div class="lixo-pilha"><div class="vazio-l"></div></div>'}<span class="rotulo">Monte <b>${st.monte.length}</b></span></button>
        ${lixoHTML}
      </div>
      <div class="area-jogos meus"><h4><span>${n === 4 ? 'Nossos jogos' : 'Seus jogos'}</span><b>${canastras(meuT) ? canastras(meuT) + ' canastra' + (canastras(meuT) > 1 ? 's' : '') : ''}</b></h4><div class="lista-jogos">${jogosHTML(meuT, true)}</div></div>
      <div class="aviso ${avisoCls}">${aviso}</div>
      <div class="log">${esc((st.ultimo && st.ultimo.texto) || '')}</div>
      <div class="mao-area">
        <div class="mao" id="mao">${maoHTML}</div>
        <div class="acoes">${acoes}${mao.length > 1 && !esconder ? `<button class="btn claro peq" data-a="ordem">↕ ${P.ordem === 'naipe' ? 'Por naipe' : 'Por valor'}</button>` : ''}</div>
        <div class="dica">${dica}</div>
      </div>`;
    ajustarMao();

    // sobreposições
    if (P.passando !== null && st.fase !== 'fimMao' && st.fase !== 'fimJogo') {
      const s = P.passando;
      veu(`<div class="painel centro"><h2 class="titulo">Vez de ${esc(st.jogadores[s].nome)}</h2>
        <p class="sub">Passe o aparelho para ${esc(st.jogadores[s].nome)}. Os outros não olham! 🙈</p>
        <button class="btn ouro grande" data-v="ver">Sou ${esc(st.jogadores[s].nome)}, mostrar cartas</button></div>`)
        .onclick = e => { if (e.target.closest('[data-v="ver"]')) { P.eu = s; P.passando = null; P.sel = []; fecharVeu(); salvar(); desenharJogo(); } };
    } else if ((st.fase === 'fimMao' || st.fase === 'fimJogo') && !P.verMesa) {
      mostrarResultado();
    } else if (!document.querySelector('.veu.menu-jogo-veu')) fecharVeu();
    if ((st.fase === 'fimMao' || st.fase === 'fimJogo') && P.verMesa) {
      const a = raiz.querySelector('.acoes');
      if (a) a.innerHTML = '<button class="btn ouro" data-a="placar">📋 Ver placar</button>';
    }
  }

  function ajustarMao() {
    const el = document.getElementById('mao'); if (!el) return;
    const cartas = Array.from(el.children); if (!cartas.length) return;
    const cw = cartas[0].getBoundingClientRect().width || 60;
    const w = el.clientWidth - 8;
    const k = cartas.length;
    let linhas = 1, porLinha = k;
    const passo = k > 1 ? (w - cw) / (k - 1) : cw;
    if (passo < cw * 0.3 && k > 12) { linhas = 2; porLinha = Math.ceil(k / 2); }
    el.classList.toggle('duas', linhas === 2);
    const p2 = porLinha > 1 ? Math.min(cw * 1.04, (w - cw) / (porLinha - 1)) : cw;
    const ml = Math.min(4, p2 - cw);
    cartas.forEach((c, i) => {
      const inicioLinha = i % porLinha === 0;
      c.style.marginLeft = inicioLinha ? '0px' : ml + 'px';
      if (linhas === 2) c.style.flexBasis = 'auto';
    });
    if (linhas === 2) {
      // quebra de linha: um elemento que força a segunda fileira
      const br = document.createElement('div'); br.style.flexBasis = '100%'; br.style.height = '0';
      el.insertBefore(br, cartas[porLinha]);
    }
  }

  function cliqueJogo(e) {
    if (!P) return;
    const st = P.st;
    const cartaEl = e.target.closest('.mao .carta');
    if (cartaEl && cartaEl.dataset.id !== undefined) {
      if (P.passando !== null) return;
      const id = +cartaEl.dataset.id;
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
    if (a === 'placar') { P.verMesa = false; return desenharJogo(); }
    if (a === 'ordem') { P.ordem = P.ordem === 'naipe' ? 'valor' : 'naipe'; store.set('ordem', P.ordem); return desenharJogo(); }
    if (!minhaVez()) return;
    if (a === 'comprar' && st.fase === 'comprar') agir({ t: 'comprar' });
    if (a === 'lixo' && st.fase === 'comprar') {
      if (!st.lixo.length) return;
      if (st.cfg.lixo === 'aberto') return agir({ t: 'lixo' });
      const topo = st.lixo[st.lixo.length - 1];
      if (P.sel.length) return agir({ t: 'lixo', cartas: P.sel.slice(), jogo: -1 });
      const t = P.eu % 2;
      const idx = M.ehCoringa(topo) ? -1 : st.jogos[t].findIndex(j => M.analisarJogo(j.c.concat([topo]), j.t, st.cfg));
      if (idx >= 0) return agir({ t: 'lixo', cartas: [], jogo: idx });
      toast('Para pegar o lixo fechado, selecione na sua mão as cartas que formam jogo com ' + M.nomeCarta(topo) + '.');
    }
    if (a === 'baixar' && st.fase === 'jogar') agir({ t: 'baixar', cartas: P.sel.slice(), jogo: -1 });
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
      if (!deBot) { toast(res.erro, 'erro'); return res; }
      // segurança: se o bot errar, compra ou descarta qualquer carta válida
      console.warn('bot', a, res.erro);
      const alt = st.fase === 'comprar' ? { t: 'comprar' } : B.decidirDescarte(st, s);
      const r2 = M.aplicar(st, s, alt);
      if (!r2.ok) return r2;
    }
    if (s === P.eu) P.sel = [];
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
    if (P.modo === 'online') {
      if (!P.mesa.souAnfitriao()) return;
      if (j.tipo === 'bot') atraso = st.fase === 'comprar' ? 800 : 650;
      else if (ausente(s)) atraso = 2500;
    } else if (j.tipo === 'bot') atraso = st.fase === 'comprar' ? 750 : 600;
    if (atraso === null) return;
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
    if (fim) {
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
        <tr class="ger"><td>Placar (até ${st.cfg.meta})</td><td>${st.placar[meuT]}</td><td>${st.placar[advT]}</td></tr>
      </table>
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

  function menuJogo() {
    const online = P.modo === 'online';
    const v = veu(`<div class="painel menu-jogo centro">
      <h2 class="titulo">Menu</h2>
      ${online ? `<p class="sub">Sala <b style="color:var(--ouro);letter-spacing:3px">${esc(P.mesa.codigo)}</b></p>` : ''}
      <button class="btn" data-m="regras">📖 Como jogar</button>
      <button class="btn" data-m="ordem">↕ Ordenar ${P.ordem === 'naipe' ? 'por valor' : 'por naipe'}</button>
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
  const PROIBIDAS = ['porra', 'caralho', 'karalho', 'krl', 'merda', 'bosta', 'puta', 'puto', 'putinha', 'putaria', 'prostitut', 'buceta', 'boceta', 'bct', 'xereca', 'xoxota', 'cu', 'cuzao', 'cusao', 'foda', 'fode', 'foder', 'fuder', 'fdp', 'pqp', 'vsf', 'tnc', 'kct', 'cacete', 'kacete', 'piroca', 'penis', 'vagina', 'bunda', 'sexo', 'porno', 'punheta', 'siririca', 'tesao', 'gostosa', 'safad', 'vagabund', 'vadia', 'piranha', 'arromb', 'otario', 'idiota', 'imbecil', 'babaca', 'retardad', 'corno', 'chifrud', 'viado', 'bicha', 'boiola', 'baitola', 'traveco', 'sapatao', 'crioulo', 'nazi', 'hitler', 'estupr', 'pedofil', 'maconha', 'cocaina', 'desgraca', 'lixo humano'];
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
    const junto = n.replace(/[^a-z0-9]/g, '');
    const leet = junto.replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't');
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
  const textoModo = (cfg, n) => (M.VARIANTES[cfg.variante] || M.VARIANTES.fechado).nome + (M.descreverConfig(cfg).includes('personalizado') ? '*' : '') + ' · ' + (n === 2 ? '1x1' : 'Duplas') + ' · até ' + cfg.meta;

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
          <div class="linha" style="flex-wrap:nowrap"><input class="txt" id="cod" maxlength="4" placeholder="CÓDIGO" style="text-align:center;letter-spacing:5px;text-transform:uppercase;font-weight:900"><button class="btn" data-a="entrar" style="flex:none">🔑 Entrar com código</button></div>
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
    };
    try {
      R.marcarOnline().catch(() => {});
      const offC = await R.ouvirContador(n => { const el = document.getElementById('contador'); if (el && n !== null) el.textContent = '🟢 ' + n + (n === 1 ? ' pessoa jogando' : ' pessoas jogando') + ' online agora'; });
      limpeza.push(offC);
      const off = await R.ouvirSalas((lista, err) => {
        const el = document.getElementById('mesas'); if (!el) return;
        if (!lista) { el.innerHTML = `<div class="vazio">${esc(erroOnline(err))}</div>`; return; }
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
        let feito = false;
        R.ouvirSalas((l, err) => { if (feito) return; feito = true; if (!l) rej(err); else res(l); })
          .then(off => setTimeout(off, 0)).catch(rej);
      });
      if (cancelado) return;
      if (lista.length) return entrarSala(lista[0].codigo, true);
      const C = store.get('cfg', {});
      const cfg = Object.assign(M.configPadrao(C.variante || 'fechado'), { meta: C.meta || 3000 });
      criarSalaOnline({ cfg, n: C.n === 4 ? 4 : 2, publica: true }, true);
    } catch (e) {
      const m = document.getElementById('msg'); if (m) m.textContent = erroOnline(e);
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
    mesa.onErro(msg => { if (P) { P.ocupado = false; desenharJogo(); } toast(msg, 'erro'); });
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
      const linhas = [];
      for (let i = 0; i < n; i++) {
        const dupla = n === 4 ? `<span class="dupla ${i % 2 ? 'b' : 'a'}">${i % 2 ? 'Dupla B' : 'Dupla A'}</span>` : '';
        const x = js[i];
        if (!x) { linhas.push(`<div class="jogador-sala livre"><div class="av">＋</div><div class="info"><b>Vaga livre</b><span>esperando alguém…</span></div>${dupla}</div>`); continue; }
        const [u, j] = x;
        const eu = u === mesa.uid;
        const ehHost = u === sala.anfitriao;
        linhas.push(`<div class="jogador-sala ${eu ? 'eu' : ''}"><div class="av">${esc(j.bot ? '🤖' : j.avatar)}</div>
          <div class="info"><b>${j.bot ? '🤖 ' : ''}${esc(j.apelido)}${ehHost ? ' 👑' : ''}${eu ? ' (você)' : ''}</b><span>${j.bot ? 'bot' : j.pronto || ehHost ? '✅ pronto' : '⏳ ainda não está pronto'}</span></div>
          ${dupla}${host && !eu ? `<button class="btn peq claro" data-rem="${esc(u)}">Remover</button>` : ''}</div>`);
      }
      const cheia = js.length >= n;
      const prontos = js.every(([u, j]) => j.bot || j.pronto || u === sala.anfitriao);
      const meu = (sala.jogadores || {})[mesa.uid] || {};
      let banner = '';
      if (host && rapidoDesde && !cheia) {
        const falta = Math.max(0, Math.ceil(30 - (Date.now() - rapidoDesde) / 1000));
        if (falta <= 10) banner = `<div class="banner-bots">Ninguém online agora. Completando com bots em ${falta}s… <button class="btn peq claro" data-a="esperar">Esperar mais</button></div>`;
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
              <p class="nota centro">${!cheia ? 'Faltam ' + (n - js.length) + ' jogador' + (n - js.length > 1 ? 'es' : '') + '. Espere ou complete com bots.' : prontos ? 'Todos prontos! Pode começar.' : 'Esperando todos tocarem em “Pronto”.'}${n === 4 ? ' As duplas seguem a ordem de chegada.' : ''}</p>`
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
    const js = Object.entries(sala.jogadores || {}).sort((a, b) => (a[1].entrouEm || 0) - (b[1].entrouEm || 0)).slice(0, n);
    if (js.length < n) { toast('Ainda falta gente na sala.'); return; }
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
  const q = new URLSearchParams(location.search);
  const cod = (q.get('sala') || '').toUpperCase();
  if (/^[A-Z0-9]{4}$/.test(cod)) pedirPerfil(() => entrarSala(cod));
  else telaInicio();

  window.addEventListener('beforeunload', () => { if (P && P.modo !== 'online') salvar(); });
})();
