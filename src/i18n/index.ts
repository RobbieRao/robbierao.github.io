export const locales = ['en', 'zh'] as const;
export type Lang = (typeof locales)[number];

/** A string that exists in both site languages. */
export interface Bi {
  en: string;
  zh: string;
}

export const htmlLang: Record<Lang, string> = { en: 'en', zh: 'zh-Hans' };

export const langFromParam = (param?: string): Lang => (param === 'zh' ? 'zh' : 'en');

/** getStaticPaths() helper for pages under src/pages/[...lang]/. */
export const langPaths = () => locales.map((lang) => ({ params: { lang: lang === 'en' ? undefined : lang } }));

export const pick = (value: Bi | string, lang: Lang): string => (typeof value === 'string' ? value : value[lang]);

const ASSET = /^\/(images|videos|assets|fonts|_astro)\//;
const FILE = /\.[a-z0-9]{2,5}$/i;

/** Localize an internal page path: '/work/' -> '/zh/work/' for Chinese. */
export function to(path: string, lang: Lang): string {
  if (lang === 'en' || !path.startsWith('/') || ASSET.test(path)) return path;
  const [pathname] = path.split(/[?#]/);
  if (FILE.test(pathname)) return path;
  return path === '/' ? '/zh/' : `/zh${path}`;
}

/** The same page in another language. `pathname` may or may not carry the /zh prefix. */
export function alternate(pathname: string, lang: Lang): string {
  const bare = pathname.replace(/^\/zh(?=\/|$)/, '') || '/';
  return to(bare, lang);
}

export const ui = {
  skip: { en: 'Skip to content', zh: '跳转至正文' },
  nav: {
    research: { en: 'Research', zh: '研究' },
    work: { en: 'Work', zh: '作品' },
    about: { en: 'About', zh: '关于' },
    cv: { en: 'CV', zh: '简历' },
  },
  switchLang: { en: '中文', zh: 'EN' },
  switchLangLabel: { en: '切换为中文', zh: 'Switch to English' },
  theme: { en: 'Toggle colour theme', zh: '切换深浅色' },
  links: {
    project: { en: 'Project page', zh: '项目页' },
    paper: { en: 'Paper', zh: '论文' },
    code: { en: 'Code', zh: '代码' },
    codeSoon: { en: 'Code (soon)', zh: '代码（待发布）' },
    notes: { en: 'Notes', zh: '手记' },
    video: { en: 'Video', zh: '视频' },
  },
  roles: {
    first: { en: 'First author', zh: '第一作者' },
    corresponding: { en: 'Corresponding author', zh: '通讯作者' },
  },
  myRole: { en: 'My role', zh: '我的工作' },
  year: { en: 'Year', zh: '年份' },
  practice: { en: 'Practice', zh: '实践领域' },
  venue: { en: 'Venue', zh: '发表' },
  authors: { en: 'Authors', zh: '作者' },
  onThisPage: { en: 'On this page', zh: '本页目录' },
  allWork: { en: 'All work', zh: '全部作品' },
  next: { en: 'Next', zh: '下一篇' },
  previous: { en: 'Previous', zh: '上一篇' },
  kinds: {
    research: { en: 'Research', zh: '研究' },
    design: { en: 'Design', zh: '设计' },
  },
  themes: {
    all: { en: 'All', zh: '全部' },
    perception: { en: 'Social perception', zh: '社会知觉' },
    interaction: { en: 'Human–AI interaction', zh: '人机智能交互' },
    art: { en: 'Art & culture', zh: '艺术与文化' },
    design: { en: 'Design practice', zh: '设计实践' },
  },
} as const;
