import {t} from './locale.js';
import {coverURL, readyCoverURL, createCoverScheduler, createPreviewPlayer, prepareMedia} from './media-readiness.js';
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const mobile = matchMedia('(max-width: 700px)');
const connection = navigator.connection;
const toggle = document.querySelector('[data-preview-toggle]');
let paused = reduced.matches || !!connection?.saveData;
let manual = false, preparing = 0, disposed = false, idle = false, idleTimer = 0, scrollFrame = 0;
let movingUntil = 0, settleTimer = 0;
const images = Array.from(document.querySelectorAll('.portfolio-media img'));
for (const image of images) {
  const surface = image.closest('.portfolio-media'), preview = surface?.dataset.preview;
  if (!preview) continue;
  // Keep every preview a single image. More specific legacy background
  // shorthands otherwise reset repeat/size and tile the tiny placeholder.
  Object.assign(surface.style, {backgroundColor: '#fff', backgroundSize: 'contain',
    backgroundPosition: 'center', backgroundRepeat: 'no-repeat'});
  surface.classList.add('has-cover-preview');
  const pending = () => {
    surface.style.backgroundImage = `url("${preview}")`;
    image.classList.add('cover-poster-pending');
  };
  const reveal = async () => {
    try {
      await image.decode();
      if (image.naturalWidth) {
        image.classList.remove('cover-poster-pending');
        // The full image owns the frame now; its white letterbox must not
        // reveal a second, differently scaled copy of the preview behind it.
        surface.style.backgroundImage = 'none';
      }
    } catch { pending(); }
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
  onReady: () => requestSync(),
  onProgress: status => document.dispatchEvent(new CustomEvent('media-background-progress', {detail: {...status, scope: 'home'}})),
});
function inView(element, margin = 0) {
  if (element.closest('[hidden]')) return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && rect.bottom > -margin && rect.top < innerHeight + margin
    && rect.right > -margin && rect.left < innerWidth + margin;
}
function measureVideos() {
  // Read every rectangle once, before source/class mutations in the playback loop.
  for (const item of videos) {
    const rect = item.video.getBoundingClientRect();
    const visible = !item.video.closest('[hidden]') && rect.width > 0 && rect.height > 0;
    item.inView = visible && rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
    item.nearby = visible && rect.bottom > -innerHeight && rect.top < innerHeight * 2
      && rect.right > -innerHeight && rect.left < innerWidth + innerHeight;
    item.distance = Math.abs(rect.top + rect.height / 2 - innerHeight / 2);
  }
}
function candidates() {
  return videos.filter(item => item.visible && item.inView)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, mobile.matches ? 1 : 3);
}
function requestSync() {
  if (!disposed && !scrollFrame) scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; sync(); });
}
function poster(item) { return item.image?.currentSrc || item.image?.src || ''; }
function sync() {
  if (disposed) return;
  const suspended = paused || preparing || window.__portfolioLoad?.active
    || document.documentElement.classList.contains('page-preparing') || document.hidden;
  if (!suspended) measureVideos();
  const chosen = suspended ? [] : candidates();
  const foreground = suspended ? [] : videos.filter(item => item.inView).sort((a, b) => a.distance - b.distance);
  background.update({paused: !!suspended || reduced.matches || !!connection?.saveData,
    cancelActive: reduced.matches || !!connection?.saveData || document.hidden, cancelStale: true,
    defer: mobile.matches && performance.now() < movingUntil,
    visible: (mobile.matches ? foreground.slice(0, 1) : foreground).map(item => item.src),
    nearby: suspended || mobile.matches ? [] : videos.filter(item => item.nearby).map(item => item.src), idle: idle && !mobile.matches});
  for (const item of videos) {
    if (!chosen.includes(item) || !readyCoverURL(item.src)) { item.player.pause(); continue; }
    item.player.setSource(item.src, poster(item)); item.player.play();
  }
  if (toggle) {
    toggle.hidden = !videos.length;
    const pressed = String(paused), label = paused ? t('Play project videos', '播放项目视频') : t('Pause project videos', '暂停项目视频');
    if (toggle.getAttribute('aria-pressed') !== pressed) toggle.setAttribute('aria-pressed', pressed);
    if (toggle.getAttribute('aria-label') !== label) toggle.setAttribute('aria-label', label);
  }
}
const observedVideos = new Map(videos.map(item => [item.video, item]));
const observer = new IntersectionObserver(entries => {
  for (const entry of entries) {
    const item = observedVideos.get(entry.target);
    if (!item) continue;
    clearTimeout(item.dwell); item.dwell = 0;
    if (!entry.isIntersecting || entry.intersectionRatio < 0.2) { item.visible = false; continue; }
    item.dwell = setTimeout(() => { item.dwell = 0; item.visible = true; requestSync(); }, 180);
  }
  requestSync();
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
  movingUntil = performance.now() + 280; clearTimeout(settleTimer);
  settleTimer = setTimeout(() => { settleTimer = 0; requestSync(); }, 290);
  idleTimer = setTimeout(() => { idle = true; sync(); }, 1800);
}
document.addEventListener('page-ready', scheduleIdle);
addEventListener('scroll', () => {
  scheduleIdle();
  requestSync();
}, {passive: true});
addEventListener('pagehide', event => {
  videos.forEach(item => { clearTimeout(item.dwell); item.player.pause(); });
  clearTimeout(idleTimer); cancelAnimationFrame(scrollFrame); scrollFrame = 0;
  clearTimeout(settleTimer); settleTimer = 0;
  background.update({paused: true});
  if (event.persisted) return;
  disposed = true; observer.disconnect();
  background.destroy();
  videos.forEach(item => item.player.destroy());
});
addEventListener('pageshow', () => { scheduleIdle(); sync(); });
sync();
