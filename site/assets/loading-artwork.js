// One white-stage typewriter: every phrase, cursor and study object is 3D.
const FRAME_INTERVAL = 1000 / 20;
const LETTER_INTERVAL = 0.075, LETTER_ENTRY = 0.20, HOLD = 0.85, MOTTO_HOLD = 2.10, ERASE = 0.035;
// Give both languages one readable, bounded opening. This is scene time, not
// a fake resource delay: network readiness remains the other prerequisite.
const FIRST_SEQUENCE_SECONDS = 5.0;
const clamp = value => Math.max(0, Math.min(1, value));
const ease = value => 1 - Math.pow(1 - clamp(value), 3);
const INK = [0.12, 0.16, 0.22], BLUE = [0.10, 0.23, 0.40];

function pose(out, position, rotation, scale = 1) {
  const [x, y, z] = rotation, cx = Math.cos(x), sx = Math.sin(x);
  const cy = Math.cos(y), sy = Math.sin(y), cz = Math.cos(z), sz = Math.sin(z);
  out.set([cz*cy*scale, sz*cy*scale, -sy*scale, 0,
    (cz*sy*sx-sz*cx)*scale, (sz*sy*sx+cz*cx)*scale, cy*sx*scale, 0,
    (cz*sy*cx+sz*sx)*scale, (sz*sy*cx-cz*sx)*scale, cy*cx*scale, 0, ...position, 1]);
}

function combine(out, at, group, local) {
  for (let column = 0; column < 4; column++) for (let row = 0; row < 4; row++) {
    out[at + column*4 + row] = group[row]*local[column*4] + group[4+row]*local[column*4+1]
      + group[8+row]*local[column*4+2] + group[12+row]*local[column*4+3];
  }
}

function timing(scene, time) {
  const length = scene.text.length;
  const typedAt = (length - 1) * LETTER_INTERVAL + LETTER_ENTRY;
  const hold = scene.phrase === 'motto' ? MOTTO_HOLD : HOLD;
  const eraseAt = typedAt + hold;
  const clearAt = eraseAt + (length - 1) * ERASE + 0.14;
  const phase = time < typedAt ? 'typing' : time < eraseAt ? 'holding'
    : time < clearAt ? 'erasing' : 'transition';
  const completed = phase === 'typing'
    ? Math.max(0, Math.min(length, Math.floor((time - LETTER_ENTRY) / LETTER_INTERVAL) + 1))
    : phase === 'holding' ? length : phase === 'erasing'
      ? Math.max(0, length - Math.ceil((time - eraseAt) / ERASE)) : 0;
  return {phase, completed, typedAt, hold, eraseAt, duration: clearAt + 0.12};
}

function typeFrame(scene, sceneModule, time, totalTime, mobile) {
  // Reuse the scene's object/fault bookkeeping and transform buffers, with no
  // old opening sequence: the point buffer contains the current phrase only.
  const frame = sceneModule.studioFrame(scene, {time: 5 + totalTime, mobile});
  const state = timing(scene, time), group = scene.groupMatrix, local = scene.localMatrix;
  const motto = scene.phrase === 'motto';
  pose(group, [0, 0.035, 0], [0.13 + Math.sin(totalTime*0.35)*0.035,
    -0.28 + Math.sin(totalTime*0.27)*0.085, -0.015], mobile ? 1.06 : 1);
  scene.objects.forEach((object, index) => {
    let position, rotation = [0, 0, 0], scale = 1, alpha = 1, tint = INK;
    if (object.kind === 'model') {
      const alone = scene.phrase === 'design';
      if (object.model === 'viewfinder') {
        if (object.part === 'scan' || object.part === 'probe') {
          const across = -1.38 + 2.76 * ease(time / 1.5);
          position = [across, object.part === 'scan' ? 0.05 : -0.83, -0.20];
          tint = BLUE; alpha = object.part === 'scan' ? 0.43 : 0.9;
        } else {
          position = [0, -0.015, -0.34]; scale = motto ? 1.03 : 0.93;
          tint = [0.28, 0.40, 0.46]; alpha = 0.62;
        }
      } else if (object.model === 'weave') {
        position = [alone ? 1.30 : 1.53, alone ? -0.65 : -0.78, 0.01];
        rotation = [0.18, -0.28, -0.14]; scale = alone ? 0.72 : 0.50;
        tint = object.part === 'warp' ? [0.38, 0.30, 0.26] : [0.24, 0.37, 0.44];
        if (alone) {
          const separation = 0.16 * Math.pow(Math.sin(Math.PI * clamp((time - 0.15) / 1.30)), 2);
          position[2] += object.part === 'warp' ? separation : -separation * 0.55;
        }
      } else {
        position = [-1.53, -0.82, 0.05];
        rotation = [0.23, 0.22, -0.10]; scale = 0.55;
        tint = object.part === 'board' ? [0.15, 0.35, 0.36]
          : object.part === 'chip' ? INK : [0.44, 0.35, 0.20];
        if (object.part === 'chip' && scene.phrase === 'business') {
          const assembly = 1 - ease((time - 0.10) / 1.15);
          position[2] += assembly * 0.25;
          rotation[2] += assembly * 0.08;
        }
      }
      alpha *= ease(time / 0.30);
    } else if (object.kind === 'cursor') {
      const stop = scene.cursorStops[state.completed] || scene.cursorStops[0];
      position = [stop.x, stop.y, 0.025]; tint = BLUE;
      alpha = state.phase === 'transition' ? 0 : state.phase === 'holding'
        ? 0.35 + 0.65 * (1 + Math.sin(time*5.2)) / 2 : 1;
    } else {
      const entry = ease((time - object.typeAt * LETTER_INTERVAL) / LETTER_ENTRY);
      const exit = state.phase === 'erasing' || state.phase === 'transition'
        ? ease((time - state.eraseAt - (scene.text.length - 1 - object.typeAt) * ERASE) / 0.12) : 0;
      alpha = entry * (1 - exit);
      position = [object.offset[0], object.rowY + (1-entry)*0.055, -(1-entry)*0.26];
      rotation = [0, -(1-entry)*0.38, 0];
      tint = scene.phrase === 'research'
        || (motto && object.line === scene.lines.length - 1) ? BLUE : INK;
      if (object.kind === 'fault') {
        // A narrow coral cut is exposed only after the entire motto is typed.
        const opening = state.phase === 'holding' ? ease((time-state.typedAt)/0.5) : 0;
        position[2] += opening * 0.055;
        rotation[1] -= opening * 0.045;
      }
    }
    pose(local, position, rotation, scale);
    if (object.kind === 'cursor') {
      const height = (scene.cursorStops[state.completed] || scene.cursorStops[0]).height;
      for (let row = 0; row < 4; row++) local[4 + row] *= height;
    }
    const at = index * 24;
    combine(frame.transforms, at, group, local);
    frame.transforms.set([...tint, alpha,
      object.kind === 'fault' || Number.isInteger(object.faultIndex) ? 1 : 0, 0, 0, 0], at + 16);
  });
  frame.phase = state.phase;
  return {frame, state};
}

/** Abort immediately owns RAF, observers, pending setup and the renderer. */
export async function mountLoadingArtwork(stage, {
  signal, language = 'en', onFirstCycleComplete = () => {}, onUnavailable = () => {}, onProgress = () => {},
} = {}) {
  let disposed = false, renderer = null, scene = null, backend = 'static';
  let animation = 0, preparation = 0, finishPreparation = null;
  let sizing = null, visibility = null, visible = true, switching = false;
  let elapsed = 0, totalTime = 0, lastPaint = 0, phraseIndex = 0;
  let timelineRate = 1;
  let draw = () => {}, switchPhrase = () => {};
  let firstCycleCompleted = false, unavailableReported = false;
  const cache = new Map();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 700px)');
  const connection = navigator.connection;

  function stopAnimation() {
    if (animation) cancelAnimationFrame(animation);
    animation = 0;
    lastPaint = 0;
  }
  function destroy() {
    if (disposed) return;
    disposed = true;
    stopAnimation();
    if (preparation) cancelAnimationFrame(preparation);
    preparation = 0;
    finishPreparation?.();
    finishPreparation = null;
    sizing?.disconnect(); visibility?.disconnect();
    sizing = visibility = null;
    document.removeEventListener('visibilitychange', onVisibility);
    globalThis.removeEventListener('pagehide', destroy);
    reduced.removeEventListener('change', onPreferences);
    connection?.removeEventListener?.('change', onPreferences);
    signal?.removeEventListener('abort', destroy);
    renderer?.destroy(); renderer = scene = null;
    cache.clear();
  }
  const controller = {destroy};
  const active = () => !disposed && !signal?.aborted && stage?.isConnected;
  function unavailable(reason) {
    if (disposed || signal?.aborted || unavailableReported) return;
    unavailableReported = true;
    if (stage) delete stage.dataset.ready;
    destroy();
    // Failure/preferences use the DOM fallback alone. Normal abort deliberately
    // keeps the last bitmap for the loader's fade; a later mount resizes it.
    for (const canvas of stage?.querySelectorAll('canvas') || []) {
      canvas.width = canvas.height = 1;
    }
    // Cleanup precedes the hook, which may itself dismiss the parent loader.
    try { onUnavailable(reason); } catch { /* The artwork is already disposed. */ }
  }
  function tick(now) {
    animation = 0;
    if (!active()) { destroy(); return; }
    if (!visible || document.hidden || switching) return;
    if (!lastPaint || now - lastPaint >= FRAME_INTERVAL) {
      if (lastPaint) {
        const delta = Math.min((now-lastPaint)/1000, 0.15) * timelineRate;
        elapsed += delta; totalTime += delta;
      }
      lastPaint = now;
      if (!firstCycleCompleted && scene.phrase === 'motto' && elapsed >= timing(scene, elapsed).eraseAt) {
        firstCycleCompleted = true;
        stage.dataset.firstCycleComplete = 'true';
        stage.dataset.cycleProgress = '1';
        try { onFirstCycleComplete(); } catch { unavailable('completion-callback-failed'); }
        // The parent is allowed to abort or call destroy synchronously here.
        if (!active() || !scene || !renderer) return;
      }
      draw();
      if (active() && elapsed >= timing(scene, elapsed).duration) void switchPhrase();
    }
    if (active() && !switching) animation = requestAnimationFrame(tick);
  }
  function wake() {
    if (active() && renderer && visible && !document.hidden && !switching && !animation) {
      lastPaint = 0;
      animation = requestAnimationFrame(tick);
    }
  }
  function onVisibility() { if (document.hidden) stopAnimation(); else wake(); }
  function onPreferences() {
    if (reduced.matches) unavailable('reduced-motion');
    else if (connection?.saveData) unavailable('save-data');
  }
  function nextPaint() {
    return new Promise(resolve => {
      finishPreparation = resolve;
      preparation = requestAnimationFrame(() => {
        preparation = 0; finishPreparation = null; resolve();
      });
    });
  }

  signal?.addEventListener('abort', destroy, {once: true});
  if (signal?.aborted) { destroy(); return controller; }
  if (!active() || !stage.querySelector('canvas')) { unavailable('stage-unavailable'); return controller; }
  if (reduced.matches) { unavailable('reduced-motion'); return controller; }
  if (connection?.saveData) { unavailable('save-data'); return controller; }
  delete stage.dataset.firstCycleComplete;
  stage.dataset.word = '';
  stage.dataset.typed = '';
  stage.dataset.phase = 'preparing';
  reduced.addEventListener('change', onPreferences);
  connection?.addEventListener?.('change', onPreferences);
  globalThis.addEventListener('pagehide', destroy);
  try {
    const [geometryModule, sceneModule, rendererModule] = await Promise.all([
      import('./loading-geometry.js?v=8046debd6605'), import('./studio-scene.js?v=8046debd6605'), import('./studio-renderer.js?v=8046debd6605'),
    ]);
    if (!active()) { destroy(); return controller; }
    const phrases = geometryModule.LOADING_PHRASES;
    const durations = phrases.map((phrase, index) => {
      const state = timing({phrase, text: geometryModule.loadingPhraseText(phrase, language)}, 0);
      return index === phrases.length - 1 ? state.eraseAt : state.duration;
    });
    const sequenceDuration = durations.reduce((sum, value) => sum + value, 0);
    timelineRate = sequenceDuration / FIRST_SEQUENCE_SECONDS;
    stage.dataset.sequenceSeconds = String(FIRST_SEQUENCE_SECONDS);
    const offsets = durations.map((_, index) => durations.slice(0, index).reduce((sum, value) => sum + value, 0));
    function getScene(index) {
      const phrase = phrases[index];
      if (!cache.has(phrase)) cache.set(phrase,
        sceneModule.prepareStudioScene(geometryModule.makeLoadingGeometry(phrase, language)));
      return cache.get(phrase);
    }
    await nextPaint();
    if (!active()) { destroy(); return controller; }
    scene = getScene(phraseIndex);
    await nextPaint();
    if (!active()) { destroy(); return controller; }
    const candidate = await rendererModule.mountStudioRenderer(stage, scene, {
      allowGPU: false,
      asciiStyle: 'loader',
      onBackendChange(info) { backend = info.backend; },
    });
    if (!active()) { candidate.destroy(); destroy(); return controller; }
    renderer = candidate;
    if (backend === 'static') { unavailable('static-renderer'); return controller; }
    draw = () => {
      if (!active() || !renderer || !scene) return;
      try {
        const {frame, state} = typeFrame(scene, sceneModule, elapsed, totalTime, mobile.matches);
        renderer.render(frame);
        stage.dataset.phrase = scene.phrase;
        stage.dataset.typed = scene.text.slice(0, state.completed).replaceAll('\n', ' ');
        stage.dataset.word = state.phase === 'holding' ? scene.displayText : '';
        stage.dataset.phase = state.phase;
        stage.dataset.ready = 'true';
        if (!firstCycleCompleted) {
          // Actual visible scene time, including typing, holding and erasure.
          // Hidden tabs pause the same clock that drives the geometry.
          const fraction = clamp((offsets[phraseIndex] + Math.min(elapsed, durations[phraseIndex])) / sequenceDuration);
          stage.dataset.cycleProgress = fraction.toFixed(4);
          onProgress(fraction);
        }
      } catch { unavailable('render-failed'); }
    };
    switchPhrase = async () => {
      if (!active() || switching) return;
      switching = true; stopAnimation();
      try {
        // Build only the next phrase, once, between frames. Cached phrases do
        // no meshing on subsequent loops; only the current buffer is rendered.
        await nextPaint();
        if (!active()) { destroy(); return; }
        phraseIndex = (phraseIndex + 1) % phrases.length;
        scene = getScene(phraseIndex);
        if (!active()) { destroy(); return; }
        renderer.setScene(scene);
        elapsed = 0; stage.dataset.word = ''; stage.dataset.typed = '';
        draw(); switching = false; wake();
      } catch { unavailable('scene-failed'); }
    };
    draw();
    if (!active()) return controller;
    if (typeof ResizeObserver !== 'undefined') {
      sizing = new ResizeObserver(() => {
        if (!active()) { destroy(); return; }
        if (document.hidden) return;
        try { renderer.resize(); draw(); } catch { unavailable('resize-failed'); }
      });
      sizing.observe(stage);
    }
    if (typeof IntersectionObserver !== 'undefined') {
      visibility = new IntersectionObserver(entries => {
        visible = entries.some(entry => entry.isIntersecting);
        if (visible) wake(); else stopAnimation();
      });
      visibility.observe(stage);
    }
    document.addEventListener('visibilitychange', onVisibility);
    wake();
  } catch { unavailable('initialization-failed'); }
  return controller;
}
