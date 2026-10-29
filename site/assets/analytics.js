(() => {
  'use strict';
  if (window.__rrAnalyticsLoaded) return;
  window.__rrAnalyticsLoaded = true;
  const endpoint = document.currentScript?.dataset.endpoint;
  const prefix = 'rr-analytics-';
  const contentPaths = new Set([
    '/', '/cv/', '/design/liangzhu/', '/design/artisense/',
    '/design/swim-the-world/', '/design/digital-human/', '/design/water-shadows/',
    '/design/lightspoken/', '/design/lost-homeland/', '/design/multifunctional-cart/',
  ]);
  const privacySignal = navigator.globalPrivacyControl === true || navigator.doNotTrack === '1';
  function read(key) { try { return localStorage.getItem(prefix + key); } catch { return null; } }
  function write(key, value) { try { localStorage.setItem(prefix + key, value); } catch { /* Storage can be disabled. */ } }
  function remove(key) { try { localStorage.removeItem(prefix + key); } catch { /* No stored identifier. */ } }

  const button = document.getElementById('analytics-choice');
  const status = document.getElementById('analytics-status');
  function showChoice() {
    if (!button || !status) return;
    const optedOut = read('optout') === '1';
    button.textContent = optedOut ? 'Allow private analytics' : 'Opt out of private analytics';
    button.setAttribute('aria-pressed', String(optedOut));
    status.textContent = privacySignal ? 'Private analytics is off because your browser sends a privacy preference.'
      : optedOut ? 'Private analytics is off in this browser.' : 'Private analytics is allowed in this browser.';
    button.disabled = privacySignal;
  }
  if (button) {
    showChoice();
    button.addEventListener('click', () => {
      if (read('optout') === '1') remove('optout');
      else { write('optout', '1'); remove('visitor'); remove('session'); }
      showChoice();
    });
  }

  const path = location.pathname.replace(/\/index\.html$/, '/');
  if (location.origin !== 'https://robbierao.github.io' || !contentPaths.has(path)
      || !endpoint || privacySignal || read('optout') === '1') return;
  try {
    const target = new URL(endpoint);
    if (target.protocol !== 'https:' || !target.hostname.endsWith('.workers.dev') || target.pathname !== '/collect') return;
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    let visitor = read('visitor');
    if (!uuid.test(visitor || '')) { visitor = crypto.randomUUID(); write('visitor', visitor); }
    let session;
    try { session = JSON.parse(read('session')); } catch { /* Start a fresh session. */ }
    const now = Date.now();
    if (!session || !uuid.test(session.id || '') || !Number.isFinite(session.last)
        || now - session.last >= 30 * 60 * 1000 || now < session.last) session = { id: crypto.randomUUID() };
    session.last = now;
    write('session', JSON.stringify(session));
    let referrer = '';
    try { referrer = new URL(document.referrer).origin; } catch { /* Direct or hidden source. */ }
    const event = { event_id: crypto.randomUUID(), visitor_id: visitor, session_id: session.id,
      path, referrer, language: navigator.language || '' };
    fetch(target.href, { method: 'POST', mode: 'cors', credentials: 'omit', keepalive: true,
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(event) }).catch(() => {});
  } catch { /* Analytics must never interfere with the website. */ }
})();
