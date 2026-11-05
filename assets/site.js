/* ═══════════════════════════════════════════════════════════════════════
   Pawsport Concierge · общий скрипт внутренних страниц (About, блог)
   ───────────────────────────────────────────────────────────────────────
   До 17.08 на внутренних страницах не было ни строчки JS: ни аналитики, ни
   куки-баннера, ни обработчика data-track. Трафик блога и About не измерялся
   вообще, а метки *_header молчали. Этот файл закрывает задачу 0г.

   Что делает:
     1. хелпер track() и обработчик клика по [data-track] — как на главной;
     2. согласие на аналитику: тот же ключ localStorage 'pw-consent' и те же
        значения 'all' / 'essential', что на главной, поэтому согласие,
        данное на главной, здесь уже действует и баннер не появляется
        второй раз (и наоборот);
     3. согласие в двух режимах по региону (06.11.2026): EU — opt-in, GA4,
        Clarity, пиксель Meta и Google Fonts только после «Accept»; US — opt-out,
        всё грузится сразу, пока нет «Opt out» или сигнала GPC; регион ставит
        head-скрипт страницы (window.__pwRegion), ?region=eu|us и ?gpc=1 — тесты;
        GA4 Consent Mode v2 и fbq consent — по тому же статусу;
     4. сам баннер и ссылку «Cookie settings» рисует скриптом, а не копией
        разметки в каждом файле: подключение страницы — одна строка
        <script src="…/assets/site.js" defer></script>. Без JS элементы
        управления согласием не появляются, и это правильно — соглашаться
        было бы не на что, аналитика без JS всё равно не загрузится.

   Разметка баннера и текст — один в один с главной; CSS живёт в pages.css
   (.cookies, .ck-btn и т.д.). Главную этот файл НЕ подключает: там та же
   логика лежит инлайном. Если однажды главная перейдёт на site.js, инлайн
   оттуда надо удалить, иначе баннер и обработчики удвоятся.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var KEY = 'pw-consent';
  var GA4_ID = 'G-64W5X6RV2K';
  var CLARITY_ID = 'xxqiuz1ged';
  /* ID датасета «Pawsport Website» из Events Manager. Пусто — пиксель не
     грузится вовсе. ID живёт в ДВУХ местах: здесь и в инлайне главной
     (preview-hunt-club-v4.html) — менять оба. */
  var META_PIXEL_ID = '1072394655611354';

  /* ── аналитика ──────────────────────────────────────────────────────── */

  function track(event, params) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({ event: event }, params || {}));
    if (window.__ga4Loaded && window.gtag && (!window.__consentGranted || window.__consentGranted())) {
      window.gtag('event', event, params || {});
    }
  }
  /* глобально — как на главной, чтобы будущий код страниц звал одинаково */
  window.track = track;

  /* ── согласие: ядро один в один с инлайном главной ──────────────────── */
  var region = window.__pwRegion || 'us';   /* выставляет head-скрипт региона; ?region=eu|us — тест */
  var gpc = navigator.globalPrivacyControl === true || /[?&]gpc=1(&|$)/.test(location.search); /* ?gpc=1 — тест */
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch(e){}
  /* EU — только явное «Accept»; US — пока нет «Opt out» и нет сигнала GPC; явное «OK» перекрывает GPC */
  function granted(){ return region === 'eu' ? saved === 'all' : (saved === 'all' || (!gpc && saved !== 'essential')); }
  window.__consentGranted = granted;
  window.__consent = granted() ? 'all' : 'essential';
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) window.gtag = function(){ window.dataLayer.push(arguments); };
  function cm(on){ var v = on ? 'granted' : 'denied'; return {ad_storage: v, ad_user_data: v, ad_personalization: v, analytics_storage: v}; }
  /* GA4 Consent Mode v2: EU — default denied и update после согласия; US — default по текущему статусу */
  window.gtag('consent', 'default', cm(region === 'us' && granted()));
  if (region === 'eu' && granted()) window.gtag('consent', 'update', cm(true));
  function loadClarity(){
    if (window.__clarityLoaded) return;
    window.__clarityLoaded = true;
    (function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", CLARITY_ID);
  }
  function loadGA4(){
    if (window.__ga4Loaded) return;
    window.__ga4Loaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_ID;
    document.head.appendChild(s);
    window.gtag('js', new Date());
    window.gtag('config', GA4_ID);
  }
  function loadMetaPixel(){
    if (!META_PIXEL_ID || window.__metaLoaded) return;
    window.__metaLoaded = true;
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
    document,'script','https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('consent', 'grant');
    window.fbq('init', META_PIXEL_ID);
    window.fbq('track', 'PageView');
  }
  function loadAll(){ if (window.__pwLoadFonts) window.__pwLoadFonts(); loadClarity(); loadGA4(); loadMetaPixel(); }
  /* «Opt out» / «Reject» после загрузки: статусы в denied, GA4 выключен флагом, теги сняты, их куки стёрты */
  function clearCookies(){
    var host = location.hostname, doms = ['', host, '.' + host, '.' + host.replace(/^www\./, '')];
    document.cookie.split(';').forEach(function(c){
      var n = c.split('=')[0].trim();
      if (!/^(_ga|_gid|_gat|_gcl|_fbp|_fbc|_clck|_clsk)/.test(n)) return;
      doms.forEach(function(d){ document.cookie = n + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + (d ? '; domain=' + d : ''); });
    });
  }
  function optOut(){
    window['ga-disable-' + GA4_ID] = true;
    window.gtag('consent', 'update', cm(false));
    if (window.fbq) window.fbq('consent', 'revoke');
    if (window.clarity){ try { window.clarity('consent', false); window.clarity('stop'); } catch(e){} }
    Array.prototype.forEach.call(document.querySelectorAll('script[src*="googletagmanager.com"],script[src*="clarity.ms"],script[src*="connect.facebook.net"]'), function(s){ s.parentNode.removeChild(s); });
    clearCookies();
  }
  function grant(){
    window['ga-disable-' + GA4_ID] = false;
    window.gtag('consent', 'update', cm(true));
    loadAll();
    if (window.fbq) window.fbq('consent', 'grant');
    if (window.clarity){ try { window.clarity('consent', true); } catch(e){} }
  }
  if (granted()) loadAll();
  var TEXT = {
    eu: {p: 'We&rsquo;d like to use analytics and advertising cookies to improve the site and measure our ads. See our <a href="/privacy.html#cookies">Privacy&nbsp;Policy</a>.',
         no: 'Reject', yes: 'Accept', footer: 'Cookie settings'},
    us: {p: 'We use analytics and advertising cookies to improve the site and measure our ads. See our <a href="/privacy.html#cookies">Privacy&nbsp;Policy</a>.',
         no: 'Opt out', yes: 'OK', footer: 'Do Not Sell or Share My Personal Information'}
  };
  var T = TEXT[region];

  /* ── баннер согласия ────────────────────────────────────────────────── */

  /* aria-modal="false" — баннер ничего не блокирует, страница под ним рабочая.
     Вставляется сразу за skip-link: так он в начале порядка табуляции и
     находится одним Tab, без насильного перевода фокуса при загрузке. */
  function banner() {
    return '<div class="cookies' + (region === 'eu' ? ' eq' : '') + '" id="cookies" role="dialog" aria-modal="false" ' +
           'aria-label="Cookie settings" tabindex="-1">' +
      '<p>' + T.p + '</p>' +
      '<div class="cookies-actions">' +
        '<button type="button" class="ck-btn ck-ghost" id="ck-essential">' + T.no + '</button>' +
        '<button type="button" class="ck-btn ck-accept" id="ck-accept">' + T.yes + '</button>' +
      '</div>' +
    '</div>';
  }

  function addCookieSettingsButton() {
    /* дописываем в нижнюю строку подвала, рядом с FAQ · Terms.
       <button>, а не <a href="#">: это действие, а не переход.
       Подпись по региону: EU — «Cookie settings», US — «Do Not Sell or Share…». */
    var host = document.querySelector('footer .f-bottom span:last-child')
            || document.querySelector('footer .f-bottom');
    if (!host || document.getElementById('ck-open')) return null;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'linkbtn';
    b.id = 'ck-open';
    b.textContent = T.footer;
    host.appendChild(document.createTextNode(' · '));
    host.appendChild(b);
    return b;
  }

  function initConsent() {
    var holder = document.createElement('div');
    holder.innerHTML = banner();
    var box = holder.firstChild;
    var skip = document.querySelector('.skip');
    if (skip && skip.parentNode === document.body) {
      document.body.insertBefore(box, skip.nextSibling);
    } else {
      document.body.insertBefore(box, document.body.firstChild);
    }
    /* Тихий анонс появления. Фокус при загрузке НЕ забираем — это сбивает и
       противоречит гайдлайну; вместо этого баннер объявляется вежливо и стоит
       первым в табуляции. */
    var live = document.createElement('p');
    live.className = 'sr-only';
    live.setAttribute('aria-live', 'polite');
    document.body.insertBefore(live, box);
    var opener = addCookieSettingsButton();
    var lastFocus = null;
    function open(opener){
      lastFocus = opener || null;
      box.classList.add('on');
      if (opener) { box.focus(); }
      else { setTimeout(function(){
        if (live) live.textContent = 'Cookie settings are available at the top of the page.';
      }, 150); }
    }
    function close(){
      box.classList.remove('on');
      if (live) live.textContent = '';
      if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
      lastFocus = null;
    }
    function set(v){
      try { localStorage.setItem(KEY, v); } catch(e){}
      saved = v;
      window.__consent = granted() ? 'all' : 'essential';
      close();
      if (v === 'all') grant(); else optOut();
    }
    /* баннер при загрузке: нет сохранённого выбора; в US при сигнале GPC не показываем — он уже «Opt out» */
    if (!saved && !(region === 'us' && gpc)) open(null);
    if (opener) opener.addEventListener('click', function(){ open(opener); });
    /* Escape закрывает, не записывая выбора. Слушатель на самом баннере, не на документе,
       чтобы не отнимать Escape у календаря в форме. */
    box.addEventListener('keydown', function(e){
      if (e.key === 'Escape'){ e.stopPropagation(); close(); }
    });
    document.getElementById('ck-essential').addEventListener('click', function(){ set('essential'); });
    document.getElementById('ck-accept').addEventListener('click', function(){ set('all'); });
  }

  /* ── метки кликов ───────────────────────────────────────────────────── */

  function initTracking() {
    document.querySelectorAll('[data-track]').forEach(function (el) {
      el.addEventListener('click', function () {
        track('click_' + el.dataset.track);
      });
    });
  }

  function init() { initConsent(); initTracking(); }

  /* defer уже гарантирует готовый DOM, но подстрахуемся: файл могут
     подключить и без defer. */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
