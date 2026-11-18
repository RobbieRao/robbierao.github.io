import { createHash } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import sharp from 'sharp';

const widths = [480, 960, 1440];
const quality = 80;
const output = '/_covers/';

function sourcePath(path) {
  return resolve('public', path.slice(1));
}

export function coverFile(path, width, digest) {
  return output + basename(path, extname(path)) + '-' + digest + '-' + width + '.webp';
}

export async function coverPlan(path) {
  const input = await readFile(sourcePath(path));
  const { width, height } = await sharp(input).metadata();
  if (!width || !height) throw new Error('Missing image dimensions: ' + path);
  const digest = createHash('sha256').update(input).update('webp-q' + quality).digest('hex').slice(0, 12);
  const sizes = [...new Set(widths.map(size => Math.min(width, size)))];
  return { width, height, input, sizes, digest };
}

export function responsiveCovers(paths) {
  return {
    name: 'responsive-work-covers',
    hooks: {
      'astro:config:setup': async ({ command }) => {
        if (command !== 'dev' && command !== 'build') return;
        await mkdir(sourcePath(output), { recursive: true });
        await Promise.all([...new Set(paths)].map(async path => {
          const { input, sizes, digest } = await coverPlan(path);
          await Promise.all(sizes.map(async width => {
            const file = sourcePath(coverFile(path, width, digest));
            try {
              await access(file);
            } catch (error) {
              if (error.code !== 'ENOENT') throw error;
              const data = await sharp(input).resize({ width, withoutEnlargement: true }).webp({ quality }).toBuffer();
              await writeFile(file, data);
            }
          }));
        }));
      },
    },
  };
}
