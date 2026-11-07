import {t, localize, language} from './locale.js?v=8046debd6605';
import {coverURL, readyCoverURL, decodePoster, createCoverScheduler, createPreviewPlayer, prepareMedia} from './media-readiness.js?v=8046debd6605';
const viewport = document.querySelector('#infinite-viewport');
let prepareCanvas = options => prepareMedia(options);
export function prepareCanvasMedia(options = {}) { return prepareCanvas(options); }
if (viewport) {
  const items = JSON.parse(document.querySelector('#canvas-content').textContent);
  const stage = document.querySelector('.canvas-world'), panel = document.querySelector('.canvas-detail');
  const readerTemplate = panel.querySelector('.canvas-reader-frame');
  const readerStatus = panel.querySelector('.canvas-reader-status');
  const storageKey = 'portfolio-canvas-view-v1:' + location.pathname;
  let savedView = null;
  try { savedView = JSON.parse(sessionStorage.getItem(storageKey) || 'null'); } catch {}
  const validView = value => value?.version === 1 && ['x', 'y', 'zoom', 'scrollY'].every(key => Number.isFinite(value[key]));
  const initialView = validView(history.state?.canvasView) ? history.state.canvasView : validView(savedView) ? savedView : null;
  const readPositions = new Map(Object.entries(savedView?.readPositions || {}));
  for (const [key, position] of Object.entries(initialView?.readPositions || {})) {
    if ((position.updatedAt || 0) >= (readPositions.get(key)?.updatedAt || 0)) readPositions.set(key, position);
  }
  const readers = new Map();
  const warmDocuments = new Set();
  let warmController = null;
  let activeReader = null, warmTimer = 0, persistTimer = 0, openingFromHistory = false, hoverProject = null;
  const motionPool = [];
  const fullPosters = new Set(), posterJobs = new Map(), posterFailures = new Set();
  let mediaIdle = false, mediaIdleTimer = 0;
  let mediaTick = 0, mediaTimer = 0, mediaScrollFrame = 0, mediaPreparing = 0, mediaDisposed = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = matchMedia('(pointer: coarse)');
  const mobile = matchMedia('(max-width: 700px)');
  const world = {width: 1940, height: Math.ceil(items.length / 4) * 390};
  const pan = {x: 0, y: 0}, goal = {x: 0, y: 0}, velocity = {x: 0, y: 0};
  let zoom = 1, zoomGoal = 1, width = 1, height = 1, raf = 0, last = 0, pointer = null, blockClickUntil = 0, active = null, returnFocus = null;
  const placements = [], buttons = [];
  const mobileVisible = new Set();
  const wrap = (v, period) => ((v + period / 2) % period + period) % period - period / 2;

  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const ratio = Math.min(2.05, Math.max(.85, item.rotate ? item.height / item.width : item.width / item.height));
    const cardWidth = index % 4 === 0 ? 380 : index % 4 === 2 ? 335 : 300;
    const cardHeight = Math.min(300, cardWidth / ratio);
    const baseX = (index % 4) * 485 + (index % 3 - 1) * 35;
    const baseY = Math.floor(index / 4) * 390 + (index % 2) * 45;
    for (let copy = 0; copy < 4; copy++) {
      const button = document.createElement('button'); button.className = 'canvas-card'; button.tabIndex = -1;
      button.dataset.project = item.id; button.dataset.copy = String(copy); button.setAttribute('aria-hidden', 'true');
      const image = document.createElement('img'); image.src = item.preview || posterURL(item); image.alt = ''; image.draggable = false; image.loading='lazy'; image.decoding='async'; image.width = item.width; image.height = item.height;
      image.className = 'canvas-poster';
      if (item.rotate && !item.preview) image.classList.add('canvas-image-rotated');
      const media = document.createElement('span'); media.className = 'canvas-card-media'; media.style.height = `${cardHeight}px`; media.append(image);
      if (item.preview) { media.style.backgroundImage = `url("${item.preview}")`; media.classList.add('has-cover-preview'); }
      image.addEventListener('error', () => { image.classList.add('cover-poster-pending'); image.classList.remove('canvas-image-rotated'); });
      const caption = document.createElement('span'); caption.className = 'canvas-card-caption';
      caption.innerHTML = `<span class="canvas-card-name"></span><span class="canvas-card-year">${item.year}</span><span class="canvas-plus" aria-hidden="true">↗</span>`;
      button.append(media, caption); button.style.width = `${cardWidth}px`; stage.append(button);
      button.addEventListener('click', () => {if (performance.now() > blockClickUntil) open(item.id, button);});
      button.addEventListener('pointerenter', () => {hoverProject = item.id; reconcileMedia(true); warmReader(item);});
      button.addEventListener('pointerleave', () => {hoverProject = null; clearTimeout(warmTimer); reconcileMedia(true);});
      button.addEventListener('focus', () => warmReader(item));
      placements.push({button, media, image, item, visible:false, inView:false, width: cardWidth, height: cardHeight + 40, x: baseX + (copy % 2) * world.width, y: baseY + Math.floor(copy / 2) * world.height, copy});
    }
    const indexButton = document.querySelector(`[data-canvas-link="${item.id}"]`);
    indexButton?.addEventListener('click', event => {if(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); open(item.id, indexButton);});
    indexButton?.addEventListener('pointerenter', () => warmReader(item));
    indexButton?.addEventListener('pointerleave', () => clearTimeout(warmTimer));
    indexButton?.addEventListener('focus', () => warmReader(item));
    buttons.push(indexButton);
  }

  function title(item) {return item.title[language] || item.title.en;}
  function snapshot() {
    return {version: 1, x: pan.x, y: pan.y, zoom, scrollY: Math.max(0, scrollY),
      readPositions: Object.fromEntries(readPositions)};
  }
  function persistView() {
    clearTimeout(persistTimer); persistTimer = 0;
    const view = snapshot();
    try { sessionStorage.setItem(storageKey, JSON.stringify(view)); } catch {}
    history.replaceState({...history.state, canvasView: view}, '', location.href);
  }
  function queuePersist() {
    clearTimeout(persistTimer); persistTimer = setTimeout(persistView, 220);
  }
  function restoreView(view, restoreScroll = true) {
    if (!validView(view)) return;
    cancelAnimationFrame(raf); raf = 0; velocity.x = velocity.y = 0;
    pan.x = goal.x = view.x; pan.y = goal.y = view.y;
    zoom = zoomGoal = Math.max(.65, Math.min(1.45, view.zoom));
    render();
    if (restoreScroll && mobile.matches) scrollTo({top: view.scrollY, behavior: 'instant'});
  }
  function rememberReader(record = activeReader) {
    if (!record?.ready || record.frame.hidden) return;
    try {
      const frame = record.frame.contentWindow;
      readPositions.set(record.key, {y: Math.max(0, frame.scrollY), entry: frame.location.hash.slice(1), updatedAt: Date.now()});
    } catch {}
  }
  function pauseReader(record) {
    if (!record) return;
    rememberReader(record);
    record.frame.contentWindow?.postMessage({type:'canvas-notebook-pause'}, location.origin);
    // Stop immediately; the child also maintains its own resume bookkeeping.
    try { record.frame.contentDocument?.querySelectorAll('video,audio').forEach(media => {
      if (!media.paused) record.playing.add(media);
      media.pause();
    }); } catch {}
  }
  function syncLanguage() {
    placements.forEach(p => {p.button.querySelector('.canvas-card-name').textContent = title(p.item);});
    buttons.forEach((button, index) => {if (button) button.querySelector('.canvas-index-name').textContent = title(items[index]);});
    if (active) fillPanel(items.find(item => item.id === active), new URLSearchParams(location.hash.slice(1)).get('entry') || '');
    document.querySelector('.canvas-live').textContent = t('Drag in any direction. Select a project to read its notebook.', '向任意方向拖动，选择作品阅读完整手记。');
    queuePersist();
  }
  function readerHref(item) {
    const url = new URL(item.href, location.origin);
    url.searchParams.set('embed', 'canvas');
    if (item.notebookVersion) url.searchParams.set('v', item.notebookVersion);
    url.searchParams.set('lang', language);
    url.hash = '';
    return url.pathname + url.search;
  }
  function trimReaders(protectedRecord) {
    while (readers.size > 3) {
      const oldest = [...readers.values()].filter(record => record !== activeReader && record !== protectedRecord)
        .sort((a, b) => a.used - b.used)[0];
      if (!oldest) break;
      pauseReader(oldest); oldest.frame.remove(); readers.delete(oldest.key);
    }
  }
  function readerReady(record, path) {
    if (!readers.has(record.key) || path !== new URL(record.url, location.origin).pathname) return;
    record.ready = true; record.frame.dataset.readerReady = 'true'; record.frame.classList.add('is-ready');
    if (record !== activeReader || !active || !panel.open) { pauseReader(record); return; }
    readerStatus.hidden = true; panel.dataset.readerReady = 'true';
    requestAnimationFrame(() => {
      if (record !== activeReader || !active || !panel.open) return;
      try {
        const child = record.frame.contentWindow;
        if (record.restore) {
          const position = readPositions.get(record.key) || record.fallbackPosition;
          if (record.entry && !record.restoreExact) {
            child.history.replaceState(child.history.state, '', record.url + '#' + record.entry);
            child.document.getElementById(decodeURIComponent(record.entry))?.scrollIntoView({block: 'start', behavior: 'instant'});
          } else if (position && Number.isFinite(position.y)) child.scrollTo({top: position.y, behavior: 'instant'});
          record.restore = false;
        }
        child.postMessage({type:'canvas-notebook-resume'}, location.origin);
        for (const media of record.playing) if (media.isConnected) media.play().catch(() => {});
        record.playing.clear();
      } catch {}
    });
  }
  function getReader(item) {
    const key = item.id + ':' + language;
    let record = readers.get(key);
    if (record) { record.used = performance.now(); return record; }
    const frame = readers.size ? readerTemplate.cloneNode(false) : readerTemplate;
    frame.removeAttribute('src'); frame.classList.remove('is-ready'); frame.hidden = true;
    frame.dataset.readerKey = key; frame.dataset.readerReady = 'false'; frame.title = title(item); frame.loading = 'eager';
    if (!frame.isConnected) panel.append(frame);
    record = {key, item, frame, url: readerHref(item), ready: false, used: performance.now(), playing: new Set(), restore: true, entry: ''};
    readers.set(key, record);
    frame.addEventListener('load', () => {
      if (!readers.has(key)) return;
      try {
        if (frame.contentDocument?.querySelector('.project-notebook')) {
          frame.contentDocument.addEventListener('play', event => {
            if (record !== activeReader || !active || !panel.open || document.hidden) event.target.pause?.();
          }, true);
          readerReady(record, frame.contentWindow.location.pathname);
        } else if (record === activeReader) {
          readerStatus.hidden = false;
          readerStatus.textContent = t('The notebook could not open. Use ↗ to open its page.', '手记未能载入，可点击 ↗ 打开原页面。');
        }
      } catch {
        if (record === activeReader) readerStatus.textContent = t('Use ↗ to open the notebook page.', '请点击 ↗ 打开手记页面。');
      }
    });
    // replace avoids adding iframe-only entries to the browser Back sequence.
    if (frame.contentWindow) frame.contentWindow.location.replace(record.url);
    else frame.src = record.url;
    trimReaders(record);
    return record;
  }
  function warmReader(item) {
    clearTimeout(warmTimer);
    if (active || pointer?.down || document.hidden || navigator.connection?.saveData || window.__portfolioLoad?.active) return;
    warmTimer = setTimeout(async () => {
      const address = readerHref(item);
      if (active || pointer?.down || document.hidden || warmController || warmDocuments.has(address) || readers.has(item.id + ':' + language)) return;
      const controller = new AbortController(); warmController = controller;
      const options = {signal: controller.signal, credentials: 'same-origin', cache: 'force-cache', priority: 'low'};
      try {
        const response = await fetch(address, options);
        if (!response.ok) return;
        // Inert parsing only: a hover must not execute analytics or load article media.
        const template = document.createElement('template'); template.innerHTML = await response.text();
        const base = new URL(address, location.origin);
        const dependencies = [...new Set([...template.content.querySelectorAll('link[rel="stylesheet"][href],script[type="module"][src]')]
          .map(node => new URL(node.getAttribute('href') || node.getAttribute('src'), base))
          .filter(url => url.origin === location.origin).map(url => url.href))];
        let next = 0;
        const worker = async () => {
          while (next < dependencies.length && !controller.signal.aborted) {
            const dependency = dependencies[next++];
            try { const asset = await fetch(dependency, options); if (asset.ok) await asset.arrayBuffer(); } catch {}
          }
        };
        await Promise.all([worker(), worker()]);
        if (!controller.signal.aborted) warmDocuments.add(address);
      } catch { /* The actual click still uses normal browser navigation. */ }
      finally { if (warmController === controller) warmController = null; }
    }, 350);
  }
  function fillPanel(item, entry = '') {
    rememberReader();
    const previous = activeReader;
    const record = getReader(item);
    if (previous !== record) {
      pauseReader(previous);
      if (previous) previous.frame.hidden = true;
      if (previous?.item.id === item.id) record.fallbackPosition = readPositions.get(previous.key);
    }
    activeReader = record; record.used = performance.now(); record.entry = entry; record.restore = true;
    const position = readPositions.get(record.key) || record.fallbackPosition;
    record.restoreExact = !!position && position.entry === entry && (openingFromHistory || previous?.item.id === item.id);
    record.frame.hidden = false; record.frame.title = title(item);
    panel.dataset.readerKey = record.key; panel.dataset.readerReady = String(record.ready);
    panel.querySelector('.canvas-reader-title').textContent = title(item);
    panel.querySelector('.canvas-reader-direct').href = item.href;
    readerStatus.hidden = record.ready;
    if (!record.ready) readerStatus.textContent = t('Opening notebook…', '正在打开手记…');
    localize(panel);
    if (record.ready) readerReady(record, new URL(record.url, location.origin).pathname);
    trimReaders(record);
  }
  function route(id, entry = '') {
    const hash = new URLSearchParams({project:id});
    if (entry) hash.set('entry', entry);
    return location.pathname + location.search + '#' + hash.toString();
  }
  function open(id, trigger, entry = '') {
    const item = items.find(item => item.id === id); if (!item) return;
    clearTimeout(warmTimer);
    const wasOpen = !!active;
    if (!wasOpen && !openingFromHistory) persistView();
    active = id; returnFocus = trigger || returnFocus;
    velocity.x = velocity.y = 0; goal.x = pan.x; goal.y = pan.y; zoomGoal = zoom;
    if (pointer) pointer.down = false;
    cancelAnimationFrame(raf); raf = 0;
    panel.hidden = false;
    if (!panel.open) panel.showModal();
    document.body.classList.add('canvas-panel-open');
    document.body.style.overflow = 'hidden';
    fillPanel(item, entry);
    reconcileMedia(true);
    buttons.forEach(button => {
      if (button?.dataset.canvasLink === id) button.setAttribute('aria-current', 'true');
      else button?.removeAttribute('aria-current');
    });
    if (!openingFromHistory) {
      const state = {...history.state, canvasReader:true, canvasView: snapshot()};
      if (wasOpen) history.replaceState(state, '', route(id, entry));
      else history.pushState(state, '', route(id, entry));
    }
    panel.querySelector('.canvas-detail-close').focus({preventScroll:true});
    queuePersist();
  }
  function hideReader() {
    if (!active) return;
    pauseReader(activeReader);
    if (activeReader) activeReader.frame.hidden = true;
    activeReader = null; active = null;
    if (panel.open) panel.close();
    panel.hidden = true; panel.dataset.readerReady = 'false';
    document.body.classList.remove('canvas-panel-open');
    document.body.style.overflow = '';
    buttons.forEach(button => button?.removeAttribute('aria-current'));
    returnFocus?.focus({preventScroll:true});
    reconcileMedia(true); wake(); queuePersist();
  }
  function close() {
    rememberReader(); persistView(); hideReader();
    if (history.state?.canvasReader) history.back();
    else history.replaceState({...history.state, canvasReader:false}, '', location.pathname + location.search);
  }
  panel.querySelector('.canvas-detail-close').addEventListener('click', close);
  panel.addEventListener('cancel', event => {event.preventDefault(); close();});
  panel.addEventListener('click', event => {if (event.target === panel) {const r = panel.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close();}});
  window.addEventListener('message', event => {
    if (event.origin !== location.origin) return;
    const record = [...readers.values()].find(value => value.frame.contentWindow === event.source);
    if (!record) return;
    const data = event.data || {}, current = record === activeReader && !!active;
    if (data.type === 'canvas-notebook-close' && current) close();
    if (data.type === 'canvas-notebook-ready') readerReady(record, data.path);
    if (data.type === 'canvas-notebook-position' && current && Number.isFinite(data.y)) {
      readPositions.set(record.key, {y: Math.max(0, data.y), entry: typeof data.entry === 'string' ? data.entry : '', updatedAt: Date.now()}); queuePersist();
    }
    if (data.type === 'canvas-notebook-anchor' && current) history.replaceState({...history.state, canvasView: snapshot()}, '', route(active, data.entry));
  });
  function readRoute() {
    const params = new URLSearchParams(location.hash.slice(1));
    const id = params.get('project');
    openingFromHistory = true;
    if (validView(history.state?.canvasView)) restoreView(history.state.canvasView);
    if (items.some(item => item.id === id)) open(id, buttons[items.findIndex(item => item.id === id)], params.get('entry') || '');
    else hideReader();
    openingFromHistory = false; queuePersist();
  }
  window.addEventListener('popstate', readRoute);
  window.addEventListener('hashchange', readRoute);
  // Keep decoder slots and their sources across pauses/drags. Rebind only when
  // a different visible project needs a slot; all short clips share cached blobs.
  function mediaSource(item) { return coverURL(item.media.src, item.media.version); }
  function posterURL(item) { return item.image + (item.imageVersion ? '?v=' + item.imageVersion : ''); }
  const background = createCoverScheduler({
    sources: items.filter(item => item.media?.type === 'video').map(item => ({src: mediaSource(item), bytes: item.media.bytes})),
    onReady: () => reconcileMedia(true),
    onProgress: status => document.dispatchEvent(new CustomEvent('media-background-progress', {detail: {...status, scope: 'canvas'}})),
  });
  function showFullPoster(item) {
    fullPosters.add(item.id);
    for (const placement of placements) if (placement.item.id === item.id) {
      const image = placement.image;
      image.classList.add('cover-poster-pending');
      if (item.rotate) image.classList.add('canvas-image-rotated');
      image.onload = async () => {
        try { await image.decode(); image.classList.remove('cover-poster-pending'); image.dataset.posterReady = 'true'; }
        catch { /* The embedded preview remains underneath. */ }
      };
      image.src = posterURL(item);
    }
  }
  function upgradePoster(item) {
    if (fullPosters.has(item.id)) return Promise.resolve();
    if (posterJobs.has(item.id)) return posterJobs.get(item.id);
    const job = decodePoster(posterURL(item)).then(() => showFullPoster(item), error => {
      posterFailures.add(item.id); throw error;
    }).finally(() => { posterJobs.delete(item.id); reconcileMedia(); });
    posterJobs.set(item.id, job); return job;
  }
  function upgradeNearbyPosters() {
    const seen = new Set();
    const selected = placements.filter(p => p.inView || p.nearby || mediaIdle).sort((a, b) =>
      Number(b.inView) - Number(a.inView) || Number(b.nearby) - Number(a.nearby) || a.distance - b.distance);
    for (const placement of selected) {
      const item = placement.item;
      if (seen.has(item.id) || fullPosters.has(item.id) || posterJobs.has(item.id) || posterFailures.has(item.id)) continue;
      seen.add(item.id); if (posterJobs.size >= 2) break;
      void upgradePoster(item).catch(() => {});
    }
  }
  function scheduleMediaIdle() {
    mediaIdle = false; clearTimeout(mediaIdleTimer);
    mediaIdleTimer = setTimeout(() => { mediaIdle = true; reconcileMedia(true); }, 1800);
  }
  function mediaCandidates() {
    const seen = new Set();
    return placements.filter(p => p.inView && p.item.media?.type === 'video').sort((a, b) => {
      if (a.item.id === hoverProject && b.item.id !== hoverProject) return -1;
      if (b.item.id === hoverProject && a.item.id !== hoverProject) return 1;
      return (a.distance || 0) - (b.distance || 0);
    }).filter(p => { if (seen.has(p.item.id)) return false; seen.add(p.item.id); return true; })
      .slice(0, mobile.matches ? 1 : 3);
  }
  function trimPool() {
    const limit = mobile.matches ? 1 : 3;
    while (motionPool.length > limit) {
      const slot = motionPool.pop(); slot.player.destroy(); slot.video.remove();
    }
  }
  function assignSlots(candidates, play) {
    trimPool();
    const selected = new Set(), assignments = [];
    for (const placement of candidates) {
      let slot = motionPool.find(item => item.placement === placement);
      if (!slot) slot = motionPool.find(item => !selected.has(item)
        && item.placement?.item.id === placement.item.id);
      if (!slot && motionPool.length < (mobile.matches ? 1 : 3)) {
        const video = document.createElement('video');
        video.className = 'canvas-cover-video'; video.loop = true; video.preload = 'auto';
        video.setAttribute('aria-hidden', 'true'); video.tabIndex = -1;
        slot = {video, player: createPreviewPlayer(video), placement: null}; motionPool.push(slot);
      }
      if (!slot) slot = motionPool.find(item => !selected.has(item) && !candidates.includes(item.placement));
      if (!slot) continue;
      if (slot.placement !== placement) {
        slot.player.pause(); slot.placement = placement; placement.media.append(slot.video);
      }
      selected.add(slot); assignments.push(slot);
      if (play && readyCoverURL(mediaSource(placement.item))) {
        slot.player.setSource(mediaSource(placement.item), placement.image.currentSrc || placement.image.src);
        slot.player.play();
      } else slot.player.pause();
    }
    for (const slot of motionPool) if (!selected.has(slot)) slot.player.pause();
    return assignments;
  }
  function reconcileMedia(force = false) {
    if (mediaDisposed) return;
    const now = performance.now();
    if (!force && now - mediaTick < 180) {
      clearTimeout(mediaTimer);
      mediaTimer = setTimeout(() => { mediaTimer = 0; reconcileMedia(true); }, 180 - (now - mediaTick));
      return;
    }
    clearTimeout(mediaTimer); mediaTimer = 0; mediaTick = now;
    trimPool();
    const blocked = active || mediaPreparing || window.__portfolioLoad?.active || document.hidden || pointer?.down;
    const motionDisabled = reduced.matches || navigator.connection?.saveData;
    background.update({paused: !!blocked || !!motionDisabled, cancelActive: !!motionDisabled,
      visible: placements.filter(p => p.inView && p.item.media?.type === 'video').map(p => mediaSource(p.item)),
      nearby: placements.filter(p => p.nearby && p.item.media?.type === 'video').map(p => mediaSource(p.item)), idle: mediaIdle});
    if (!blocked) upgradeNearbyPosters();
    const suspended = blocked || motionDisabled;
    if (suspended) { motionPool.forEach(slot => slot.player.pause()); return; }
    assignSlots(mediaCandidates(), true);
  }
  prepareCanvas = async ({signal, onProgress} = {}) => {
    mediaPreparing++; reconcileMedia(true); render();
    const initial = [...new Map(placements.filter(p => p.inView).map(p => [p.item.id, p.item])).values()];
    try {
      const result = await prepareMedia({signal, onProgress,
        images: initial.map(posterURL),
      });
      for (const item of initial) void upgradePoster(item).catch(() => {});
      document.documentElement.dataset.canvasReady = result.failed ? 'partial' : 'true';
      document.documentElement.dataset.canvasMediaReady = result.failed ? 'partial' : 'true';
      document.dispatchEvent(new CustomEvent('canvas-ready', {detail: result}));
      return result;
    } finally { mediaPreparing--; reconcileMedia(true); }
  };
  function center(index) {
    const p = placements[index * 4]; goal.x = -p.x - p.width / 2; goal.y = -p.y - p.height / 2;
    velocity.x = velocity.y = 0; wake();
  }
  function render() {
    if (mobile.matches) {
      placements.forEach(p => {
        p.button.hidden = p.copy !== 0; p.button.tabIndex=p.copy===0?0:-1;
        p.button.setAttribute('aria-hidden',String(p.copy!==0));p.button.style.transform = '';
        p.button.style.visibility = ''; p.button.style.width = '';
        p.visible = p.copy === 0 && mobileVisible.has(p.button);
        const rect = p.button.getBoundingClientRect();
        p.inView = p.copy === 0 && rect.width > 0 && rect.bottom > 0 && rect.top < innerHeight;
        p.nearby = p.copy === 0 && rect.width > 0 && rect.bottom > -innerHeight && rect.top < innerHeight * 2;
        p.distance = Math.abs(rect.top + rect.height / 2 - innerHeight / 2);
      }); reconcileMedia(); return;
    }
    for (const p of placements) {
      p.button.hidden = false;
      p.button.tabIndex=-1;p.button.setAttribute('aria-hidden','true');
      const x = wrap((p.x + pan.x) * zoom, world.width * 2 * zoom) + width / 2;
      const y = wrap((p.y + pan.y) * zoom, world.height * 2 * zoom) + height / 2;
      const visible = x > -p.width * zoom - 100 && x < width + 100 && y > -p.height * zoom - 100 && y < height + 100;
      p.inView = x > -p.width * zoom && x < width && y > -p.height * zoom && y < height;
      p.nearby = x > -p.width * zoom - 485 && x < width + 485 && y > -p.height * zoom - 390 && y < height + 390;
      p.visible = visible; p.distance = Math.hypot(x + p.width * zoom / 2 - width / 2, y + p.height * zoom / 2 - height / 2);
      p.button.style.visibility = visible ? 'visible' : 'hidden';
      if (!visible) continue;
      p.button.style.width = `${p.width}px`;
      const tilt = pointer?.down ? Math.max(-2, Math.min(2, velocity.x * .04)) : 0;
      p.button.style.transform = `translate3d(${x}px,${y}px,0) scale(${zoom}) rotate(${tilt}deg)`;
    }
    viewport.dataset.panX = pan.x.toFixed(1); viewport.dataset.panY = pan.y.toFixed(1); viewport.dataset.zoom = zoom.toFixed(2);
    document.querySelector('.canvas-zoom-value').textContent = `${Math.round(zoom * 100)}%`;
    reconcileMedia();
  }
  function frame(now) {
    raf = 0; if (document.hidden || mobile.matches || active) return;
    const delta = Math.min(2, (now - last) / 16.67 || 1); last = now;
    if (!pointer?.down) {goal.x += velocity.x * delta; goal.y += velocity.y * delta; velocity.x *= Math.pow(.89, delta); velocity.y *= Math.pow(.89, delta);}
    const follow = reduced.matches ? 1 : 1 - Math.pow(.85, delta);
    pan.x += (goal.x - pan.x) * follow; pan.y += (goal.y - pan.y) * follow; zoom += (zoomGoal - zoom) * follow;
    render();
    if (Math.abs(goal.x - pan.x) + Math.abs(goal.y - pan.y) + Math.abs(velocity.x) + Math.abs(velocity.y) > .08 || Math.abs(zoomGoal - zoom) > .001 || pointer?.down) raf = requestAnimationFrame(frame);
    else queuePersist();
  }
  function wake() {if (!raf && !mobile.matches && !document.hidden && !active) {last = performance.now(); raf = requestAnimationFrame(frame);}}
  viewport.addEventListener('pointerdown', event => {
    if (mobile.matches || event.button !== 0) return;
    clearTimeout(warmTimer);
    scheduleMediaIdle();
    pointer = {id:event.pointerId, startX:event.clientX, startY:event.clientY, x:event.clientX, y:event.clientY, down:true, moved:false};
    velocity.x = velocity.y = 0; reconcileMedia(true); viewport.setPointerCapture(event.pointerId); viewport.classList.add('is-dragging'); wake();
  });
  viewport.addEventListener('pointermove', event => {
    if (!pointer?.down || event.pointerId !== pointer.id) return;
    const dx = (event.clientX - pointer.x) / zoom, dy = (event.clientY - pointer.y) / zoom;
    goal.x += dx; goal.y += dy; velocity.x = reduced.matches ? 0 : dx * .4; velocity.y = reduced.matches ? 0 : dy * .4;
    pointer.x = event.clientX; pointer.y = event.clientY;
    if (Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) > 6) pointer.moved = true;
  });
  function release(event) {
    if (!pointer || pointer.id !== event.pointerId) return;
    if (pointer.moved) blockClickUntil = performance.now() + 250;
    else {const element = document.elementFromPoint(event.clientX, event.clientY)?.closest('.canvas-card'); if (element) {blockClickUntil = performance.now() + 250; open(element.dataset.project, element);}}
    pointer.down = false; viewport.classList.remove('is-dragging'); reconcileMedia(true); wake();
  }
  viewport.addEventListener('pointerup', release);
  viewport.addEventListener('pointercancel', () => {pointer = null; viewport.classList.remove('is-dragging'); reconcileMedia(true); wake();});
  viewport.addEventListener('click', event => {if (!mobile.matches && performance.now() < blockClickUntil) {event.preventDefault(); event.stopPropagation();}}, true);
  viewport.addEventListener('wheel', event => {
    if (mobile.matches) return; event.preventDefault();
    scheduleMediaIdle();
    if (event.ctrlKey) zoomGoal = Math.max(.65, Math.min(1.45, zoomGoal - event.deltaY * .002));
    else {goal.x -= (event.shiftKey ? event.deltaY : event.deltaX) / zoom; goal.y -= (event.shiftKey ? 0 : event.deltaY) / zoom;}
    velocity.x = velocity.y = 0; wake();
  }, {passive:false});
  viewport.addEventListener('keydown', event => {
    if (mobile.matches) return;
    const shifts = {ArrowLeft:[100,0], ArrowRight:[-100,0], ArrowUp:[0,100], ArrowDown:[0,-100]};
    if (shifts[event.key]) {event.preventDefault(); goal.x += shifts[event.key][0] / zoom; goal.y += shifts[event.key][1] / zoom; wake();}
  });
  document.querySelectorAll('[data-canvas-zoom]').forEach(button => button.addEventListener('click', () => {zoomGoal = Math.max(.65, Math.min(1.45, zoomGoal + Number(button.dataset.canvasZoom))); wake();}));
  document.querySelector('.canvas-reset').addEventListener('click', () => {zoomGoal = 1; center(0);});
  function resize() {width = viewport.clientWidth; height = viewport.clientHeight; render(); wake();}
  new ResizeObserver(resize).observe(viewport); mobile.addEventListener('change', resize);
  document.addEventListener('visibilitychange', () => {
    reconcileMedia(true);
    if (document.hidden) {
      clearTimeout(warmTimer); pauseReader(activeReader); persistView(); cancelAnimationFrame(raf); raf = 0;
    } else {
      if (activeReader?.ready) readerReady(activeReader, new URL(activeReader.url, location.origin).pathname);
      wake();
    }
  });
  document.addEventListener('languagechange', syncLanguage); syncLanguage();
  const mobileObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) mobileVisible.add(entry.target); else mobileVisible.delete(entry.target);
    }
    if (mobile.matches) {render(); reconcileMedia(true);}
  }, {rootMargin:'100px'});
  for (const p of placements) if (p.copy === 0) mobileObserver.observe(p.button);
  addEventListener('scroll', () => {
    if (mobile.matches && !active) queuePersist();
    if (!mobile.matches || mediaDisposed || mediaScrollFrame) return;
    scheduleMediaIdle();
    mediaScrollFrame = requestAnimationFrame(() => { mediaScrollFrame = 0; render(); });
  }, {passive: true});
  reduced.addEventListener('change', () => reconcileMedia(true));
  navigator.connection?.addEventListener?.('change', () => reconcileMedia(true));
  document.addEventListener('page-ready', () => { scheduleMediaIdle(); reconcileMedia(true); });
  addEventListener('pagehide', event => {
    clearTimeout(warmTimer); pauseReader(activeReader); persistView();
    warmController?.abort(); warmController = null;
    clearTimeout(mediaTimer); mediaTimer = 0;
    clearTimeout(mediaIdleTimer); mediaIdleTimer = 0;
    cancelAnimationFrame(mediaScrollFrame); mediaScrollFrame = 0;
    motionPool.forEach(slot => slot.player.pause());
    background.update({paused: true});
    if (event.persisted) return;
    mediaDisposed = true; background.destroy(); motionPool.forEach(slot => slot.player.destroy());
  });
  addEventListener('pageshow', event => {
    if (event.persisted) {
      if (validView(history.state?.canvasView)) restoreView(history.state.canvasView);
      readRoute();
    }
    scheduleMediaIdle(); reconcileMedia(true);
  });
  goal.x = -viewport.clientWidth/2+50; goal.y = -viewport.clientHeight/2+80; pan.x = goal.x; pan.y = goal.y;
  resize();
  if (initialView) restoreView(initialView);
  if (window.__portfolioLoad?.active) document.addEventListener('page-ready', readRoute, {once:true});
  else readRoute();
  const skipLink = document.querySelector('.skip-link');
  if (skipLink) skipLink.href = '#infinite-viewport';
  document.documentElement.dataset.canvasReady = 'structure';
  document.dispatchEvent(new CustomEvent('canvas-created'));
}
