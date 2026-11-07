import {addStudioTextLine, addStudioModels, sampleStudioBox, measureStudioTextLine} from './studio-geometry.js';

export const LOADING_PHRASES = ['research', 'design', 'business', 'motto'];

function phraseLines(phrase, language) {
  if (phrase !== 'motto') return [phrase];
  return language.startsWith('zh') ? ['寻找世界的', 'bug。'] : ['Looking for', "the world's", 'bugs.'];
}

// Text-only timing metadata; reading it does not mesh the other scenes.
export function loadingPhraseText(phrase, language = 'en') {
  return phraseLines(phrase, language).join('\n');
}

function retainModels(scene, phrase) {
  const wanted = phrase === 'research' ? ['viewfinder'] : phrase === 'design' ? ['weave']
    : ['viewfinder', 'weave', 'circuit'];
  const indices = new Map();
  const objects = scene.objects.filter(object => {
    const keep = object.kind !== 'model' || wanted.includes(object.model);
    if (keep) indices.set(object.index, indices.size);
    return keep;
  }).map(object => ({...object, index: indices.get(object.index), count: 0}));
  for (const object of objects) {
    if (Number.isInteger(object.parentIndex)) object.parentIndex = indices.get(object.parentIndex);
    if (Number.isInteger(object.faultIndex)) object.faultIndex = indices.get(object.faultIndex);
  }
  const kept = [];
  for (let at = 0; at < scene.points.length; at += 7) {
    const index = indices.get(scene.points[at + 6]);
    // The restrained front-facing camera never exposes a rear cap. Spend its
    // sample budget on dense front caps, rounded bevels and the real side walls.
    if (index === undefined || scene.points[at + 5] < -0.01) continue;
    for (let component = 0; component < 6; component++) kept.push(scene.points[at + component]);
    kept.push(index);
    objects[index].count++;
  }
  return {...scene, points: new Float32Array(kept), objects};
}

function build(phrase, language, spacing) {
  const lines = phraseLines(phrase, language);
  const points = [], objects = [], cursorStops = [];
  const motto = phrase === 'motto';
  const rowY = lines.length === 3 ? [0.70, 0.16, -0.58] : lines.length === 2 ? [0.40, -0.40] : [0.12];
  let typedAt = 0;
  lines.forEach((text, line) => {
    const width = motto ? 2.55 : 2.85;
    const em = Math.min(motto && line === lines.length - 1 ? 1.0 : 0.86,
      width / measureStudioTextLine(text));
    const measured = measureStudioTextLine(text, em);
    const start = objects.length;
    addStudioTextLine(points, objects, text, 'motto', em, 0.28, 0.018, spacing,
      {line, splitChar: motto && line === 1 ? (language.startsWith('zh') ? 'g' : 'o') : ''});
    let character = 0;
    for (let index = start; index < objects.length; index++) {
      const object = objects[index];
      if (object.kind === 'fault') {
        object.typeAt = objects[object.parentIndex].typeAt;
      } else {
        while (text[character] === ' ') character++;
        object.typeAt = typedAt + character;
        character++;
      }
      object.rowY = rowY[line];
      object.em = em;
    }
    for (let count = 0; count <= text.length; count++) {
      const prefix = text.slice(0, count);
      const trailingSpace = prefix.endsWith(' ') ? em * 0.29 : 0;
      cursorStops[typedAt + count] = {
        x: -measured / 2 + measureStudioTextLine(prefix, em) + trailingSpace + 0.07,
        y: rowY[line], height: Math.min(0.63, em * 0.72),
      };
    }
    typedAt += text.length;
    if (line < lines.length - 1) typedAt++;
  });
  const index = objects.length;
  sampleStudioBox((x, y, z, nx, ny, nz) => points.push(x, y, z, nx, ny, nz, index),
    [0, 0, 0], [0.035, 1, 0.22], spacing);
  objects.push({kind: 'cursor', index, count: 0});
  addStudioModels(points, objects, spacing);
  if (phrase === 'research') {
    // A probe crosses the letters behind their front faces; its paired marker
    // travels along the existing calibrated rail. Both are physical geometry.
    for (const [part, size] of [['scan', [0.022, 1.24, 0.035]], ['probe', [0.10, 0.06, 0.08]]]) {
      const index = objects.length;
      sampleStudioBox((x, y, z, nx, ny, nz) => points.push(x, y, z, nx, ny, nz, index),
        [0, 0, 0], size, spacing);
      objects.push({kind: 'model', model: 'viewfinder', part, index, count: 0});
    }
  }
  return retainModels({points, objects, phrase, lines, text: lines.join('\n'),
    displayText: lines.join(' '), cursorStops, rowY}, phrase);
}

/** One current phrase, never all phrases in one rendering point buffer. */
export function makeLoadingGeometry(phrase, language = 'en') {
  if (!LOADING_PHRASES.includes(phrase)) throw new RangeError('Unknown loading phrase.');
  let spacing = 0.0125;
  let scene = build(phrase, language, spacing);
  for (let attempt = 0; scene.points.length / 7 > 70000 && attempt < 8; attempt++) {
    spacing *= Math.max(1.07, Math.sqrt(scene.points.length / 7 / 66000));
    scene = build(phrase, language, spacing);
  }
  if (scene.points.length / 7 > 70000) throw new RangeError('Loading phrase exceeded its surface budget.');
  return scene;
}
