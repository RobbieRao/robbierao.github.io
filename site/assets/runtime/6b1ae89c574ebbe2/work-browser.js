import {t, localize} from './locale.js';

const browser = document.querySelector('#work-browser');
if (browser) {
  const rail = browser.querySelector('.work-filter-rail');
  const result = browser.querySelector('.work-browser-main');
  const status = browser.querySelector('.work-filter-status');
  const buttons = [...rail.querySelectorAll('[data-work-filter]')];
  const cards = [...result.querySelectorAll('.portfolio-card')];
  const sections = [...result.querySelectorAll('#research, #design')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const categories = new Set(buttons.map(button => button.dataset.workFilter));
  const groups = [...result.querySelectorAll('.research-topic')].map(heading => {
    const members = [];
    for (let node = heading.nextElementSibling; node && !node.classList.contains('research-topic'); node = node.nextElementSibling) {
      if (node.classList.contains('portfolio-card')) members.push(node);
    }
    return {heading, cards: members};
  });
  let selected = 'all';
  let animations = [];

  function keepButtonVisible(button) {
    if (rail.scrollWidth <= rail.clientWidth) return;
    const left = button.offsetLeft - (rail.clientWidth - button.offsetWidth) / 2;
    rail.scrollTo({left: Math.max(0, left), behavior: 'instant'});
  }

  function fromURL() {
    const value = new URL(location.href).searchParams.get('work') || 'all';
    return categories.has(value) ? value : 'all';
  }
  function announce() {
    const count = cards.filter(card => !card.hidden).length;
    const button = buttons.find(button => button.dataset.workFilter === selected);
    const label = button.querySelector('.work-filter-label').textContent;
    status.textContent = t(`${label}: ${count} projects shown.`, `${label}：显示 ${count} 个项目。`);
  }
  function targetFromHash(hash = location.hash) {
    if (!hash || hash === '#') return null;
    try { return document.getElementById(decodeURIComponent(hash.slice(1))); } catch { return null; }
  }
  function hiddenTarget(target) {
    return target && browser.contains(target) && (target.hidden || !!target.closest('[hidden]'));
  }
  function updateURL(mode) {
    const url = new URL(location.href);
    if (selected === 'all') url.searchParams.delete('work');
    else url.searchParams.set('work', selected);
    if (hiddenTarget(targetFromHash(url.hash))) url.hash = '';
    if (url.href !== location.href) history[mode === 'push' ? 'pushState' : 'replaceState'](history.state, '', url.pathname + url.search + url.hash);
  }
  function apply(value, {historyMode = '', animate = false, initiated = false} = {}) {
    selected = categories.has(value) ? value : 'all';
    animations.forEach(animation => animation.cancel());
    animations = [];
    const previouslyVisible = new Set(cards.filter(card => !card.hidden));
    cards.forEach(card => {
      card.hidden = selected !== 'all' && !card.dataset.workCategories.split(' ').includes(selected);
    });
    groups.forEach(group => { group.heading.hidden = group.cards.every(card => card.hidden); });
    sections.forEach(section => { section.hidden = [...section.querySelectorAll('.portfolio-card')].every(card => card.hidden); });
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.workFilter === selected)));
    keepButtonVisible(buttons.find(button => button.dataset.workFilter === selected));
    browser.dataset.workFilter = selected;
    if (historyMode) updateURL(historyMode);
    announce();
    if (initiated) {
      // A short result set can leave a reader below all results after a deep
      // scroll. Bring the same filter controls and their results into view;
      // keyboard focus stays on the button the reader used.
      const bounds = result.getBoundingClientRect();
      if (bounds.bottom < 180 || bounds.top < -innerHeight * .8) {
        scrollTo({top: Math.max(0, scrollY + browser.getBoundingClientRect().top - 88), behavior: 'instant'});
      }
    }
    if (animate && !reduced.matches) {
      cards.filter(card => !card.hidden && !previouslyVisible.has(card)).forEach((card, index) => {
        animations.push(card.animate([{opacity: 0, transform: 'translateY(7px)'}, {opacity: 1, transform: 'translateY(0)'}], {
          duration: 230, delay: Math.min(index * 18, 100), easing: 'cubic-bezier(.2,.7,.2,1)',
        }));
      });
    }
    document.dispatchEvent(new CustomEvent('workfilterchange', {detail: {filter: selected}}));
  }
  buttons.forEach((button, index) => {
    button.addEventListener('click', () => apply(button.dataset.workFilter, {historyMode: 'push', animate: true, initiated: true}));
    button.addEventListener('keydown', event => {
      const movement = {ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1}[event.key];
      if (!movement && event.key !== 'Home' && event.key !== 'End') return;
      event.preventDefault();
      const target = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + movement + buttons.length) % buttons.length;
      buttons[target].focus({preventScroll: true});
      keepButtonVisible(buttons[target]);
    });
  });
  function revealHash() {
    if (hiddenTarget(targetFromHash())) apply('all', {historyMode: 'replace'});
  }
  // Top-level section navigation and incoming project anchors must never
  // lead to a section hidden by a previous filter.
  document.addEventListener('click', event => {
    const anchor = event.target.closest('a[href]');
    if (!anchor) return;
    const url = new URL(anchor.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname) return;
    if (hiddenTarget(targetFromHash(url.hash))) apply('all', {historyMode: 'replace'});
  }, true);
  addEventListener('popstate', () => { apply(fromURL()); revealHash(); });
  addEventListener('hashchange', revealHash);
  document.addEventListener('languagechange', () => {
    announce();
    keepButtonVisible(buttons.find(button => button.dataset.workFilter === selected));
  });
  localize(rail);
  rail.hidden = false;
  browser.dataset.ready = 'true';
  apply(fromURL());
  revealHash();
  // Native fragment navigation can run before filtering changes the section
  // heights. Re-align the same incoming anchor after that layout is settled.
  const incomingHash = location.hash;
  const incomingTarget = targetFromHash(incomingHash);
  if (incomingTarget && browser.contains(incomingTarget)) {
    const alignIncoming = () => requestAnimationFrame(() => {
      if (location.hash === incomingHash && !hiddenTarget(incomingTarget)) {
        incomingTarget.scrollIntoView({block: 'start', behavior: 'instant'});
      }
    });
    if (document.readyState === 'complete') alignIncoming();
    else addEventListener('load', alignIncoming, {once: true});
  }
  new ResizeObserver(() => {
    keepButtonVisible(buttons.find(button => button.dataset.workFilter === selected));
  }).observe(rail);
}
