/* Sintonia — telas (versão 1: mesma tela, sem servidor).
   A UI só lê/escreve o "estado" através do SintoniaMotor.
   Para a versão 2 online, basta trocar "salvar" por um envio ao servidor
   e chamar "irPara(estado.fase)" quando o estado da sala mudar. */
(function () {
  "use strict";
  var M = window.SintoniaMotor;
  var PACOTES = window.SINTONIA_PACOTES;
  var CH_RECORDE = "sintonia:recorde";
  var CH_CONFIG = "sintonia:config";
  var CH_PARTIDA = "sintonia:partida";
  var CH_SOM = "sintonia:som";

  function ler(chave, padrao) {
    try { var v = localStorage.getItem(chave); return v == null ? padrao : JSON.parse(v); } catch (e) { return padrao; }
  }
  function gravar(chave, valor) { try { localStorage.setItem(chave, JSON.stringify(valor)); } catch (e) {} }
  function apagar(chave) { try { localStorage.removeItem(chave); } catch (e) {} }

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var config = Object.assign(
    { modo: "equipes", meta: 30, nomes: ["Time Sol", "Time Lua"], pacotes: ["geral"] },
    ler(CH_CONFIG, {})
  );
  config.pacotes = (config.pacotes || []).filter(function (id) { return PACOTES.some(function (p) { return p.id === id; }); });
  if (!config.pacotes.length) config.pacotes = ["geral"];

  var estado = null;
  var palpite = 50;
  var somLigado = ler(CH_SOM, true);
  var telaAtual = "inicio";
  var TELAS_JOGO = ["passe", "sintonizador", "palpite", "revelacao"];

  /* ================= Som (gerado na hora, sem arquivos) ================= */
  var Som = (function () {
    var ctx = null;
    function ac() {
      if (!somLigado) return null;
      try {
        if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === "suspended") ctx.resume();
      } catch (e) { return null; }
      return ctx;
    }
    function nota(freq, ini, dur, tipo, vol) {
      var c = ac(); if (!c) return;
      var o = c.createOscillator(), g = c.createGain(), t = c.currentTime + (ini || 0);
      o.type = tipo || "sine"; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.18, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
    }
    var ultimoTique = 0;
    return {
      tique: function () { var a = Date.now(); if (a - ultimoTique < 45) return; ultimoTique = a; nota(1400, 0, 0.03, "square", 0.04); },
      toque: function () { nota(660, 0, 0.08, "triangle", 0.12); },
      rufar: function () { for (var i = 0; i < 10; i++) nota(140 + i * 8, i * 0.07, 0.06, "triangle", 0.08 + i * 0.01); },
      resultado: function (pts) {
        if (pts === 10) { [523, 659, 784, 1047].forEach(function (f, i) { nota(f, i * 0.09, 0.25, "triangle", 0.16); }); }
        else if (pts === 6) { nota(587, 0, 0.18, "triangle"); nota(784, 0.1, 0.25, "triangle"); }
        else if (pts === 3) { nota(523, 0, 0.25, "triangle", 0.14); }
        else { nota(220, 0, 0.18, "sine", 0.12); nota(185, 0.14, 0.3, "sine", 0.12); }
      },
      vitoria: function () { [523, 659, 784, 659, 784, 1047].forEach(function (f, i) { nota(f, i * 0.12, 0.3, "triangle", 0.16); }); }
    };
  })();

  function vibrar(p) { if (navigator.vibrate) { try { navigator.vibrate(p); } catch (e) {} } }

  function atualizarBotaoSom() {
    $$('[data-acao="som"]').forEach(function (b) {
      b.innerHTML = '<svg><use href="#' + (somLigado ? "i-som" : "i-mudo") + '"/></svg>';
      b.setAttribute("aria-pressed", somLigado ? "true" : "false");
      b.title = somLigado ? "Som ligado" : "Som desligado";
    });
  }

  /* ================= Confete ================= */
  function confete(qtd) {
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var box = $("#confete"), cores = ["#e8201a", "#ff8a1a", "#ffd21f", "#36d04a", "#19c7e6", "#1f6bff", "#fff"];
    for (var i = 0; i < (qtd || 60); i++) {
      var p = document.createElement("i");
      p.style.left = Math.random() * 100 + "%";
      p.style.background = cores[i % cores.length];
      p.style.animationDelay = Math.random() * 0.4 + "s";
      p.style.animationDuration = 1.6 + Math.random() * 1.2 + "s";
      p.style.setProperty("--x", (Math.random() * 160 - 80) + "px");
      p.style.setProperty("--r", (Math.random() * 720 - 360) + "deg");
      box.appendChild(p);
    }
    setTimeout(function () { box.innerHTML = ""; }, 3400);
  }

  /* ================= Navegação + botão "voltar" do celular ================= */
  function mostrar(id, semHistorico) {
    $$(".tela").forEach(function (t) { t.classList.toggle("ativa", t.id === "tela-" + id); });
    telaAtual = id;
    window.scrollTo(0, 0);
    if (!semHistorico) { try { history.pushState({ tela: id }, ""); } catch (e) {} }
  }
  window.addEventListener("popstate", function () {
    if (!$("#modal-regras").hidden) { $("#modal-regras").hidden = true; return; }
    if (TELAS_JOGO.indexOf(telaAtual) >= 0) {
      // durante a partida, o "voltar" não sai do jogo
      try { history.pushState({ tela: telaAtual }, ""); } catch (e) {}
      toast("Partida salva. Para sair, use “Encerrar partida”.");
      return;
    }
    if (telaAtual === "config" || telaAtual === "fim") { mostrarInicio(true); return; }
  });

  function salvar() { if (estado) gravar(CH_PARTIDA, estado); }

  /* ================= Início ================= */
  function mostrarInicio(semHistorico) {
    var salvo = ler(CH_PARTIDA, null);
    var box = $("#continuar");
    if (salvo && salvo.fase && salvo.fase !== "fim" && salvo.versao === 1) {
      var info = salvo.modo === "coop"
        ? "Cooperativo, rodada " + salvo.rodada + " de " + salvo.totalRodadas + " (" + salvo.times[0].pontos + " pts)."
        : salvo.times[0].nome + " " + salvo.times[0].pontos + " × " + salvo.times[1].pontos + " " + salvo.times[1].nome + ".";
      $("#continuar-info").textContent = info;
      box.hidden = false;
    } else box.hidden = true;
    mostrar("inicio", semHistorico);
  }

  function continuar() {
    var salvo = ler(CH_PARTIDA, null);
    if (!salvo) return;
    estado = salvo;
    // por segurança, quem estava vendo o alvo volta para a tela de passar o celular
    if (estado.fase === "sintonizador" || estado.fase === "palpite") estado.fase = "passe";
    if (estado.fase === "revelacao") mostrarRevelacao(false); else irPasse();
  }

  /* ================= Configuração ================= */
  function montarConfig() {
    var box = $("#op-pacotes");
    box.innerHTML = "";
    PACOTES.forEach(function (p) {
      var b = document.createElement("button");
      b.className = "pacote";
      b.dataset.pacote = p.id;
      b.setAttribute("aria-pressed", "false");
      b.innerHTML = '<span class="p-ico">' + p.icone + "</span><span>" + p.nome + "<small>" + p.cartas.length + " cartas</small></span>";
      box.appendChild(b);
    });
    $("#nome-0").value = config.nomes[0];
    $("#nome-1").value = config.nomes[1];
    atualizarConfig();
  }

  function atualizarConfig() {
    $$("#op-modo .op").forEach(function (b) { b.classList.toggle("sel", b.dataset.modo === config.modo); b.setAttribute("aria-pressed", b.dataset.modo === config.modo); });
    $$("#op-meta .chip").forEach(function (b) { b.classList.toggle("sel", +b.dataset.meta === config.meta); b.setAttribute("aria-pressed", +b.dataset.meta === config.meta); });
    $$("#op-pacotes .pacote").forEach(function (b) {
      var on = config.pacotes.indexOf(b.dataset.pacote) >= 0;
      b.classList.toggle("sel", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    var coop = config.modo === "coop";
    $("#bloco-times").hidden = coop;
    $("#bloco-recorde").hidden = !coop;
    var rec = ler(CH_RECORDE, null);
    $("#recorde-config").textContent = rec != null ? rec + " pontos" : "ainda não tem — façam o primeiro!";
    var semPacote = config.pacotes.length === 0;
    $("#aviso-pacotes").hidden = !semPacote;
    $("#btn-comecar").disabled = semPacote;
  }

  /* ================= Partida ================= */
  function comecar() {
    config.nomes = [$("#nome-0").value.trim() || "Time Sol", $("#nome-1").value.trim() || "Time Lua"];
    gravar(CH_CONFIG, config);
    estado = M.criarPartida(config, PACOTES);
    irPasse();
  }

  function icoTime(i) { return '<svg class="ico-time"><use href="#' + (i ? "i-lua" : "i-sol") + '"/></svg>'; }

  function renderPlacar() {
    $$("[data-placar]").forEach(function (el) {
      if (estado.modo === "coop") {
        el.innerHTML = '<div class="pt coop"><span class="pt-nome">🤝 Grupo</span><span class="pt-meta">rodada ' +
          Math.min(estado.rodada, estado.totalRodadas) + "/" + estado.totalRodadas + "</span><b>" + estado.times[0].pontos + "</b></div>";
      } else {
        el.innerHTML = estado.times.map(function (t, i) {
          return '<div class="pt t' + i + (i === estado.vez && estado.fase !== "fim" ? " vez" : "") + '">' + icoTime(i) +
            '<span class="pt-nome">' + esc(t.nome) + '</span><span class="pt-meta">/' + estado.meta + "</span><b>" + t.pontos + "</b></div>";
        }).join("");
      }
    });
    $$("[data-rodada]").forEach(function (el) { el.textContent = "Rodada " + estado.rodada + (estado.modo === "equipes" ? " · meta " + estado.meta + " pontos" : ""); });
  }

  function renderCarta() {
    var c = estado.carta;
    $$("[data-carta]").forEach(function (el) {
      el.innerHTML = '<div class="lado esq">' + esc(c.esq) + '</div><div class="seta" aria-label="até">⟷</div><div class="lado dir">' + esc(c.dir) + "</div>";
    });
  }

  function desenharZona(el, alvo) {
    var f = function (cls, meia, rot) {
      return '<div class="f ' + cls + '" style="left:' + alvo + "%;width:" + (meia * 2 + 1) + '%"><span>' + rot + "</span></div>";
    };
    el.innerHTML = f("f3", 15, "3") + f("f6", 8, "6") + f("f10", 3, "10");
  }

  function irPasse() {
    estado.fase = "passe";
    salvo();
    renderPlacar();
    var quem = $("#passe-quem");
    if (estado.modo === "coop") {
      quem.textContent = "Escolham quem vai dar a dica desta rodada.";
    } else {
      var t = estado.times[estado.vez];
      quem.innerHTML = 'Vez do <span class="nome-time t' + estado.vez + '">' + esc(t.nome) + "</span><br><small>Escolham quem do time vai dar a dica.</small>";
    }
    var av = $("#aviso-ultima");
    if (estado.modo === "equipes" && estado.ultimaChance) {
      av.textContent = "⏳ Última chance do " + estado.times[estado.vez].nome + "!";
      av.hidden = false;
    } else if (estado.modo === "equipes" && estado.turnos[0] === estado.turnos[1] && Math.max(estado.times[0].pontos, estado.times[1].pontos) >= estado.meta) {
      av.textContent = "⚡ Empate! Morte súbita.";
      av.hidden = false;
    } else av.hidden = true;
    mostrar("passe");
  }
  function salvo() { salvar(); }

  function atualizarBotoesSint() {
    var trocar = $("#btn-trocar"), pronto = $("#btn-pronto");
    trocar.disabled = estado.viuAlvo || estado.trocasRestantes <= 0;
    trocar.textContent = estado.viuAlvo ? "🔄 Sem troca" : (estado.trocasRestantes > 0 ? "🔄 Trocar carta" : "🔄 Já trocou");
    trocar.title = "Dá para trocar a carta 1 vez, antes de ver o alvo";
    pronto.disabled = !estado.viuAlvo;
    pronto.textContent = estado.viuAlvo ? "Tenho a dica →" : "Veja o alvo antes";
  }

  function irSintonizador() {
    estado.fase = "sintonizador";
    salvar();
    renderPlacar(); renderCarta();
    desenharZona($("#zona-sint"), estado.alvo);
    $("#zona-sint").classList.remove("visivel");
    $("#regua-sint").classList.remove("revelando");
    atualizarBotoesSint();
    mostrar("sintonizador");
  }

  function irPalpite() {
    estado.fase = "palpite";
    salvar();
    $("#zona-sint").classList.remove("visivel");
    palpite = 50;
    posicionarPino();
    renderPlacar(); renderCarta();
    mostrar("palpite");
  }

  var FRASES = {
    10: ["Telepatia pura!", "Sintonia total!", "Leram a mente!", "Na mosquinha!"],
    6: ["Por um triz!", "Quase lá!", "Pertinho, pertinho!", "Faltou um tiquinho!"],
    3: ["Esquentou!", "Na vizinhança!", "Deu para sentir!", "Rondando o alvo!"],
    0: ["Frequências trocadas!", "Sinal fora do ar!", "Cada um numa estação!", "Fica para a próxima!"]
  };
  function frase(pts) { var l = FRASES[pts]; return l[Math.floor(Math.random() * l.length)]; }

  function travar() {
    if (estado.fase !== "palpite") return;
    M.travarPalpite(estado, palpite);
    estado.resultado.frase = frase(estado.resultado.pontos);
    salvar();
    mostrarRevelacao(true);
  }

  function mostrarRevelacao(animar) {
    renderPlacar(); renderCarta();
    var zona = $("#zona-rev"), regua = $("#regua-rev");
    desenharZona(zona, estado.alvo);
    zona.classList.remove("anima", "visivel");
    regua.classList.add("revelando");
    $("#pino-rev").style.left = estado.palpite + "%";
    var r = estado.resultado;
    $("#res-rotulo").textContent = r.rotulo;
    $("#res-frase").textContent = r.frase || "";
    var rp = $("#res-pontos");
    rp.classList.toggle("zero", !r.pontos);
    rp.textContent = r.pontos ? "+" + r.pontos + " pontos" + (estado.modo === "equipes" ? " para " + estado.times[estado.vez].nome : "") : "0 ponto";
    $("#res-dist").textContent = r.distancia === 0 ? "Em cheio: distância zero!" : "Faltaram " + r.distancia + (r.distancia === 1 ? " passinho" : " passinhos") + " até o alvo.";
    var res = $("#resultado"); res.classList.remove("mostra", "ok10");
    var btn = $("#btn-proximo"); btn.classList.remove("pronto");
    btn.textContent = M.vaiTerminar(estado) ? "Ver resultado 🏁" : "Próxima rodada →";
    mostrar("revelacao");
    void zona.offsetWidth;
    if (!animar) { zona.classList.add("visivel"); res.classList.add("mostra"); btn.classList.add("pronto"); return; }
    Som.rufar();
    setTimeout(function () { zona.classList.add("visivel", "anima"); res.classList.add("mostra"); }, 250);
    setTimeout(function () {
      Som.resultado(r.pontos);
      if (r.pontos === 10) { vibrar([60, 40, 140]); confete(50); res.classList.add("ok10"); }
      else if (r.pontos) vibrar(80); else vibrar([30, 60, 30]);
    }, 900);
    setTimeout(function () { btn.classList.add("pronto"); }, 1500);
  }

  function proximo() {
    M.avancar(estado);
    salvar();
    if (estado.fase === "fim") irFim(); else irPasse();
  }

  function irFim() {
    apagar(CH_PARTIDA);
    renderPlacar();
    var tit = $("#fim-titulo"), txt = $("#fim-texto"), ico = $("#fim-ico");
    if (estado.modo === "coop") {
      var pts = estado.times[0].pontos;
      var antigo = ler(CH_RECORDE, null);
      var novo = antigo == null || pts > antigo;
      if (novo) gravar(CH_RECORDE, pts);
      ico.textContent = novo ? "🏆" : (pts >= 60 ? "🎯" : "🤝");
      tit.textContent = pts + " pontos!";
      txt.textContent = novo ? (antigo == null ? "Primeiro recorde do grupo neste aparelho!" : "Novo recorde! O anterior era " + antigo + ".")
        : "Recorde do grupo: " + antigo + " pontos. " + (pts >= antigo - 5 ? "Quase lá!" : "Bora mais uma?");
      if (novo) { confete(90); Som.vitoria(); vibrar([80, 50, 80, 50, 200]); }
    } else {
      var v = estado.times[estado.vencedor], o = estado.times[1 - estado.vencedor];
      ico.innerHTML = '<svg class="fim-svg"><use href="#' + (estado.vencedor ? "i-lua" : "i-sol") + '"/></svg>';
      tit.textContent = v.nome + " venceu!";
      txt.textContent = v.pontos + " × " + o.pontos + " em " + estado.rodada + " rodadas. Estavam em sintonia!";
      confete(90); Som.vitoria(); vibrar([80, 50, 80, 50, 200]);
    }
    $("#historico").innerHTML = estado.historico.map(function (h) {
      return "<li><span>" + h.rodada + ". " + esc(h.carta.esq) + " ⟷ " + esc(h.carta.dir) + "</span><b>" +
        (h.pontos ? "+" + h.pontos : "0") + (estado.modo === "equipes" ? " " + (h.time ? "🌙" : "☀️") : "") + "</b></li>";
    }).join("");
    mostrar("fim");
  }

  /* ================= Marcador arrastável ================= */
  function lado(v) {
    var c = estado && estado.carta; if (!c) return "";
    if (v < 35) return ", mais para " + c.esq;
    if (v > 65) return ", mais para " + c.dir;
    return ", no meio";
  }
  function posicionarPino() {
    var p = $("#pino");
    p.style.left = palpite + "%";
    p.setAttribute("aria-valuenow", Math.round(palpite));
    p.setAttribute("aria-valuetext", Math.round(palpite) + lado(palpite));
  }
  function ligarArraste() {
    var trilho = $("#trilho-palpite"), pino = $("#pino"), ativo = false, ultimo = 50;
    function valor(ev) {
      var r = trilho.getBoundingClientRect();
      return Math.max(0, Math.min(100, ((ev.clientX - r.left) / r.width) * 100));
    }
    function move(v) { palpite = v; posicionarPino(); if (Math.round(v) !== ultimo) { ultimo = Math.round(v); if (ultimo % 2 === 0) Som.tique(); } }
    trilho.addEventListener("pointerdown", function (ev) {
      ativo = true; pino.classList.add("arrastando");
      try { trilho.setPointerCapture(ev.pointerId); } catch (e) {}
      move(valor(ev)); ev.preventDefault();
    });
    trilho.addEventListener("pointermove", function (ev) { if (ativo) move(valor(ev)); });
    var solta = function () { ativo = false; pino.classList.remove("arrastando"); };
    trilho.addEventListener("pointerup", solta);
    trilho.addEventListener("pointercancel", solta);
    pino.addEventListener("keydown", function (ev) {
      var passo = ev.shiftKey ? 10 : 1, v = Math.round(palpite);
      if (ev.key === "ArrowLeft" || ev.key === "ArrowDown") v = Math.max(0, v - passo);
      else if (ev.key === "ArrowRight" || ev.key === "ArrowUp") v = Math.min(100, v + passo);
      else if (ev.key === "Home") v = 0;
      else if (ev.key === "End") v = 100;
      else return;
      ev.preventDefault(); move(v);
    });
  }

  /* ================= Segurar para ver o alvo ================= */
  function ligarSegurar() {
    var btn = $("#btn-segurar"), zona = $("#zona-sint");
    function abre(ev) {
      if (ev) ev.preventDefault();
      if (!estado || estado.fase !== "sintonizador") return;
      zona.classList.add("visivel"); btn.classList.add("ativo");
      if (!estado.viuAlvo) { M.marcarAlvoVisto(estado); salvar(); atualizarBotoesSint(); Som.toque(); vibrar(30); }
    }
    function fecha() { zona.classList.remove("visivel"); btn.classList.remove("ativo"); }
    btn.addEventListener("pointerdown", function (ev) { try { btn.setPointerCapture(ev.pointerId); } catch (e) {} abre(ev); });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (t) { btn.addEventListener(t, fecha); });
    btn.addEventListener("contextmenu", function (ev) { ev.preventDefault(); });
    btn.addEventListener("keydown", function (ev) { if ((ev.key === " " || ev.key === "Enter") && !ev.repeat) abre(ev); });
    btn.addEventListener("keyup", function (ev) { if (ev.key === " " || ev.key === "Enter") fecha(); });
    btn.addEventListener("blur", fecha);
    document.addEventListener("visibilitychange", fecha);
  }

  /* ================= Segurar para travar o palpite ================= */
  function ligarTravar() {
    var btn = $("#btn-travar"), barra = $(".progresso", btn), timer = null, DUR = 700;
    function inicia(ev) {
      if (ev) ev.preventDefault();
      if (timer) return;
      btn.classList.add("enchendo");
      barra.style.transition = "width " + DUR + "ms linear"; barra.style.width = "100%";
      timer = setTimeout(function () { timer = null; cancela(); vibrar(40); travar(); }, DUR);
    }
    function cancela() {
      if (timer) { clearTimeout(timer); timer = null; if (estado && estado.fase === "palpite") toast("Segure um pouquinho até encher"); }
      btn.classList.remove("enchendo");
      barra.style.transition = "width .2s"; barra.style.width = "0";
    }
    btn.addEventListener("pointerdown", function (ev) { try { btn.setPointerCapture(ev.pointerId); } catch (e) {} inicia(ev); });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (t) { btn.addEventListener(t, cancela); });
    btn.addEventListener("contextmenu", function (ev) { ev.preventDefault(); });
    btn.addEventListener("keydown", function (ev) { if ((ev.key === " " || ev.key === "Enter") && !ev.repeat) inicia(ev); });
    btn.addEventListener("keyup", function (ev) { if (ev.key === " " || ev.key === "Enter") cancela(); });
  }

  /* ================= Utilidades ================= */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var toastTimer;
  function toast(msg) {
    var t = $("#toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 2400);
  }
  function compartilhar() {
    var url = location.origin + location.pathname;
    var dados = { title: "Sintonia — CARLUDIX", text: "Bora jogar Sintonia? Um dá a dica e o grupo acha o ponto na régua!", url: url };
    if (navigator.share) { navigator.share(dados).catch(function () {}); return; }
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { toast("Link copiado!"); }, function () { toast(url); });
    else toast(url);
  }
  function telaCheia() {
    var d = document;
    try {
      if (d.fullscreenElement) d.exitFullscreen();
      else d.documentElement.requestFullscreen();
    } catch (e) { toast("Tela cheia não disponível aqui"); }
  }

  /* ================= Eventos ================= */
  document.addEventListener("click", function (ev) {
    var alvo = ev.target.closest("button");
    if (!alvo || alvo.disabled) return;
    if (alvo.dataset.ir) {
      if (alvo.dataset.ir === "config") { atualizarConfig(); mostrar("config"); }
      else if (alvo.dataset.ir === "inicio") mostrarInicio();
      return;
    }
    if (alvo.dataset.modo) { config.modo = alvo.dataset.modo; atualizarConfig(); return; }
    if (alvo.dataset.meta) { config.meta = +alvo.dataset.meta; atualizarConfig(); return; }
    if (alvo.dataset.pacote) {
      var id = alvo.dataset.pacote, i = config.pacotes.indexOf(id);
      if (i >= 0) config.pacotes.splice(i, 1); else config.pacotes.push(id);
      atualizarConfig(); return;
    }
    switch (alvo.dataset.acao || alvo.id) {
      case "btn-comecar": comecar(); break;
      case "regras": $("#modal-regras").hidden = false; $(".modal-caixa").scrollTop = 0; break;
      case "fechar-regras": $("#modal-regras").hidden = true; break;
      case "sou-sintonizador": irSintonizador(); break;
      case "trocar-carta":
        if (M.trocarCarta(estado)) { salvar(); renderCarta(); toast("Carta trocada"); }
        atualizarBotoesSint();
        break;
      case "pronto": irPalpite(); break;
      case "proximo": proximo(); break;
      case "revanche": estado = M.criarPartida(config, PACOTES); irPasse(); break;
      case "compartilhar": compartilhar(); break;
      case "continuar": continuar(); break;
      case "descartar": apagar(CH_PARTIDA); $("#continuar").hidden = true; atualizarConfig(); mostrar("config"); break;
      case "som": somLigado = !somLigado; gravar(CH_SOM, somLigado); atualizarBotaoSom(); if (somLigado) Som.toque(); break;
      case "tela-cheia": telaCheia(); break;
      case "sair":
        if (confirmarSaida()) { apagar(CH_PARTIDA); estado = null; mostrarInicio(); }
        break;
    }
  });
  var saidaPendente = false, saidaTimer;
  function confirmarSaida() {
    if (saidaPendente) { saidaPendente = false; return true; }
    saidaPendente = true; toast("Toque de novo para encerrar a partida");
    clearTimeout(saidaTimer); saidaTimer = setTimeout(function () { saidaPendente = false; }, 2500);
    return false;
  }
  $("#modal-regras").addEventListener("click", function (ev) { if (ev.target.id === "modal-regras") ev.currentTarget.hidden = true; });
  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape") $("#modal-regras").hidden = true; });

  try { history.replaceState({ tela: "inicio" }, ""); } catch (e) {}
  montarConfig();
  ligarArraste();
  ligarSegurar();
  ligarTravar();
  atualizarBotaoSom();
  mostrarInicio(true);
})();
