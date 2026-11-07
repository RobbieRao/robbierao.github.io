import {t} from './locale.js?v=8046debd6605';
import {coverURL, readyCoverURL, createCoverScheduler, createPreviewPlayer, prepareMedia} from './media-readiness.js?v=8046debd6605';
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const mobile = matchMedia('(max-width: 700px)');
const connection = navigator.connection;
const toggle = document.querySelector('[data-preview-toggle]');
let paused = reduced.matches || !!connection?.saveData;
let manual = false, preparing = 0, disposed = false, idle = false, idleTimer = 0, scrollFrame = 0;
const images = Array.from(document.querySelectorAll('.portfolio-media img'));
for (const image of images) {
  const surface = image.closest('.portfolio-media'), preview = surface?.dataset.preview;
  if (!preview) continue;
  surface.style.backgroundImage = `url("${preview}")`;
  surface.classList.add('has-cover-preview');
  const pending = () => image.classList.add('cover-poster-pending');
  const reveal = async () => {
    try { await image.decode(); if (image.naturalWidth) image.classList.remove('cover-poster-pending'); } catch { pending(); }
  };
  pending(); image.addEventListener('load', reveal); image.addEventListener('error', pending);
  if (image.complete && image.naturalWidth) void reveal();
}
const videos = Array.from(document.querySelectorAll('.work-video'), video => {
  const image = video.closest('.work-media')?.querySelector('img');
  return {video, image, visible: false, dwell: 0,
    src: coverURL(video.dataset.src, video.dataset.version),
    bytes: Number(video.dataset.bytes) || 0,
    player: createPreviewPlayer(video, {readyClass: 'is-playing'})};
});
const background = createCoverScheduler({sources: videos.map(item => ({src: item.src, bytes: item.bytes})),
  onReady: () => sync(),
  onProgress: status => document.dispatchEvent(new CustomEvent('media-background-progress', {detail: {...status, scope: 'home'}})),
});
function inView(element, margin = 0) {
  if (element.closest('[hidden]')) return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && rect.bottom > -margin && rect.top < innerHeight + margin
    && rect.right > -margin && rect.left < innerWidth + margin;
}
function candidates(initial = false) {
  return videos.filter(item => (initial || item.visible) && inView(item.video))
    .sort((a, b) => Math.abs(a.video.getBoundingClientRect().top - innerHeight / 2)
      - Math.abs(b.video.getBoundingClientRect().top - innerHeight / 2))
    .slice(0, mobile.matches ? 1 : 3);
}
function poster(item) { return item.image?.currentSrc || item.image?.src || ''; }
function sync() {
  if (disposed) return;
  const suspended = paused || preparing || window.__portfolioLoad?.active
    || document.documentElement.classList.contains('page-preparing') || document.hidden;
  const chosen = suspended ? [] : candidates();
  background.update({paused: !!suspended || reduced.matches || !!connection?.saveData,
    cancelActive: reduced.matches || !!connection?.saveData,
    visible: videos.filter(item => inView(item.video)).map(item => item.src),
    nearby: videos.filter(item => inView(item.video, innerHeight)).map(item => item.src), idle});
  for (const item of videos) {
    if (!chosen.includes(item) || !readyCoverURL(item.src)) { item.player.pause(); continue; }
    item.player.setSource(item.src, poster(item)); item.player.play();
  }
  if (toggle) {
    toggle.hidden = !videos.length;
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.setAttribute('aria-label', paused ? t('Play project videos', '播放项目视频') : t('Pause project videos', '暂停项目视频'));
  }
}
const observer = new IntersectionObserver(entries => {
  for (const entry of entries) {
    const item = videos.find(item => item.video === entry.target);
    if (!item) continue;
    clearTimeout(item.dwell); item.dwell = 0;
    if (!entry.isIntersecting || entry.intersectionRatio < 0.2) { item.visible = false; continue; }
    item.dwell = setTimeout(() => { item.dwell = 0; item.visible = true; sync(); }, 180);
  }
  sync();
}, {threshold: 0.2});
for (const item of videos) observer.observe(item.video);

/** Only the current viewport is a prerequisite for entry; clips prepare afterwards. */
export async function prepareWorkMedia({signal, onProgress} = {}) {
  preparing++; sync();
  try {
    return await prepareMedia({signal, onProgress,
      images: images.filter(image => inView(image)).map(image => image.currentSrc || image.src),
    });
  } finally { preparing--; sync(); }
}

toggle?.addEventListener('click', () => { manual = true; paused = !paused; sync(); });
function preferences() { if (!manual) paused = reduced.matches || !!connection?.saveData; sync(); }
reduced.addEventListener('change', preferences);
connection?.addEventListener?.('change', preferences);
mobile.addEventListener('change', sync);
for (const name of ['visibilitychange', 'languagechange', 'workfilterchange', 'page-ready']) document.addEventListener(name, sync);
function scheduleIdle() {
  idle = false; clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { idle = true; sync(); }, 1800);
}
document.addEventListener('page-ready', scheduleIdle);
addEventListener('scroll', () => {
  scheduleIdle();
  if (!scrollFrame) scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; sync(); });
}, {passive: true});
addEventListener('pagehide', event => {
  videos.forEach(item => { clearTimeout(item.dwell); item.player.pause(); });
  clearTimeout(idleTimer); cancelAnimationFrame(scrollFrame); scrollFrame = 0;
  background.update({paused: true});
  if (event.persisted) return;
  disposed = true; observer.disconnect();
  background.destroy();
  videos.forEach(item => item.player.destroy());
});
addEventListener('pageshow', () => { scheduleIdle(); sync(); });
sync();
