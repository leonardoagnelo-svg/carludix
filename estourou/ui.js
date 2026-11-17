/* Estourou! — CARLUDIX · telas */
(function () {
  'use strict';
  const M = window.EstourouMotor, B = window.EstourouBot, R = window.EstourouRede;
  const C = M.carta;
  const app = document.getElementById('app');
  const URL_UNIVERSO = 'https://carludix.com/cartas/';
  const URL_SUG = 'https://carludix.com/contato/?jogo=Estourou%21';
  const NOMES_BOT = ['Bia', 'Duda', 'Tonho', 'Lia', 'Caco', 'Nina', 'Juca', 'Rosa', 'Teco', 'Mel'];
  const AV_BOT = ['🦊', '🐼', '🐯', '🐸', '🦉', '🐙', '🐵', '🐧'];

  const store = {
    get(k, d) { try { const v = localStorage.getItem('estourou:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('estourou:' + k, JSON.stringify(v)); } catch (e) {} },
  };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = s => app.querySelector(s);
  const embaralhar = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  let limpeza = [];
  function limpar() { limpeza.forEach(f => { try { f(); } catch (e) {} }); limpeza = []; }
  function tela(html) { limpar(); fecharVeu(); app.onclick = null; app.innerHTML = html; window.scrollTo(0, 0); }

  let toastT = null;
  function toast(msg, tipo) {
    document.querySelectorAll('.toast').forEach(t => t.remove());
    const d = document.createElement('div');
    d.className = 'toast' + (tipo ? ' ' + tipo : '');
    d.textContent = msg;
    document.body.appendChild(d);
    clearTimeout(toastT);
    toastT = setTimeout(() => d.remove(), tipo === 'erro' ? 2800 : 2300);
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
  function boom(txt) {
    const d = document.createElement('div');
    d.className = 'boom';
    d.innerHTML = `<span>${esc(txt)}</span>`;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 1150);
    const cores = ['#ffe08a', '#ff7a1a', '#e8323d', '#ffb238', '#fff'];
    for (let k = 0; k < 26; k++) {
      const f = document.createElement('i');
      f.className = 'faisca';
      const ang = Math.random() * Math.PI * 2, dist = 80 + Math.random() * 170;
      f.style.cssText = `left:50%;top:45%;background:${cores[k % cores.length]};--x:${Math.cos(ang) * dist}px;--y:${Math.sin(ang) * dist}px`;
      document.body.appendChild(f);
      setTimeout(() => f.remove(), 950);
    }
  }

  function rodape() {
    return `<div class="cdx"><a href="${URL_UNIVERSO}">← CARLUDIX</a><a href="https://carludix.com/privacidade/">Privacidade</a><a href="${URL_SUG}" target="_blank" rel="noopener">💡 Enviar sugestão</a></div>`;
  }
  const logoHTML = `<img class="logo" src="titulo.png" alt="Estourou!" onerror="this.outerHTML='<div class=&quot;logo-txt&quot;>Estourou!</div>'">`;

  /* =================== CARTAS =================== */
  function cartaHTML(id, cls, extra) {
    cls = cls || ''; extra = extra || '';
    if (id == null) return `<div class="carta verso ${cls}" ${extra}></div>`;
    const c = C(id);
    if (c.t === 'n') return `<div class="carta n${c.v} ${cls}" data-id="${id}" ${extra}><span class="cn">${c.v}</span><span class="v">${c.v}</span></div>`;
    if (c.t === 'm') return `<div class="carta mod ${c.v === 'x2' ? 'x2' : ''} ${cls}" data-id="${id}" ${extra}><span class="v">${c.v === 'x2' ? '×2' : '+' + c.v}</span></div>`;
    const I = M.INFO_ACAO[c.a];
    return `<div class="carta acao a-${c.a} ${cls}" data-id="${id}" ${extra} title="${esc(I.nome + ': ' + I.txt)}"><span class="ic">${I.ic}</span><span class="nm">${esc(I.nome)}</span></div>`;
  }

  /* =================== INÍCIO =================== */
  function telaInicio() {
    sairOnline();
    J = null;
    tela(`<div class="inicio">
        ${logoHTML}
        <div class="menu">
          <button class="btn fogo grande" data-a="bots"><span class="ic">🤖</span> Jogar contra bots</button>
          <button class="btn" data-a="local"><span class="ic">👥</span> Mesmo aparelho</button>
          <button class="btn" data-a="online"><span class="ic">🌐</span> Jogar online</button>
          <button class="btn claro" data-a="regras"><span class="ic">📖</span> Como jogar</button>
        </div>
        <div class="online-agora" id="online-agora"></div>
        <div class="vitrine">${cartaHTML(78, '', 'style="--r:-8deg"')}${cartaHTML(81, '', 'style="--r:2deg"')}${cartaHTML(85, '', 'style="--r:9deg"')}</div>
      </div>${rodape()}`);
    app.onclick = e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      const a = b.dataset.a;
      if (a === 'bots') telaConfigBots();
      if (a === 'local') telaConfigLocal();
      if (a === 'online') pedirPerfil(telaOnline);
      if (a === 'regras') telaRegras(telaInicio);
    };
    R.ouvirContador(n => { const el = document.getElementById('online-agora'); if (el && n) el.textContent = `🟢 ${n} ${n === 1 ? 'pessoa jogando' : 'pessoas jogando'} online agora`; })
      .then(off => limpeza.push(off)).catch(() => {});
  }

  /* =================== COMO JOGAR =================== */
  function telaRegras(voltar) {
    const A = M.INFO_ACAO;
    tela(`<button class="voltar" data-a="voltar">← Voltar</button>
      <div class="painel regras">
        <h2 class="titulo centro">Como jogar</h2>
        <p>Arrisque a sorte virando cartas, mas saiba a hora de parar! Vence quem passar primeiro da meta (200 pontos, ou a que vocês escolherem).</p>
        <h3>A rodada</h3>
        <ul>
          <li>Cada jogador começa com uma carta.</li>
          <li>Na sua vez, escolha <b>PUXAR</b> mais uma carta ou <b>PARAR</b> e guardar os pontos.</li>
          <li><b>💥 Estourou:</b> se vier um número que você já tem, você sai da rodada com 0 ponto.</li>
          <li><b>🎉 Sete Cheio:</b> juntou 7 números diferentes? A rodada acaba na hora e você ganha +${M.BONUS_CHEIO}.</li>
          <li>A rodada também acaba quando ninguém mais está jogando.</li>
        </ul>
        <h3>O baralho (100 cartas)</h3>
        <div class="ex">${cartaHTML(78)}${cartaHTML(66)}${cartaHTML(1)}<span>Números de 0 a 12. Cada número tem tantas cópias quanto o seu valor: há doze 12 e só um 1. Números altos valem mais, mas repetem mais!</span></div>
        <div class="ex">${cartaHTML(81)}${cartaHTML(84)}<span>Modificadores: +2, +4, +6, +8, +10 e ×2. Nunca fazem estourar.</span></div>
        <h3>Cartas de ação (3 de cada)</h3>
        <p>Quem tira a carta escolhe em quem ela vale, inclusive em si mesmo.</p>
        <div class="ex">${cartaHTML(79 + 6)}<span><b>${A.gelo.nome}:</b> ${A.gelo.txt}</span></div>
        <div class="ex">${cartaHTML(88)}<span><b>${A.rajada.nome}:</b> ${A.rajada.txt}</span></div>
        <div class="ex">${cartaHTML(91)}<span><b>${A.escudo.nome}:</b> você guarda a carta e ela anula um estouro. Cada jogador só pode ter um; se tirar o segundo, dá para outro jogador.</span></div>
        <div class="ex">${cartaHTML(94)}<span><b>${A.troca.nome}:</b> ${A.troca.txt} Cuidado: dá para empurrar um número repetido e fazer o outro estourar!</span></div>
        <div class="ex">${cartaHTML(97)}<span><b>${A.espiar.nome}:</b> ${A.espiar.txt}</span></div>
        <h3>Pontuação</h3>
        <p>Some os números. Se tiver o ×2, dobre essa soma. Depois some os modificadores de + e, se fez Sete Cheio, mais ${M.BONUS_CHEIO}.<br><i>Exemplo: números somando 28 com ×2 viram 56; com um +4, a rodada vale 60.</i></p>
        <h3>Dicas</h3>
        <ul>
          <li>Quanto mais cartas você tem, maior o risco. O jogo mostra o seu risco de estourar.</li>
          <li>As cartas que já saíram não voltam até o baralho acabar: preste atenção!</li>
          <li>Use o Gelo para travar quem está com poucos pontos e a Rajada em quem tem muitas cartas.</li>
        </ul>
        <div class="linha c" style="margin-top:14px"><button class="btn fogo" data-a="voltar">Entendi!</button></div>
      </div>${rodape()}`);
    app.onclick = e => { const b = e.target.closest('[data-a]'); if (b && b.dataset.a === 'voltar') voltar(); };
  }

  /* =================== CONFIGURAÇÕES =================== */
  function opcoes(nome, valores, atual, rot) {
    return `<div class="opcoes" data-grupo="${nome}">${valores.map((v, k) => `<button class="op ${v === atual ? 'on' : ''}" data-v="${v}">${esc(rot ? rot[k] : v)}</button>`).join('')}</div>`;
  }
  function lerOpcoes(cfg) {
    app.querySelectorAll('.opcoes').forEach(g => {
      const on = g.querySelector('.op.on');
      if (on) { const v = on.dataset.v; cfg[g.dataset.grupo] = /^\d+$/.test(v) ? +v : v; }
    });
    return cfg;
  }
  function cliqueOpcao(e) {
    const o = e.target.closest('.op'); if (!o) return false;
    o.parentElement.querySelectorAll('.op').forEach(x => x.classList.toggle('on', x === o));
    return true;
  }

  function telaConfigBots() {
    const cfg = Object.assign({ bots: 3, nivel: 'medio', meta: 200 }, store.get('cfgBots', {}));
    tela(`<button class="voltar" data-a="voltar">← Voltar</button>
      <div class="painel" style="max-width:480px;margin:10px auto">
        <h2 class="titulo centro">Contra bots</h2>
        <label class="rot">Quantos bots?</label>${opcoes('bots', [1, 2, 3, 4, 5], cfg.bots)}
        <label class="rot">Dificuldade</label>${opcoes('nivel', ['facil', 'medio', 'dificil'], cfg.nivel, ['Fácil', 'Médio', 'Difícil'])}
        <label class="rot">Meta de pontos</label>${opcoes('meta', [100, 200, 300], cfg.meta)}
        <div class="linha c" style="margin-top:18px"><button class="btn fogo grande larga" data-a="ok">Começar 💥</button></div>
      </div>${rodape()}`);
    app.onclick = e => {
      if (cliqueOpcao(e)) return;
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'voltar') return telaInicio();
      if (b.dataset.a === 'ok') {
        lerOpcoes(cfg); store.set('cfgBots', cfg);
        const eu = perfil() || { apelido: 'Você', avatar: '😎' };
        const nomes = embaralhar(NOMES_BOT.slice()), avs = embaralhar(AV_BOT.slice());
        const js = [{ nome: eu.apelido, tipo: 'humano', avatar: eu.avatar }];
        for (let i = 0; i < cfg.bots; i++) js.push({ nome: nomes[i], tipo: 'bot', avatar: avs[i], nivel: cfg.nivel });
        iniciarLocal('bots', { meta: cfg.meta }, js);
      }
    };
  }

  function telaConfigLocal() {
    const cfg = Object.assign({ n: 3, meta: 200, nomes: [] }, store.get('cfgLocal', {}));
    const avs = ['🦊', '🐼', '🐯', '🐸', '🦉', '🐙'];
    const desenhar = () => {
      const box = $('#nomes');
      const atuais = [...box.querySelectorAll('input')].map(i => i.value);
      box.innerHTML = Array.from({ length: cfg.n }, (_, k) => `<input class="txt" maxlength="12" placeholder="Jogador ${k + 1}" value="${esc(atuais[k] != null ? atuais[k] : cfg.nomes[k] || '')}">`).join('');
    };
    tela(`<button class="voltar" data-a="voltar">← Voltar</button>
      <div class="painel" style="max-width:480px;margin:10px auto">
        <h2 class="titulo centro">Mesmo aparelho</h2>
        <p class="sub centro">Passem o celular de mão em mão. Todas as cartas ficam à vista, como na mesa de verdade.</p>
        <label class="rot">Quantos jogadores?</label>${opcoes('n', [2, 3, 4, 5, 6], cfg.n)}
        <label class="rot">Nomes</label><div class="nomes" id="nomes"></div>
        <label class="rot">Meta de pontos</label>${opcoes('meta', [100, 200, 300], cfg.meta)}
        <div class="linha c" style="margin-top:18px"><button class="btn fogo grande larga" data-a="ok">Começar 💥</button></div>
      </div>${rodape()}`);
    desenhar();
    app.onclick = e => {
      if (cliqueOpcao(e)) { lerOpcoes(cfg); desenhar(); return; }
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'voltar') return telaInicio();
      if (b.dataset.a === 'ok') {
        lerOpcoes(cfg);
        cfg.nomes = [...$('#nomes').querySelectorAll('input')].map((i, k) => i.value.trim().slice(0, 12) || 'Jogador ' + (k + 1));
        store.set('cfgLocal', cfg);
        iniciarLocal('local', { meta: cfg.meta }, cfg.nomes.map((n, k) => ({ nome: n, tipo: 'humano', avatar: avs[k] })));
      }
    };
  }

  /* =================== PARTIDA =================== */
  // J: partida aberta
  let J = null;

  function iniciarLocal(modo, cfg, js) {
    J = { modo, cfg, js, st: M.novaPartida(cfg, js), ultimoSeq: 0, botT: null, foco: 0 };
    telaMesa();
  }

  const controla = i => {
    if (!J || !J.st.jogadores[i]) return false;
    const j = J.st.jogadores[i];
    if (J.modo === 'online') return j.tipo === 'humano' && j.uid === J.mesa.uid;
    return j.tipo === 'humano';
  };
  function meuIndice() {
    if (!J) return 0;
    if (J.modo === 'online') { const k = J.st.jogadores.findIndex(j => j.uid === J.mesa.uid); return k < 0 ? 0 : k; }
    if (J.modo === 'bots') return 0;
    const p = J.st.pend;
    if (p && controla(p.de)) J.foco = p.de;
    else if (J.st.jogadores[J.st.vez] && J.st.fase === 'jogo') J.foco = J.st.vez;
    return J.foco;
  }

  function aplicar(a, quem) {
    if (!J) return;
    if (J.modo === 'online' && !J.host) { J.mesa.pedir(a).catch(() => toast('Não deu para enviar a jogada. Confira a internet.', 'erro')); return; }
    const err = M.jogar(J.st, quem, a);
    if (err) { toast(err, 'erro'); return; }
    if (J.modo === 'online') J.mesa.publicar(J.st).catch(() => toast('Falha ao enviar para a sala.', 'erro'));
    desenharMesa();
  }

  function telaMesa() {
    tela(`<div id="mesa"></div>`);
    app.onclick = cliqueMesa;
    desenharMesa();
  }

  let animAte = 0;
  function desenharMesa() {
    if (!J) return;
    const st = J.st;
    const box = document.getElementById('mesa');
    if (!box) return;
    const novos = processarEventos();
    const foco = meuIndice();
    const eu = st.jogadores[foco];
    const p = st.pend;
    const vezDe = p ? p.de : st.vez;
    const meus = new Set(eu.nums.map(id => C(id).v));
    const dupV = eu.estado === 'estourou' && eu.nums.length ? C(eu.nums[eu.nums.length - 1]).v : null;
    const cartaAnim = (id, cls) => { const n = novos.has(id); return cartaHTML(id, (cls || '') + (n ? ' nova' : ''), n ? `style="--d:${novos.get(id)}ms"` : ''); };

    const rivais = st.jogadores.map((j, i) => {
      if (i === foco) return '';
      const selo = j.estado === 'estourou' ? '<span class="selo verm">ESTOUROU 💥</span>' : j.cheio ? '<span class="selo verde">SETE CHEIO 🎉</span>' : j.estado === 'parou' ? '<span class="selo azul">PAROU ✋</span>' : i === vezDe && st.fase === 'jogo' ? '<span class="selo">VEZ</span>' : '';
      const minis = j.nums.concat(j.mods).map(id => cartaAnim(id, 'mini')).join('') + (j.escudo != null ? cartaAnim(j.escudo, 'mini') : '');
      return `<div class="rival ${j.estado} ${i === vezDe && st.fase === 'jogo' ? 'vez' : ''}" data-j="${i}">${selo}
        <div class="cab"><span class="av">${esc(j.avatar || '🙂')}</span><span class="nm">${esc(j.nome)}</span></div>
        <div class="pts"><span>Total <b>${j.total}</b></span><span>Rodada <b>${j.estado === 'estourou' ? 0 : j.pts}</b></span></div>
        <div class="minis">${minis || '<span class="nota">sem cartas</span>'}</div></div>`;
    }).join('');

    const topoDesc = st.descarte.length ? st.descarte[st.descarte.length - 1] : null;
    const risco = Math.round(M.riscoEstouro(st, foco) * 100);
    const unicos = meus.size;
    const minhaVez = p && p.tipo === 'vez' && p.de === foco && controla(foco);
    let espera = '';
    if (st.fase === 'jogo' && p && !minhaVez) {
      const q = st.jogadores[p.de];
      const oque = p.tipo === 'vez' ? 'decidindo' : p.tipo === 'espiar' ? 'espiando o baralho' : p.tipo === 'troca' ? 'escolhendo a troca' : 'escolhendo o alvo';
      espera = controla(p.de) ? '' : `${esc(q.avatar || '')} ${esc(q.nome)} está ${oque}…`;
    }
    const aviso = st.log.length ? esc(st.log[st.log.length - 1]) : 'Boa sorte!';
    const estadoEu = eu.estado === 'estourou' ? '💥 Você estourou nesta rodada' : eu.cheio ? '🎉 Sete Cheio!' : eu.estado === 'parou' ? `✋ Parou com ${eu.pts} pontos` : '';
    const nomeEu = J.modo === 'local' ? eu.nome : (J.modo === 'bots' || controla(foco) ? 'Você' : eu.nome);

    box.innerHTML = `
      <div class="topo">
        <button class="ic-btn" data-a="sair" aria-label="Sair" title="Sair">✕</button>
        <span class="tag">Rodada ${st.rodada}</span><span class="tag">Meta ${st.cfg.meta}</span>
        ${J.modo === 'online' ? `<span class="tag">Sala ${esc(J.mesa.codigo)}</span>` : ''}
        <button class="ic-btn" data-a="regras" aria-label="Como jogar" title="Como jogar">?</button>
      </div>
      <div class="rivais">${rivais}</div>
      <div class="centro-mesa">
        <div class="monte"><div class="pilha">${cartaHTML(null)}${st.baralho.length > 1 ? cartaHTML(null) : ''}${st.baralho.length > 2 ? cartaHTML(null) : ''}</div>${st.baralho.length} cartas</div>
        <div class="aviso">${aviso}</div>
        <div class="monte"><div class="pilha">${topoDesc != null ? cartaHTML(topoDesc) : '<div class="carta" style="opacity:.15"></div>'}</div>descarte</div>
      </div>
      <div class="eu ${eu.estado} ${vezDe === foco && st.fase === 'jogo' ? 'vez' : ''}" id="eu">
        <div class="cab"><span class="av">${esc(eu.avatar || '😎')}</span><span>${esc(nomeEu)}</span><span class="tot">Total <b>${eu.total}</b></span></div>
        <div class="mao">${eu.nums.map(id => cartaAnim(id, C(id).v === dupV ? 'dup' : '')).join('') || '<span class="vazio">Sem cartas ainda</span>'}${eu.mods.length || eu.escudo != null ? '<span class="sep"></span>' : ''}${eu.mods.map(id => cartaAnim(id)).join('')}${eu.escudo != null ? cartaAnim(eu.escudo) : ''}</div>
        <div class="placa">
          <div>Pontos da rodada<b>${eu.estado === 'estourou' ? 0 : eu.pts}</b></div>
          <div class="risco ${risco >= 30 ? 'alto' : ''}">Risco de estourar<b>${eu.estado === 'ativo' ? (eu.escudo != null ? '🛡️ 0' : risco) + '%' : '—'}</b></div>
          <div>Sete Cheio<b>${unicos}/7</b></div>
        </div>
        <div class="sete">${Array.from({ length: 7 }, (_, k) => `<i class="${k < unicos ? 'on' : ''}"></i>`).join('')}</div>
        ${estadoEu ? `<div class="espera">${estadoEu}</div>` : ''}
        ${minhaVez ? `<div class="acoes"><button class="btn fogo" data-a="puxar">PUXAR</button><button class="btn" data-a="parar">✋ PARAR</button></div>` : ''}
        ${espera ? `<div class="espera">${espera}</div>` : ''}
      </div>
      ${J.modo === 'online' ? `<div class="reacoes">${REACOES.map(r => `<button data-reacao="${esc(r)}">${esc(r)}</button>`).join('')}</div>` : ''}
      <div class="log">${st.log.slice(-8).map(l => `<div>${esc(l)}</div>`).join('')}</div>`;
    const lg = box.querySelector('.log'); if (lg) lg.scrollTop = lg.scrollHeight;

    // janelas de decisão / fim de rodada (depois das animações)
    clearTimeout(J.veuT);
    const espera2 = Math.max(0, animAte - Date.now());
    if (st.fase === 'fimJogo') { const jj = J; J.veuT = setTimeout(() => { if (J === jj && J.st.fase === 'fimJogo') telaFim(); }, espera2 + 1600); return; }
    J.veuT = setTimeout(abrirJanela, espera2 + (espera2 ? 250 : 0));
    agendarBots(espera2);
  }

  // olha os eventos novos: devolve mapa id→atraso (ms) das cartas para animar e mostra os avisos
  function processarEventos() {
    const st = J.st;
    const novos = new Map();
    const evs = st.ev.filter(e => e.seq > J.ultimoSeq);
    const primeira = J.ultimoSeq === 0 && st.rodada > 1; // entrou no meio (online)
    J.ultimoSeq = st.seq;
    if (!evs.length || primeira) return novos;
    let t = 0;
    let destaque = null;
    evs.forEach(e => {
      if ((e.tipo === 'carta' || e.tipo === 'estourou' || e.tipo === 'acao') && e.id != null) { novos.set(e.id, t); t += 260; }
      if (e.tipo === 'estourou') destaque = destaque || e;
      if (e.tipo === 'cheio') destaque = e;
      if (e.tipo === 'salvo' && !destaque) destaque = e;
    });
    animAte = Date.now() + t + 350;
    const foco = meuIndice();
    if (destaque) {
      setTimeout(() => {
        if (destaque.tipo === 'estourou') {
          boom('ESTOUROU!');
          if (destaque.j === foco) { const el = document.getElementById('eu'); if (el) { el.classList.add('treme'); setTimeout(() => el.classList.remove('treme'), 500); } if (navigator.vibrate) navigator.vibrate(160); }
          else toast(destaque.txt);
        } else if (destaque.tipo === 'cheio') { boom('SETE CHEIO!'); toast(destaque.txt, 'festa'); }
        else toast(destaque.txt);
      }, Math.max(0, t - 200));
    } else {
      const ult = evs.filter(e => e.txt && e.tipo !== 'acao').pop();
      if (ult && evs.length > 1) setTimeout(() => toast(ult.txt), Math.max(0, t - 200));
    }
    return novos;
  }

  function abrirJanela() {
    if (!J || !document.getElementById('mesa')) return;
    const st = J.st;
    if (st.fase === 'fimRodada') return janelaFimRodada();
    const p = st.pend;
    if (!p || p.tipo === 'vez' || !controla(p.de)) { fecharVeu(); return; }
    if (J.modo === 'local') J.foco = p.de;
    if (p.tipo === 'alvo') return janelaAlvo(p);
    if (p.tipo === 'troca') return janelaTroca(p);
    if (p.tipo === 'espiar') return janelaEspiar(p);
  }

  const quemSou = i => (J.modo !== 'local' && controla(i)) ? 'Você' : J.st.jogadores[i].nome;

  function janelaAlvo(p) {
    const st = J.st;
    const I = p.a === 'escudoDar' ? { nome: 'Escudo extra', ic: '🛡️', txt: 'Você já tem um Escudo. Escolha quem vai ganhar este.' } : M.INFO_ACAO[p.a];
    const id = p.id;
    const d = veu(`<div class="painel centro">
        <div class="linha c" style="--cw:84px">${cartaHTML(id, 'grande-carta')}</div>
        <h2 class="titulo">${I.ic} ${esc(I.nome)}</h2>
        <p class="sub">${esc(I.txt)}</p>
        ${J.modo === 'local' ? `<p class="nota"><b>${esc(st.jogadores[p.de].nome)}</b>, é com você.</p>` : ''}
        <p class="rot centro">Em quem você vai usar?</p>
        <div class="alvos">${p.ops.map(i => { const j = st.jogadores[i]; return `<button class="alvo" data-alvo="${i}"><span class="av">${esc(j.avatar || '🙂')}</span><span class="info">${esc(quemSou(i))}${i === p.de ? ' (você mesmo)' : ''}<span>${j.pts} pts na rodada · ${j.nums.length} ${j.nums.length === 1 ? 'carta' : 'cartas'} · risco ${Math.round(M.riscoEstouro(st, i) * 100)}%${j.escudo != null ? ' · 🛡️' : ''}</span></span><span>➜</span></button>`; }).join('')}</div>
      </div>`);
    d.onclick = e => { const b = e.target.closest('[data-alvo]'); if (!b) return; fecharVeu(); aplicar({ a: 'alvo', i: +b.dataset.alvo }, p.de); };
  }

  function janelaTroca(p) {
    const st = J.st;
    const eu = st.jogadores[p.de];
    let minha = null, dele = null, alvo = null;
    const d = veu('');
    const desenhar = () => {
      const meusV = id => eu.nums.filter(x => x !== minha).map(x => C(x).v);
      let alerta = '';
      if (minha != null && dele != null) {
        const ele = st.jogadores[alvo];
        const euEst = meusV().includes(C(dele).v);
        const eleEst = ele.nums.filter(x => x !== dele).map(x => C(x).v).includes(C(minha).v);
        if (euEst) alerta += `<p class="nota" style="color:#ffb3b3">⚠️ Você vai receber um número repetido${eu.escudo != null ? ' (o seu Escudo salva)' : ' e vai ESTOURAR'}.</p>`;
        if (eleEst) alerta += `<p class="nota" style="color:#ffe08a">💥 ${esc(ele.nome)} vai receber um número repetido${ele.escudo != null ? ', mas tem Escudo' : ' e vai ESTOURAR'}!</p>`;
      }
      d.innerHTML = `<div class="painel">
        <div class="linha c">${cartaHTML(p.id, 'grande-carta')}</div>
        <h2 class="titulo centro">🔄 Troca</h2>
        <p class="sub centro">Toque em uma carta sua e em uma carta de outro jogador.</p>
        <div class="troca-bloco"><h4>${J.modo === 'local' ? esc(eu.nome) : 'Suas cartas'}</h4><div class="mao">${eu.nums.map(id => `<button class="carta-bt" data-minha="${id}" style="background:none;border:0;padding:0">${cartaHTML(id, id === minha ? 'sel' : '')}</button>`).join('')}</div></div>
        ${p.ops.map(i => { const j = st.jogadores[i]; return `<div class="troca-bloco"><h4>${esc(j.avatar || '')} ${esc(j.nome)} · ${j.pts} pts${j.escudo != null ? ' · 🛡️' : ''}</h4><div class="mao">${j.nums.map(id => `<button data-dele="${id}" data-j="${i}" style="background:none;border:0;padding:0">${cartaHTML(id, id === dele ? 'sel' : '')}</button>`).join('')}</div></div>`; }).join('')}
        ${alerta}
        <div class="linha c" style="margin-top:10px"><button class="btn fogo larga" data-a="ok" ${minha != null && dele != null ? '' : 'disabled'}>Trocar</button></div>
      </div>`;
    };
    desenhar();
    d.onclick = e => {
      const m = e.target.closest('[data-minha]'); if (m) { minha = +m.dataset.minha; return desenhar(); }
      const o = e.target.closest('[data-dele]'); if (o) { dele = +o.dataset.dele; alvo = +o.dataset.j; return desenhar(); }
      const b = e.target.closest('[data-a="ok"]');
      if (b && minha != null && dele != null) { fecharVeu(); aplicar({ a: 'troca', i: alvo, minha, dele }, p.de); }
    };
  }

  function janelaEspiar(p) {
    let ordem = p.cartas.slice();
    const d = veu('');
    const desenhar = () => {
      d.innerHTML = `<div class="painel centro">
        <h2 class="titulo">👁️ Espiar</h2>
        <p class="sub">Estas são as próximas cartas do baralho. A da esquerda sai primeiro. Mude a ordem como quiser.</p>
        ${J.modo === 'local' ? `<p class="nota">Só <b>${esc(J.st.jogadores[p.de].nome)}</b> pode olhar!</p>` : ''}
        <div class="espiar-cartas">${ordem.map((id, k) => `<div class="slot"><small>${k + 1}ª</small>${cartaHTML(id, 'grande-carta')}<div class="setas"><button data-mv="${k}" data-d="-1" ${k === 0 ? 'disabled' : ''}>◀</button><button data-mv="${k}" data-d="1" ${k === ordem.length - 1 ? 'disabled' : ''}>▶</button></div></div>`).join('')}</div>
        <button class="btn fogo larga" data-a="ok">Pronto</button>
      </div>`;
    };
    desenhar();
    d.onclick = e => {
      const s = e.target.closest('[data-mv]');
      if (s) { const k = +s.dataset.mv, q = k + +s.dataset.d; if (q >= 0 && q < ordem.length) { [ordem[k], ordem[q]] = [ordem[q], ordem[k]]; desenhar(); } return; }
      if (e.target.closest('[data-a="ok"]')) { fecharVeu(); aplicar({ a: 'espiar', ordem }, p.de); }
    };
  }

  function linhaResultado(st, i, r) {
    const j = st.jogadores[i];
    let det = '';
    if (r.estado === 'estourou') det = '💥 estourou';
    else {
      const partes = [`números ${r.det.base}`];
      if (r.det.x2) partes.push('×2');
      if (r.det.mais) partes.push('+' + r.det.mais);
      if (r.cheio) partes.push('Sete Cheio +' + M.BONUS_CHEIO);
      det = partes.join(' · ');
    }
    const pct = Math.min(100, Math.round(j.total / st.cfg.meta * 100));
    return `<tr class="${r.estado === 'estourou' ? 'est' : ''} ${r.cheio ? 'cheio' : ''}"><td>${esc(j.avatar || '')} ${esc(j.nome)}${r.cheio ? ' <span class="selo-in">SETE CHEIO 🎉</span>' : ''}<span class="det">${det}</span><span class="barra"><i style="width:${pct}%"></i></span></td><td class="n">${r.estado === 'estourou' ? 0 : '+' + r.pts}</td><td class="n">${j.total}</td></tr>`;
  }

  function janelaFimRodada() {
    const st = J.st;
    const res = st.ultimaRodada || [];
    const ordem = st.jogadores.map((_, i) => i).sort((a, b) => st.jogadores[b].total - st.jogadores[a].total);
    const podeSeguir = J.modo !== 'online' || J.host;
    const d = veu(`<div class="painel centro">
        <h2 class="titulo">Fim da rodada ${st.rodada}</h2>
        <table class="tabela"><tr><th>Jogador</th><th style="text-align:right">Rodada</th><th style="text-align:right">Total</th></tr>
        ${ordem.map(i => linhaResultado(st, i, res[i] || { pts: 0, estado: 'parou', det: { base: 0 } })).join('')}</table>
        <p class="nota">Meta: ${st.cfg.meta} pontos</p>
        ${podeSeguir ? '<button class="btn fogo grande larga" data-a="prox">Próxima rodada ➜</button>' : '<p class="espera">Aguardando o anfitrião começar a próxima rodada…</p>'}
      </div>`);
    d.onclick = e => { if (e.target.closest('[data-a="prox"]')) { fecharVeu(); J.ultimoSeq = J.st.seq; aplicar({ a: 'proxima' }, 0); } };
  }

  function telaFim() {
    if (!J) return;
    const st = J.st;
    const v = st.jogadores[st.vencedores[0]];
    const ordem = st.jogadores.map((_, i) => i).sort((a, b) => st.jogadores[b].total - st.jogadores[a].total);
    const ganhei = J.modo !== 'local' && controla(st.vencedores[0]);
    const res = st.ultimaRodada || [];
    clearTimeout(J.botT);
    tela(`<div class="painel centro" style="max-width:520px;margin:14px auto">
        <div class="trofeu">🏆</div>
        <h2 class="titulo">${ganhei ? 'Você venceu!' : esc(v.nome) + ' venceu!'}</h2>
        <p class="sub">${v.total} pontos em ${st.rodada} ${st.rodada === 1 ? 'rodada' : 'rodadas'}</p>
        <table class="tabela"><tr><th>Jogador</th><th style="text-align:right">Última</th><th style="text-align:right">Total</th></tr>
        ${ordem.map(i => linhaResultado(st, i, res[i] || { pts: 0, estado: 'parou', det: { base: 0 } })).join('')}</table>
        <div class="cdx-ad" data-ad="jogo-resultado"></div>
        <div class="linha c" style="margin-top:12px">
          ${J.modo === 'online' ? (J.host ? '<button class="btn fogo grande" data-a="denovo">Jogar de novo</button>' : '<p class="espera">O anfitrião pode começar outra partida.</p>') : '<button class="btn fogo grande" data-a="denovo">Jogar de novo</button>'}
          <button class="btn claro" data-a="inicio">Início</button>
        </div>
        <p class="nota" style="margin-top:14px"><a href="${URL_SUG}" target="_blank" rel="noopener">💡 Enviar sugestão</a></p>
      </div>${rodape()}`);
    if (window.CarludixAds) window.CarludixAds.render();
    app.onclick = e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'inicio') return telaInicio();
      if (b.dataset.a === 'denovo') {
        if (J.modo === 'online') return novaPartidaOnline();
        iniciarLocal(J.modo, J.cfg, J.js);
      }
    };
  }

  function cliqueMesa(e) {
    const r = e.target.closest('[data-reacao]');
    if (r && J && J.mesa) { if (J.mesa.reagir(r.dataset.reacao)) mostrarReacao({ uid: J.mesa.uid, r: r.dataset.reacao }); return; }
    const b = e.target.closest('[data-a]'); if (!b || !J) return;
    const a = b.dataset.a;
    const p = J.st.pend;
    if (a === 'puxar' || a === 'parar') {
      if (!p || p.tipo !== 'vez' || !controla(p.de)) return;
      b.disabled = true;
      aplicar({ a }, p.de);
    }
    if (a === 'regras') {
      const d = veu(`<div class="painel"><h2 class="titulo centro">Resumo</h2><div class="regras">
        <p><b>PUXAR</b> mais uma carta ou <b>PARAR</b> e guardar os pontos. Número repetido = <b>💥 estourou</b> (0 na rodada). 7 números diferentes = <b>🎉 Sete Cheio</b> (+${M.BONUS_CHEIO} e a rodada acaba).</p>
        ${M.ACOES.map(x => `<div class="ex">${cartaHTML(85 + M.ACOES.indexOf(x) * 3)}<span><b>${M.INFO_ACAO[x].nome}:</b> ${M.INFO_ACAO[x].txt}</span></div>`).join('')}
        <p>Pontos: soma dos números (×2 se tiver) + modificadores + bônus.</p></div>
        <div class="linha c"><button class="btn fogo" data-a="fechar">Voltar ao jogo</button></div></div>`, () => abrirJanela());
      d.onclick = ev => { if (ev.target.closest('[data-a="fechar"]')) { fecharVeu(); abrirJanela(); } };
    }
    if (a === 'sair') {
      const d = veu(`<div class="painel centro"><h2 class="titulo">Sair da partida?</h2><p class="sub">${J.modo === 'online' ? 'Você sai da sala. Os outros continuam jogando.' : 'A partida em andamento será perdida.'}</p>
        <div class="linha c"><button class="btn claro" data-a="fica">Continuar jogando</button><button class="btn fogo" data-a="sai">Sair</button></div></div>`, () => abrirJanela());
      d.onclick = ev => {
        if (ev.target.closest('[data-a="fica"]')) { fecharVeu(); abrirJanela(); }
        if (ev.target.closest('[data-a="sai"]')) { const x = J; J = null; if (x) clearTimeout(x.botT); telaInicio(); }
      };
    }
  }

  /* ---------- bots (e quem saiu da sala online) ---------- */
  function agendarBots(espera) {
    if (!J) return;
    clearTimeout(J.botT);
    if (J.modo === 'online' && !J.host) return;
    const st = J.st;
    const p = st.pend;
    if (st.fase !== 'jogo' || !p) return;
    const j = st.jogadores[p.de];
    let atraso = null;
    if (j.tipo === 'bot') atraso = (p.tipo === 'vez' ? 750 : 1100) + Math.random() * 450;
    else if (J.modo === 'online' && j.uid && !J.mesa.presente(j.uid)) atraso = 3500; // saiu da sala: joga no automático
    if (atraso == null) return;
    const seq = st.seq;
    J.botT = setTimeout(() => {
      if (!J || J.st.seq !== seq || !J.st.pend) return;
      const d = B.decidir(J.st, J.st.pend.de) || { a: 'parar' };
      aplicar(d, J.st.pend.de);
    }, (espera || 0) + atraso);
  }

  /* =================== PERFIL (apelido e avatar, compartilhados entre os jogos) =================== */
  const AVATARES = ['🦊', '🐶', '🐱', '🐼', '🐸', '🐯', '🦁', '🐵', '🐧', '🦉', '🐢', '🐙', '🦄', '🐝', '🐞', '🐬', '⚽', '🏀', '🎾', '🃏', '♠️', '♥️', '♦️', '♣️', '🎲', '⭐', '🚀', '🌻'];
  const REACOES = ['👏', '😂', '🔥', '😱', '🙏', 'Boa!', 'Arrisca!', 'GG!'];
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
    const PERMITIDAS = /computa|disputa|reputa|imputa/g;
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
        <div class="linha c" style="margin-top:16px"><button class="btn fogo grande" data-a="ok">Continuar</button></div>
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

  /* =================== ONLINE =================== */
  let MESA = null; // sala aberta
  function sairOnline() {
    if (MESA) { const m = MESA; MESA = null; m.sair().catch(() => {}); }
    R.desmarcarOnline();
  }
  function erroOnline(e) {
    const m = String((e && (e.code || e.message)) || e);
    if (/permission|PERMISSION/i.test(m)) return 'O online do Estourou! ainda não foi liberado no servidor' + (e && e.caminho ? ' (' + e.caminho + ')' : '') + '. Enquanto isso, jogue contra os bots ou no mesmo aparelho.';
    if (/nao-existe/.test(m)) return 'Não achei essa sala. Confira o código.';
    if (/cheia/.test(m)) return 'Essa sala está cheia.';
    if (/jogando/.test(m)) return 'Essa sala já começou a jogar. Escolha outra.';
    return 'Não deu para conectar ao servidor. Confira a internet e tente de novo.';
  }

  function telaOnline(eu) {
    const cfg = Object.assign({ max: 4, meta: 200, publica: 'sim' }, store.get('cfgOnline', {}));
    tela(`<button class="voltar" data-a="voltar">← Voltar</button>
      <div class="painel" style="max-width:520px;margin:6px auto">
        <h2 class="titulo centro">Jogar online</h2>
        <p class="nota centro">Você: <b>${esc(eu.avatar + ' ' + eu.apelido)}</b> · <a href="#" data-a="perfil">trocar</a></p>
        <label class="rot">Entrar com código</label>
        <div class="linha"><input class="txt" id="cod" maxlength="4" placeholder="ABCD" style="flex:1;text-transform:uppercase;letter-spacing:4px" autocomplete="off"><button class="btn ouro" data-a="entrar">Entrar</button></div>
        <label class="rot">Salas abertas</label>
        <div class="mesas" id="mesas"><p class="nota">Procurando salas…</p></div>
        <label class="rot">Criar sala</label>
        <p class="nota" style="margin:0 0 4px">Máximo de jogadores</p>${opcoes('max', [2, 3, 4, 5, 6], cfg.max)}
        <p class="nota" style="margin:10px 0 4px">Meta de pontos</p>${opcoes('meta', [100, 200, 300], cfg.meta)}
        <p class="nota" style="margin:10px 0 4px">Quem pode entrar</p>${opcoes('publica', ['sim', 'nao'], cfg.publica, ['Qualquer um (pública)', 'Só com o código'])}
        <div class="linha c" style="margin-top:14px"><button class="btn fogo grande larga" data-a="criar">Criar sala</button></div>
        <p class="nota centro" id="online-agora" style="margin-top:10px"></p>
      </div>${rodape()}`);
    R.marcarOnline().catch(() => {});
    R.ouvirSalas((lista, err) => {
      const box = document.getElementById('mesas'); if (!box) return;
      if (!lista) { box.innerHTML = `<p class="nota">${esc(erroOnline(err))}</p>`; return; }
      box.innerHTML = lista.length ? lista.map(m => {
        const h = (m.jogadores || {})[m.anfitriao] || {};
        return `<div class="mesa-item"><div style="font-size:26px">${esc(h.avatar || '💥')}</div><div class="info"><b>${esc(h.apelido || 'Sala')}</b><span>${esc(m.modo || '')}</span></div><div class="lugares">${m.ocupadas}/${m.max}</div><button class="btn peq ouro" data-a="sentar" data-cod="${esc(m.codigo)}">Entrar</button></div>`;
      }).join('') : '<p class="nota">Nenhuma sala aberta agora. Crie a sua e chame os amigos!</p>';
    }).then(off => limpeza.push(off)).catch(e => { const box = document.getElementById('mesas'); if (box) box.innerHTML = `<p class="nota">${esc(erroOnline(e))}</p>`; });
    R.ouvirContador(n => { const el = document.getElementById('online-agora'); if (el && n) el.textContent = `🟢 ${n} ${n === 1 ? 'pessoa' : 'pessoas'} online agora`; }).then(off => limpeza.push(off)).catch(() => {});
    $('#cod').onkeydown = e => { if (e.key === 'Enter') entrar($('#cod').value); };
    const entrar = c => { c = String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (c.length !== 4) return toast('O código tem 4 letras.', 'erro'); entrarSala(c, eu); };
    app.onclick = async e => {
      if (cliqueOpcao(e)) return;
      const b = e.target.closest('[data-a]'); if (!b) return;
      const a = b.dataset.a;
      if (a === 'voltar') return telaInicio();
      if (a === 'perfil') { e.preventDefault(); return pedirPerfil(telaOnline, true); }
      if (a === 'entrar') return entrar($('#cod').value);
      if (a === 'sentar') return entrarSala(b.dataset.cod, eu);
      if (a === 'criar') {
        lerOpcoes(cfg); store.set('cfgOnline', cfg);
        b.disabled = true;
        try {
          const codigo = await R.criarSala({ cfg: { meta: cfg.meta }, publica: cfg.publica === 'sim', modo: `Até ${cfg.max} jogadores · meta ${cfg.meta}`, min: 2, max: cfg.max, perfil: eu });
          entrarSala(codigo, eu);
        } catch (err) { b.disabled = false; toast(erroOnline(err), 'erro'); }
      }
    };
  }

  async function entrarSala(codigo, eu) {
    tela(`<div class="painel centro" style="max-width:420px;margin:40px auto"><p class="sub">Entrando na sala ${esc(codigo)}…</p></div>`);
    try {
      sairOnline();
      MESA = await R.abrirSala(codigo, eu);
      R.marcarOnline().catch(() => {});
      try { history.replaceState(null, '', location.pathname + '?sala=' + codigo + (TESTE ? '&teste=' + TESTE : '')); } catch (e) {}
    } catch (e) { toast(erroOnline(e), 'erro'); return telaOnline(eu); }
    const mesa = MESA;
    mesa.onSaiu(motivo => {
      if (MESA !== mesa) return;
      MESA = null; J = null;
      toast(motivo === 'removido' ? 'Você foi removido da sala.' : 'A sala foi encerrada.', 'erro');
      limparUrl(); telaOnline(eu);
    });
    mesa.onErro(msg => toast(msg, 'erro'));
    mesa.onReacao(mostrarReacao);
    mesa.onEstado(st => {
      if (MESA !== mesa) return;
      if (!J || J.mesa !== mesa) { comecarOnline(mesa, st); return; }
      if (J.host) return; // o anfitrião é a fonte do estado
      if (st.seq < J.ultimoSeq) J.ultimoSeq = 0; // partida nova
      J.st = st;
      if (st.fase === 'fimJogo' && document.getElementById('mesa')) desenharMesa();
      else if (document.getElementById('mesa')) desenharMesa();
      else if (st.fase !== 'fimJogo') telaMesa();
    });
    mesa.onSala(sala => {
      if (MESA !== mesa) return;
      if (J && J.mesa === mesa) {
        // anfitrião saiu? quem entrou antes assume
        if (!J.host) mesa.conferirAnfitriao().then(ok => { if (ok && J && J.mesa === mesa) { J.host = true; mesa.ouvirPedidos(pedidoOnline); toast('Agora você é o anfitrião da sala.'); agendarBots(0); } }).catch(() => {});
        else agendarBots(0);
        return;
      }
      if (sala.status === 'esperando') telaSala(mesa, eu);
    });
  }
  function limparUrl() { try { history.replaceState(null, '', location.pathname + (TESTE ? '?teste=' + TESTE : '')); } catch (e) {} }

  function telaSala(mesa, eu) {
    const sala = mesa.sala;
    const host = mesa.souAnfitriao();
    const lugares = R.distribuirLugares(sala);
    const ocup = lugares.filter(Boolean);
    const humanosProntos = ocup.every(([u, j]) => j.bot || j.pronto || u === sala.anfitriao);
    const pode = ocup.length >= 2 && humanosProntos;
    const minha = (sala.jogadores || {})[mesa.uid] || {};
    const url = location.origin + location.pathname + '?sala=' + mesa.codigo;
    const html = `<button class="voltar" data-a="sair">← Sair da sala</button>
      <div class="painel centro" style="max-width:520px;margin:6px auto">
        <p class="nota" style="margin:0">Código da sala</p>
        <div class="codigo">${esc(mesa.codigo)}</div>
        <div class="linha c"><button class="btn peq ouro" data-a="convidar">📨 Convidar amigos</button></div>
        <p class="nota">${esc(sala.modo || '')} · ${sala.publica ? 'sala pública' : 'só com o código'}</p>
        <div class="jogadores-sala">${lugares.map((x, k) => {
          if (!x) return `<div class="jog" style="opacity:.5"><span class="av">🪑</span><div class="info"><b>Lugar ${k + 1}</b><span>vazio</span></div></div>`;
          const [u, j] = x, ehHost = u === sala.anfitriao, sou = u === mesa.uid;
          return `<div class="jog"><span class="av">${esc(j.avatar || '🙂')}</span><div class="info"><b>${j.bot ? '🤖 ' : ''}${esc(j.apelido)}${ehHost ? ' 👑' : ''}${sou ? ' (você)' : ''}</b><span>${j.bot ? 'bot' : j.pronto || ehHost ? '✅ pronto' : '⏳ não está pronto'}</span></div>${host && !sou ? `<button class="ic-btn rem" data-rem="${esc(u)}" aria-label="Remover ${esc(j.apelido)}" title="Remover">✕</button>` : ''}</div>`;
        }).join('')}</div>
        ${host ? `<div class="linha c">
            ${lugares.includes(null) ? '<button class="btn peq claro" data-a="bot">🤖 Pôr um bot</button>' : ''}
            <button class="btn fogo grande" data-a="comecar" ${pode ? '' : 'disabled'}>Começar 💥</button></div>
            <p class="nota">${ocup.length < 2 ? 'Precisa de pelo menos 2 jogadores (pode pôr bots).' : humanosProntos ? 'Todos prontos!' : 'Esperando todos ficarem prontos.'}</p>`
          : `<button class="btn ${minha.pronto ? 'claro' : 'fogo'} grande" data-a="pronto">${minha.pronto ? 'Não estou pronto' : 'Estou pronto ✅'}</button><p class="nota">O anfitrião 👑 começa a partida.</p>`}
      </div>
      <div class="reacoes">${REACOES.map(r => `<button data-reacao="${esc(r)}">${esc(r)}</button>`).join('')}</div>${rodape()}`;
    if (!document.getElementById('sala-espera')) tela(`<div id="sala-espera"></div>`);
    document.getElementById('sala-espera').innerHTML = html;
    app.onclick = async e => {
      const r = e.target.closest('[data-reacao]');
      if (r) { if (mesa.reagir(r.dataset.reacao)) mostrarReacao({ uid: mesa.uid, r: r.dataset.reacao }); return; }
      const rem = e.target.closest('[data-rem]'); if (rem) return mesa.remover(rem.dataset.rem).catch(() => {});
      const b = e.target.closest('[data-a]'); if (!b) return;
      const a = b.dataset.a;
      if (a === 'sair') { sairOnline(); limparUrl(); return telaOnline(eu); }
      if (a === 'pronto') return mesa.pronto(!minha.pronto).catch(err => toast(erroOnline(err), 'erro'));
      if (a === 'bot') {
        const usados = Object.values(mesa.sala.jogadores || {}).map(x => x.apelido);
        const nome = NOMES_BOT.find(n => !usados.includes(n)) || 'Bot';
        return mesa.porBot(nome, 'medio').catch(err => toast(erroOnline(err), 'erro'));
      }
      if (a === 'convidar') {
        const texto = 'Bora jogar Estourou! no CARLUDIX? Sala ' + mesa.codigo + ': ' + url;
        if (navigator.share) navigator.share({ title: 'Estourou! · CARLUDIX', text: texto, url }).catch(() => {});
        else { try { await navigator.clipboard.writeText(texto); toast('Convite copiado!'); } catch (err) { toast(url); } }
        return;
      }
      if (a === 'comecar') { b.disabled = true; novaPartidaOnline(); }
    };
  }

  function jogadoresDaSala(sala) {
    return R.distribuirLugares(sala).filter(Boolean).map(([u, j]) => j.bot ? { nome: j.apelido, tipo: 'bot', nivel: j.nivel || 'medio', avatar: j.avatar || '🤖' } : { nome: j.apelido, tipo: 'humano', uid: u, avatar: j.avatar });
  }
  async function novaPartidaOnline() {
    const mesa = MESA; if (!mesa) return;
    const js = jogadoresDaSala(mesa.sala);
    if (js.length < 2) return toast('Precisa de pelo menos 2 jogadores.', 'erro');
    const cfg = mesa.cfg || { meta: 200 };
    const st = M.novaPartida(cfg, js);
    J = { modo: 'online', mesa, host: true, cfg, st, ultimoSeq: 0, botT: null, foco: 0 };
    mesa.ouvirPedidos(pedidoOnline);
    try { await mesa.comecar(st); } catch (e) { toast(erroOnline(e), 'erro'); }
    telaMesa();
  }
  function comecarOnline(mesa, st) {
    const host = mesa.souAnfitriao();
    J = { modo: 'online', mesa, host, cfg: mesa.cfg, st, ultimoSeq: 0, botT: null, foco: 0 };
    if (host) mesa.ouvirPedidos(pedidoOnline);
    if (st.fase === 'fimJogo') return telaFim();
    telaMesa();
  }
  function pedidoOnline(a, de) {
    if (!J || !J.host) return;
    const i = J.st.jogadores.findIndex(j => j.uid === de);
    if (a.a === 'proxima') return; // só o anfitrião passa de rodada
    if (i < 0) return;
    const err = M.jogar(J.st, i, a);
    if (err) { J.mesa.avisarErro(de, err).catch(() => {}); return; }
    J.mesa.publicar(J.st).catch(() => {});
    desenharMesa();
  }
  function mostrarReacao(v) {
    let nome = '';
    if (MESA && MESA.sala && MESA.sala.jogadores && MESA.sala.jogadores[v.uid]) { const j = MESA.sala.jogadores[v.uid]; nome = (j.avatar || '') + ' ' + j.apelido + ': '; }
    document.querySelectorAll('.balao-reacao').forEach(x => x.remove());
    const d = document.createElement('div');
    d.className = 'balao-reacao';
    d.textContent = nome + v.r;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 2200);
  }

  if (/[?&]debug=1/.test(location.search)) window.__estourou = { J: () => J, desenhar: () => desenharMesa() };

  window.addEventListener('beforeunload', () => { if (MESA) MESA.sair(); });

  /* =================== ABERTURA =================== */
  const salaUrl = (new URLSearchParams(location.search).get('sala') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  if (salaUrl.length === 4) pedirPerfil(eu => entrarSala(salaUrl, eu));
  else telaInicio();
})();
