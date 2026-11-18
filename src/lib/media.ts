import { resolve } from 'node:path';
import sharp from 'sharp';
import { coverFile, coverPlan } from './cover-variants.mjs';

type Dimensions = { width: number; height: number };
const sizes = new Map<string, Promise<Dimensions>>();

export function imageSize(publicPath: string): Promise<Dimensions> {
  const pathname = publicPath.split(/[?#]/)[0];
  const cached = sizes.get(pathname);
  if (cached) return cached;

  const size = sharp(resolve('public', pathname.slice(1))).metadata().then(({ width, height }) => {
    if (!width || !height) throw new Error('Missing image dimensions: ' + pathname);
    return { width, height };
  });
  sizes.set(pathname, size);
  return size;
}

type ResponsiveCover = Dimensions & { srcset: string };
const covers = new Map<string, Promise<ResponsiveCover>>();

export function responsiveCover(path: string): Promise<ResponsiveCover> {
  const cached = covers.get(path);
  if (cached) return cached;

  const result = coverPlan(path).then(({ width, height, sizes, digest }) => ({
    width, height,
    srcset: sizes.map(size => coverFile(path, size, digest) + ' ' + size + 'w').join(', '),
  }));
  covers.set(path, result);
  return result;
}
