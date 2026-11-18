import home from '../../content/migration/home.json';
import metadata from '../../content/migration/works-meta.json';
import type { Bi, Lang } from '@/i18n';
import { site } from './site';

export const themes = ['perception', 'interaction', 'art', 'design'] as const;
export type Theme = typeof themes[number];
export type Kind = 'research' | 'design';
export type Author = { name: string; me?: boolean; corresponding?: boolean };
type Link = { label: string; href: string; cls: string };
type Project = {
  title: string; subtitle: string; summary: string; contribution: string; links: Link[]; bibtex: string;
};
type Meta = {
  eyebrow: Bi; title: Bi; lead: Bi; role?: Bi; authors?: Bi;
  links?: Record<Lang, Link[]>; facts?: Record<Lang, string[][]>; project?: Record<Lang, Project>;
};

export interface Work {
  slug: string;
  kind: Kind;
  year: string;
  name: Bi;
  subtitle?: Bi;
  title: Bi;
  summary: Bi;
  lead: Bi;
  role?: Bi;
  themes: Theme[];
  tags?: Bi[];
  cover: { image: string; alt: Bi; video?: string; mount?: boolean };
  venue?: { short: string; full: string; status?: string };
  authors?: Author[];
  links: { paper?: string; code?: string; codeSoon?: string; project?: string };
  featured?: number;
  project?: Record<Lang, Project>;
}

const meta: Record<string, Meta> = metadata;
const featuredOrder = ['disface3dnet', 'facial-social-traits', 'contextcam', 'flowing-ink'];
const photoCovers = new Set(['flowing-ink', 'art-therapy', 'performance-art', 'trailtracking']);
const videoCovers: Record<string, string> = {
  contextcam: '/videos/contextcam.mp4',
  'flowing-ink': '/videos/flowing-ink.mp4',
};
const stripTags = (html: string) => html.replace(/<[^>]+>/g, '').replaceAll('&amp;', '&');
const upright = (path: string) => path.replace(/\/([^/]+)\.webp$/, '/$1-upright.webp');
const pathOnly = (url: string) => url.split('?')[0];
const categories = (value: string) => themes.filter(theme => value.split(' ').includes(theme));
const firstSentence = (lead: string, lang: Lang) =>
  new Intl.Segmenter(lang, { granularity: 'sentence' }).segment(lead)[Symbol.iterator]().next().value?.segment.trim() ?? lead;

function authorsFrom(html: string): Author[] {
  const list = html.replace(/<\/?strong>/g, '').replaceAll('<sup>*</sup>', '*');
  return list.replace(/\.$/, '').split(/,\s*(?:and\s+)?|\s+and\s+/).map(author => {
    const name = author.replace(/\*$/, '');
    return { name, me: name === site.publicationName, corresponding: author.endsWith('*') };
  });
}

function splitTitle(title: Bi) {
  const split = (text: string) => text.match(/^(.+?)[:：]\s*(.+)$/s);
  const en = split(title.en);
  const zh = split(title.zh);
  return {
    name: { en: en?.[1] ?? title.en, zh: zh?.[1] ?? title.zh },
    subtitle: en || zh ? { en: en?.[2] ?? '', zh: zh?.[2] ?? '' } : undefined,
  };
}

export const publications: Work[] = home.en.research.map(item => {
  const slug = item.id;
  const zh = home.zh.research.find(entry => entry.id === slug)!;
  const { title, lead, role, project } = meta[slug];
  const year = meta[slug].eyebrow.en.match(/\d{4}$/)![0];
  const status = item.venue.match(/<span class="publication-status">([^<]+)<\/span>/)?.[1];
  const full = stripTags(item.venue).replace(/ · (Preprint|Accepted \/ In press)$/, '');
  const links = Object.fromEntries(item.links.flatMap(([label, href]) => {
    const keys: Record<string, string> = { Paper: 'paper', Project: 'project', Code: 'code', 'Code (soon)': 'codeSoon' };
    return keys[label] ? [[keys[label], href]] : [];
  }));
  const featured = featuredOrder.indexOf(slug);
  return {
    slug, kind: 'research', year, title, ...splitTitle(title), lead, role, project,
    summary: { en: firstSentence(lead.en, 'en'), zh: firstSentence(lead.zh, 'zh') },
    themes: categories(item.categories),
    cover: { image: pathOnly(item.image), alt: { en: item.imageAlt, zh: zh.imageAlt }, video: videoCovers[slug], mount: !photoCovers.has(slug) },
    venue: { short: item.label.replace(/\d{4}$/, ''), full, status },
    authors: authorsFrom(item.authors), links,
    featured: featured < 0 ? undefined : featured,
  };
});

export const designs: Work[] = home.en.design.map(item => {
  const slug = item.id;
  const zh = home.zh.design.find(entry => entry.id === slug)!;
  const { title, lead, role, facts } = meta[slug];
  const year = facts?.en[0][1] ?? item.meta.split(' · ')[0];
  const enTags = item.meta.split(' · ').slice(1);
  const zhTags = zh.meta.split(' · ').slice(1);
  return {
    slug, kind: 'design', year, title, ...splitTitle(title), lead, role,
    summary: { en: item.summary, zh: zh.summary },
    themes: categories(item.categories),
    tags: enTags.map((en, i) => ({ en, zh: zhTags[i] ?? en })),
    cover: {
      image: slug === 'digital-human' ? upright(pathOnly(item.image)) : pathOnly(item.poster || item.image),
      alt: slug === 'digital-human'
        ? { en: 'Upright digital character in a physical display with speakers below', zh: '实体显示装置中的数字角色，下方为音箱' }
        : { en: item.summary, zh: zh.summary },
      video: item.video ? pathOnly(item.video) : undefined,
    },
    links: {},
  };
});

export const works = [...publications, ...designs];
export const featuredWorks = featuredOrder.map(slug => publications.find(work => work.slug === slug)!);
export const publicationGroups = (['perception', 'interaction', 'art'] as const).map((theme, index) => ({
  theme,
  title: { en: home.en.topics[index], zh: home.zh.topics[index] },
  works: publications.filter(work => work.themes.includes(theme) &&
    (theme !== 'interaction' || !work.themes.includes('art'))),
}));

export const workPath = (work: Work) => '/' + work.kind + '/' + work.slug + '/';
