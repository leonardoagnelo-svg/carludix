/* CARLUDIX — aviso de cookies (LGPD)
   Uso em qualquer página (portal ou jogos):  <script src="/cookies.js" defer></script>

   Escolha salva em localStorage "carludix-consent": "aceito" | "recusado".
   - window.CarludixCookies.status()  → "aceito", "recusado" ou null
   - window.CarludixCookies.open()    → reabre o aviso
   - evento "carludix:consent" no window quando a pessoa decide (detail = status)

   ANÚNCIOS: quando o AdSense for aprovado, coloque o ID do editor abaixo.
   O script só carrega depois que a pessoa responder ao aviso; se ela recusar,
   os anúncios são pedidos como NÃO personalizados. */
(function () {
  var ADSENSE_CLIENT = 'ca-pub-1981456165037413'; // ex.: 'ca-pub-0000000000000000' (deixe vazio até a aprovação)
  var KEY = 'carludix-consent';

  function get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  function loadAds(status) {
    if (!ADSENSE_CLIENT || document.getElementById('carludix-adsense')) return;
    window.adsbygoogle = window.adsbygoogle || [];
    if (status !== 'aceito') window.adsbygoogle.requestNonPersonalizedAds = 1;
    var s = document.createElement('script');
    s.id = 'carludix-adsense';
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + ADSENSE_CLIENT;
    document.head.appendChild(s);
    adsReady = true;
    renderAds();
  }

  /* ===== Espaços de anúncio =====
     Coloque na página onde o anúncio pode aparecer:
       <div class="cdx-ad" data-ad="jogo-resultado"></div>
     O espaço fica INVISÍVEL até um anúncio ser de fato exibido (nada de buraco vazio).
     Para telas que aparecem depois (ex.: fim de partida), chame window.CarludixAds.render()
     logo após mostrar a tela. */
  var SLOTS = {
    'portal-meio': '2628174437',
    'portal-rodape': '3724653743',
    'jogo-resultado': '7904551849'
  };
  var adsReady = false;

  function fillSlot(box) {
    if (box.getAttribute('data-cdx-done')) return;
    var id = SLOTS[box.getAttribute('data-ad')];
    if (!id) return;
    box.setAttribute('data-cdx-done', '1');
    var ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.setAttribute('data-ad-client', ADSENSE_CLIENT);
    ins.setAttribute('data-ad-slot', id);
    ins.setAttribute('data-ad-format', 'auto');
    ins.setAttribute('data-full-width-responsive', 'true');
    box.appendChild(ins);
    // só mostra o espaço quando o Google realmente preencher um anúncio
    try {
      new MutationObserver(function () {
        var st = ins.getAttribute('data-ad-status');
        if (st === 'filled') box.classList.add('cdx-filled');
        else if (st === 'unfilled') box.classList.remove('cdx-filled');
      }).observe(ins, { attributes: true, attributeFilter: ['data-ad-status'] });
    } catch (e) {}
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
  }

  function renderAds() {
    if (!adsReady) return;
    var list = document.querySelectorAll('.cdx-ad');
    for (var i = 0; i < list.length; i++) {
      // ignora espaços escondidos (ex.: tela de resultado ainda fechada)
      var p = list[i].parentElement;
      if (p && p.getClientRects().length === 0) continue;
      fillSlot(list[i]);
    }
  }
  window.CarludixAds = { render: renderAds };

  var adCss =
    '.cdx-ad{display:none;margin:24px auto;max-width:970px;text-align:center}' +
    '.cdx-ad.cdx-filled{display:block}' +
    '.cdx-ad.cdx-filled:before{content:"Publicidade";display:block;font:11px/1.4 Inter,ui-sans-serif,system-ui,sans-serif;' +
    'letter-spacing:.12em;text-transform:uppercase;color:#6c7891;margin-bottom:6px}';

  var css =
    '#cdx-cookies{position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;max-width:560px;margin:0 auto;' +
    'background:#121a2d;color:#f3f5fa;border:1px solid #2c3955;border-radius:14px;padding:18px 20px;' +
    'box-shadow:0 20px 50px rgba(0,0,0,.5);font:14px/1.55 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' +
    '#cdx-cookies p{margin:0 0 14px;color:#a3adc2}' +
    '#cdx-cookies b{color:#fff}' +
    '#cdx-cookies a{color:#fff;text-underline-offset:3px}' +
    '#cdx-cookies .cdx-row{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}' +
    '#cdx-cookies button{font:inherit;font-weight:700;cursor:pointer;height:40px;padding:0 16px;border-radius:9px}' +
    '#cdx-cookies .cdx-no{background:transparent;color:#e6eaf2;border:1px solid #3a4560}' +
    '#cdx-cookies .cdx-no:hover{border-color:#5a6888}' +
    '#cdx-cookies .cdx-yes{background:#e3262f;color:#fff;border:0}' +
    '#cdx-cookies .cdx-yes:hover{background:#c41d26}' +
    '#cdx-cookies button:focus-visible{outline:2px solid #fff;outline-offset:2px}' +
    '@media(max-width:480px){#cdx-cookies .cdx-row button{flex:1}}';

  function close() { var el = document.getElementById('cdx-cookies'); if (el) el.remove(); }

  function decide(v) {
    set(v); close(); loadAds(v);
    try { window.dispatchEvent(new CustomEvent('carludix:consent', { detail: v })); } catch (e) {}
  }

  function open() {
    if (document.getElementById('cdx-cookies')) return;
    if (!document.getElementById('cdx-cookies-css')) {
      var st = document.createElement('style'); st.id = 'cdx-cookies-css'; st.textContent = css;
      document.head.appendChild(st);
    }
    var box = document.createElement('div');
    box.id = 'cdx-cookies';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Aviso de cookies');
    box.innerHTML =
      '<p><b>Cookies</b> · Usamos o armazenamento do navegador para salvar seu progresso nos jogos e, se você permitir, ' +
      'cookies de anúncios para manter a CARLUDIX gratuita. <a href="/privacidade/">Saiba mais</a>.</p>' +
      '<div class="cdx-row"><button type="button" class="cdx-no">Recusar</button>' +
      '<button type="button" class="cdx-yes">Aceitar</button></div>';
    box.querySelector('.cdx-no').onclick = function () { decide('recusado'); };
    box.querySelector('.cdx-yes').onclick = function () { decide('aceito'); };
    document.body.appendChild(box);
  }

  window.CarludixCookies = { status: get, open: open };

  function init() {
    if (!document.getElementById('cdx-ad-css')) {
      var st = document.createElement('style'); st.id = 'cdx-ad-css'; st.textContent = adCss;
      document.head.appendChild(st);
    }
    var s = get();
    if (s) loadAds(s); else open();
    // links com data-cookies abrem o aviso (ex.: rodapé)
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('[data-cookies]');
      if (a) { e.preventDefault(); open(); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
