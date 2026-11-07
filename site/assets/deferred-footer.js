// The footer's renderer is needed only when the reader approaches it.
const footer = document.querySelector('.experimental-footer');
if (footer) {
  // A blocked or unavailable counter must not leave a broken badge in the footer.
  for (const image of footer.querySelectorAll('a.site-counter img')) {
    const counter = image.closest('a.site-counter');
    const hideFailedCounter = () => { counter.hidden = true; };
    image.addEventListener('error', hideFailedCounter, {once: true});
    if (image.complete && !image.naturalWidth) hideFailedCounter();
  }
  // A fixed footer does not give native fragment navigation a flow position.
  // Resolve its anchor before loading the renderer so direct links also wake it.
  function followFooterAnchor() {
    if (location.hash === '#footer' && document.body.classList.contains('studio-home')) {
      requestAnimationFrame(() => scrollTo({top: document.documentElement.scrollHeight, behavior: 'instant'}));
    }
  }
  addEventListener('hashchange', followFooterAnchor);
  addEventListener('load', followFooterAnchor);
  document.fonts.ready.then(followFooterAnchor);
  followFooterAnchor();
  // Desktop reveals a fixed footer behind the page; observe a flow sentinel,
  // since the footer itself geometrically intersects the viewport from the start.
  const sentinel=document.createElement('span');
  sentinel.setAttribute('aria-hidden','true');
  sentinel.style.cssText='display:block;height:1px;pointer-events:none';
  footer.before(sentinel);
  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    observer.disconnect();
    sentinel.remove();
    import('./footer-field.js?v=8046debd6605').catch(() => {
      // Contact links and static footer remain fully usable.
      footer.querySelector('.footer-pause')?.setAttribute('hidden', '');
    });
  }, {rootMargin:'300px'});
  observer.observe(sentinel);
}
