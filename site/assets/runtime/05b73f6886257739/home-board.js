import {language, t} from './locale.js';

const section = document.querySelector('#home-portfolio');
if (section) {
  const slot = section.querySelector('.home-board-slot');
  const stage = section.querySelector('.home-board-stage');
  const fallback = section.querySelector('.home-board-fallback');
  let frame, visible = false, reading = false;

  function send(payload) {
    frame?.contentWindow?.postMessage({type: 'home-canvas-controls', ...payload}, location.origin);
  }

  function mount() {
    if (frame) return;
    frame = document.createElement('iframe');
    frame.className = 'home-board-frame';
    frame.title = t('Interactive portfolio', '交互作品集');
    frame.setAttribute('allow', 'autoplay');
    stage.open = true;
    stage.append(frame);
    // A lazy iframe navigation must not add a phantom Back step.
    frame.contentWindow.location.replace('/canvas/?embed=home&lang=' + language);
  }

  function showReader(open) {
    if (reading === open) return;
    reading = open;
    stage.close();
    if (open) stage.showModal();
    else stage.open = true;
    document.documentElement.classList.toggle('home-board-reading', open);
    frame.focus({preventScroll: true});
    send({visible: visible || open});
  }

  window.addEventListener('message', event => {
    if (event.origin !== location.origin || !frame || event.source !== frame.contentWindow) return;
    const data = event.data;
    if (data?.type !== 'home-canvas-state') return;
    if (Number.isFinite(data.stripHeight) && data.stripHeight > 0) {
      slot.style.setProperty('--board-strip-height', Math.ceil(data.stripHeight + 2) + 'px');
    }
    if (data.ready) {
      slot.classList.add('is-ready');
      fallback.hidden = true;
      send({language, visible});
    }
    if (data.requestLanguage) send({language});
    if (typeof data.reader === 'boolean') showReader(data.reader);
    if ((data.language === 'en' || data.language === 'zh') && data.language !== language) {
      document.querySelector('.language-toggle')?.click();
    }
  });
  section.querySelector('.home-board-index').addEventListener('click', event => {
    const link = event.target.closest('a[data-board-id]');
    if (!link || !slot.classList.contains('is-ready') || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    event.preventDefault();
    send({project: link.dataset.boardId});
  });
  stage.addEventListener('cancel', event => { event.preventDefault(); send({close: true}); });
  document.addEventListener('languagechange', () => {
    if (frame) frame.title = t('Interactive portfolio', '交互作品集');
    send({language});
  });

  const nearby = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) { nearby.disconnect(); mount(); }
  }, {rootMargin: '180px 0px'});
  const inView = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    send({visible: visible || reading});
  });
  nearby.observe(slot);
  inView.observe(slot);
}
