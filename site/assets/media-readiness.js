// Only the short, public cover clips registered by a page are fetched here.
// Detail-page films are never discovered or downloaded by this module.
const CACHE_NAME = 'portfolio-covers-v1';
const covers = new Map(), posters = new Map(), queue = [];
let downloads = 0, cachePromise;
const aborted = () => new DOMException('Media preparation stopped', 'AbortError');

export function coverURL(source, version) {
  const url = new URL(source, location.href);
  if (version) url.searchParams.set('v', version);
  url.hash = '';
  return url.href;
}

function cacheable(url) {
  const parsed = new URL(url);
  return parsed.origin === location.origin && parsed.pathname.startsWith('/videos/')
    && /\.(mp4|webm)$/i.test(parsed.pathname) && /^[a-f\d]{8,64}$/i.test(parsed.searchParams.get('v') || '');
}

function coverCache() {
  if (!cachePromise) cachePromise = globalThis.caches?.open(CACHE_NAME).catch(() => null) || Promise.resolve(null);
  return cachePromise;
}

function recordFor(source) {
  const url = coverURL(source.src, source.version);
  let record = covers.get(url);
  if (!record) {
    record = {url, expected: Number(source.bytes) || 0, bytes: Number(source.bytes) || 0, loaded: 0, objectURL: '', task: null};
    covers.set(url, record);
  } else if (!record.expected && source.bytes) record.expected = record.bytes = Number(source.bytes);
  return record;
}

export function preparedCoverURL(source, version) {
  const url = coverURL(source, version);
  return covers.get(url)?.objectURL || url;
}

export function readyCoverURL(source, version) {
  return covers.get(coverURL(source, version))?.objectURL || '';
}

function pump() {
  while (downloads < 2 && queue.length) {
    queue.sort((a, b) => a.priority - b.priority);
    const task = queue.shift();
    task.started = true;
    downloads++;
    task.run().then(task.resolve, task.reject).finally(() => { downloads--; pump(); });
  }
}

async function download(record, signal, report, ignoreCache = false) {
  if (signal.aborted) throw aborted();
  const cache = cacheable(record.url) ? await coverCache() : null;
  let response;
  try { if (!ignoreCache) response = await cache?.match(record.url); } catch { /* Storage is optional. */ }
  if (signal.aborted) throw aborted();
  const fromCache = !!response;
  if (!response) response = await fetch(record.url, {signal, credentials: 'omit', cache: ignoreCache ? 'reload' : 'force-cache'});
  if (!response.ok) throw new Error('cover-http-' + response.status);
  const contentType = response.headers.get('Content-Type') || 'video/mp4';
  if (contentType.includes('text/html')) throw new Error('cover-not-video');
  const length = Number(response.headers.get('Content-Length'));
  if (length > 0 && !record.expected) record.bytes = length;
  record.loaded = 0; report();
  const chunks = [];
  if (response.body?.getReader) {
    const reader = response.body.getReader();
    const cancel = () => { void reader.cancel().catch(() => {}); };
    signal.addEventListener('abort', cancel, {once: true});
    try {
      while (true) {
        if (signal.aborted) throw aborted();
        const {done, value} = await reader.read();
        if (signal.aborted) throw aborted();
        if (done) break;
        chunks.push(value); record.loaded += value.byteLength; report();
      }
    } finally { signal.removeEventListener('abort', cancel); reader.releaseLock(); }
  } else {
    const bytes = await response.arrayBuffer();
    if (signal.aborted) throw aborted();
    chunks.push(bytes); record.loaded = bytes.byteLength;
  }
  const blob = new Blob(chunks, {type: contentType});
  if (signal.aborted) throw aborted();
  if (!blob.size || (record.expected && blob.size !== record.expected)) {
    record.loaded = 0; report();
    if (fromCache) {
      try { await cache.delete(record.url); } catch { /* Retry the public source even when storage is unavailable. */ }
      return download(record, signal, report, true);
    }
    throw new Error(blob.size ? 'cover-size-mismatch' : 'cover-empty');
  }
  record.loaded = record.bytes = blob.size;
  record.objectURL = URL.createObjectURL(blob);
  report();
  if (cache && !fromCache) {
    try {
      await cache.put(record.url, new Response(blob, {headers: {
        'Content-Type': contentType, 'Content-Length': String(blob.size),
      }}));
      // Delete superseded hashes for this file in our cache only.
      const current = new URL(record.url);
      for (const request of await cache.keys()) {
        const old = new URL(request.url);
        if (cacheable(request.url) && old.pathname === current.pathname && old.href !== current.href) await cache.delete(request);
      }
    } catch { /* The prepared in-memory blob remains usable without CacheStorage. */ }
  }
  return record;
}

function acquire(record, {signal, onProgress, priority = 0}) {
  if (signal?.aborted) return Promise.reject(aborted());
  if (record.objectURL) { onProgress?.(); return Promise.resolve(record); }
  if (record.task?.controller.signal.aborted) record.task = null;
  if (!record.task) {
    const controller = new AbortController(), subscribers = new Set();
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    const task = {controller, subscribers, promise, resolve, reject, priority,
      run: () => download(record, controller.signal, () => subscribers.forEach(callback => callback()))};
    record.task = task;
    promise.finally(() => { if (record.task === task) record.task = null; }).catch(() => {});
    queue.push(task);
    // Attach the first consumer before starting the two-download queue.
    queueMicrotask(pump);
  }
  const task = record.task;
  task.priority = Math.min(task.priority, priority);
  return new Promise((resolve, reject) => {
    let finished = false;
    const progress = () => onProgress?.();
    task.subscribers.add(progress);
    const cleanup = () => { task.subscribers.delete(progress); signal?.removeEventListener('abort', cancel); };
    const cancel = () => {
      if (finished) return;
      finished = true; cleanup();
      if (!task.subscribers.size && !record.objectURL) task.controller.abort();
      reject(aborted());
    };
    signal?.addEventListener('abort', cancel, {once: true});
    task.promise.then(value => {
      if (finished) return; finished = true; cleanup(); resolve(value);
    }, error => { if (finished) return; finished = true; cleanup(); reject(error); });
    progress();
  });
}

/** The page supplies visibility; queued foreground work passes idle prefetches. */
export function createCoverScheduler({sources = [], onReady = () => {}, onProgress = () => {}} = {}) {
  const records = [...new Map(sources.map(source => { const record = recordFor(source); return [record.url, record]; })).values()];
  const pending = new Map(), failed = new Map();
  let disposed = false, reportTimer = 0, lastReport = 0;
  function reportNow() {
    reportTimer = 0; lastReport = performance.now();
    const bytesTotal = records.reduce((sum, record) => sum + (record.expected || record.bytes || 65536), 0);
    const bytesLoaded = records.reduce((sum, record) => sum + Math.min(record.loaded, record.expected || record.bytes || 65536), 0);
    onProgress({ratio: bytesTotal ? bytesLoaded / bytesTotal : 1,
      ready: records.filter(record => record.objectURL).length, total: records.length, failed: failed.size,
      bytesLoaded, bytesTotal, images: 0, videos: records.length, decoders: 0});
  }
  function report() {
    if (disposed) return;
    if (performance.now() - lastReport >= 120) reportNow();
    else if (!reportTimer) reportTimer = setTimeout(reportNow, 120 - (performance.now() - lastReport));
  }
  function update({visible = [], nearby = [], paused = false, idle = false, cancelActive = false} = {}) {
    if (disposed) return;
    const foreground = new Set(visible.map(url => coverURL(url))), neighbors = new Set(nearby.map(url => coverURL(url)));
    for (const record of records) {
      const priority = paused ? 3 : foreground.has(record.url) ? 0 : neighbors.has(record.url) ? 1 : idle ? 2 : 3;
      let job = pending.get(record.url);
      if (job?.controller.signal.aborted) { pending.delete(record.url); job = null; }
      if (priority === 3) {
        if (job && (cancelActive || !record.task?.started)) job.controller.abort();
        continue;
      }
      if (record.objectURL) continue;
      if (job) { if (record.task) record.task.priority = priority; continue; }
      if ((failed.get(record.url) || 0) > Date.now()) continue;
      const controller = new AbortController(); job = {controller}; pending.set(record.url, job);
      acquire(record, {signal: controller.signal, priority, onProgress: report}).then(() => {
        if (disposed || controller.signal.aborted) return;
        failed.delete(record.url); onReady(record.url);
      }, error => {
        if (error.name !== 'AbortError') failed.set(record.url, Date.now() + 30000);
      }).finally(() => { if (pending.get(record.url) === job) pending.delete(record.url); if (!disposed) report(); });
    }
    report();
  }
  function destroy() { disposed = true; clearTimeout(reportTimer); for (const job of pending.values()) job.controller.abort(); pending.clear(); }
  return {update, destroy};
}

function cancelable(promise, signal) {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(aborted());
  return new Promise((resolve, reject) => {
    const cancel = () => { cleanup(); reject(aborted()); };
    const cleanup = () => signal.removeEventListener('abort', cancel);
    signal.addEventListener('abort', cancel, {once: true});
    promise.then(value => { cleanup(); resolve(value); }, error => { cleanup(); reject(error); });
  });
}

export function decodePoster(source, {signal} = {}) {
  const url = new URL(source, location.href).href;
  if (!posters.has(url)) {
    const image = new Image(); image.decoding = 'async';
    const promise = new Promise((resolve, reject) => {
      image.onload = async () => {
        try { await image.decode(); resolve(image); } catch (error) { reject(error); }
      };
      image.onerror = () => reject(new Error('poster-unavailable'));
      image.src = url;
    });
    posters.set(url, promise);
    promise.catch(() => { if (posters.get(url) === promise) posters.delete(url); });
  }
  return cancelable(posters.get(url), signal);
}

/** Keep the poster visible until a frame from the current source is presented. */
export function createPreviewPlayer(video, {readyClass = 'is-ready'} = {}) {
  let source = '', address = '', generation = 0, frameRequest = 0, firstPaint = 0, secondPaint = 0;
  let started = false, disposed = false, pendingPlay = null;
  const listeners = [];
  video.muted = video.defaultMuted = true; video.playsInline = true;
  function listen(name, callback) { video.addEventListener(name, callback); listeners.push([name, callback]); }
  function cancelFrame() {
    if (frameRequest) video.cancelVideoFrameCallback?.(frameRequest);
    cancelAnimationFrame(firstPaint); cancelAnimationFrame(secondPaint);
    frameRequest = firstPaint = secondPaint = 0;
  }
  function hide(state = 'poster') {
    cancelFrame(); started = false;
    video.classList.remove(readyClass); video.dataset.frameReady = 'false'; video.dataset.mediaState = state;
  }
  function current() {
    return !disposed && !!address && video.currentSrc === address && video.readyState >= 2
      && video.videoWidth > 0 && video.videoHeight > 0;
  }
  function reveal() {
    if (current() && started && !video.paused && !video.ended) {
      video.classList.add(readyClass); video.dataset.frameReady = 'true'; video.dataset.mediaState = 'playing';
    }
  }
  function frame() {
    if (disposed || !started || video.paused || frameRequest || firstPaint || secondPaint) return;
    const token = generation;
    if (video.requestVideoFrameCallback) {
      frameRequest = video.requestVideoFrameCallback(() => {
        frameRequest = 0; if (generation === token) reveal();
      });
    } else {
      firstPaint = requestAnimationFrame(() => {
        firstPaint = 0;
        secondPaint = requestAnimationFrame(() => { secondPaint = 0; if (generation === token) reveal(); });
      });
    }
  }
  listen('playing', () => { started = true; frame(); });
  listen('seeked', () => { if (!video.paused) { started = true; frame(); } });
  listen('pause', () => { if (video.paused) hide('pause'); });
  listen('waiting', () => {
    hide('waiting');
    // A queued waiting event can arrive after canplay/playing on a rebound slot.
    if (current() && video.readyState >= 3 && !video.paused) { started = true; frame(); }
  });
  listen('canplay', () => { if (current() && !video.paused) { started = true; frame(); } });
  for (const name of ['seeking', 'emptied', 'loadstart', 'error']) listen(name, () => hide(name));
  listen('stalled', () => { if (video.readyState < 3) hide('waiting'); });

  function setSource(url, poster) {
    const canonical = coverURL(url);
    if (source === canonical && video.getAttribute('src')) return;
    generation++; pendingPlay = null; video.pause(); hide('loading');
    source = canonical; address = preparedCoverURL(canonical);
    if (poster) video.poster = poster;
    video.dataset.coverSource = source;
    video.preload = 'auto'; video.src = address; video.load();
    video.dispatchEvent(new Event('preview-sourcechange'));
  }
  function play() {
    if (disposed || !source || pendingPlay) return;
    if (!video.paused) { if (started) frame(); return; }
    const token = generation;
    pendingPlay = video.play();
    pendingPlay?.then(() => {
      if (generation !== token || disposed) return;
      pendingPlay = null; started = true; frame();
    }, () => { if (generation === token) { pendingPlay = null; hide('poster'); } });
  }
  function pause() { video.pause(); hide(); }
  function prepare({signal, timeout = 15000} = {}) {
    const token = generation;
    return new Promise((resolve, reject) => {
      const events = ['loadeddata', 'canplay', 'progress', 'loadedmetadata'];
      let timer;
      const cleanup = () => {
        clearTimeout(timer); signal?.removeEventListener('abort', cancel);
        events.forEach(name => video.removeEventListener(name, check));
        video.removeEventListener('error', failure); video.removeEventListener('preview-sourcechange', changed);
      };
      const success = () => { cleanup(); resolve(); };
      const cancel = () => { cleanup(); reject(aborted()); };
      const failure = () => { cleanup(); reject(new Error('cover-decode-failed')); };
      const changed = () => { if (generation !== token) { cleanup(); reject(new Error('cover-source-changed')); } };
      const check = () => {
        if (generation !== token) { changed(); return; }
        if (current() && video.readyState >= 3) success();
      };
      if (signal?.aborted) { cancel(); return; }
      signal?.addEventListener('abort', cancel, {once: true});
      events.forEach(name => video.addEventListener(name, check));
      video.addEventListener('error', failure); video.addEventListener('preview-sourcechange', changed);
      timer = setTimeout(failure, timeout);
      if (video.error) failure(); else check();
    });
  }
  function destroy() {
    if (disposed) return;
    pause(); disposed = true; generation++;
    video.dispatchEvent(new Event('preview-sourcechange'));
    listeners.forEach(([name, callback]) => video.removeEventListener(name, callback));
    video.removeAttribute('src'); video.load();
  }
  return {video, setSource, play, pause, prepare, destroy, get source() { return source; }};
}

/** Download complete short covers, decode posters, then prime only visible players. */
export async function prepareMedia({images = [], sources = [], players = [], signal, onProgress = () => {}} = {}) {
  const imageURLs = [...new Set(images.filter(Boolean))];
  const records = [...new Map(sources.map(source => { const record = recordFor(source); return [record.url, record]; })).values()];
  const status = {ratio: 0, ready: 0, total: imageURLs.length + records.length + players.length,
    failed: 0, bytesLoaded: 0, bytesTotal: 0, images: imageURLs.length, videos: records.length, decoders: players.length};
  const decodeWeight = 16384;
  let imageReady = 0, decoderReady = 0;
  function report() {
    status.bytesLoaded = records.reduce((sum, record) => sum + record.loaded, 0);
    status.bytesTotal = records.reduce((sum, record) => sum + Math.max(record.bytes, record.loaded), 0);
    const transfer = records.reduce((sum, record) => sum + Math.min(record.loaded, record.expected || record.bytes || 65536), 0);
    const budget = records.reduce((sum, record) => sum + (record.expected || record.bytes || 65536), 0)
      + (imageURLs.length + players.length) * decodeWeight;
    status.ratio = budget ? (transfer + (imageReady + decoderReady) * decodeWeight) / budget : 1;
    onProgress({...status});
  }
  report();
  let next = 0;
  const imageWorker = async () => {
    while (next < imageURLs.length) {
      if (signal?.aborted) throw aborted();
      const url = imageURLs[next++];
      try { await decodePoster(url, {signal}); status.ready++; imageReady++; }
      catch (error) { if (signal?.aborted) throw error; status.failed++; }
      report();
    }
  };
  await Promise.all([
    ...Array.from({length: Math.min(4, imageURLs.length)}, imageWorker),
    ...records.map(async record => {
      try { await acquire(record, {signal, onProgress: report}); status.ready++; }
      catch (error) { if (signal?.aborted) throw error; status.failed++; }
      report();
    }),
  ]);
  if (signal?.aborted) throw aborted();
  await Promise.all(players.map(async item => {
    try {
      item.player.setSource(item.src, item.poster);
      await item.player.prepare({signal}); status.ready++; decoderReady++;
    } catch (error) { if (signal?.aborted) throw error; status.failed++; }
    report();
  }));
  report();
  return {...status};
}

addEventListener('pagehide', event => {
  if (event.persisted) return;
  for (const record of covers.values()) {
    record.task?.controller.abort();
    if (record.objectURL) URL.revokeObjectURL(record.objectURL);
  }
  covers.clear(); posters.clear();
});
