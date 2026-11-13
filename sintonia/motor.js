/* Sintonia — motor do jogo (regras puras, sem tela).
   Tudo aqui trabalha só com o objeto "estado", que é JSON puro.
   Assim, numa versão 2 online, o mesmo estado pode ir para o servidor
   (ex.: carludix/sintonia/salas/<codigo>) sem mudar as regras. */
(function () {
  "use strict";

  var FAIXAS = [
    { ate: 3, pontos: 10, rotulo: "Na mosca!" },
    { ate: 8, pontos: 6, rotulo: "Quase!" },
    { ate: 15, pontos: 3, rotulo: "Perto" }
  ];
  var RODADAS_COOP = 10;
  var METAS = [20, 30, 50];

  function embaralhar(lista, rng) {
    var a = lista.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function montarBaralho(pacotes, idsEscolhidos, rng) {
    var cartas = [];
    pacotes.forEach(function (p) {
      if (idsEscolhidos.indexOf(p.id) === -1) return;
      p.cartas.forEach(function (c) { cartas.push({ esq: c[0], dir: c[1], pacote: p.id }); });
    });
    return embaralhar(cartas, rng);
  }

  function pontuar(distancia) {
    for (var i = 0; i < FAIXAS.length; i++) {
      if (distancia <= FAIXAS[i].ate) return { pontos: FAIXAS[i].pontos, rotulo: FAIXAS[i].rotulo };
    }
    return { pontos: 0, rotulo: "Longe…" };
  }

  /* config: { modo: "equipes"|"coop", meta, nomes: [a,b], pacotes: [ids] } */
  function criarPartida(config, pacotes, rng) {
    rng = rng || Math.random;
    var equipes = config.modo !== "coop";
    var estado = {
      versao: 1,
      modo: equipes ? "equipes" : "coop",
      meta: equipes ? (METAS.indexOf(config.meta) >= 0 ? config.meta : 30) : null,
      totalRodadas: equipes ? null : RODADAS_COOP,
      times: equipes
        ? [{ nome: config.nomes[0] || "Time Sol", pontos: 0 }, { nome: config.nomes[1] || "Time Lua", pontos: 0 }]
        : [{ nome: "Grupo", pontos: 0 }],
      vez: 0,              // índice do time da vez
      rodada: 0,           // rodadas já iniciadas
      pacotes: config.pacotes.slice(),
      baralho: montarBaralho(pacotes, config.pacotes, rng),
      usadas: 0,
      carta: null,
      alvo: null,
      palpite: null,
      resultado: null,
      historico: [],
      fase: "passe",       // passe -> sintonizador -> palpite -> revelacao -> (passe | fim)
      vencedor: null
    };
    return novaRodada(estado, rng);
  }

  function puxarCarta(estado, rng) {
    if (estado.usadas >= estado.baralho.length) {
      // acabou o baralho: embaralha de novo (só acontece em partidas muito longas)
      estado.baralho = embaralhar(estado.baralho, rng);
      estado.usadas = 0;
    }
    estado.carta = estado.baralho[estado.usadas++];
  }

  function novaRodada(estado, rng) {
    rng = rng || Math.random;
    estado.rodada += 1;
    puxarCarta(estado, rng);
    estado.alvo = Math.round(rng() * 100);
    estado.palpite = null;
    estado.resultado = null;
    estado.fase = "passe";
    return estado;
  }

  /* O Sintonizador pode trocar a carta antes de dar a dica (o alvo continua). */
  function trocarCarta(estado, rng) {
    puxarCarta(estado, rng || Math.random);
    return estado;
  }

  function travarPalpite(estado, valor) {
    var v = Math.max(0, Math.min(100, Math.round(valor)));
    var dist = Math.abs(v - estado.alvo);
    var p = pontuar(dist);
    estado.palpite = v;
    estado.resultado = { distancia: dist, pontos: p.pontos, rotulo: p.rotulo };
    estado.times[estado.vez].pontos += p.pontos;
    estado.historico.push({
      rodada: estado.rodada, time: estado.vez, carta: estado.carta,
      alvo: estado.alvo, palpite: v, distancia: dist, pontos: p.pontos
    });
    estado.fase = "revelacao";
    return estado;
  }

  function verificarFim(estado) {
    if (estado.modo === "equipes") {
      var t = estado.times[estado.vez];
      if (t.pontos >= estado.meta) { estado.vencedor = estado.vez; return true; }
      return false;
    }
    return estado.rodada >= estado.totalRodadas;
  }

  /* Depois da revelação: termina ou passa a vez. */
  function avancar(estado, rng) {
    if (verificarFim(estado)) { estado.fase = "fim"; return estado; }
    if (estado.modo === "equipes") estado.vez = (estado.vez + 1) % estado.times.length;
    return novaRodada(estado, rng);
  }

  window.SintoniaMotor = {
    FAIXAS: FAIXAS, METAS: METAS, RODADAS_COOP: RODADAS_COOP,
    pontuar: pontuar, criarPartida: criarPartida, trocarCarta: trocarCarta,
    travarPalpite: travarPalpite, avancar: avancar
  };
})();
