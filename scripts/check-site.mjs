import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { parse } from 'parse5';

const root = new URL('../dist/', import.meta.url);
const origin = 'https://robbierao.github.io';
const limit = 15 * 1024;
const files = new Set((await readdir(root, { recursive: true, withFileTypes: true }))
  .filter(entry => entry.isFile()).map(entry => relative(fileURLToPath(root), join(entry.parentPath, entry.name)).replaceAll('\\', '/')));
const pages = new Map();
const scripts = new Set();
const canvasDirectory = 'assets/canvas/';
const canvasPages = new Set(['canvas/index.html', 'zh/canvas/index.html']);
const inline = new Set();
const errors = [];

const walk = function* (node) {
  yield node;
  for (const child of node.childNodes ?? []) yield* walk(child);
};
const attr = (node, key) => node?.attrs?.find(attribute => attribute.name === key)?.value;
const text = node => node.childNodes?.map(child => child.value ?? '').join('').trim() ?? '';
const read = file => readFile(new URL(file.split('/').map(encodeURIComponent).join('/'), root), 'utf8');

for (const file of files) {
  if (!file.endsWith('.html')) continue;
  const nodes = Array.from(walk(parse(await read(file))));
  const ids = new Set();
  const report = message => errors.push(file + ' — ' + message);
  if (!attr(nodes.find(node => node.tagName === 'html'), 'lang')) report('missing html lang');
  if (!text(nodes.find(node => node.tagName === 'title') ?? {})) report('missing title');
  if (!nodes.some(node => node.tagName === 'meta' && attr(node, 'name') === 'viewport' && attr(node, 'content'))) report('missing viewport');
  if (nodes.filter(node => node.tagName === 'h1').length !== 1) report('expected one h1');
  for (const node of nodes) {
    const id = attr(node, 'id');
    if (id && ids.has(id)) report('duplicate id #' + id);
    if (id) ids.add(id);
    if (node.tagName === 'img') {
      if (attr(node, 'alt') === undefined) report('missing alt on ' + attr(node, 'src'));
      if (![attr(node, 'width'), attr(node, 'height')].every(value => /^\d+$/.test(value ?? '') && +value > 0)) {
        report('missing intrinsic image dimensions on ' + attr(node, 'src'));
      }
    }
    if (node.tagName === 'script') {
      const src = attr(node, 'src');
      const type = attr(node, 'type');
      if (src) {
        scripts.add(src);
        if (src.startsWith('/' + canvasDirectory) && !canvasPages.has(file)) report('canvas runtime must load only on canvas routes');
      }
      else if (!type || type === 'module' || type === 'text/javascript') inline.add(text(node));
    }
  }
  pages.set(file, { nodes, ids });
}

function resolveLocal(url, file) {
  let target;
  try { target = new URL(url, origin + '/' + file.replace(/index\.html$/, '')); }
  catch { errors.push(file + ' — invalid URL ' + url); return; }
  if (target.origin !== origin) return;
  try {
    const path = decodeURIComponent(target.pathname).slice(1);
    const targetFile = files.has(path) ? path : (path && !path.endsWith('/') ? path + '/' : path) + 'index.html';
    if (!files.has(targetFile)) errors.push(file + ' — missing local target ' + url);
    else if (target.hash && pages.has(targetFile) && !pages.get(targetFile).ids.has(decodeURIComponent(target.hash.slice(1)))) {
      errors.push(file + ' — missing anchor ' + url);
    }
  } catch { errors.push(file + ' — invalid URL encoding ' + url); }
}

for (const [file, { nodes }] of pages) {
  for (const node of nodes) {
    for (const key of ['href', 'src', 'poster', 'data-src']) {
      const value = attr(node, key);
      if (value) resolveLocal(value, file);
    }
    const srcset = attr(node, 'srcset');
    if (srcset) for (const value of srcset.split(',')) resolveLocal(value.trim().split(/\s+/)[0], file);
    if (node.tagName === 'meta' && attr(node, 'http-equiv') === 'refresh') {
      const url = attr(node, 'content')?.match(/;\s*url=(.+)$/i)?.[1];
      if (url) resolveLocal(url, file);
    }
  }
}

const bundled = [...files].filter(file => file.startsWith('_astro/') && /\.(?:m?js)$/.test(file));
const assets = new Set([...bundled, ...[...scripts].filter(src => src.startsWith('/')).map(src => src.slice(1))]);
const canvasAssets = [...files].filter(file => file.startsWith(canvasDirectory) && /\.m?js$/.test(file));
const assetText = await Promise.all([...assets].filter(file => files.has(file) && !file.startsWith(canvasDirectory)).map(read));
const canvasBytes = (await Promise.all(canvasAssets.map(read))).reduce((size, script) => size + gzipSync(script).length, 0);
const gzipBytes = [...inline, ...assetText].filter(Boolean).reduce((size, script) => size + gzipSync(script).length, 0);
if (gzipBytes > limit) errors.push('Total unique JavaScript exceeds 15 KiB gzip: ' + gzipBytes + ' bytes.');
if (!pages.size) errors.push('No HTML found in dist. Run npm run build first.');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Checked ' + pages.size + ' HTML pages: metadata, IDs, images, links and anchors passed.');
  console.log('General JavaScript: ' + gzipBytes + ' bytes gzip (' + (gzipBytes / 1024).toFixed(2) + ' KiB).');
  console.log('Canvas-only JavaScript: ' + canvasBytes + ' bytes gzip. Total: ' + (gzipBytes + canvasBytes) + ' bytes gzip.');
}
