import home from '../../content/migration/home.json';
import type { Bi } from '@/i18n';
import { workPath, works } from './works';

const recognitions: Record<string, Bi> = {
  '2026-08-14': {
    en: '<a href="/research/flowing-ink/#notebook">Flowing Ink Resonator</a> selected for the technical demo and design works program at <strong>HMCC 2026</strong>.',
    zh: '<a href="/research/flowing-ink/#notebook">Flowing Ink Resonator</a> 入选<strong>第二届中国人机计算大会（HMCC 2026）</strong>技术 Demo 与设计作品展示。',
  },
  '2025-12-26': {
    en: '<a href="/research/flowing-ink/#notebook">Flowing Ink Resonator</a> selected for the poster program at the <strong>inaugural CCF Conference on AI for Humanities (AI4Humanities 2025)</strong>.',
    zh: '<a href="/research/flowing-ink/#notebook">Flowing Ink Resonator</a> 入选<strong>首届 CCF 人文智能大会</strong>海报展示。',
  },
};

function restoreLinks(html: string) {
  return html.replace(/href="#([^"]+)"/g, (attribute, slug: string) => {
    const work = works.find(entry => entry.slug === slug);
    return work ? 'href="' + workPath(work) + '"' : attribute;
  });
}

export const updates = home.en.news.map(({ date, html }) => {
  const zh = home.zh.news.find(item => item.date === date)!;
  const text = recognitions[date] ?? { en: html, zh: zh.html };
  return { date, text: { en: restoreLinks(text.en), zh: restoreLinks(text.zh) } };
});
