import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { rmdir, unlink, writeFile } from 'node:fs/promises';
import legacyRoutes from './content/legacy-routes.json' with { type: 'json' };
import home from './content/migration/home.json' with { type: 'json' };
import { responsiveCovers } from './src/lib/cover-variants.mjs';

const coverPaths = [
  ...home.en.research.map(item => item.image.split('?')[0]),
  ...home.en.design.map(item => item.id === 'digital-human'
    ? '/images/design/digital-human/cover-upright.webp'
    : (item.poster || item.image).split('?')[0]),
];

const works = Object.fromEntries([
  ...home.en.research.map(({ id }) => [id, '/research/' + id + '/']),
  ...home.en.design.map(({ id }) => [id, '/design/' + id + '/']),
  ['art-tutor', '/design/artisense/'],
]);
const landing = { research: '/#research', design: '/#practice', about: '/#about' };
const legacyTarget = target => {
  const slug = target.startsWith('/#') ? target.slice(2) : '';
  return slug ? works[slug] ?? landing[slug] ?? target : target;
};
const redirects = Object.fromEntries(Object.entries({
  ...legacyRoutes, '/notebooks/': '/canvas/',
}).map(([from, target]) => [
  from.endsWith('/') || from.endsWith('.html') ? from : from + '/',
  legacyTarget(target),
]));
const directory = path => path.endsWith('/') ? path + 'index.html' : path;
const escapeAttribute = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');

function legacyPage(from, fallback) {
  const archive = from === '/notebooks/';
  const script = 'const page=new URL(location.href);const destination=new URL(' + JSON.stringify(fallback) +
    ',page);const chinese=page.searchParams.get("lang")==="zh";' +
    (archive ? 'destination.hash=page.hash;' : '') +
    'if(chinese)destination.pathname="/zh"+destination.pathname;location.replace(destination);';
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Page moved · Robbie Rao</title><meta name="robots" content="noindex,follow"><script>' +
    script + '</script><meta http-equiv="refresh" content="0; url=' + escapeAttribute(fallback) +
    '"></head><body><main><h1>Page moved</h1><p><a href="' + escapeAttribute(fallback) + '">Continue to the new page</a></p></main></body></html>';
}

const legacy = {
  name: 'legacy-pages',
  hooks: {
    'astro:build:done': async ({ dir }) => {
      await Promise.all(Object.entries(redirects).map(async ([from, fallback]) => {
        const output = new URL(directory(from).slice(1), dir);
        // Astro creates the route. Supply its metadata and preserve query/fragment behavior.
        if (from.endsWith('.html')) {
          await unlink(new URL(directory(from + '/').slice(1), dir));
          await rmdir(output);
        }
        await writeFile(output, legacyPage(from, fallback));
      }));
    },
  },
};

export default defineConfig({
  site: 'https://robbierao.github.io',
  trailingSlash: 'always',
  compressHTML: true,
  markdown: { syntaxHighlight: false },
  redirects,
  integrations: [responsiveCovers(coverPaths), sitemap({ filter: url => !Object.hasOwn(redirects, new URL(url).pathname) }), legacy],
});
