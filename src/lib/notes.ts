import { getEntry } from 'astro:content';
import { langPaths, type Lang } from '@/i18n';
import { works, type Kind, type Work } from '@/data/works';

export const notePaths = (kind: Kind | 'project') => langPaths().flatMap(({ params }) =>
  works.filter(work => kind === 'project' ? work.project : work.kind === kind).map(work => ({
    params: { ...params, slug: work.slug },
    props: { work },
  })),
);

export async function getNote(work: Work, lang: Lang, project = false) {
  const id = work.slug + '/' + (project ? 'project.' : '') + lang;
  const entry = await getEntry('notes', id);
  if (!entry) throw new Error('Missing note: ' + id);
  return entry;
}
