// The canonical notebook also serves the Canvas reader, without a second content copy.
if (document.documentElement.classList.contains('notebook-embedded') && window.parent !== window) {
  const send = data => window.parent.postMessage(data, location.origin);
  const paused = new Set();
  let positionTimer = 0;
  function position() {
    clearTimeout(positionTimer);
    positionTimer = setTimeout(() => send({type:'canvas-notebook-position', y:scrollY, entry:location.hash.slice(1)}), 160);
  }
  window.addEventListener('scroll', position, {passive:true});
  window.addEventListener('hashchange', () => {
    send({type:'canvas-notebook-anchor', entry:location.hash.slice(1)});
    position();
  });
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== window.parent) return;
    const data = event.data || {};
    if (data.type === 'canvas-notebook-pause') {
      for (const video of document.querySelectorAll('video')) {
        if (!video.paused) paused.add(video);
        video.pause();
      }
    }
    if (data.type === 'canvas-notebook-resume') {
      for (const video of paused) video.play().catch(() => {});
      paused.clear();
    }
    if (data.type === 'canvas-notebook-restore' && Number.isFinite(data.y)) scrollTo({top:data.y,behavior:'instant'});
  });
  document.addEventListener('keydown', event => {
    // Let the native image viewer consume its own Escape first.
    if (event.key === 'Escape' && !document.querySelector('dialog[open]')) {
      event.preventDefault(); send({type:'canvas-notebook-close'});
    }
  }, {capture:true});
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const url = new URL(link.href, location.href);
    if (url.origin === location.origin && url.pathname === location.pathname) {
      // Locale adds query strings to anchors; keep chapter navigation in this document.
      if (url.hash) {
        event.preventDefault();
        history.replaceState(null, '', location.pathname + location.search + url.hash);
        let target;
        try {target = document.getElementById(decodeURIComponent(url.hash.slice(1)));} catch {}
        target?.scrollIntoView({block:'start', behavior:'instant'});
        send({type:'canvas-notebook-anchor', entry:url.hash.slice(1)});
        position();
      }
      return;
    }
    if (/\.(?:webp|png|jpe?g|svg|gif)$/i.test(url.pathname)) return;
    // Papers, source code and project sites should not replace the notebook reader.
    if (url.protocol === 'https:' || url.protocol === 'http:') {
      link.target = '_blank'; link.rel = 'noopener';
    }
  });
  requestAnimationFrame(() => {
    send({type:'canvas-notebook-ready', path:location.pathname});
    if (location.hash) {
      try {document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();} catch {}
    }
  });
}
