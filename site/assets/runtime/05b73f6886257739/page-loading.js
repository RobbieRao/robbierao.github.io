// This optional artwork runs only when a visitor opens it from the footer.
const trigger = document.querySelector('.replay-opening');
const dialog = document.querySelector('#page-loader');
const stage = dialog.querySelector('.page-loader-artwork');
const progress = dialog.querySelector('[role="progressbar"]');
const count = dialog.querySelector('.page-loader-count');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const connection = navigator.connection;
let current;
let fadeTimer;

function update(value) {
  const percent = Math.round(value * 100);
  dialog.style.setProperty('--page-load', String(value));
  progress.setAttribute('aria-valuenow', String(percent));
  count.textContent = String(percent).padStart(2, '0');
}

function close() {
  if (!dialog.open) return;
  clearTimeout(fadeTimer);
  current?.abort();
  current = null;
  document.documentElement.classList.remove('page-preparing');
  dialog.close();
  if (!trigger.hidden) trigger.focus({preventScroll: true});
}

function preferences() {
  trigger.hidden = typeof dialog.showModal !== 'function' || reduced.matches || !!connection?.saveData;
  if (trigger.hidden) close();
}

async function replay() {
  if (current || trigger.hidden) return;
  const controller = new AbortController();
  current = controller;
  delete stage.dataset.ready;
  update(0);
  dialog.classList.remove('is-leaving');
  dialog.showModal();
  document.documentElement.classList.add('page-preparing');
  try {
    const {mountLoadingArtwork} = await import('./loading-artwork.js');
    if (controller.signal.aborted) return;
    await mountLoadingArtwork(stage, {
      signal: controller.signal,
      language: document.documentElement.lang.startsWith('zh') ? 'zh' : 'en',
      onProgress: update,
      onFirstCycleComplete() {
        update(1);
        controller.abort();
        dialog.classList.add('is-leaving');
        fadeTimer = setTimeout(close, 260);
      },
      onUnavailable: close,
    });
  } catch { close(); }
}

trigger.addEventListener('click', replay);
dialog.querySelector('.page-loader-continue').addEventListener('click', close);
dialog.addEventListener('cancel', event => {event.preventDefault(); close();});
addEventListener('pagehide', close);
reduced.addEventListener('change', preferences);
connection?.addEventListener?.('change', preferences);
preferences();
