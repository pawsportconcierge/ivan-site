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
     3. GA4 и Clarity грузятся ТОЛЬКО при согласии 'all' — до него ни одного
        сетевого запроса к аналитике;
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

  /* dataLayer заводим сразу: track() пишет в него независимо от согласия.
     Это память страницы, а не сеть — запросов отсюда не уходит. */
  window.dataLayer = window.dataLayer || [];

  /* ── аналитика ──────────────────────────────────────────────────────── */

  function track(event, params) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({ event: event }, params || {}));
    if (window.__ga4Loaded && window.gtag) {
      window.gtag('event', event, params || {});
    }
  }
  /* глобально — как на главной, чтобы будущий код страниц звал одинаково */
  window.track = track;

  function loadClarity() {
    if (window.__clarityLoaded) return;
    window.__clarityLoaded = true;
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', CLARITY_ID);
  }

  function loadGA4() {
    if (window.__ga4Loaded) return;
    window.__ga4Loaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA4_ID);
  }

  /* ── баннер согласия ────────────────────────────────────────────────── */

  /* aria-modal="false" — баннер ничего не блокирует, страница под ним рабочая.
     Вставляется ПЕРВЫМ элементом body: так он в начале порядка табуляции и
     находится одним Tab, без насильного перевода фокуса при загрузке. */
  var BANNER =
    '<div class="cookies" id="cookies" role="dialog" aria-modal="false" ' +
         'aria-label="Cookie settings" tabindex="-1">' +
      '<p>We use essential cookies only. With your consent we’ll also enable ' +
      'basic, anonymous analytics to improve the site. You can change this any time.</p>' +
      '<div class="cookies-actions">' +
        '<button type="button" class="ck-btn ck-ghost" id="ck-essential">Essential only</button>' +
        '<button type="button" class="ck-btn ck-accept" id="ck-accept">Accept</button>' +
      '</div>' +
    '</div>';

  function addCookieSettingsButton(open) {
    /* дописываем в нижнюю строку подвала, рядом с FAQ · Terms.
       <button>, а не <a href="#">: это действие, а не переход. */
    var host = document.querySelector('footer .f-bottom span:last-child')
            || document.querySelector('footer .f-bottom');
    if (!host || document.getElementById('ck-open')) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'linkbtn';
    b.id = 'ck-open';
    b.textContent = 'Cookie settings';
    b.addEventListener('click', function () { open(b); });
    host.appendChild(document.createTextNode(' · '));
    host.appendChild(b);
  }

  function initConsent() {
    var saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) {}
    window.__consent = saved;

    if (saved === 'all') { loadClarity(); loadGA4(); }

    var holder = document.createElement('div');
    holder.innerHTML = BANNER;
    var box = holder.firstChild;
    /* сразу за skip-link: баннер оказывается вторым в порядке табуляции, но
       не отбирает первое место у «Skip to main content» */
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
    /* сам баннер визуально внизу экрана (position:fixed), поэтому в анонсе
       говорим про порядок чтения, а не про низ страницы */

    var lastFocus = null;

    function open(opener) {
      lastFocus = opener || null;
      box.classList.add('on');
      if (opener) {
        box.focus();                    /* открыл пользователь — уводим фокус внутрь */
      } else {
        /* область объявлений должна успеть попасть в дерево доступности до
           того, как в ней появится текст, иначе часть скринридеров её молчит */
        setTimeout(function () {
          live.textContent = 'Cookie settings are available at the top of the page.';
        }, 150);
      }
    }

    function close() {
      box.classList.remove('on');
      live.textContent = '';
      if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
      lastFocus = null;
    }

    function set(v) {
      try { localStorage.setItem(KEY, v); } catch (e) {}
      window.__consent = v;
      close();
      if (v === 'all') { loadClarity(); loadGA4(); }
    }

    document.getElementById('ck-essential')
      .addEventListener('click', function () { set('essential'); });
    document.getElementById('ck-accept')
      .addEventListener('click', function () { set('all'); });

    /* Escape закрывает баннер, НЕ записывая согласия: выбор не сделан, значит
       при следующем заходе спросим снова. Вернуть баннер сразу — «Cookie
       settings» в подвале. */
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
    });

    if (!saved) open(null);
    addCookieSettingsButton(open);
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
