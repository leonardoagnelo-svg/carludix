/* IMPÉRIOS — CARLUDIX · online (padrão CARLUDIX de sala de espera)
   Firebase "carludix" (mesmo app e login anônimo do Buraco).
     carludix/salas/imperios/<CODIGO>   → a sala: anfitrião, jogadores (com o reino escolhido), status, reações
     carludix/imperios/<CODIGO>/...     → a partida: cfg, estado completo (gravado pelo anfitrião), pedidos, erros
     carludix/online/imperios/<uid>     → contador "jogando online agora"
   O estado completo fica guardado: quem cair volta pelo link da sala e continua no mesmo reino. */
(function (G) {
  'use strict';
  const JOGO = 'imperios';
  const FB_CFG = { apiKey: 'AIzaSyDmgYvZko7-jwMVEKbrwMuyFIA4Iz0gnK8', authDomain: 'carludix.firebaseapp.com', databaseURL: 'https://carludix-default-rtdb.firebaseio.com', projectId: 'carludix', storageBucket: 'carludix.firebasestorage.app', messagingSenderId: '450493225382', appId: '1:450493225382:web:09c01f72156017fd385767' };
  const FB_V = 'https://www.gstatic.com/firebasejs/10.12.2/';
  const P_SALAS = 'carludix/salas/' + JOGO + '/';
  const P_JOGO = 'carludix/' + JOGO + '/';
  const P_ONLINE = 'carludix/online/' + JOGO + '/';
  const LETRAS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const VELHA = 10 * 60 * 1000;
  let fbP = null;

  function conectar() {
    if (!fbP) fbP = (async () => {
      const [A, Au, D] = await Promise.all([import(FB_V + 'firebase-app.js'), import(FB_V + 'firebase-auth.js'), import(FB_V + 'firebase-database.js')]);
      // ?teste=x abre um jogador de teste separado (outro login anônimo só nesta aba) para testar com várias abas
      const teste = (new URLSearchParams(location.search).get('teste') || '').replace(/[^a-z0-9]/gi, '').slice(0, 8);
      const nomeApp = teste ? 'imperios-teste-' + teste : '[DEFAULT]';
      const app = A.getApps().find(a => a.name === nomeApp) || (teste ? A.initializeApp(FB_CFG, nomeApp) : A.initializeApp(FB_CFG));
      const auth = teste ? Au.initializeAuth(app, { persistence: Au.inMemoryPersistence }) : Au.getAuth(app);
      const db = D.getDatabase(app);
      const uid = await new Promise((ok, falha) => { Au.onAuthStateChanged(auth, u => { if (u) ok(u.uid); }); Au.signInAnonymously(auth).catch(falha); });
      return { D, db, uid };
    })().catch(e => { console.error(e); fbP = null; throw e; });
    return fbP;
  }
  // Mostra no console qual caminho o Firebase recusou (para liberar no console do Firebase)
  function marcar(caminho, p) {
    return Promise.resolve(p).catch(e => { const err = new Error((e && e.message) || String(e)); err.code = e && e.code; err.caminho = caminho; console.error('Firebase recusou:', caminho, e); throw err; });
  }

  function codigoNovo() { let s = ''; for (let i = 0; i < 4; i++) s += LETRAS[Math.floor(Math.random() * LETRAS.length)]; return s; }
  // jogadores da sala por ordem de chegada
  const ordenados = sala => Object.entries((sala && sala.jogadores) || {}).filter(([, j]) => j).sort((a, b) => (a[1].entrouEm || 0) - (b[1].entrouEm || 0));
  const humanosDe = sala => Object.entries((sala && sala.jogadores) || {}).filter(([, j]) => j && !j.bot);

  /* ---------- contador "jogando online agora" ---------- */
  let onlineOff = null;
  async function marcarOnline() {
    if (onlineOff) return;
    const { D, db, uid } = await conectar();
    const r = D.ref(db, P_ONLINE + uid);
    const un = D.onValue(D.ref(db, '.info/connected'), s => { if (s.val()) { D.onDisconnect(r).remove(); marcar(P_ONLINE + uid, D.set(r, true)).catch(() => {}); } });
    onlineOff = () => { un(); D.remove(r).catch(() => {}); onlineOff = null; };
  }
  function desmarcarOnline() { if (onlineOff) onlineOff(); }
  async function ouvirContador(cb) {
    const { D, db } = await conectar();
    return D.onValue(D.ref(db, 'carludix/online/' + JOGO), s => cb(s.size || 0), () => cb(null));
  }

  /* ---------- lista de salas ---------- */
  async function ouvirSalas(cb) {
    const { D, db } = await conectar();
    return D.onValue(D.ref(db, 'carludix/salas/' + JOGO), s => {
      const v = s.val() || {};
      const agora = Date.now();
      const lista = [];
      Object.entries(v).forEach(([cod, x]) => {
        if (!x) return;
        const velha = !x.atualizadaEm || agora - x.atualizadaEm > VELHA;
        const vazia = !humanosDe(x).length;
        if (velha || vazia) { // limpeza: quem encontra sala abandonada apaga
          if (velha || (vazia && agora - (x.criadaEm || 0) > 60000)) { D.remove(D.ref(db, P_SALAS + cod)).catch(() => {}); D.remove(D.ref(db, P_JOGO + cod)).catch(() => {}); }
          return;
        }
        const n = Object.keys(x.jogadores || {}).length;
        if (x.publica && x.status === 'esperando' && n < (x.max || 4)) lista.push(Object.assign({ codigo: cod, ocupadas: n }, x));
      });
      lista.sort((a, b) => (b.atualizadaEm || 0) - (a.atualizadaEm || 0));
      cb(lista.slice(0, 20));
    }, e => cb(null, e));
  }

  /* ---------- criar e abrir sala ---------- */
  async function criarSala(o) {
    const { D, db, uid } = await conectar();
    let codigo = codigoNovo();
    for (let k = 0; k < 8; k++) {
      if (!(await D.get(D.ref(db, P_SALAS + codigo))).exists()) break;
      codigo = codigoNovo();
    }
    await marcar(P_JOGO + codigo + '/cfg', D.set(D.ref(db, P_JOGO + codigo + '/cfg'), JSON.stringify(o.cfg)));
    await marcar(P_SALAS + codigo, D.set(D.ref(db, P_SALAS + codigo), {
      codigo, jogo: JOGO, publica: !!o.publica, modo: o.modo, min: o.min, max: o.max,
      anfitriao: uid, status: 'esperando', criadaEm: D.serverTimestamp(), atualizadaEm: D.serverTimestamp(),
      jogadores: { [uid]: { apelido: o.perfil.apelido, avatar: o.perfil.avatar, pronto: true, bot: false, reino: o.reino || null, entrouEm: D.serverTimestamp() } },
    }));
    return codigo;
  }

  async function abrirSala(codigo, perfil) {
    const { D, db, uid } = await conectar();
    const RS = p => D.ref(db, P_SALAS + codigo + (p ? '/' + p : ''));
    const RJ = p => D.ref(db, P_JOGO + codigo + (p ? '/' + p : ''));
    const snap = await marcar(P_SALAS + codigo, D.get(RS()));
    if (!snap.exists()) throw new Error('nao-existe');
    let sala = snap.val();
    const cfgSnap = await D.get(RJ('cfg'));
    const cfg = cfgSnap.exists() ? JSON.parse(cfgSnap.val()) : null;
    const minhaRef = RS('jogadores/' + uid);
    const offs = [];

    // entrar (ou voltar) na sala
    const jaEstava = sala.jogadores && sala.jogadores[uid];
    if (!jaEstava) {
      if (sala.status === 'esperando') {
        if (Object.keys(sala.jogadores || {}).length >= (sala.max || 4)) throw new Error('cheia');
      } else {
        // partida em andamento: só volta quem era jogador
        const est = await D.get(RJ('estado'));
        const pl = est.exists() ? JSON.parse(est.val()) : null;
        if (!pl || !pl.st || !pl.st.jogadores.some(j => j.uid === uid)) throw new Error('jogando');
      }
    }
    const dados = Object.assign({ pronto: sala.status !== 'esperando', bot: false }, jaEstava || {}, { apelido: perfil.apelido, avatar: perfil.avatar });
    if (!jaEstava) {
      dados.entrouEm = D.serverTimestamp();
      // pega um reino livre (pode trocar na sala)
      const usados = Object.values(sala.jogadores || {}).map(j => j && j.reino);
      if (sala.status === 'esperando' && (!dados.reino || usados.includes(dados.reino))) dados.reino = (perfil.reinos || []).find(r => !usados.includes(r)) || null;
    }
    // presença: some da sala ao fechar a aba
    offs.push(D.onValue(D.ref(db, '.info/connected'), s => {
      if (!s.val()) return;
      D.onDisconnect(minhaRef).remove();
      marcar(P_SALAS + codigo + '/jogadores/' + uid, D.set(minhaRef, dados)).catch(() => {});
    }));
    await marcar(P_SALAS + codigo + '/jogadores/' + uid, D.set(minhaRef, dados));
    D.update(RS(), { atualizadaEm: D.serverTimestamp() }).catch(() => {});

    const ouv = { sala: [], estado: [], erro: [], reacao: [], saiu: [] };
    let removido = false;
    offs.push(D.onValue(RS(), s => {
      const v = s.val();
      if (!v) { ouv.saiu.forEach(f => f('apagada')); return; }
      sala = v;
      if (!(v.jogadores || {})[uid] && !removido && v.status === 'esperando') { removido = true; ouv.saiu.forEach(f => f('removido')); return; }
      ouv.sala.forEach(f => f(sala));
    }));
    offs.push(D.onValue(RJ('estado'), s => { const v = s.val(); if (v) { try { const pl = JSON.parse(v); ouv.estado.forEach(f => f(pl)); } catch (e) { console.error(e); } } }));
    offs.push(D.onValue(RJ('erros/' + uid), s => { const v = s.val(); if (v && v.msg) { ouv.erro.forEach(f => f(v.msg)); D.remove(s.ref); } }));
    const inicio = Date.now();
    offs.push(D.onChildAdded(D.query(RS('reacoes'), D.limitToLast(8)), s => {
      const v = s.val(); if (!v || !v.em || v.em < inicio - 4000) return;
      ouv.reacao.forEach(f => f(v));
    }));

    let pedidosOff = null, ultimaReacao = 0, fimT = null;
    const api = {
      codigo, uid, cfg,
      get sala() { return sala; },
      souAnfitriao: () => sala && sala.anfitriao === uid,
      presente: u => !!(sala && sala.jogadores && sala.jogadores[u]),
      onSala: f => { ouv.sala.push(f); f(sala); },
      onEstado: f => ouv.estado.push(f),
      onErro: f => ouv.erro.push(f),
      onReacao: f => ouv.reacao.push(f),
      onSaiu: f => ouv.saiu.push(f),
      pronto: v => marcar(P_SALAS + codigo + '/jogadores/' + uid, D.update(minhaRef, { pronto: !!v })).then(() => D.update(RS(), { atualizadaEm: D.serverTimestamp() })),
      remover: u => D.remove(RS('jogadores/' + u)),
      // escolher o reino antes de começar (quem escolheu primeiro fica com ele)
      async escolherReino(r) {
        if (sala.status !== 'esperando') return false;
        if (Object.entries(sala.jogadores || {}).some(([u, j]) => u !== uid && j && j.reino === r)) return false;
        dados.reino = r;
        await marcar(P_SALAS + codigo + '/jogadores/' + uid, D.update(minhaRef, { reino: r }));
        return true;
      },
      async porBots(bots) {
        const js = sala.jogadores || {};
        const falta = (sala.max || 4) - Object.keys(js).length;
        const upd = {};
        for (let i = 0; i < falta && i < bots.length; i++) upd['jogadores/bot' + Date.now().toString(36) + i] = { apelido: bots[i].nome, avatar: '🤖', pronto: true, bot: true, reino: bots[i].reino, entrouEm: Date.now() + i };
        upd.atualizadaEm = D.serverTimestamp();
        if (falta > 0) await marcar(P_SALAS + codigo, D.update(RS(), upd));
      },
      tocar: () => D.update(RS(), { atualizadaEm: D.serverTimestamp() }).catch(() => {}),
      async comecar(pl) {
        await marcar(P_JOGO + codigo + '/estado', D.set(RJ('estado'), JSON.stringify(pl)));
        await marcar(P_SALAS + codigo, D.update(RS(), { status: 'jogando', atualizadaEm: D.serverTimestamp() }));
        clearTimeout(fimT);
      },
      publicar(pl) {
        const st = pl.st;
        const p = marcar(P_JOGO + codigo + '/estado', D.set(RJ('estado'), JSON.stringify(pl)));
        const upd = { atualizadaEm: D.serverTimestamp() };
        if (st.fase === 'fim' && sala.status !== 'fim') {
          upd.status = 'fim';
          clearTimeout(fimT);
          fimT = setTimeout(() => api.apagar(), 5 * 60 * 1000); // apaga 5 min depois de terminar
        } else if (st.fase !== 'fim' && sala.status === 'fim') { upd.status = 'jogando'; clearTimeout(fimT); }
        D.update(RS(), upd).catch(() => {});
        return p;
      },
      pedir: a => marcar(P_JOGO + codigo + '/pedidos', D.push(RJ('pedidos'), { de: uid, a: JSON.stringify(a), t: D.serverTimestamp() })),
      ouvirPedidos(cb) {
        if (pedidosOff) return;
        pedidosOff = D.onChildAdded(RJ('pedidos'), s => {
          const v = s.val(); D.remove(s.ref);
          try { cb(JSON.parse(v.a), v.de); } catch (e) { console.error(e); }
        });
      },
      avisarErro: (u, msg) => D.set(RJ('erros/' + u), { msg, t: D.serverTimestamp() }),
      reagir(r) {
        const agora = Date.now();
        if (agora - ultimaReacao < 2000) return false;
        ultimaReacao = agora;
        const ref = D.push(RS('reacoes'));
        D.set(ref, { uid, r, em: D.serverTimestamp() }).catch(() => {});
        setTimeout(() => D.remove(ref).catch(() => {}), 8000);
        return true;
      },
      // anfitrião saiu: quem entrou há mais tempo assume
      async conferirAnfitriao() {
        if (!sala || !sala.anfitriao || api.presente(sala.anfitriao)) return false;
        const hs = humanosDe(sala).sort((a, b) => (a[1].entrouEm || 0) - (b[1].entrouEm || 0));
        if (!hs.length || hs[0][0] !== uid) return false;
        const antigo = sala.anfitriao;
        const res = await D.runTransaction(RS('anfitriao'), cur => (cur === antigo ? uid : undefined));
        return res.committed;
      },
      async apagar() { await D.remove(RS()).catch(() => {}); await D.remove(RJ()).catch(() => {}); },
      async sair() {
        offs.forEach(f => { try { f(); } catch (e) {} });
        if (pedidosOff) { pedidosOff(); pedidosOff = null; }
        try {
          // remove primeiro: se a remoção falhar, o aviso de desconexão ainda tira o jogador da sala
          await D.remove(minhaRef);
          await D.onDisconnect(minhaRef).cancel();
          const s = await D.get(RS());
          if (s.exists() && !humanosDe(s.val()).length) await api.apagar(); // sala sem pessoas: apaga
        } catch (e) {}
      },
    };
    return api;
  }

  G.ImperiosRede = { ordenados, conectar, marcarOnline, desmarcarOnline, ouvirContador, ouvirSalas, criarSala, abrirSala, humanosDe };
})(window);
