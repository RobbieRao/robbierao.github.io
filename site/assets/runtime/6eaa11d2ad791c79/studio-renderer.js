// Shared camera and shading values keep the Canvas and WebGPU views equivalent.
export const STUDIO_RENDER = Object.freeze({
  glyphs: '.:-ox*#%@', atlasWidth: 20, atlasHeight: 28, shades: 12,
  focal: 8, near: 0.1, far: 32,
  lightX: -0.6 / Math.SQRT2, lightY: 0.8 / Math.SQRT2, lightZ: 1 / Math.SQRT2,
  ambient: 0.2, diffuse: 0.7, specular: 0.14, shininess: 32,
});

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

function validateScene(scene) {
  if (!scene || !(scene.points instanceof Float32Array) || scene.points.length % 7 || !Array.isArray(scene.objects)) {
    throw new TypeError('Studio scene needs Float32Array xyz/normal/index points and an objects array.');
  }
  const points = scene.points;
  for (let i = 0; i < points.length; i += 7) {
    const object = points[i + 6];
    if (!Number.isInteger(object) || object < 0 || object >= scene.objects.length) throw new RangeError('Studio point refers to an unknown object.');
    for (let j = 0; j < 6; j++) if (!Number.isFinite(points[i + j])) throw new RangeError('Studio geometry contains a non-finite component.');
  }
}

function initialFrame(count) {
  const transforms = new Float32Array(count * 24);
  for (let i = 0; i < transforms.length; i += 24) {
    transforms[i] = transforms[i + 5] = transforms[i + 10] = transforms[i + 15] = 1;
    transforms[i + 16] = 0.23; transforms[i + 17] = 0.27; transforms[i + 18] = 0.31; transforms[i + 19] = 1;
  }
  return {transforms, phase: 'initial', time: 0};
}

function makeAtlas(dense = false) {
  const canvas = document.createElement('canvas');
  canvas.width = STUDIO_RENDER.glyphs.length * STUDIO_RENDER.atlasWidth;
  canvas.height = STUDIO_RENDER.atlasHeight;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.font = 'bold 30px Menlo, Consolas, monospace';
  context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillStyle = '#fff';
  context.strokeStyle = '#fff'; context.lineWidth = dense ? 1.8 : 1.2;
  for (let i = 0; i < STUDIO_RENDER.glyphs.length; i++) {
    context.strokeText(STUDIO_RENDER.glyphs[i], (i + 0.5) * STUDIO_RENDER.atlasWidth, STUDIO_RENDER.atlasHeight / 2);
    context.fillText(STUDIO_RENDER.glyphs[i], (i + 0.5) * STUDIO_RENDER.atlasWidth, STUDIO_RENDER.atlasHeight / 2);
  }
  return canvas;
}

/** Area-filter each glyph independently before sampling it at tiny screen sizes. */
export function makeStudioCellAtlas(source, pixelWidth, pixelHeight, {coverage = 1} = {}) {
  const glyphWidth = Math.max(1, Math.round(pixelWidth));
  const glyphHeight = Math.max(1, Math.round(pixelHeight));
  const padding = 1, stride = glyphWidth + padding * 2;
  const canvas = document.createElement('canvas');
  canvas.width = STUDIO_RENDER.glyphs.length * stride; canvas.height = glyphHeight + padding * 2;
  const context = canvas.getContext('2d'), sourceContext = source.getContext('2d');
  if (!context || !sourceContext) throw new Error('glyph-prefilter-unavailable');
  const input = sourceContext.getImageData(0, 0, source.width, source.height).data;
  const output = context.createImageData(canvas.width, canvas.height);
  const sourceWidth = STUDIO_RENDER.atlasWidth, sourceHeight = STUDIO_RENDER.atlasHeight;
  const stepX = sourceWidth / glyphWidth, stepY = sourceHeight / glyphHeight;
  // This small CPU-only atlas is generated on size changes, never per frame.
  for (let glyph = 0; glyph < STUDIO_RENDER.glyphs.length; glyph++) {
    for (let y = 0; y < glyphHeight; y++) for (let x = 0; x < glyphWidth; x++) {
      const x0 = x * stepX, x1 = (x + 1) * stepX, y0 = y * stepY, y1 = (y + 1) * stepY;
      let alpha = 0;
      for (let sy = Math.floor(y0); sy < Math.min(sourceHeight, Math.ceil(y1)); sy++) {
        const weightY = Math.min(y1, sy + 1) - Math.max(y0, sy);
        for (let sx = Math.floor(x0); sx < Math.min(sourceWidth, Math.ceil(x1)); sx++) {
          const weightX = Math.min(x1, sx + 1) - Math.max(x0, sx);
          alpha += input[(sy * source.width + glyph * sourceWidth + sx) * 4 + 3] * weightX * weightY;
        }
      }
      const target = ((y + padding) * canvas.width + glyph * stride + padding + x) * 4;
      output.data[target] = output.data[target + 1] = output.data[target + 2] = 255;
      const averaged = alpha / (stepX * stepY);
      output.data[target + 3] = coverage === 1 ? Math.round(averaged)
        : Math.round(255 * (1 - Math.pow(1 - clamp(averaged / 255, 0, 1), coverage)));
    }
  }
  context.putImageData(output, 0, 0);
  return {canvas, glyphWidth, glyphHeight, stride, padding};
}

/** A point-cloud surface renderer. The controller owns all motion and object poses. */
export async function mountStudioRenderer(stage, scene, {onBackendChange = () => {}, allowGPU = true, asciiStyle = 'default'} = {}) {
  validateScene(scene);
  let canvas = stage.querySelector('canvas');
  const ownsCanvas = !canvas;
  if (!canvas) { canvas = document.createElement('canvas'); stage.append(canvas); }
  canvas.setAttribute('aria-hidden', 'true');
  const dense = asciiStyle === 'loader';
  let context = null, atlas = null, sourceAtlas = null, cellAtlas = null;
  try { context = canvas.getContext('2d'); atlas = sourceAtlas = makeAtlas(dense); } catch { /* Retain the DOM fallback. */ }

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 700px)');
  const connection = navigator.connection;
  let frame = initialFrame(scene.objects.length), width = 1, height = 1, dpr = 1;
  let columns = 1, rows = 1, cellWidth = 2.2, cellHeight = 3.1, scale = 1;
  let depths = new Float32Array(1), owners = new Int32Array(1), shades = new Uint8Array(1);
  let palette = [], gpu = null, gpuCanvas = null, disposed = false, pending = false, attempted = false;
  let idle = 0, timer = 0, backend = context && atlas ? 'canvas2d' : 'static', reason = '';

  function report(next, why = '') {
    const changed = backend !== next || reason !== why || !stage.dataset.renderer;
    backend = next; reason = why;
    stage.dataset.renderer = next; stage.dataset.rendererReason = why;
    stage.dataset.surfacePoints = String(scene.points.length / 7);
    if (changed) onBackendChange({backend: next, ...(why ? {reason: why} : {})});
  }

  function ineligible() {
    if (!allowGPU || dense) return 'loader-canvas';
    if (new URLSearchParams(location.search).get('renderer') === 'canvas') return 'canvas-requested';
    if (reduced.matches) return 'reduced-motion';
    if (mobile.matches) return 'small-screen';
    if (connection?.saveData) return 'save-data';
    if (!globalThis.isSecureContext || !navigator.gpu) return 'webgpu-unavailable';
    if (!atlas) return 'atlas-unavailable';
    return '';
  }

  function clearPalette() {
    for (const item of palette) for (const sheet of item.sheets) if (sheet) { sheet.width = 1; sheet.height = 1; }
    palette = [];
  }

  function preparePalette() {
    const transforms = frame.transforms, objectCount = scene.objects.length;
    for (let object = 0; object < objectCount; object++) {
      const offset = object * 24;
      const opacity = clamp(transforms[offset + 19], 0, 1);
      // The second N palette entries belong to cut faces, with the same opacity.
      for (let cut = 0; cut < 2; cut++) {
        const owner = object + cut * objectCount;
        const r = cut ? 250 : Math.round(clamp(transforms[offset + 16], 0, 1) * 255);
        const g = cut ? 41 : Math.round(clamp(transforms[offset + 17], 0, 1) * 255);
        const b = cut ? 19 : Math.round(clamp(transforms[offset + 18], 0, 1) * 255);
        let item = palette[owner];
        if (!item) item = palette[owner] = {r, g, b, opacity, sheets: new Array(STUDIO_RENDER.shades)};
        if (item.r !== r || item.g !== g || item.b !== b) {
          for (const sheet of item.sheets) if (sheet) { sheet.width = 1; sheet.height = 1; }
          item.sheets.fill(undefined); item.r = r; item.g = g; item.b = b;
        }
        item.opacity = opacity;
      }
    }
  }

  function colorAtlas(object, shade) {
    const item = palette[object];
    if (item.sheets[shade]) return item.sheets[shade];
    const sheet = document.createElement('canvas');
    sheet.width = atlas.width; sheet.height = atlas.height;
    const ink = sheet.getContext('2d');
    if (!ink) return atlas;
    const intensity = 0.34 + 0.66 * shade / (STUDIO_RENDER.shades - 1);
    ink.drawImage(atlas, 0, 0); ink.globalCompositeOperation = 'source-in';
    ink.fillStyle = `rgb(${Math.round(item.r * intensity)},${Math.round(item.g * intensity)},${Math.round(item.b * intensity)})`;
    ink.fillRect(0, 0, sheet.width, sheet.height);
    item.sheets[shade] = sheet;
    return sheet;
  }

  function drawCanvas() {
    if (!context || !atlas || disposed) return;
    preparePalette(); depths.fill(-Infinity); owners.fill(-1);
    const points = scene.points, transforms = frame.transforms;
    const lightX = STUDIO_RENDER.lightX, lightY = STUDIO_RENDER.lightY, lightZ = STUDIO_RENDER.lightZ;
    // Scalars only in the surface loop: no vector arrays or per-point objects.
    for (let i = 0; i < points.length; i += 7) {
      const object = points[i + 6], offset = object * 24;
      if (palette[object].opacity <= 0.001) continue;
      const x = points[i], y = points[i + 1], z = points[i + 2];
      const px = transforms[offset] * x + transforms[offset + 4] * y + transforms[offset + 8] * z + transforms[offset + 12];
      const py = transforms[offset + 1] * x + transforms[offset + 5] * y + transforms[offset + 9] * z + transforms[offset + 13];
      const pz = transforms[offset + 2] * x + transforms[offset + 6] * y + transforms[offset + 10] * z + transforms[offset + 14];
      const distance = STUDIO_RENDER.focal - pz;
      if (distance <= STUDIO_RENDER.near || distance >= STUDIO_RENDER.far) continue;
      const a = points[i + 3], b = points[i + 4], c = points[i + 5];
      let nx = transforms[offset] * a + transforms[offset + 4] * b + transforms[offset + 8] * c;
      let ny = transforms[offset + 1] * a + transforms[offset + 5] * b + transforms[offset + 9] * c;
      let nz = transforms[offset + 2] * a + transforms[offset + 6] * b + transforms[offset + 10] * c;
      const normalLength = Math.max(0.00001, Math.hypot(nx, ny, nz));
      nx /= normalLength; ny /= normalLength; nz /= normalLength;
      const viewLength = Math.max(0.00001, Math.hypot(px, py, distance));
      const vx = -px / viewLength, vy = -py / viewLength, vz = distance / viewLength;
      if (nx * vx + ny * vy + nz * vz < -0.02) continue;
      const perspective = STUDIO_RENDER.focal / distance;
      const column = Math.floor((width * 0.5 + px * perspective * scale) / cellWidth);
      const row = Math.floor((height * 0.49 - py * perspective * scale) / cellHeight);
      if (column < 0 || row < 0 || column >= columns || row >= rows) continue;
      const cell = row * columns + column;
      if (pz < depths[cell]) continue;
      const diffuse = Math.max(0, nx * lightX + ny * lightY + nz * lightZ);
      const hx = lightX + vx, hy = lightY + vy, hz = lightZ + vz;
      const halfLength = Math.max(0.00001, Math.hypot(hx, hy, hz));
      const specular = Math.pow(Math.max(0, (nx * hx + ny * hy + nz * hz) / halfLength), STUDIO_RENDER.shininess);
      const brightness = clamp(STUDIO_RENDER.ambient + STUDIO_RENDER.diffuse * diffuse + STUDIO_RENDER.specular * specular, 0, 1);
      const cut = transforms[offset + 20] === 1 && Math.abs(x) < 0.001 && Math.abs(a) > 0.99;
      depths[cell] = pz; owners[cell] = object + (cut ? scene.objects.length : 0);
      shades[cell] = Math.round(brightness * (STUDIO_RENDER.shades - 1));
    }
    context.clearRect(0, 0, width, height);
    for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
      const cell = row * columns + column, object = owners[cell];
      if (object < 0) continue;
      const shade = shades[cell];
      const variation = ((column * 73 + row * 151 + column * row * 3) % 17) % 3 - 1;
      const glyph = dense ? 6 + (variation + 1)
        : clamp(3 + Math.floor((1 - shade / (STUDIO_RENDER.shades - 1)) * 6) + variation, 3, STUDIO_RENDER.glyphs.length - 1);
      context.globalAlpha = palette[object].opacity;
      if (cellAtlas) {
        context.drawImage(colorAtlas(object, shade), glyph * cellAtlas.stride + cellAtlas.padding, cellAtlas.padding,
          cellAtlas.glyphWidth, cellAtlas.glyphHeight, column * cellWidth, row * cellHeight, cellWidth, cellHeight);
      } else {
        context.drawImage(colorAtlas(object, shade), glyph * STUDIO_RENDER.atlasWidth, 0, STUDIO_RENDER.atlasWidth, STUDIO_RENDER.atlasHeight,
          column * cellWidth, row * cellHeight, cellWidth, cellHeight);
      }
    }
    context.globalAlpha = 1;
  }

  function fallback(why) {
    const old = gpu; gpu = null; old?.destroy();
    gpuCanvas?.remove(); gpuCanvas = null; canvas.style.visibility = '';
    report(context && atlas ? 'canvas2d' : 'static', why); drawCanvas();
  }

  function render(next) {
    if (disposed) return;
    if (next) {
      if (!(next.transforms instanceof Float32Array) || next.transforms.length !== scene.objects.length * 24) {
        throw new RangeError('Studio frame requires exactly 24 floats per object.');
      }
      frame = next;
    }
    stage.dataset.phase = typeof frame.phase === 'string' ? frame.phase : '';
    if (gpu) {
      try { gpu.render(frame); return; } catch { fallback('gpu-frame-failed'); }
    } else drawCanvas();
    schedule();
  }

  function resize() {
    if (disposed) return;
    const rect = stage.getBoundingClientRect();
    width = Math.max(1, rect.width); height = Math.max(1, rect.height);
    dpr = Math.min(globalThis.devicePixelRatio || 1, mobile.matches ? 1.25 : 1.5);
    // Align the character grid to physical pixels. Fractional cell edges create
    // alternating dark stripes when a small mobile canvas is composited.
    cellWidth = Math.round((mobile.matches ? 1.4 : 2.2) * dpr) / dpr;
    cellHeight = Math.round((mobile.matches ? 2 : 3.1) * dpr) / dpr;
    if (dense && sourceAtlas && (!cellAtlas || cellAtlas.glyphWidth !== Math.round(cellWidth*dpr)
      || cellAtlas.glyphHeight !== Math.round(cellHeight*dpr))) {
      // Filter each glyph once to the exact physical cell size. Direct browser
      // minification of thin strokes into 2–3px cells creates light scanlines.
      clearPalette();
      cellAtlas = makeStudioCellAtlas(sourceAtlas, cellWidth*dpr, cellHeight*dpr, {coverage: 1.45});
      atlas = cellAtlas.canvas;
    }
    scale = mobile.matches ? Math.min(width / 4.05, height / 3.1) : Math.min(width / 4.3, height / 2.45);
    canvas.width = Math.max(1, Math.round(width * dpr)); canvas.height = Math.max(1, Math.round(height * dpr));
    context?.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (context) { context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high'; }
    columns = Math.ceil(width / cellWidth); rows = Math.ceil(height / cellHeight);
    if (depths.length !== columns * rows) {
      depths = new Float32Array(columns * rows); owners = new Int32Array(columns * rows); shades = new Uint8Array(columns * rows);
    }
    if (gpu) {
      try { gpu.resize(width, height, dpr, cellWidth, cellHeight, scale); } catch { fallback('gpu-resize-failed'); }
    }
    render();
  }

  async function upgrade() {
    if (disposed || attempted || pending) return;
    const why = ineligible();
    if (why) { report(backend, why); return; }
    const bounds = stage.getBoundingClientRect();
    if (document.hidden || bounds.bottom < 0 || bounds.top > globalThis.innerHeight) return;
    pending = true; attempted = true;
    let candidate = null, candidateCanvas = null, lost = false;
    try {
      const {createStudioGPU} = await import('./studio-webgpu.js');
      if (disposed) return;
      candidateCanvas = document.createElement('canvas'); candidateCanvas.setAttribute('aria-hidden', 'true');
      candidateCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;visibility:hidden;pointer-events:none';
      stage.insertBefore(candidateCanvas, canvas);
      candidate = await createStudioGPU(candidateCanvas, {scene, atlas, onLost: why => {
        lost = true; if (gpu && gpu === candidate) fallback(why);
      }});
      const blocked = ineligible();
      if (disposed || lost || candidate.failed || blocked) {
        candidate.destroy(); candidateCanvas.remove();
        if (!disposed && blocked) { attempted = false; report(backend, blocked); }
        return;
      }
      // The language/scene may have changed while the device was initializing.
      candidate.setScene(scene);
      candidate.resize(width, height, dpr, cellWidth, cellHeight, scale); candidate.render(frame);
      gpu = candidate; gpuCanvas = candidateCanvas;
      canvas.style.visibility = 'hidden'; gpuCanvas.style.visibility = ''; report('webgpu');
    } catch (error) {
      candidate?.destroy(); candidateCanvas?.remove();
      if (!disposed) fallback(error.message || 'gpu-init-failed');
    } finally { pending = false; }
  }

  function schedule() {
    if (disposed || gpu || pending || attempted || idle || timer) return;
    const why = ineligible();
    if (why) { if (reason !== why) report(backend, why); return; }
    if ('requestIdleCallback' in globalThis) idle = requestIdleCallback(() => { idle = 0; void upgrade(); }, {timeout: 1400});
    else timer = setTimeout(() => { timer = 0; void upgrade(); }, 200);
  }

  async function prepare() {
    // Explicit startup preparation avoids switching renderer during the opening.
    if (idle) {cancelIdleCallback(idle);idle=0;}
    if (timer) {clearTimeout(timer);timer=0;}
    await upgrade();
  }

  function preferences() {
    const why = ineligible();
    if (why && gpu) fallback(why);
    else if (!why) { attempted = false; schedule(); }
    resize();
  }

  function setScene(next) {
    if (disposed) return;
    validateScene(next); scene = next; clearPalette();
    if (frame.transforms.length !== scene.objects.length * 24) frame = initialFrame(scene.objects.length);
    stage.dataset.surfacePoints = String(scene.points.length / 7);
    if (gpu) {
      try { gpu.setScene(scene); } catch { fallback('gpu-scene-failed'); }
    }
    render();
  }

  function destroy() {
    if (disposed) return;
    disposed = true;
    if (idle) cancelIdleCallback(idle); if (timer) clearTimeout(timer);
    gpu?.destroy(); gpuCanvas?.remove(); gpu = null; gpuCanvas = null;
    canvas.style.visibility = ''; clearPalette();
    reduced.removeEventListener('change', preferences); mobile.removeEventListener('change', preferences);
    connection?.removeEventListener?.('change', preferences);
    if (ownsCanvas) canvas.remove();
  }

  reduced.addEventListener('change', preferences); mobile.addEventListener('change', preferences);
  connection?.addEventListener?.('change', preferences);
  report(backend, ineligible()); resize();
  return {render, resize, setScene, prepare, destroy};
}
