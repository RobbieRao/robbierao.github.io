const query = new URLSearchParams(location.search).get('lang');
let saved = '';
try { saved = localStorage.getItem('robbie-language') || ''; } catch {}
export let language = query === 'zh' || query === 'en' ? query : saved === 'zh' ? 'zh' : 'en';
if (query === 'zh' || query === 'en') { try { localStorage.setItem('robbie-language', language); } catch {} }
// A query-free page may have opened in either saved language. Remember this
// entry's choice so Back can restore it without guessing from today's setting.
history.replaceState({...history.state, robbieLanguage: language}, '', location.href);
export const t = (en, zh) => language === 'zh' ? zh : en;
// Build-generated, page-local copy: no network request or top-level await.
let translations = {};
try { translations = JSON.parse(document.getElementById('page-translations')?.textContent || '{}'); } catch {}
const ariaTranslations={'Main navigation':'主导航','Notebook chapters':'手记章节','Personal profile':'个人信息','Rendering style':'渲染方式','Expression':'表情','Filter work':'筛选作品','Reset head view':'复位人头视角','Project index':'项目索引','Selected project':'选中的项目','Close project':'关闭项目','Zoom in':'放大','Zoom out':'缩小','On this page':'本页目录','Project contents':'项目目录','Interactive animated human head':'可交互的动态人头','Infinite work canvas. Drag or use arrow keys to pan.':'无限作品集，可拖动或用方向键平移。'};

export function localize(root = document) {
  root.querySelectorAll('[aria-label]').forEach(node=>{const en=node.getAttribute('aria-label');if(ariaTranslations[en]&&!node.dataset.enLabel){node.dataset.enLabel=en;node.dataset.zhLabel=ariaTranslations[en];}});
  root.querySelectorAll('[data-i18n]').forEach(node => {
    const entry = translations[node.dataset.i18n];
    if (entry) node.innerHTML = entry[language];
  });
  root.querySelectorAll('[data-en][data-zh]').forEach(node => { node.innerHTML = node.dataset[language]; });
  root.querySelectorAll('[data-en-label]').forEach(node => {
    node.setAttribute('aria-label', node.dataset[language === 'zh' ? 'zhLabel' : 'enLabel']);
  });
  root.querySelectorAll('[data-language-only]').forEach(node => { node.hidden = node.dataset.languageOnly !== language; });
  root.querySelectorAll('[data-en-src][data-zh-src]').forEach(node => {
    const attribute = node.tagName === 'A' ? 'href' : 'src';
    const value = node.dataset[language === 'zh' ? 'zhSrc' : 'enSrc'];
    if (node.getAttribute(attribute) !== value) node.setAttribute(attribute, value);
    if (node.dataset.enAlt) node.alt = node.dataset[language === 'zh' ? 'zhAlt' : 'enAlt'];
  });
  root.querySelectorAll('.language-toggle').forEach(button => {
    button.textContent = t('中文', 'EN');
    button.setAttribute('aria-label', t('Switch to Chinese', '切换为英文'));
  });
  root.querySelectorAll('a[href]').forEach(link => {
    if (!link.getAttribute('href').startsWith('/') || link.getAttribute('href').startsWith('//')) return;
    const url = new URL(link.href);
    if (/\.[a-z0-9]{2,5}$/i.test(url.pathname)) return;
    url.searchParams.set('lang', language);
    link.href = url.pathname + url.search + url.hash;
  });
}

function apply() {
  document.documentElement.lang = language === 'zh' ? 'zh-Hans' : 'en';
  document.documentElement.dataset.language = language;
  localize();
  document.dispatchEvent(new CustomEvent('languagechange', { detail: { language } }));
}

document.addEventListener('click', event => {
  if (!event.target.closest('.language-toggle')) return;
  language = language === 'en' ? 'zh' : 'en';
  try { localStorage.setItem('robbie-language', language); } catch {}
  const url = new URL(location.href);
  url.searchParams.set('lang', language);
  // Keep the navigation state used by the portfolio reader and work filters.
  history.replaceState({...history.state, robbieLanguage: language}, '', url.pathname + url.search + url.hash);
  apply();
});
window.addEventListener('popstate', () => {
  const query = new URLSearchParams(location.search).get('lang');
  const next = query === 'en' || query === 'zh' ? query : history.state?.robbieLanguage;
  if ((next === 'en' || next === 'zh') && next !== language) {
    language = next;
    try { localStorage.setItem('robbie-language', language); } catch {}
    apply();
  }
});
apply();
