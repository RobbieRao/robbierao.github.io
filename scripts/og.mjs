import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { openSync } from 'fontkit';

const root = new URL('../', import.meta.url);
const require = createRequire(import.meta.url);
const { copy, site } = await import(new URL('src/data/site.ts', root));
const asset = path => fileURLToPath(new URL(path, root));
const inter = new Map([400, 500, 600].map(weight => [weight,
  openSync(require.resolve('@fontsource/inter/files/inter-latin-' + weight + '-normal.woff2'))]));
const paper = '#f6f4ee';
const ink = '#121210';
const accent = '#bb402a';

function label(content, weight, size, left, baseline, color = ink) {
  const face = inter.get(weight);
  const { glyphs, positions } = face.layout(content);
  const scale = size / face.unitsPerEm;
  let offset = 0;
  const paths = glyphs.map((glyph, index) => {
    const position = positions[index];
    const path = '<path d="' + glyph.path.toSVG() + '" transform="translate(' +
      (left + (offset + position.xOffset) * scale) + ' ' + (baseline - position.yOffset * scale) +
      ') scale(' + scale + ' ' + -scale + ')"/>';
    offset += position.xAdvance;
    return path;
  });
  if (left + offset * scale > 746) throw new Error('Text exceeds the card column: ' + content);
  return '<g fill="' + color + '">' + paths.join('') + '</g>';
}

const portrait = await sharp(asset('src/assets/portrait.png'))
  .extract({ left: 365, top: 155, width: 542, height: 854 })
  .resize(400, 630, { fit: 'cover' })
  .png().toBuffer();
const sealSource = await readFile(asset('public/favicon.svg'));
const seal = await sharp(sealSource, { density: 144 }).resize(34, 34).png().toBuffer();
const [first, second] = copy.hero.headline.en;
const labels = [
  label(site.name, 500, 27, 119, 95),
  label(first, 600, 61, 72, 254),
  label(second, 600, 54, 72, 332),
  label(copy.hero.eyebrow.en, 500, 21, 72, 471),
  label(new URL(site.url).hostname, 400, 19, 72, 561, '#6a6861'),
];
const artwork = Buffer.from('<svg width="800" height="630" xmlns="http://www.w3.org/2000/svg"><path d="M72 138H728M72 511H728M799 0V630" stroke="#dcd9cf"/><path d="M72 138H134" stroke="' +
  accent + '" stroke-width="2"/>' + labels.join('') + '</svg>');
await sharp({ create: { width: 1200, height: 630, channels: 3, background: paper } })
  .composite([{ input: portrait, left: 800, top: 0 }, { input: artwork, left: 0, top: 0 },
    { input: seal, left: 72, top: 69 }])
  .png({ palette: true, quality: 100 }).toFile(asset('public/og.png'));
console.log('Wrote public/og.png (1200×630).');
