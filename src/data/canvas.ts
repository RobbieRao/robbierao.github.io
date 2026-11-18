import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import home from '../../content/migration/home.json';
import { works, workPath } from './works';
import { to, type Lang } from '@/i18n';
import { imageSize } from '@/lib/media';

const publicFile = (path: string) => resolve('public', path.slice(1));
const alternateClips: Record<string, string> = {
  'art-therapy': '/videos/art-therapy.mp4',
  'performance-art': '/videos/performance-art.mp4',
  trailtracking: '/videos/trailtracking.mp4',
};
const boardOrder = ['disface3dnet', 'facial-social-traits', 'streetcure', 'shared-canvases', 'citycure',
  'flowing-ink', 'diva', 'art-therapy', 'contextcam', 'performance-art', 'trailtracking'];
const rank = new Map(boardOrder.map((id, index) => [id, index]));

const covers = new Map<string, Promise<string>>();
function preview(path: string) {
  const existing = covers.get(path);
  if (existing) return existing;
  const task = sharp(publicFile(path)).resize({ width: 96, withoutEnlargement: true })
    .webp({ quality: 66 }).toBuffer().then(data => 'data:image/webp;base64,' + data.toString('base64'));
  covers.set(path, task);
  return task;
}

async function motion(src: string) {
  const file = publicFile(src);
  const [{ size }, data] = await Promise.all([stat(file), readFile(file)]);
  return { type: 'video', src, bytes: size, version: createHash('sha256').update(data).digest('hex').slice(0, 12) };
}

const board = [...works].sort((a, b) => (rank.get(a.slug) ?? boardOrder.length) - (rank.get(b.slug) ?? boardOrder.length));

export async function canvasItems(lang: Lang) {
  return Promise.all(board.map(async work => {
    const { image, video } = work.cover;
    const clip = video ?? alternateClips[work.slug];
    const original = [...home.en.research, ...home.en.design].find(item => item.id === work.slug)?.image;
    const imageVersion = original?.startsWith(image + '?') ? new URL(original, 'https://example.invalid').searchParams.get('v') : undefined;
    const [size, thumbnail, media] = await Promise.all([imageSize(image), preview(image), clip ? motion(clip) : null]);
    return {
      id: work.slug, title: work.title, year: work.year, href: to(workPath(work) + '#notebook', lang),
      image, imageVersion, ...size, preview: thumbnail, media,
    };
  }));
}
