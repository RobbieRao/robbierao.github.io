// Local, system-font type solids with one letter split into two closed pieces.
// Seven floats per point: local position, outward normal, object index.
// Objects keep their own origin; only their fixed typesetting lives in offset.
const FONT_PX = 128;
const FONT = `800 ${FONT_PX}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", "Arial Unicode MS", sans-serif`;
const PI = Math.PI;
const MAX_POINTS = 110000;
const TARGET_POINTS = 104000;
const glyphCache = new Map();
let measureContext;

function canvas(width, height) {
  const surface = typeof document !== 'undefined'
    ? document.createElement('canvas')
    : new OffscreenCanvas(width, height);
  surface.width = width;
  surface.height = height;
  return surface;
}

function measure() {
  if (!measureContext) {
    measureContext = canvas(1, 1).getContext('2d', {willReadFrequently: true});
    if (!measureContext) throw new Error('Studio lettering requires a 2D canvas.');
    measureContext.font = FONT;
  }
  return measureContext;
}

// The two chamfer sweeps measure distance to the opposite side of the mask.
// Diagonal distances keep curves smooth without shipping a font or mesher.
function distance(mask, width, height, toInside) {
  const result = new Float32Array(mask.length);
  const diagonal = Math.SQRT2;
  for (let i = 0; i < mask.length; i++) result[i] = !!mask[i] === toInside ? 0 : 1e6;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * width + x;
    let d = result[i];
    if (x) d = Math.min(d, result[i - 1] + 1);
    if (y) {
      d = Math.min(d, result[i - width] + 1);
      if (x) d = Math.min(d, result[i - width - 1] + diagonal);
      if (x + 1 < width) d = Math.min(d, result[i - width + 1] + diagonal);
    }
    result[i] = d;
  }
  for (let y = height - 1; y >= 0; y--) for (let x = width - 1; x >= 0; x--) {
    const i = y * width + x;
    let d = result[i];
    if (x + 1 < width) d = Math.min(d, result[i + 1] + 1);
    if (y + 1 < height) {
      d = Math.min(d, result[i + width] + 1);
      if (x) d = Math.min(d, result[i + width - 1] + diagonal);
      if (x + 1 < width) d = Math.min(d, result[i + width + 1] + diagonal);
    }
    result[i] = d;
  }
  return result;
}

function glyph(char) {
  if (glyphCache.has(char)) return glyphCache.get(char);
  const metrics = measure().measureText(char);
  const left = metrics.actualBoundingBoxLeft || 0;
  const right = metrics.actualBoundingBoxRight || metrics.width;
  const ascent = metrics.actualBoundingBoxAscent || FONT_PX * .75;
  const descent = metrics.actualBoundingBoxDescent || 0;
  const padding = 5;
  const width = Math.ceil(left + right) + padding * 2 + 1;
  const height = Math.ceil(ascent + descent) + padding * 2 + 1;
  const surface = canvas(width, height);
  const context = surface.getContext('2d', {willReadFrequently: true});
  if (!context) throw new Error('Studio glyph rasterization failed.');
  context.font = FONT;
  context.textBaseline = 'alphabetic';
  context.fillStyle = '#fff';
  const originX = padding + left;
  const originY = padding + ascent;
  context.fillText(char, originX, originY);
  const rgba = context.getImageData(0, 0, width, height).data;
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < mask.length; i++) mask[i] = rgba[i * 4 + 3] >= 128 ? 1 : 0;
  const inside = distance(mask, width, height, false);
  const outside = distance(mask, width, height, true);
  const field = new Float32Array(mask.length);
  for (let i = 0; i < mask.length; i++) field[i] = mask[i] ? inside[i] - .5 : .5 - outside[i];
  const result = {
    width, height, field, advance: metrics.width,
    centerX: originX + (right - left) / 2,
    centerY: originY + (descent - ascent) / 2,
    centerFromOrigin: (right - left) / 2,
    centerAboveBaseline: (ascent - descent) / 2,
    ascent, descent, left, right,
  };
  glyphCache.set(char, result);
  return result;
}

function sample(g, x, y) {
  x = Math.max(0, Math.min(g.width - 1.001, x));
  y = Math.max(0, Math.min(g.height - 1.001, y));
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const i = iy * g.width + ix;
  const a = g.field[i] * (1 - fx) + g.field[i + 1] * fx;
  const b = g.field[i + g.width] * (1 - fx) + g.field[i + g.width + 1] * fx;
  return a * (1 - fy) + b * fy;
}

function outward(g, x, y) {
  const dx = sample(g, x + 1, y) - sample(g, x - 1, y);
  const dy = sample(g, x, y + 1) - sample(g, x, y - 1);
  const length = Math.hypot(dx, dy);
  return length > 1e-5 ? [-dx / length, dy / length] : [0, 0];
}

// Marching squares traces both external outlines and letter counters. Shared
// edge keys join cell segments before arc-length sampling, avoiding dense rows
// of points at individual raster pixels and preserving continuous side walls.
function contours(g, level, step) {
  const vertices = new Map();
  const verticalBase = g.width * g.height;
  const pairs = [[], [[3, 0]], [[0, 1]], [[3, 1]], [[1, 2]], null,
    [[0, 2]], [[3, 2]], [[2, 3]], [[2, 0]], null, [[2, 1]],
    [[1, 3]], [[1, 0]], [[0, 3]], []];
  for (let y = 0; y < g.height - 1; y++) for (let x = 0; x < g.width - 1; x++) {
    const i = y * g.width + x;
    const values = [g.field[i], g.field[i + 1], g.field[i + g.width + 1], g.field[i + g.width]];
    const code = (values[0] >= level ? 1 : 0) | (values[1] >= level ? 2 : 0)
      | (values[2] >= level ? 4 : 0) | (values[3] >= level ? 8 : 0);
    if (!code || code === 15) continue;
    let links = pairs[code];
    if (!links) {
      const centerInside = (values[0] + values[1] + values[2] + values[3]) / 4 >= level;
      links = (code === 5) === centerInside ? [[0, 1], [2, 3]] : [[3, 0], [1, 2]];
    }
    const corners = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]];
    const keys = [i, verticalBase + i + 1, i + g.width, verticalBase + i];
    const edgeVertex = edge => {
      const key = keys[edge];
      if (!vertices.has(key)) {
        const next = (edge + 1) % 4;
        const t = (level - values[edge]) / (values[next] - values[edge]);
        const a = corners[edge], b = corners[next];
        vertices.set(key, {x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, links: []});
      }
      return key;
    };
    for (const [a, b] of links) {
      const ka = edgeVertex(a), kb = edgeVertex(b);
      vertices.get(ka).links.push(kb);
      vertices.get(kb).links.push(ka);
    }
  }
  const visited = new Set(), result = [];
  for (const [start] of vertices) {
    if (visited.has(start)) continue;
    const path = [];
    let current = start, previous = -1;
    do {
      const vertex = vertices.get(current);
      path.push(vertex);
      visited.add(current);
      const next = vertex.links.find(key => key !== previous);
      previous = current;
      current = next;
    } while (current !== undefined && current !== start && !visited.has(current));
    if (path.length < 3) continue;
    const lengths = [];
    let total = 0;
    for (let i = 0; i < path.length; i++) {
      const a = path[i], b = path[(i + 1) % path.length];
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      lengths.push(length);
      total += length;
    }
    const count = Math.max(3, Math.ceil(total / step));
    let segment = 0, before = 0;
    for (let i = 0; i < count; i++) {
      const position = total * i / count;
      while (segment + 1 < path.length && before + lengths[segment] < position) before += lengths[segment++];
      const a = path[segment], b = path[(segment + 1) % path.length];
      const t = lengths[segment] > 1e-8 ? (position - before) / lengths[segment] : 0;
      const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
      const normal = outward(g, x, y);
      result.push([x, y, normal[0], normal[1]]);
    }
  }
  return result;
}

function letterPoints(points, objectIndex, g, em, depth, bevel, spacing, yOffset = 0, faultIndex = -1) {
  const scale = em / FONT_PX, step = spacing / scale, halfDepth = depth / 2;
  const bevelPixels = bevel / scale;
  let count = 0, faultCount = 0;
  const emit = (x, y, z, nx, ny, nz, owner) => {
    points.push(x, y, z, nx, ny, nz, owner);
    if (owner === objectIndex) count++; else faultCount++;
  };
  const put = (x, y, z, nx, ny, nz) => {
    const localX = (x + .5 - g.centerX) * scale;
    emit(localX, (g.centerY - y - .5) * scale + yOffset, z, nx, ny, nz,
      faultIndex >= 0 && localX > 0 ? faultIndex : objectIndex);
  };
  // A cap covers every occupied pixel, including strokes narrower than twice
  // the bevel. Their rounded crest remains closed instead of losing the stroke
  // when an inward-offset outline disappears at its medial axis.
  for (let y = .5; y < g.height - 1; y += step) for (let x = .5; x < g.width - 1; x += step) {
    const d = sample(g, x, y);
    if (d < 0) continue;
    const radial = Math.max(0, 1 - d / bevelPixels);
    const nz = Math.sqrt(Math.max(0, 1 - radial * radial));
    const z = halfDepth - bevel + bevel * nz;
    const [nx, ny] = radial ? outward(g, x, y) : [0, 0];
    const length = Math.hypot(nx * radial, ny * radial, nz);
    const inv = length > 1e-6 ? 1 / length : 0;
    put(x, y, z, nx * radial * inv, ny * radial * inv, inv ? nz * inv : 1);
    put(x, y, -z, nx * radial * inv, ny * radial * inv, inv ? -nz * inv : -1);
  }
  const outline = contours(g, 0, step);
  const wallDepth = depth - bevel * 2;
  const wallSteps = Math.max(2, Math.ceil(wallDepth / spacing));
  for (const [x, y, nx, ny] of outline) for (let layer = 0; layer <= wallSteps; layer++) {
    put(x, y, -wallDepth / 2 + wallDepth * layer / wallSteps, nx, ny, 0);
  }
  // Circular quarter sections add samples where the cap becomes nearly
  // vertical. Each inset contour has analytic, rounded bevel normals.
  const bevelSteps = Math.max(4, Math.ceil(bevel * PI / 2 / spacing));
  for (let layer = 1; layer < bevelSteps; layer++) {
    const angle = layer / bevelSteps * PI / 2;
    const radial = Math.cos(angle), nz = Math.sin(angle);
    const ring = contours(g, bevelPixels * (1 - radial), step);
    const z = halfDepth - bevel + bevel * nz;
    for (const [x, y, nx, ny] of ring) {
      put(x, y, z, nx * radial, ny * radial, nz);
      put(x, y, -z, nx * radial, ny * radial, -nz);
    }
  }
  if (faultIndex >= 0) {
    // Intersect the same beveled solid with x=0. Counters remain open because
    // the cut only covers occupied mask intervals, with its actual bevel depth.
    const cutX = g.centerX - .5;
    for (let y = .5; y < g.height - 1; y += step) {
      const d = sample(g, cutX, y);
      if (d < 0) continue;
      const radial = Math.max(0, 1 - d / bevelPixels);
      const extent = halfDepth - bevel + bevel * Math.sqrt(Math.max(0, 1 - radial * radial));
      const layers = Math.max(2, Math.ceil(extent * 2 / spacing));
      const localY = (g.centerY - y - .5) * scale + yOffset;
      for (let layer = 0; layer <= layers; layer++) {
        const z = -extent + extent * 2 * layer / layers;
        emit(0, localY, z, 1, 0, 0, objectIndex);
        emit(0, localY, z, -1, 0, 0, faultIndex);
      }
    }
  }
  return {count, faultCount};
}

function addLine(points, objects, text, kind, em, depth, bevel, spacing, {line = 0, accentWord = '', splitChar = ''} = {}) {
  const chars = [...text], scale = em / FONT_PX, tracking = em * .018;
  const advances = chars.map(char => measure().measureText(char).width * scale);
  const ink = chars.filter(char => char !== ' ').map(glyph);
  const baseline = -(Math.max(...ink.map(g => g.ascent)) - Math.max(...ink.map(g => g.descent))) * scale / 2;
  // Center the visible run, rather than including asymmetric end bearings.
  let cursor = 0, leftEdge = Infinity, rightEdge = -Infinity;
  for (let position = 0; position < chars.length; position++) {
    if (chars[position] !== ' ') {
      const g = glyph(chars[position]);
      leftEdge = Math.min(leftEdge, cursor - g.left * scale);
      rightEdge = Math.max(rightEdge, cursor + g.right * scale);
    }
    cursor += advances[position] + tracking;
  }
  const center = (leftEdge + rightEdge) / 2;
  const accentStart = accentWord ? text.indexOf(accentWord) : -1;
  let splitDone = false;
  cursor = 0;
  chars.forEach((char, position) => {
    if (char !== ' ') {
      const g = glyph(char), index = objects.length;
      const object = {
        kind, index, count: 0, char, line,
        offset: [cursor + g.centerFromOrigin * scale - center, 0, 0],
        accent: accentStart >= 0 && position >= accentStart && position < accentStart + accentWord.length,
      };
      objects.push(object);
      let fault;
      if (!splitDone && char === splitChar) {
        fault = {kind: 'fault', index: objects.length, parentIndex: index,
          count: 0, char, line, offset: [...object.offset], accent: true};
        object.faultIndex = fault.index;
        objects.push(fault); splitDone = true;
      }
      // Bake baseline alignment into local geometry: every offset.y remains 0,
      // leaving the controller free to place and articulate each complete line.
      const yOffset = baseline + g.centerAboveBaseline * scale;
      const counts = letterPoints(points, index, g, em, depth, bevel, spacing, yOffset, fault?.index ?? -1);
      object.count = counts.count;
      if (fault) fault.count = counts.faultCount;
    }
    cursor += advances[position] + tracking;
  });
}

// Small, recognizable tools share the same surface renderer as the type.
// They are modeled here rather than fetched as decorative 3D assets.
function addStudyObject(points, objects, model, part, make) {
  const index = objects.length, before = points.length;
  const put = (x, y, z, nx, ny, nz) => points.push(x, y, z, nx, ny, nz, index);
  make(put);
  objects.push({kind: 'model', model, part, index, count: (points.length - before) / 7});
}

function box(put, center, size, step) {
  for (let axis = 0; axis < 3; axis++) {
    const a = (axis + 1) % 3, b = (axis + 2) % 3;
    const na = Math.max(2, Math.ceil(size[a] / step)), nb = Math.max(2, Math.ceil(size[b] / step));
    for (const side of [-1, 1]) for (let i = 0; i <= na; i++) for (let j = 0; j <= nb; j++) {
      const p = [...center], n = [0, 0, 0];
      p[axis] += side * size[axis] / 2;
      p[a] += size[a] * (i / na - .5); p[b] += size[b] * (j / nb - .5); n[axis] = side;
      put(...p, ...n);
    }
  }
}

function tube(put, path, radius, step) {
  const sides = Math.max(6, Math.ceil(radius * PI * 2 / step));
  for (let section = 0; section < path.length - 1; section++) {
    const a = path[section], b = path[section + 1], d = b.map((v, i) => v - a[i]);
    const length = Math.hypot(...d); if (length < 1e-6) continue;
    const t = d.map(v => v / length), up = Math.abs(t[2]) < .9 ? [0, 0, 1] : [0, 1, 0];
    let u = [t[1] * up[2] - t[2] * up[1], t[2] * up[0] - t[0] * up[2], t[0] * up[1] - t[1] * up[0]];
    const ul = Math.hypot(...u); u = u.map(v => v / ul);
    const v = [t[1] * u[2] - t[2] * u[1], t[2] * u[0] - t[0] * u[2], t[0] * u[1] - t[1] * u[0]];
    const steps = Math.max(1, Math.ceil(length / step));
    for (let i = 0; i <= steps; i++) for (let j = 0; j < sides; j++) {
      const angle = j / sides * PI * 2, c = Math.cos(angle), s = Math.sin(angle);
      const n = u.map((x, k) => x * c + v[k] * s);
      put(...a.map((x, k) => x + d[k] * i / steps + n[k] * radius), ...n);
    }
  }
}

function studyModels(points, objects, spacing) {
  const step = Math.max(.019, spacing * 1.15);
  addStudyObject(points, objects, 'viewfinder', 'frame', put => {
    // Four solid corner brackets and a fine calibrated lower rail.
    for (const x of [-1, 1]) for (const y of [-1, 1]) {
      box(put, [x * 1.54, y * .87, 0], [.43, .055, .095], step);
      box(put, [x * 1.73, y * .69, 0], [.055, .39, .095], step);
    }
    box(put, [0, -.91, -.025], [2.65, .025, .055], step);
    for (let i = -8; i <= 8; i++) box(put, [i * .15, -.87, .005], [.018, i % 4 === 0 ? .12 : .055, .04], step);
  });
  addStudyObject(points, objects, 'weave', 'warp', put => {
    // Over-under crossings and a curved edge give the swatch actual thickness.
    for (let i = 0; i < 9; i++) {
      const path = [];
      for (let j = 0; j <= 32; j++) {
        const x = -.40 + j * .025, y = -.32 + i * .08;
        path.push([x, y, .12 * Math.sin(x * 3.3) + .029 * Math.cos((x + .40) / .08 * PI) * (i % 2 ? -1 : 1)]);
      }
      tube(put, path, .026, step);
    }
  });
  addStudyObject(points, objects, 'weave', 'weft', put => {
    for (let i = 0; i < 11; i++) {
      const path = [];
      for (let j = 0; j <= 26; j++) {
        const x = -.40 + i * .08, y = -.32 + j * .025;
        path.push([x, y, .12 * Math.sin(x * 3.3) - .029 * Math.cos((y + .32) / .08 * PI) * (i % 2 ? -1 : 1)]);
      }
      tube(put, path, .026, step);
    }
  });
  addStudyObject(points, objects, 'circuit', 'board', put => {
    box(put, [0, 0, 0], [.80, .54, .075], step);
  });
  addStudyObject(points, objects, 'circuit', 'chip', put => {
    box(put, [0, 0, .095], [.28, .23, .12], step);
    for (let i = -2; i <= 2; i++) for (const side of [-1, 1]) {
      box(put, [i * .05, side * .15, .07], [.018, .09, .028], step);
      box(put, [side * .18, i * .04, .07], [.09, .018, .028], step);
    }
  });
  addStudyObject(points, objects, 'circuit', 'traces', put => {
    for (let i = -2; i <= 2; i++) for (const side of [-1, 1]) {
      const x = i * .06, y = side * .23;
      tube(put, [[x, side * .19, .046], [x + side * .035, y, .046], [x + side * .13, y, .046]], .012, step);
      box(put, [x + side * .13, y, .049], [.034, .034, .018], step);
    }
  });
}

function build(language, spacing) {
  const points = [], objects = [];
  addLine(points, objects, 'robbie.', 'name', .56, .23, .017, spacing);
  addLine(points, objects, 'portfolio.', 'portfolio', .50, .23, .017, spacing);
  if (language === 'zh') {
    addLine(points, objects, '寻找', 'motto', .42, .18, .018, spacing, {line: 0});
    addLine(points, objects, '世界的', 'motto', .50, .24, .018, spacing, {line: 1, splitChar: '界'});
    addLine(points, objects, 'bug。', 'motto', .65, .28, .018, spacing, {line: 2, accentWord: 'bug'});
  } else {
    addLine(points, objects, 'Looking for', 'motto', .42, .18, .018, spacing, {line: 0});
    addLine(points, objects, "the world's", 'motto', .42, .24, .018, spacing, {line: 1, splitChar: 'o'});
    addLine(points, objects, 'bugs.', 'motto', .65, .28, .018, spacing, {line: 2, accentWord: 'bugs'});
  }
  studyModels(points, objects, spacing);
  return {points: new Float32Array(points), objects};
}

export function makeStudioGeometry(language = 'en', {compact = false} = {}) {
  const budget = compact ? 70000 : MAX_POINTS, target = compact ? 65000 : TARGET_POINTS;
  let spacing = compact ? .0165 : .0135, result = build(language, spacing);
  // Adjust whole-surface density; neither half of the fault loses its cap,
  // reverse surface or side wall when a smaller device needs fewer samples.
  for (let attempt = 0; result.points.length / 7 > budget && attempt < 8; attempt++) {
    spacing *= Math.max(1.08, Math.sqrt(result.points.length / 7 / target));
    result = build(language, spacing);
  }
  if (result.points.length / 7 > budget) throw new RangeError('Studio geometry exceeded its surface-point budget.');
  return result;
}

// Reusable sampling primitives for short-lived loading scenes. The original
// scene builder above keeps its existing geometry and opening sequence.
export {addLine as addStudioTextLine, studyModels as addStudioModels, box as sampleStudioBox};

export function measureStudioTextLine(text, em = 1) {
  const scale = em / FONT_PX, tracking = em * .018;
  let cursor = 0, left = Infinity, right = -Infinity;
  for (const char of text) {
    if (char !== ' ') {
      const shape = glyph(char);
      left = Math.min(left, cursor - shape.left * scale);
      right = Math.max(right, cursor + shape.right * scale);
    }
    cursor += measure().measureText(char).width * scale + tracking;
  }
  return Number.isFinite(left) ? right - left : 0;
}
