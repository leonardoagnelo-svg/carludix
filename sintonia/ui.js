/* Sintonia — telas (versão 1: mesma tela, sem servidor).
   A UI só lê/escreve o "estado" através do SintoniaMotor.
   Para a versão 2 online, basta trocar a função "aplicar" por um envio ao servidor
   e chamar "render" quando o estado da sala mudar. */
(function () {
  "use strict";
  var M = window.SintoniaMotor;
  var PACOTES = window.SINTONIA_PACOTES;
  var CH_RECORDE = "sintonia:recorde";
  var CH_CONFIG = "sintonia:config";

  function ler(chave, padrao) {
    try { var v = localStorage.getItem(chave); return v == null ? padrao : JSON.parse(v); } catch (e) { return padrao; }
  }
  function gravar(chave, valor) { try { localStorage.setItem(chave, JSON.stringify(valor)); } catch (e) {} }

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
  var jaViuAlvo = false;

  /* ---------- navegação ---------- */
  function mostrar(id) {
    $$(".tela").forEach(function (t) { t.classList.toggle("ativa", t.id === "tela-" + id); });
    window.scrollTo(0, 0);
  }

  /* ---------- configuração ---------- */
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
    $$("#op-modo .op").forEach(function (b) { b.classList.toggle("sel", b.dataset.modo === config.modo); });
    $$("#op-meta .chip").forEach(function (b) { b.classList.toggle("sel", +b.dataset.meta === config.meta); });
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
    $("#btn-comecar").disabled = config.pacotes.length === 0;
  }

  /* ---------- partida ---------- */
  function comecar() {
    config.nomes = [$("#nome-0").value.trim() || "Time Sol", $("#nome-1").value.trim() || "Time Lua"];
    gravar(CH_CONFIG, config);
    estado = M.criarPartida(config, PACOTES);
    irPasse();
  }

  function renderPlacar() {
    $$("[data-placar]").forEach(function (el) {
      if (estado.modo === "coop") {
        el.innerHTML = '<div class="pt coop"><span>🤝 Grupo <span class="meta">rodada ' +
          Math.min(estado.rodada, estado.totalRodadas) + "/" + estado.totalRodadas + "</span></span><b>" + estado.times[0].pontos + "</b></div>";
      } else {
        el.innerHTML = estado.times.map(function (t, i) {
          return '<div class="pt t' + i + (i === estado.vez && estado.fase !== "fim" ? " vez" : "") + '"><span>' + (i ? "🌙 " : "☀️ ") +
            esc(t.nome) + ' <span class="meta">/' + estado.meta + "</span></span><b>" + t.pontos + "</b></div>";
        }).join("");
      }
    });
    $$("[data-rodada]").forEach(function (el) { el.textContent = "Rodada " + estado.rodada; });
  }

  function renderCarta() {
    var c = estado.carta;
    $$("[data-carta]").forEach(function (el) {
      el.innerHTML = '<div class="lado esq">' + esc(c.esq) + '</div><div class="seta">⟷</div><div class="lado dir">' + esc(c.dir) + "</div>";
    });
    $$("[data-extremos]").forEach(function (el) {
      el.innerHTML = "<span>← " + esc(c.esq) + "</span><span>" + esc(c.dir) + " →</span>";
    });
  }

  function desenharZona(el, alvo, comNumeros) {
    var f = function (cls, meia, rot) {
      return '<div class="f ' + cls + '" style="left:' + alvo + "%;width:" + (meia * 2 + 1) + '%">' + (comNumeros ? rot : "") + "</div>";
    };
    el.innerHTML = f("f3", 15, "") + f("f6", 8, "") + f("f10", 3, "") + '<div class="centro-alvo" style="left:' + alvo + '%"></div>';
  }

  function irPasse() {
    renderPlacar();
    var quem = $("#passe-quem");
    if (estado.modo === "coop") {
      quem.textContent = "Escolham quem vai dar a dica desta rodada.";
    } else {
      var t = estado.times[estado.vez];
      quem.innerHTML = 'Vez do <span class="nome-time" style="background:' + (estado.vez ? "var(--lua)" : "var(--sol)") + '">' +
        esc(t.nome) + "</span><br><small>Escolham quem do time vai dar a dica.</small>";
    }
    mostrar("passe");
  }

  function irSintonizador() {
    estado.fase = "sintonizador";
    jaViuAlvo = false;
    $("#btn-pronto").disabled = true;
    renderPlacar(); renderCarta();
    desenharZona($("#zona-sint"), estado.alvo, false);
    $("#zona-sint").classList.remove("visivel");
    mostrar("sintonizador");
  }

  function irPalpite() {
    estado.fase = "palpite";
    $("#zona-sint").classList.remove("visivel");
    palpite = 50;
    posicionarPino();
    renderPlacar(); renderCarta();
    mostrar("palpite");
  }

  function travar() {
    M.travarPalpite(estado, palpite);
    renderPlacar(); renderCarta();
    var zona = $("#zona-rev");
    desenharZona(zona, estado.alvo, true);
    zona.classList.remove("anima", "visivel");
    $("#pino-rev").style.left = estado.palpite + "%";
    var r = estado.resultado;
    $("#res-rotulo").textContent = r.rotulo;
    $("#res-pontos").style.color = r.pontos ? "" : "var(--coral)";
    $("#res-pontos").textContent = r.pontos ? "+" + r.pontos + " pontos" + (estado.modo === "equipes" ? " para " + estado.times[estado.vez].nome : "") : "0 ponto";
    $("#res-dist").textContent = "Distância: " + r.distancia + " (alvo em " + estado.alvo + ", palpite em " + estado.palpite + ")";
    var res = $("#resultado"); res.classList.remove("mostra");
    var btn = $("#btn-proximo"); btn.classList.remove("pronto");
    btn.textContent = fimDepoisDesta() ? "Ver resultado 🏁" : "Próxima rodada →";
    mostrar("revelacao");
    // força reflow para reiniciar as animações
    void zona.offsetWidth;
    setTimeout(function () { zona.classList.add("visivel", "anima"); res.classList.add("mostra"); }, 250);
    setTimeout(function () { btn.classList.add("pronto"); }, 1700);
    if (r.pontos === 10 && navigator.vibrate) { try { navigator.vibrate([60, 40, 120]); } catch (e) {} }
  }

  function fimDepoisDesta() {
    if (estado.modo === "coop") return estado.rodada >= estado.totalRodadas;
    return estado.times[estado.vez].pontos >= estado.meta;
  }

  function proximo() {
    M.avancar(estado);
    if (estado.fase === "fim") irFim(); else irPasse();
  }

  function irFim() {
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
    } else {
      var v = estado.times[estado.vencedor];
      ico.textContent = estado.vencedor ? "🌙" : "☀️";
      tit.textContent = v.nome + " venceu!";
      txt.textContent = "Chegou a " + v.pontos + " pontos em " + estado.rodada + " rodadas. Estavam em sintonia!";
    }
    $("#historico").innerHTML = estado.historico.map(function (h) {
      return "<li><span>" + h.rodada + ". " + esc(h.carta.esq) + " ⟷ " + esc(h.carta.dir) + "</span><b>" +
        (h.pontos ? "+" + h.pontos : "0") + (estado.modo === "equipes" ? " " + (h.time ? "🌙" : "☀️") : "") + "</b></li>";
    }).join("");
    mostrar("fim");
  }

  /* ---------- marcador arrastável ---------- */
  function posicionarPino() {
    var p = $("#pino");
    p.style.left = palpite + "%";
    p.setAttribute("aria-valuenow", Math.round(palpite));
  }
  function ligarArraste() {
    var trilho = $("#trilho-palpite"), pino = $("#pino"), ativo = false;
    function valor(ev) {
      var r = trilho.getBoundingClientRect();
      return Math.max(0, Math.min(100, ((ev.clientX - r.left) / r.width) * 100));
    }
    trilho.addEventListener("pointerdown", function (ev) {
      ativo = true; pino.classList.add("arrastando");
      try { trilho.setPointerCapture(ev.pointerId); } catch (e) {}
      palpite = valor(ev); posicionarPino(); ev.preventDefault();
    });
    trilho.addEventListener("pointermove", function (ev) { if (!ativo) return; palpite = valor(ev); posicionarPino(); });
    var solta = function () { ativo = false; pino.classList.remove("arrastando"); };
    trilho.addEventListener("pointerup", solta);
    trilho.addEventListener("pointercancel", solta);
    pino.addEventListener("keydown", function (ev) {
      var passo = ev.shiftKey ? 10 : 1;
      if (ev.key === "ArrowLeft" || ev.key === "ArrowDown") palpite = Math.max(0, Math.round(palpite) - passo);
      else if (ev.key === "ArrowRight" || ev.key === "ArrowUp") palpite = Math.min(100, Math.round(palpite) + passo);
      else if (ev.key === "Home") palpite = 0;
      else if (ev.key === "End") palpite = 100;
      else return;
      ev.preventDefault(); posicionarPino();
    });
  }

  /* ---------- toque e segure ---------- */
  function ligarSegurar() {
    var btn = $("#btn-segurar"), zona = $("#zona-sint");
    function abre(ev) {
      if (ev) ev.preventDefault();
      zona.classList.add("visivel"); btn.classList.add("ativo");
      if (!jaViuAlvo) { jaViuAlvo = true; $("#btn-pronto").disabled = false; }
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

  /* ---------- utilidades ---------- */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var toastTimer;
  function toast(msg) {
    var t = $("#toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 2200);
  }
  function compartilhar() {
    var url = location.origin + location.pathname;
    var dados = { title: "Sintonia — CARLUDIX", text: "Bora jogar Sintonia? Um dá a dica e o grupo acha o ponto na régua!", url: url };
    if (navigator.share) { navigator.share(dados).catch(function () {}); return; }
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { toast("Link copiado!"); }, function () { toast(url); });
    else toast(url);
  }

  /* ---------- eventos ---------- */
  document.addEventListener("click", function (ev) {
    var alvo = ev.target.closest("button");
    if (!alvo) return;
    if (alvo.dataset.ir) {
      if (alvo.dataset.ir === "config") atualizarConfig();
      mostrar(alvo.dataset.ir); return;
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
      case "regras": $("#modal-regras").hidden = false; break;
      case "fechar-regras": $("#modal-regras").hidden = true; break;
      case "sou-sintonizador": irSintonizador(); break;
      case "trocar-carta": M.trocarCarta(estado); renderCarta(); toast("Carta trocada"); break;
      case "pronto": irPalpite(); break;
      case "travar": travar(); break;
      case "proximo": proximo(); break;
      case "revanche": estado = M.criarPartida(config, PACOTES); irPasse(); break;
      case "compartilhar": compartilhar(); break;
      case "sair":
        if (confirmarSaida()) { atualizarConfig(); mostrar("config"); }
        break;
    }
  });
  var saidaPendente = false, saidaTimer;
  function confirmarSaida() {
    // confirmação sem janela do navegador: tocar duas vezes
    if (saidaPendente) { saidaPendente = false; return true; }
    saidaPendente = true; toast("Toque de novo para encerrar");
    clearTimeout(saidaTimer); saidaTimer = setTimeout(function () { saidaPendente = false; }, 2500);
    return false;
  }
  $("#modal-regras").addEventListener("click", function (ev) { if (ev.target.id === "modal-regras") ev.currentTarget.hidden = true; });
  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape") $("#modal-regras").hidden = true; });

  montarConfig();
  ligarArraste();
  ligarSegurar();
})();
