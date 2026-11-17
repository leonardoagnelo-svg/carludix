/* Estourou! — CARLUDIX · bots
   nivel: 'facil' | 'medio' | 'dificil'                                                */
(function (G) {
  'use strict';
  const M = G.EstourouMotor;
  const C = M.carta;

  const lider = (st, exceto) => {
    let best = -1, bi = -1;
    st.jogadores.forEach((j, i) => { if (i !== exceto && j.total + j.pts > best) { best = j.total + j.pts; bi = i; } });
    return bi;
  };

  function decidir(st, i) {
    const p = st.pend;
    if (!p || p.de !== i) return null;
    const eu = st.jogadores[i];
    const nivel = eu.nivel || 'medio';

    if (p.tipo === 'vez') {
      if (eu.escudo != null) return { a: 'puxar' };
      const risco = M.riscoEstouro(st, i);
      const pts = eu.pts;
      const unicos = new Set(eu.nums.map(x => C(x).v)).size;
      // ganharia a partida parando agora?
      const meus = eu.total + pts;
      const outros = Math.max(...st.jogadores.filter((_, k) => k !== i).map(j => j.total + (j.estado !== 'estourou' ? j.pts : 0)));
      if (meus >= st.cfg.meta && meus > outros) return { a: 'parar' };
      if (nivel === 'facil') {
        if (pts < 10) return { a: 'puxar' };
        return Math.random() < (risco < 0.2 ? 0.75 : 0.35) ? { a: 'puxar' } : { a: 'parar' };
      }
      // valor esperado: ganho médio de uma carta boa contra perder o que já tem
      const ganho = 6.5 * (eu.mods.some(x => C(x).v === 'x2') ? 2 : 1) + (unicos === 6 ? 15 : 0);
      let apetite = 1;
      if (nivel === 'dificil') {
        const atras = outros - meus;
        if (atras > 60) apetite = 1.35; else if (atras < -40) apetite = 0.8;
      }
      return (1 - risco) * ganho * apetite > risco * pts ? { a: 'puxar' } : { a: 'parar' };
    }

    if (p.tipo === 'alvo') {
      const ops = p.ops;
      if (p.a === 'escudoDar') {
        // dá para quem está pior
        return { a: 'alvo', i: ops.slice().sort((a, b) => (st.jogadores[a].total + st.jogadores[a].pts) - (st.jogadores[b].total + st.jogadores[b].pts))[0] };
      }
      const outros = ops.filter(k => k !== i);
      if (p.a === 'gelo') {
        // se estou arriscado e com pontos, me congelo; senão travo o adversário com menos pontos (de preferência o líder)
        if (ops.includes(i) && M.riscoEstouro(st, i) > 0.3 && eu.pts >= 15 && eu.escudo == null) return { a: 'alvo', i };
        if (!outros.length) return { a: 'alvo', i };
        const L = lider(st, i);
        if (nivel !== 'facil' && outros.includes(L) && st.jogadores[L].pts < 12) return { a: 'alvo', i: L };
        return { a: 'alvo', i: outros.slice().sort((a, b) => st.jogadores[a].pts - st.jogadores[b].pts)[0] };
      }
      if (p.a === 'rajada') {
        if (!outros.length) return { a: 'alvo', i };
        // quem tem mais chance de estourar (e sem escudo)
        const nota = k => M.riscoEstouro(st, k) * (st.jogadores[k].escudo != null ? 0.2 : 1) + st.jogadores[k].pts / 200;
        if (nivel === 'facil') return { a: 'alvo', i: outros[Math.floor(Math.random() * outros.length)] };
        return { a: 'alvo', i: outros.slice().sort((a, b) => nota(b) - nota(a))[0] };
      }
    }

    if (p.tipo === 'troca') {
      // melhor par: o que eu pego não repete comigo; se puder, empurro uma carta que ele já tem
      let melhor = null, nota = -1e9;
      p.ops.forEach(k => {
        const ele = st.jogadores[k];
        eu.nums.forEach(m => {
          ele.nums.forEach(d => {
            const meusSem = eu.nums.filter(x => x !== m).map(x => C(x).v);
            const deleSem = ele.nums.filter(x => x !== d).map(x => C(x).v);
            const euEstouro = meusSem.includes(C(d).v) && eu.escudo == null;
            const eleEstouro = deleSem.includes(C(m).v) && ele.escudo == null;
            let n = (C(d).v - C(m).v);
            if (euEstouro) n -= 1000;
            if (eleEstouro) n += 60 + ele.pts;
            if (nivel === 'facil') n += Math.random() * 20;
            if (n > nota) { nota = n; melhor = { a: 'troca', i: k, minha: m, dele: d }; }
          });
        });
      });
      return melhor;
    }

    if (p.tipo === 'espiar') {
      // põe primeiro uma carta boa para mim (não repete); as ruins vão para o fim
      const tenho = new Set(eu.nums.map(x => C(x).v));
      const nota = id => { const c = C(id); if (c.t === 'n') return tenho.has(c.v) ? -100 : c.v; if (c.t === 'm') return 8; return c.a === 'escudo' ? 12 : 3; };
      return { a: 'espiar', ordem: p.cartas.slice().sort((a, b) => nota(b) - nota(a)) };
    }
    return null;
  }

  G.EstourouBot = { decidir };
})(typeof window !== 'undefined' ? window : globalThis);
