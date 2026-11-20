/* Cookie の同意確認 + Google アナリティクス（GA4）の読み込み制御
 *
 * 決まり:
 *  - 利用者が「同意する」を選ぶまで、Google のスクリプト（gtag.js）を読み込まない。Cookie も作らない。
 *  - 同意前・拒否中は、ページ内の gtag(...)（ボタンのクリック記録）は何もしない。
 *  - 選んだ結果は localStorage に保存。使えない環境でも壊れない（そのページの間だけ記憶）。
 *  - フッターの [data-cookie-settings] を押すと、確認を再表示。「同意しない」を選ぶと GA4 の Cookie を消す。
 *  - 同意したページの読み込みで gtag を読み込む＝ page_view に URL の UTM が載る。
 */
(function () {
  'use strict';
  var GA_ID = 'G-L5DXZ6SEG9';
  var KEY = 'mc_cookie_consent';          // 'granted' | 'denied'
  var lang = String(document.documentElement.getAttribute('lang') || 'ja').slice(0, 2) === 'en' ? 'en' : 'ja';
  var TEXT = {
    ja: {
      title: 'Cookie（クッキー）の確認',
      body: 'このサイトでは、閲覧状況の把握のため、アクセス解析（Google アナリティクス）を使います。「同意する」を選んだ場合だけ、見たページ・訪問元・端末の種類などを Google へ送ります。',
      more: '詳しくはプライバシーポリシー（第9章）',
      yes: '同意する',
      no: '同意しない',
      nowOn: '現在の選択：同意している',
      nowOff: '現在の選択：同意していない'
    },
    en: {
      title: 'Cookies',
      body: 'This site uses Google Analytics to understand how it is viewed. Only if you choose “Accept,” information such as the pages you view, where you came from, and your device type is sent to Google.',
      more: 'Details: Privacy Policy (Section 9)',
      yes: 'Accept',
      no: 'Decline',
      nowOn: 'Current choice: Accepted',
      nowOff: 'Current choice: Declined'
    }
  }[lang];
  var POLICY = lang === 'en' ? 'privacy-en.html#site-analytics' : 'privacy.html#site-analytics';

  // ---- 保存（localStorage が使えなくても壊れない）----
  var memory = null;
  function readChoice() {
    try { var v = window.localStorage.getItem(KEY); if (v === 'granted' || v === 'denied') return v; return null; }
    catch (e) { return memory; }
  }
  function writeChoice(v) {
    memory = v;
    try { window.localStorage.setItem(KEY, v); } catch (e) { /* 保存できない環境: このページの間だけ */ }
  }

  // ---- GA4 ----
  var scriptAdded = false;
  var realGtag = null;
  function noop() {}
  window.gtag = noop;   // 同意前・拒否中は何もしない（クリック記録がたまって後で送られることも防ぐ）

  function enableGA() {
    window['ga-disable-' + GA_ID] = false;
    if (!scriptAdded) {
      window.dataLayer = window.dataLayer || [];
      realGtag = function () { window.dataLayer.push(arguments); };
      window.gtag = realGtag;
      realGtag('js', new Date());
      realGtag('config', GA_ID);                 // page_view（URL の UTM もここで記録される）
      var s = document.createElement('script');
      s.async = true;
      s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
      (document.head || document.documentElement).appendChild(s);
      scriptAdded = true;
    } else {
      // 取り消し → 再び同意した場合
      window.gtag = realGtag;
      realGtag('config', GA_ID);
    }
  }
  function deleteCookies() {
    var host = location.hostname;
    var parts = host.split('.');
    var domains = [host, '.' + host];
    if (parts.length > 2) domains.push('.' + parts.slice(-2).join('.'));
    String(document.cookie || '').split(';').forEach(function (c) {
      var name = c.split('=')[0].replace(/^\s+/, '');
      if (name.indexOf('_ga') !== 0) return;      // _ga, _ga_<ID>
      var past = '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
      document.cookie = name + past;
      domains.forEach(function (d) { document.cookie = name + past + '; domain=' + d; });
    });
  }
  function disableGA() {
    window['ga-disable-' + GA_ID] = true;
    window.gtag = noop;
    deleteCookies();
  }
  function apply(choice) { if (choice === 'granted') enableGA(); else disableGA(); }

  // 同意済みなら、できるだけ早く（ページ読み込みの時点で）有効化する
  var initial = readChoice();
  if (initial === 'granted') enableGA();

  // ---- バナー ----
  var CSS = '' +
    '#mc-consent{position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483000;max-width:720px;margin:0 auto;' +
    'background:var(--card,#fffdf9);color:var(--ink,#2b2b2b);border:1px solid var(--line,#e4ddcf);border-radius:16px;' +
    'box-shadow:var(--shadow,0 12px 34px rgba(60,45,30,.18));padding:18px 18px 16px;font-size:17px;line-height:1.7;text-align:left}' +
    '#mc-consent[hidden]{display:none}' +
    '#mc-consent h2{font-size:18px;margin:0 0 6px;color:var(--ink,#2b2b2b)}' +
    '#mc-consent p{margin:0 0 8px;font-size:16px;color:var(--ink,#2b2b2b)}' +
    '#mc-consent .mc-now{color:var(--sub,#6b6b6b);font-size:15px}' +
    '#mc-consent a{color:var(--akane,#c0414a)}' +
    '#mc-consent .mc-btns{display:flex;gap:12px;margin-top:12px}' +
    '#mc-consent button{flex:1 1 0;min-height:48px;padding:10px 12px;font:inherit;font-size:17px;font-weight:700;cursor:pointer;' +
    'background:transparent;color:var(--akane,#c0414a);border:2px solid var(--akane,#c0414a);border-radius:999px}' +
    '#mc-consent button:hover{background:color-mix(in srgb, var(--akane,#c0414a) 10%, transparent)}' +
    '#mc-consent button:focus-visible{outline:3px solid var(--ink,#2b2b2b);outline-offset:2px}' +
    '@media (max-width:420px){#mc-consent{left:8px;right:8px;bottom:8px;padding:14px}#mc-consent .mc-btns{gap:8px}}';

  var box = null, nowEl = null;
  function build() {
    if (box) return;
    var st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    box = document.createElement('div');
    box.id = 'mc-consent';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-labelledby', 'mc-consent-title');
    box.hidden = true;
    box.innerHTML =
      '<h2 id="mc-consent-title"></h2><p class="mc-body"></p>' +
      '<p class="mc-now" hidden></p>' +
      '<p><a class="mc-more"></a></p>' +
      '<div class="mc-btns"><button type="button" data-mc="granted"></button><button type="button" data-mc="denied"></button></div>';
    box.querySelector('h2').textContent = TEXT.title;
    box.querySelector('.mc-body').textContent = TEXT.body;
    var a = box.querySelector('.mc-more');
    a.textContent = TEXT.more; a.href = POLICY;
    box.querySelector('[data-mc="granted"]').textContent = TEXT.yes;
    box.querySelector('[data-mc="denied"]').textContent = TEXT.no;
    nowEl = box.querySelector('.mc-now');
    box.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('button[data-mc]') : null;
      if (!b) return;
      var v = b.getAttribute('data-mc');
      writeChoice(v);
      apply(v);
      box.hidden = true;
    });
    document.body.appendChild(box);
  }
  function show(withStatus) {
    build();
    var cur = readChoice();
    if (withStatus && cur) { nowEl.textContent = cur === 'granted' ? TEXT.nowOn : TEXT.nowOff; nowEl.hidden = false; }
    else { nowEl.hidden = true; }
    box.hidden = false;
    var first = box.querySelector('button');
    if (withStatus && first && first.focus) first.focus();
  }
  function init() {
    if (readChoice() === null) show(false);
    var links = document.querySelectorAll('[data-cookie-settings]');
    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener('click', function (e) { e.preventDefault(); show(true); });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
