import {t, localize, language} from './locale.js';
import {coverURL, readyCoverURL, decodePoster, createCoverScheduler, createPreviewPlayer, prepareMedia} from './media-readiness.js';
const viewport = document.querySelector('#infinite-viewport');
let prepareCanvas = options => prepareMedia(options);
export function prepareCanvasMedia(options = {}) { return prepareCanvas(options); }
if (viewport) {
  const embedded = document.documentElement.classList.contains('home-canvas-embed');
  let hostVisible = !embedded;
  function reportToHome(state) {
    if (embedded) parent.postMessage({type: 'home-canvas-state', ...state}, location.origin);
  }
  const items = JSON.parse(document.querySelector('#canvas-content').textContent);
  if (embedded) {
    // Open the archive where interaction design, physical computing and
    // digital art meet. Keep the standalone catalogue in publication order.
    const start = items.findIndex(item => item.id === 'contextcam');
    if (start > 0) items.push(...items.splice(0, start));
  }
  const videoURLs = new Map(items.filter(item => item.media?.type === 'video').map(item => [item.id, coverURL(item.media.src, item.media.version)]));
  const posterURLs = new Map(items.map(item => [item.id, item.image + (item.imageVersion ? '?v=' + item.imageVersion : '')]));
  const stage = document.querySelector('.canvas-world'), panel = document.querySelector('.canvas-detail');
  const address = new URL(location.href);
  if (address.searchParams.has('skill')) {
    address.searchParams.delete('skill');
    history.replaceState(history.state, '', address);
  }
  const readerTemplate = panel.querySelector('.canvas-reader-frame');
  const readerStatus = panel.querySelector('.canvas-reader-status');
  const storageKey = 'portfolio-canvas-view-v1:' + location.pathname + (embedded ? ':home' : '');
  let savedView = null;
  try { savedView = JSON.parse(sessionStorage.getItem(storageKey) || 'null'); } catch {}
  const validView = value => [1, 2].includes(value?.version) && ['x', 'y', 'zoom', 'scrollY'].every(key => Number.isFinite(value[key]));
  const initialView = validView(history.state?.canvasView) ? history.state.canvasView : validView(savedView) ? savedView : null;
  const readPositions = new Map(Object.entries(savedView?.readPositions || {}));
  for (const [key, position] of Object.entries(initialView?.readPositions || {})) {
    if ((position.updatedAt || 0) >= (readPositions.get(key)?.updatedAt || 0)) readPositions.set(key, position);
  }
  const readers = new Map();
  const warmDocuments = new Set();
  let warmController = null;
  let activeReader = null, warmTimer = 0, persistTimer = 0, openingFromHistory = false;
  const motionPlayers = new Map();
  const visibleMotion = new Set();
  const fullPosters = new Set(), posterJobs = new Map(), posterFailures = new Set();
  let mediaIdle = false, mediaIdleTimer = 0;
  let mediaMovingUntil = 0, mediaSettleTimer = 0;
  let mediaTick = 0, mediaTimer = 0, mediaScrollFrame = 0, mediaPreparing = 0, mediaDisposed = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = matchMedia('(pointer: coarse)');
  const mobile = matchMedia('(max-width: 700px)');
  // Stored views use physical scale. The denser, 0.65-scale view reads as 100%.
  const defaultScale = 0.65, minScale = defaultScale * 0.65, maxScale = defaultScale * 2.25;
  const clampScale = value => Math.max(minScale, Math.min(maxScale, value));
  const columnWidths = [258, 272, 254, 264], columnPitch = 306;
  const worldWidth = columnWidths.length * columnPitch, cameraDistance = 1250;
  // Include a complete tile beyond the screen at minimum zoom, so that the
  // seam stays offscreen even when panning on an ultrawide display.
  const minColumnPeriod = Math.max(1, Math.floor(items.length / columnWidths.length)) *
    (Math.min(...columnWidths) / 2.25 + 55);
  const wrapColumns = Math.max(2, Math.ceil((Math.max(screen.width, innerWidth) / (minScale * .96) + columnPitch) / worldWidth));
  const wrapRows = Math.max(2, Math.ceil((Math.max(screen.height, innerHeight) / (minScale * .96) + 300) / minColumnPeriod));
  stage.style.setProperty('--canvas-perspective', cameraDistance + 'px');
  const pan = {x: 0, y: 0}, goal = {x: 0, y: 0}, velocity = {x: 0, y: 0};
  let zoom = defaultScale, zoomGoal = defaultScale, width = 1, height = 1, raf = 0, last = 0, pointer = null, blockClickUntil = 0, active = null, returnFocus = null;
  const placements = [], mobilePlacements = [], buttons = [];
  const zoomLabel = document.querySelector('.canvas-zoom-value');
  let layoutMobile = null, measureColumns = true, lastZoomLabel = '';
  const mobileVisible = new Set();
  const wrap = (v, period) => ((v + period / 2) % period + period) % period - period / 2;
  const zoomControls = [...document.querySelectorAll('[data-canvas-zoom]')];

  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const ratio = Math.min(2.25, Math.max(1.35, item.rotate ? item.height / item.width : item.width / item.height));
    const column = index % columnWidths.length, row = Math.floor(index / columnWidths.length);
    const cardWidth = columnWidths[column], cardHeight = cardWidth / ratio;
    const baseX = column * columnPitch + (row % 2 ? 4 : -4);
    const depth = [-42, 38, -18, 50, 0][(column + 2 * row) % 5];
    const yaw = [-5, 5, -3, 4][(row + column) % 4];
    for (let copy = 0; copy < wrapColumns * wrapRows; copy++) {
      const button = document.createElement('button'); button.className = 'canvas-card'; button.tabIndex = -1;
      button.dataset.project = item.id; button.dataset.copy = String(copy); button.setAttribute('aria-hidden', 'true');
      const image = document.createElement('img'); image.src = item.preview || posterURL(item); image.alt = ''; image.draggable = false; image.loading='lazy'; image.decoding='async'; image.width = item.width; image.height = item.height;
      image.className = 'canvas-poster';
      if (item.rotate && !item.preview) image.classList.add('canvas-image-rotated');
      const media = document.createElement('span'); media.className = 'canvas-card-media'; media.style.height = `${cardHeight}px`; media.append(image);
      media.style.setProperty('--cover-ratio', Math.min(2.5, Math.max(1.2, item.rotate ? item.height / item.width : item.width / item.height)));
      if (item.preview) { media.style.backgroundImage = `url("${item.preview}")`; media.classList.add('has-cover-preview'); }
      image.addEventListener('error', () => {
        image.classList.add('cover-poster-pending'); image.classList.remove('canvas-image-rotated');
        if (item.preview) media.style.backgroundImage = `url("${item.preview}")`;
      });
      const caption = document.createElement('span'); caption.className = 'canvas-card-caption';
      caption.innerHTML = `<span class="canvas-card-name"></span><span class="canvas-card-year">${item.year}</span>`;
      const credits = document.createElement('span'); credits.className = 'canvas-card-credits';
      const badges = (item.credits || []).map(credit => {
        const badge = document.createElement('span'); badge.className = 'canvas-credit ' + credit.kind;
        credits.append(badge); return {badge, credit};
      });
      credits.hidden = !badges.length;
      const skills = document.createElement('span'); skills.className = 'canvas-card-skills';
      button.append(media, caption, credits, skills); button.style.width = `${cardWidth}px`; stage.append(button);
      button.addEventListener('click', () => {if (performance.now() > blockClickUntil) open(item.id, button);});
      button.addEventListener('pointerenter', () => warmReader(item));
      button.addEventListener('pointerleave', () => clearTimeout(warmTimer));
      button.addEventListener('focus', () => warmReader(item));
      const placement = {button, media, image, skills, badges, item, column, depth, yaw, copy, visible:false, inView:false,
        width:cardWidth, height:cardHeight + 65, x:baseX + (copy % wrapColumns) * worldWidth, y:0, period:1};
      placements.push(placement); if (copy === 0) mobilePlacements.push(placement);
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
    return {version: 2, x: pan.x, y: pan.y, zoom, scrollY: Math.max(0, scrollY),
      stripScroll: viewport.scrollLeft,
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
    const oldDefault = embedded ? .84 : 1;
    const wasDefault = view.version === 1 && Math.abs(view.zoom - oldDefault) < .001;
    zoom = zoomGoal = wasDefault ? defaultScale : clampScale(view.zoom);
    render();
    if (restoreScroll) {
      if (embedded && mobile.matches) viewport.scrollLeft = view.stripScroll || 0;
      else if (mobile.matches) scrollTo({top: view.scrollY, behavior: 'instant'});
    }
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
    try { record.frame.contentDocument?.querySelectorAll('img').forEach(image => {
      if (!image.complete) image.fetchPriority = 'low';
    }); } catch {}
  }
  function syncLanguage() {
    placements.forEach(p => {
      const fullTitle = title(p.item);
      p.button.querySelector('.canvas-card-name').textContent = fullTitle;
      p.badges.forEach(({badge,credit}, index) => {
        const team = index === 0 && credit.kind === 'award' ? t('Team awards · ', '团队获奖 · ') : '';
        badge.textContent = team + credit[language];
        badge.title = credit.detail?.[language] || credit[language];
      });
      p.button.setAttribute('aria-label', [fullTitle, ...p.badges.map(({badge}) => badge.textContent)].join(' · '));
      p.skills.textContent = p.item.skills.map(label => label[language]).join(' · ');
      p.skills.hidden = !p.item.skills.length;
    });
    buttons.forEach((button, index) => {
      if (!button) return;
      const item = items[index];
      button.querySelector('.canvas-index-name').textContent = title(item);
    });
    if (active) fillPanel(items.find(item => item.id === active), new URLSearchParams(location.hash.slice(1)).get('entry') || '');
    measureColumns = true;
    if (layoutMobile === false) render();
    announceView();
    queuePersist();
  }
  function announceView() {
    viewport.setAttribute('aria-label', mobile.matches
      ? t('Project cards', '作品列表')
      : t('Infinite work canvas. Drag or use arrow keys to pan.', '无限作品集，可拖动或用方向键平移。'));
    document.querySelector('.canvas-live').textContent = mobile.matches
      ? t('Select a project to read its notebook.', '选择作品阅读完整手记。')
      : t('Drag in any direction. Select a project to read its notebook.', '向任意方向拖动，选择作品阅读完整手记。');
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
        for (const image of child.document.images) if (!image.complete) {
          const rect = image.getBoundingClientRect();
          image.fetchPriority = rect.bottom > 0 && rect.top < child.innerHeight ? 'high' : 'auto';
        }
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
    reportToHome({reader:true});
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
    reportToHome({reader:false});
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
    if (embedded && event.source === parent && event.data?.type === 'home-canvas-controls') {
      const {visible, close: dismiss, language: nextLanguage, project} = event.data;
      if (typeof visible === 'boolean') { hostVisible = visible; reconcileMedia(true); if (visible) wake(); }
      if (dismiss && active) close();
      if ((nextLanguage === 'en' || nextLanguage === 'zh') && nextLanguage !== language) {
        document.querySelector('.language-toggle')?.click();
      }
      if (project && items.some(item => item.id === project)) open(project, viewport);
      return;
    }
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
  window.addEventListener('popstate', () => {
    readRoute();
    reportToHome({requestLanguage:true});
  });
  if (embedded) document.addEventListener('click', event => {
    if (event.target.closest('.language-toggle')) reportToHome({language});
  });
  window.addEventListener('hashchange', readRoute);
  function mediaSource(item) { return videoURLs.get(item.id); }
  function posterURL(item) { return posterURLs.get(item.id); }
  const background = createCoverScheduler({
    sources: items.filter(item => item.media?.type === 'video').map(item => ({src: mediaSource(item), bytes: item.media.bytes})),
    onReady: () => reconcileMedia(true),
    onProgress: status => document.dispatchEvent(new CustomEvent('media-background-progress', {detail: {...status, scope: 'canvas'}})),
  });
  // Observe the painted media surface: tilted edge cards can be visible even
  // when the layout's approximate card rectangle falls just outside the frame.
  const motionSurfaces = new Map(placements.filter(p => videoURLs.has(p.item.id)).map(p => [p.media, p]));
  const motionObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const placement = motionSurfaces.get(entry.target);
      if (entry.isIntersecting) visibleMotion.add(placement);
      else visibleMotion.delete(placement);
    }
    reconcileMedia();
  });
  for (const media of motionSurfaces.keys()) motionObserver.observe(media);

  function showFullPoster(item) {
    fullPosters.add(item.id);
    for (const placement of placements) if (placement.item.id === item.id) {
      const image = placement.image;
      image.classList.add('cover-poster-pending');
      if (item.rotate) image.classList.add('canvas-image-rotated');
      image.onload = async () => {
        try {
          await image.decode(); image.classList.remove('cover-poster-pending'); image.dataset.posterReady = 'true';
          placement.media.style.backgroundImage = 'none';
        }
        catch { /* The embedded preview remains underneath. */ }
      };
      image.src = posterURL(item);
    }
  }
  function upgradePoster(item, priority = 'low') {
    if (fullPosters.has(item.id)) return Promise.resolve();
    if (posterJobs.has(item.id)) {
      const job = posterJobs.get(item.id);
      if (priority === 'high') void decodePoster(posterURL(item), {priority, signal: job.controller.signal}).catch(() => {});
      return job.promise;
    }
    const job = {controller: new AbortController(), promise: null};
    job.promise = decodePoster(posterURL(item), {priority, signal: job.controller.signal}).then(() => showFullPoster(item), error => {
      if (error.name !== 'AbortError') posterFailures.add(item.id); throw error;
    }).finally(() => { if (posterJobs.get(item.id) === job) posterJobs.delete(item.id); reconcileMedia(); });
    posterJobs.set(item.id, job); return job.promise;
  }
  function upgradeNearbyPosters(start = true) {
    const seen = new Set();
    const selected = placements.filter(p => p.inView || p.nearby || (mediaIdle && !embedded && !mobile.matches)).sort((a, b) =>
      Number(b.inView) - Number(a.inView) || Number(b.nearby) - Number(a.nearby) || a.distance - b.distance);
    const current = new Set(selected.filter(p => p.inView).map(p => p.item.id));
    const relevant = new Set(selected.map(p => p.item.id));
    const urgent = [...current].some(id => !fullPosters.has(id) && !posterJobs.has(id));
    for (const [id, job] of posterJobs) {
      if (!hostVisible || active || document.hidden || !relevant.has(id) || (urgent && !current.has(id))) {
        job.controller.abort(); posterJobs.delete(id);
      }
    }
    if (!start) return;
    for (const placement of selected) {
      const item = placement.item;
      if (seen.has(item.id) || fullPosters.has(item.id) || posterFailures.has(item.id)) continue;
      seen.add(item.id);
      if (posterJobs.has(item.id)) { if (placement.inView) void upgradePoster(item, 'high').catch(() => {}); continue; }
      if (posterJobs.size >= 2) continue;
      void upgradePoster(item, placement.inView ? 'high' : 'low').catch(() => {});
    }
  }
  function scheduleMediaIdle() {
    mediaIdle = false; clearTimeout(mediaIdleTimer);
    mediaMovingUntil = performance.now() + 280; clearTimeout(mediaSettleTimer);
    mediaSettleTimer = setTimeout(() => { mediaSettleTimer = 0; reconcileMedia(true); }, 290);
    mediaIdleTimer = setTimeout(() => { mediaIdle = true; reconcileMedia(true); }, 1800);
  }
  // A placement is one visible instance on the repeating board. Two instances
  // of a project share its downloaded Blob, but each needs its own video surface.
  function playVisibleCovers(visible) {
    const ready = new Set(visible.filter(p => readyCoverURL(mediaSource(p.item))));
    const spare = [];
    for (const [placement, player] of motionPlayers) {
      if (ready.has(placement)) continue;
      player.pause();
      motionPlayers.delete(placement);
      spare.push(player);
    }
    for (const placement of ready) {
      let player = motionPlayers.get(placement);
      if (!player) {
        player = spare.pop();
        if (!player) {
          const video = document.createElement('video');
          video.className = 'canvas-cover-video';
          video.loop = true; video.tabIndex = -1;
          video.setAttribute('aria-hidden', 'true');
          player = createPreviewPlayer(video);
        }
        placement.media.append(player.video);
        player.setSource(mediaSource(placement.item), placement.image.currentSrc || placement.image.src);
        motionPlayers.set(placement, player);
      }
      player.play();
    }
    for (const player of spare) {
      player.destroy();
      player.video.remove();
    }
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
    const moving = pointer?.down || performance.now() < mediaMovingUntil;
    const blocked = !hostVisible || active || mediaPreparing || window.__portfolioLoad?.active || document.hidden;
    const motionDisabled = reduced.matches || navigator.connection?.saveData;
    const foreground = [...visibleMotion].filter(p => p.visible && !p.button.hidden);
    background.update({paused: !!blocked || !!motionDisabled,
      cancelActive: !hostVisible || !!motionDisabled || !!active || document.hidden, cancelStale: true,
      visible: foreground.map(p => mediaSource(p.item)),
      nearby: moving || mobile.matches ? [] : placements.filter(p => p.nearby && p.item.media?.type === 'video').map(p => mediaSource(p.item)),
      idle: mediaIdle && !moving && !embedded && !mobile.matches});
    // Sharpen the initial view during the opening, using the same two-job
    // queue. A slow full-size image must not extend the completed artwork.
    upgradeNearbyPosters(hostVisible && !active && !mediaPreparing && !document.hidden && !moving);
    if (blocked || motionDisabled) {
      for (const player of motionPlayers.values()) {
        if (!player.video.paused) player.pause();
      }
      return;
    }
    playVisibleCovers(foreground);
  }
  prepareCanvas = async ({signal, onProgress} = {}) => {
    mediaPreparing++; reconcileMedia(true); render();
    const initial = [...new Map(placements.filter(p => p.inView).map(p => [p.item.id, p.item])).values()];
    try {
      const result = await prepareMedia({signal, onProgress,
        // Every card already has an embedded, project-specific image. Decode
        // that real first view before entry; sharper posters are progressive.
        images: initial.map(item => item.preview || posterURL(item)),
      });
      result.posterTier = 'preview';
      upgradeNearbyPosters(hostVisible);
      document.documentElement.dataset.canvasReady = result.failed ? 'partial' : 'true';
      document.documentElement.dataset.canvasMediaReady = result.failed ? 'partial' : 'true';
      document.dispatchEvent(new CustomEvent('canvas-ready', {detail: result}));
      return result;
    } finally { mediaPreparing--; reconcileMedia(true); }
  };
  function resetView() {
    zoomGoal = defaultScale;
    goal.x = ((embedded ? 24 : 32) - viewport.clientWidth / 2) / zoomGoal;
    goal.y = ((embedded ? 24 : 36) - viewport.clientHeight / 2) / zoomGoal;
    velocity.x = velocity.y = 0;
  }
  function packColumns() {
    // Repeat each column at its own height. Long titles, award labels and an
    // incomplete final row then occupy real space without leaving blank cells.
    const starts = [0, 36, -16, 21], ends = [...starts], bounds = new Map();
    for (const p of mobilePlacements) {
      const h = p.button.offsetHeight;
      bounds.set(p.item, {top:ends[p.column], height:h});
      ends[p.column] += h + 28;
    }
    for (const p of placements) {
      const box = bounds.get(p.item);
      p.height = box.height;
      p.period = ends[p.column] - starts[p.column];
      p.y = box.top + Math.floor(p.copy / wrapColumns) * p.period;
    }
    measureColumns = false;
  }
  function render() {
    const listLayout = mobile.matches;
    if (layoutMobile !== listLayout) {
      layoutMobile = listLayout;
      measureColumns = true;
      // These attributes describe the layout mode, not the current animation frame.
      for (const p of placements) {
        p.button.hidden = listLayout && p.copy !== 0;
        p.button.tabIndex = listLayout && !p.button.hidden ? 0 : -1;
        p.button.setAttribute('aria-hidden', String(!listLayout || p.button.hidden));
        p.button.style.transform = ''; p.transform = '';
        p.button.style.visibility = ''; p.displayed = undefined;
        p.button.style.width = listLayout ? '' : `${p.width}px`;
        if (p.button.hidden) p.visible = p.inView = p.nearby = false;
      }
    }
    if (listLayout) {
      // One read batch over the 22 real cards; hidden wrap copies need no layout reads.
      const bounds = mobilePlacements.map(p => p.button.getBoundingClientRect());
      mobilePlacements.forEach((p, index) => {
        const rect = bounds[index];
        p.visible = mobileVisible.has(p.button);
        p.inView = rect.width > 0 && rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
        p.nearby = rect.width > 0 && rect.bottom > -innerHeight && rect.top < innerHeight * 2 && rect.right > -innerWidth && rect.left < innerWidth * 2;
        p.distance = Math.abs(rect.top + rect.height / 2 - innerHeight / 2);
      }); reconcileMedia(); return;
    }
    if (measureColumns) packColumns();
    for (const p of placements) {
      const dx = (wrap(p.x + p.width / 2 + pan.x, worldWidth * wrapColumns) - p.width / 2) * zoom;
      const dy = (wrap(p.y + p.height / 2 + pan.y, p.period * wrapRows) - p.height / 2) * zoom;
      const z = reduced.matches ? 0 : p.depth * zoom;
      const perspective = cameraDistance / (cameraDistance - z), scale = zoom * perspective;
      const x = width / 2 + dx * perspective, y = height / 2 + dy * perspective;
      const right = x + p.width * scale, bottom = y + p.height * scale;
      const visible = right > -100 && x < width + 100 && bottom > -100 && y < height + 100;
      p.inView = right > 0 && x < width && bottom > 0 && y < height;
      p.nearby = right > -columnPitch && x < width + columnPitch && bottom > -300 && y < height + 300;
      p.visible = visible; p.distance = Math.hypot(x + p.width * scale / 2 - width / 2, y + p.height * scale / 2 - height / 2);
      if (p.displayed !== visible) { p.button.style.visibility = visible ? 'visible' : 'hidden'; p.displayed = visible; }
      if (!visible) continue;
      const angle = reduced.matches ? '' : ` rotateY(${p.yaw}deg) rotateX(${p.depth / 16}deg)`;
      const transform = `translate3d(${width / 2 + dx}px,${height / 2 + dy}px,${z}px) scale(${zoom})${angle}`;
      if (p.transform !== transform) { p.button.style.transform = transform; p.transform = transform; }
    }
    const x = pan.x.toFixed(1), y = pan.y.toFixed(1), z = (zoom / defaultScale).toFixed(2);
    if (viewport.dataset.panX !== x) viewport.dataset.panX = x;
    if (viewport.dataset.panY !== y) viewport.dataset.panY = y;
    if (viewport.dataset.zoom !== z) viewport.dataset.zoom = z;
    const label = `${Math.round(zoom / defaultScale * 100)}%`;
    if (lastZoomLabel !== label) {
      zoomLabel.textContent = label; lastZoomLabel = label;
      zoomControls.forEach(button => {
        button.disabled = Number(button.dataset.canvasZoom) < 0 ? label === '65%' : label === '225%';
      });
    }
    reconcileMedia();
  }
  function frame(now) {
    raf = 0; if (!hostVisible || document.hidden || mobile.matches || active) return;
    const delta = Math.min(2, (now - last) / 16.67 || 1); last = now;
    if (!pointer?.down) {goal.x += velocity.x * delta; goal.y += velocity.y * delta; velocity.x *= Math.pow(.89, delta); velocity.y *= Math.pow(.89, delta);}
    const follow = reduced.matches ? 1 : 1 - Math.pow(.85, delta);
    pan.x += (goal.x - pan.x) * follow; pan.y += (goal.y - pan.y) * follow; zoom += (zoomGoal - zoom) * follow;
    if (Math.abs(goal.x - pan.x) + Math.abs(goal.y - pan.y) + Math.abs(velocity.x) + Math.abs(velocity.y) > 5) mediaMovingUntil = Math.max(mediaMovingUntil, now + 120);
    render();
    if (Math.abs(goal.x - pan.x) + Math.abs(goal.y - pan.y) + Math.abs(velocity.x) + Math.abs(velocity.y) > .08 || Math.abs(zoomGoal - zoom) > .001 || pointer?.down) raf = requestAnimationFrame(frame);
    else queuePersist();
  }
  function wake() {if (hostVisible && !raf && !mobile.matches && !document.hidden && !active) {last = performance.now(); raf = requestAnimationFrame(frame);}}
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
    if (!pointer?.down || pointer.id !== event.pointerId) return;
    if (pointer.moved) blockClickUntil = performance.now() + 250;
    else {const element = document.elementFromPoint(event.clientX, event.clientY)?.closest('.canvas-card'); if (element) {blockClickUntil = performance.now() + 250; open(element.dataset.project, element);}}
    pointer.down = false; scheduleMediaIdle(); viewport.classList.remove('is-dragging'); reconcileMedia(true); wake();
  }
  viewport.addEventListener('pointerup', release);
  viewport.addEventListener('pointercancel', () => {pointer = null; viewport.classList.remove('is-dragging'); reconcileMedia(true); wake();});
  viewport.addEventListener('click', event => {if (!mobile.matches && performance.now() < blockClickUntil) {event.preventDefault(); event.stopPropagation();}}, true);
  function panWithWheel(event) {
    if (active || (mobile.matches && (!embedded || event.ctrlKey))) return;
    // Touch swipes use native scrolling. A mouse wheel on the narrow home
    // strip still belongs to the portfolio, including at its two ends.
    event.preventDefault();
    const mode = event.deltaMode;
    const dx = event.deltaX * (mode === 1 ? 16 : mode === 2 ? viewport.clientWidth : 1);
    const dy = event.deltaY * (mode === 1 ? 16 : mode === 2 ? viewport.clientHeight : 1);
    if (mobile.matches) {
      viewport.scrollLeft += Math.abs(dx) > Math.abs(dy) ? dx : dy;
      return;
    }
    scheduleMediaIdle();
    if (event.ctrlKey) zoomGoal = clampScale(zoomGoal - dy * .002 * defaultScale);
    else {
      goal.x -= (event.shiftKey ? dx || dy : dx) / zoom;
      if (!event.shiftKey) goal.y -= dy / zoom;
    }
    velocity.x = velocity.y = 0; wake();
  }
  viewport.addEventListener('wheel', panWithWheel, {passive:false});
  document.querySelector('.canvas-controls').addEventListener('wheel', panWithWheel, {passive:false});
  viewport.addEventListener('keydown', event => {
    if (mobile.matches) return;
    const shifts = {ArrowLeft:[100,0], ArrowRight:[-100,0], ArrowUp:[0,100], ArrowDown:[0,-100]};
    if (shifts[event.key]) {event.preventDefault(); goal.x += shifts[event.key][0] / zoom; goal.y += shifts[event.key][1] / zoom; wake();}
  });
  zoomControls.forEach(button => button.addEventListener('click', () => {zoomGoal = clampScale(zoomGoal + Number(button.dataset.canvasZoom) * defaultScale); wake();}));
  document.querySelector('.canvas-reset').addEventListener('click', () => {resetView(); wake();});
  function resize() {width = viewport.clientWidth; height = viewport.clientHeight; render(); wake();}
  new ResizeObserver(resize).observe(viewport); mobile.addEventListener('change', () => {resize(); announceView();});
  if (embedded) new ResizeObserver(() => {
    if (mobile.matches) reportToHome({stripHeight:stage.offsetHeight});
  }).observe(stage);
  document.fonts?.ready.then(() => { measureColumns = true; render(); });
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
  function requestMobileRender() {
    if (!mobile.matches || mediaDisposed || mediaScrollFrame) return;
    mediaScrollFrame = requestAnimationFrame(() => { mediaScrollFrame = 0; render(); });
  }
  const mobileObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) mobileVisible.add(entry.target); else mobileVisible.delete(entry.target);
    }
    requestMobileRender();
  }, {rootMargin:'100px'});
  for (const p of placements) if (p.copy === 0) mobileObserver.observe(p.button);
  viewport.addEventListener('scroll', () => {
    if (active || !embedded || !mobile.matches) return;
    if (embedded && mobile.matches) scheduleMediaIdle();
    queuePersist(); requestMobileRender();
  }, {passive: true});
  addEventListener('scroll', () => {
    if (mobile.matches && !active) queuePersist();
    if (!mobile.matches || mediaDisposed || mediaScrollFrame) return;
    scheduleMediaIdle();
    requestMobileRender();
  }, {passive: true});
  reduced.addEventListener('change', () => { render(); reconcileMedia(true); });
  navigator.connection?.addEventListener?.('change', () => reconcileMedia(true));
  document.addEventListener('page-ready', () => { scheduleMediaIdle(); reconcileMedia(true); });
  addEventListener('pagehide', event => {
    clearTimeout(warmTimer); pauseReader(activeReader); persistView();
    warmController?.abort(); warmController = null;
    clearTimeout(mediaTimer); mediaTimer = 0;
    clearTimeout(mediaIdleTimer); mediaIdleTimer = 0;
    clearTimeout(mediaSettleTimer); mediaSettleTimer = 0;
    for (const job of posterJobs.values()) job.controller.abort(); posterJobs.clear();
    cancelAnimationFrame(mediaScrollFrame); mediaScrollFrame = 0;
    motionPlayers.forEach(player => player.pause());
    background.update({paused: true});
    if (event.persisted) return;
    mediaDisposed = true; background.destroy(); motionObserver.disconnect();
    motionPlayers.forEach(player => player.destroy()); motionPlayers.clear();
  });
  addEventListener('pageshow', event => {
    if (event.persisted) {
      if (validView(history.state?.canvasView)) restoreView(history.state.canvasView);
      readRoute();
    }
    scheduleMediaIdle(); reconcileMedia(true);
  });
  resetView(); pan.x = goal.x; pan.y = goal.y; zoom = zoomGoal;
  resize();
  if (initialView) restoreView(initialView);
  if (window.__portfolioLoad?.active) document.addEventListener('page-ready', readRoute, {once:true});
  else readRoute();
  const skipLink = document.querySelector('.skip-link');
  if (skipLink) skipLink.href = '#infinite-viewport';
  document.documentElement.dataset.canvasReady = 'structure';
  document.dispatchEvent(new CustomEvent('canvas-created'));
  if (embedded) {
    // Keep the static fallback painted until the visible real cover previews
    // have decoded. Partial failures can still use the index and full canvas.
    prepareCanvas().then(() => reportToHome({ready:true})).catch(() => {});
  }
}
