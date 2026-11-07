// Warm only public same-origin page dependencies. Navigation stays native, so
// browser history, normal links, new tabs and no-JavaScript reading still work.
const embedded = self !== top;
const connection = navigator.connection;
const documents = new Map(), assets = new Map(), queue = [];
let active = 0, paused = false, controller = new AbortController(), intent = 0, idle = 0;
const allowed = () => !embedded && !paused && !document.hidden && !connection?.saveData && navigator.onLine !== false;

function pageURL(anchor) {
  if (!anchor || anchor.download || anchor.target === '_blank') return null;
  if (anchor.closest('[data-canvas-link],#infinite-viewport')) return null;
  const url = new URL(anchor.href, location.href);
  if (url.origin !== location.origin || url.searchParams.has('embed')) return null;
  if (!/^\/(?:$|canvas\/$|cv\/$|(?:research|design|projects)\/[^/]+\/$)/.test(url.pathname)) return null;
  if (url.pathname === location.pathname) return null;
  url.hash = '';
  return url;
}

function pump() {
  while (allowed() && active < 2 && queue.length) {
    const job = queue.shift(); active++;
    job().catch(() => {}).finally(() => { active--; pump(); });
  }
}

function warmAsset(value, base) {
  const url = new URL(value, base);
  if (url.origin !== location.origin || !url.pathname.startsWith('/assets/')) return;
  if (!/\.(css|js)$/.test(url.pathname) || assets.has(url.href)) return;
  assets.set(url.href, true);
  queue.push(async () => {
    try {
      const response = await fetch(url.href, {signal: controller.signal, cache: 'force-cache', priority: 'low'});
      if (!response.ok) throw new Error('prefetch-http');
      await response.arrayBuffer();
    } catch { assets.delete(url.href); }
  });
}

function warm(anchor) {
  if (!allowed()) return;
  const url = pageURL(anchor);
  if (!url || documents.has(url.href) || documents.size >= 6) return;
  documents.set(url.href, true);
  // A new user intent goes ahead of the remaining background asset jobs.
  queue.unshift(async () => {
    try {
      const response = await fetch(url.href, {signal: controller.signal, cache: 'force-cache', priority: 'low'});
      if (!response.ok || !response.headers.get('Content-Type')?.includes('text/html')) throw new Error('prefetch-page');
      // Template contents stay inert, including images/iframes in the fetched
      // page. Only the explicitly selected same-origin dependencies are warmed.
      const template = document.createElement('template');
      template.innerHTML = await response.text();
      const doc = template.content;
      for (const link of doc.querySelectorAll('link[rel="stylesheet"][href]')) warmAsset(link.getAttribute('href'), url);
      // Fetching bytes does not execute these modules against the current DOM.
      for (const script of doc.querySelectorAll('script[type="module"][src]')) warmAsset(script.getAttribute('src'), url);
      document.dispatchEvent(new CustomEvent('page-prefetched', {detail: {url: url.href}}));
    } catch { documents.delete(url.href); }
  });
  pump();
}

function intended(event) {
  const anchor = event.target.closest?.('a[href]');
  clearTimeout(intent);
  if (pageURL(anchor)) intent = setTimeout(() => warm(anchor), event.type === 'pointerdown' ? 0 : 90);
}
function warmPortfolio() {
  clearTimeout(idle);
  if (embedded) return;
  idle = setTimeout(() => warm(document.querySelector('.studio-header a[href^="/canvas/"]')), 700);
}
if (!embedded) {
  for (const name of ['pointerover', 'focusin', 'pointerdown']) document.addEventListener(name, intended, {passive: true});
  document.addEventListener('page-ready', warmPortfolio);
  if (!window.__portfolioLoad?.active) warmPortfolio();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) pump(); });
  addEventListener('pagehide', () => {
    paused = true; clearTimeout(intent); clearTimeout(idle); controller.abort();
    queue.length = 0; documents.clear(); assets.clear();
  });
  addEventListener('pageshow', event => {
    if (event.persisted) { paused = false; controller = new AbortController(); warmPortfolio(); }
  });
}
