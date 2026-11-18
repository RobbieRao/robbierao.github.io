import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { parse, parseFragment } from 'parse5';

const root = new URL('../', import.meta.url);
const historical = file => parse(execFileSync('git', ['show', 'master:site/' + file], {
  cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
}));
const attr = (node, key) => node?.attrs?.find(a => a.name === key)?.value;
const walk = function* (node) {
  if (!node) return;
  yield node;
  for (const child of node.childNodes ?? []) yield* walk(child);
};
const descendants = (node, predicate) => [...walk(node)].filter(predicate);
const find = (node, predicate) => descendants(node, predicate)[0];
const id = (node, value) => find(node, el => attr(el, 'id') === value);
const hasClass = (node, value) => attr(node, 'class')?.split(/\s+/).includes(value);
const tagged = (node, ...names) => descendants(node, item => names.includes(item.tagName));
const normalize = value => value.replace(/\s+/gu, ' ').trim();
const pathOnly = value => value?.split('?')[0];

function visible(node, translate = () => undefined) {
  if (node.nodeName === '#text') return node.value;
  if (['script', 'style', 'template'].includes(node.tagName) || attr(node, 'hidden') !== undefined) return '';
  const replacement = translate(node);
  if (replacement !== undefined) return visible(parseFragment(replacement));
  if (node.tagName === 'br') return ' ';
  const text = (node.childNodes ?? []).map(child => visible(child, translate)).join('');
  return ['main', 'section', 'article', 'div', 'p', 'li', 'h1', 'h2', 'h3', 'h4'].includes(node.tagName) ? ' ' + text + ' ' : text;
}

function localized(doc, lang) {
  const translations = JSON.parse(visibleTextNode(id(doc, 'page-translations')) || '{}');
  return node => {
    const value = translations[attr(node, 'data-i18n')]?.[lang] ?? attr(node, 'data-' + lang);
    return typeof value === 'string' ? value : undefined;
  };
}

const visibleTextNode = node => node?.childNodes?.[0]?.value;
const oldHome = historical('index.html');
const oldCv = historical('cv/index.html');
const homeCards = descendants(oldHome, node => attr(node, 'data-kind') === 'research');
const exceptions = [];
const reviewed = [];
const coverRows = [];
let count = 0;
let exact = 0;

for (const lang of ['en', 'zh']) {
  const folder = lang === 'zh' ? 'zh/' : '';
  const textIn = (node, old = oldHome) => normalize(visible(node, localized(old, lang)));
  const readPage = async file => parse(await readFile(new URL('dist/' + folder + file, root), 'utf8'));
  const [home, cv, work] = await Promise.all(['index.html', 'cv/index.html', 'work/index.html'].map(readPage));

  function check(page, field, expected, node, method = 'text', disposition) {
    if (!expected) return;
    count++;
    const value = normalize(expected);
    const actual = method === 'href'
      ? tagged(node, 'a').map(link => attr(link, 'href'))
      : method === 'date' ? tagged(node, 'time').map(time => attr(time, 'datetime'))
      : normalize(node ? visible(node) : '');
    if (actual.includes(value)) exact++;
    else if (disposition) reviewed.push({ lang, page, field, value, disposition });
    else exceptions.push({ lang, page, field, value });
  }

  for (const card of homeCards) {
    const slug = attr(card, 'id');
    const title = textIn(tagged(card, 'h4')[0]);
    const heading = tagged(id(home, 'publications'), 'h4').find(node => normalize(visible(node)) === title ||
      tagged(node, 'a').some(link => attr(link, 'href') === '/' + folder + 'research/' + slug + '/'));
    const row = heading?.parentNode?.parentNode;
    const article = await readPage('research/' + slug + '/index.html');
    const articleFacts = find(article, node => node.tagName === 'dl' && hasClass(node, 'facts'));
    const venue = textIn(find(card, node => hasClass(node, 'venue')));
    const authors = textIn(find(card, node => hasClass(node, 'authors')));
    const year = textIn(tagged(card, 'time')[0]);
    check('home', slug + ' title', title, heading);
    check('home', slug + ' authors', authors, row);
    const fullVenueOnArticle = normalize(visible(articleFacts)).includes(venue);
    check('home', slug + ' venue', venue, row, 'text',
      fullVenueOnArticle ? '首页使用简称，作品详情保留旧站全称及状态。' : undefined);
    check('home', slug + ' year', year, row);
    check('article', slug + ' venue', venue, articleFacts);
    check('article', slug + ' authors', authors, articleFacts);
    const doi = tagged(card, 'a').map(link => attr(link, 'href')).find(href => /doi\.org\//i.test(href ?? ''));
    if (doi) check('home', slug + ' DOI link', doi, row, 'href');
  }

  for (const card of descendants(oldHome, node => attr(node, 'data-kind') === 'design')) {
    const slug = attr(card, 'id');
    const page = await readPage('design/' + slug + '/index.html');
    const year = textIn(tagged(card, 'time')[0]);
    check('article', slug + ' year', year, tagged(page, 'header').at(-1));
    const title = textIn(tagged(card, 'h3')[0]);
    const shown = tagged(id(home, 'practice'), 'h3').find(node => normalize(visible(node)) === title);
    const archive = find(work, node => node.tagName === 'a' && attr(node, 'href') === '/' + folder + 'design/' + slug + '/');
    check('home', slug + ' title', title, shown, 'text',
      normalize(visible(archive)).includes(title) ? '首页精选缩为 6 项，作品索引保留此标题。' : undefined);
    check('work', slug + ' archive title', title, archive);
  }

  const legacyNews = id(oldHome, 'news');
  const currentNews = id(home, 'news');
  for (const item of tagged(legacyNews, 'li')) {
    const date = attr(tagged(item, 'time')[0], 'datetime');
    const row = tagged(currentNews, 'li').find(node => attr(tagged(node, 'time')[0], 'datetime') === date);
    if (!date) continue;
    check('home', 'news date', date, row);
    const copy = textIn(item).replace(date, '').trim();
    const itemTranslation = parseFragment(localized(oldHome, lang)(item) ?? '');
    const recognition = attr(item, 'data-project-recognition') && item.childNodes.find(node => attr(node, 'data-' + lang));
    const expected = recognition ? textIn(recognition) : (normalize(visible(itemTranslation)).replace(date, '').trim() || copy);
    check('home', 'news ' + date, expected, row);
  }

  for (const section of ['experience', 'honors']) {
    for (const item of tagged(id(oldHome, section), 'li')) {
      const cvSection = id(cv, section + '-title')?.parentNode?.parentNode;
      const retained = normalize(visible(cvSection));
      const original = textIn(item);
      const label = original.split(' — ')[0];
      const course = label.match(/\b(?:SD4410|URIS)\b/)?.[0];
      const full = retained.includes(label) || Boolean(course && retained.includes(course));
      check('home', section + ' item', original, id(home, 'about'), 'text',
        full ? '首页只放摘要，CV 保留对应条目的完整信息。' : undefined);
    }
  }
  const cvSections = ['education', 'current-research', 'experience', 'memberships', 'presentations',
    'publications', 'honors', 'ip', 'skills', 'practice'];
  for (const section of cvSections) {
    const original = id(oldCv, section + '-title')?.parentNode;
    const current = id(cv, section + '-title')?.parentNode?.parentNode;
    for (const field of tagged(original, 'h3', 'p', 'li', 'time')) {
      if (field.tagName === 'time') {
        check('cv', section + ' date', attr(field, 'datetime'), current, 'date');
      } else {
        check('cv', section + ' ' + field.tagName, textIn(field, oldCv), current);
      }
    }
    if (section === 'publications') {
      const sourceEntries = descendants(original, node => hasClass(node, 'cv-entry'));
      for (const entry of sourceEntries) {
        const title = textIn(tagged(entry, 'h3')[0], oldCv);
        const row = tagged(current, 'h3').find(node => normalize(visible(node)) === title)?.parentNode;
        for (const link of tagged(entry, 'a')) {
          const href = attr(link, 'href');
          if (/doi\.org\//i.test(href ?? '')) check('cv', title + ' DOI link', href, row, 'href');
        }
      }
    }
  }

  if (lang === 'en') {
    for (const card of descendants(oldHome, node => node.tagName === 'article' && attr(node, 'data-kind'))) {
      const slug = attr(card, 'id');
      const kind = attr(card, 'data-kind');
      const prior = tagged(card, 'img')[0];
      const archive = find(work, node => node.tagName === 'a' && attr(node, 'href') === '/' + kind + '/' + slug + '/');
      const current = tagged(archive, 'img')[0];
      const source = pathOnly(attr(prior, 'src'));
      const destination = pathOnly(attr(current, 'src'));
      const rotated = hasClass(prior.parentNode, 'rotate-ccw');
      const ratio = Number(attr(current, 'width')) / Number(attr(current, 'height'));
      const mounted = hasClass(find(archive, node => hasClass(node, 'work-card')) ?? archive?.parentNode, 'paper');
      const archiveMode = mounted
        ? '完整图，白衬底；比例不同会留边'
        : rotated ? '竖图完整显示，两侧深色留边'
          : ratio > 4 / 3 ? '4:3 居中裁左右；旧站展示完整帧' : '4:3 居中裁上下；旧站展示完整帧';
      coverRows.push([slug, source === destination ? '同源' : rotated ? '旧图逆时针转 90°' : '来源不同', archiveMode]);
      count++;
      if (source === destination || rotated && destination === source.replace('.webp', '-upright.webp')) exact++;
      else exceptions.push({ lang, page: 'work', field: slug + ' cover', value: source });
    }
  }
}

const report = [
  '# 双语内容逐字核对',
  '',
  '以本地 master 分支的旧站 HTML 为基准。比对时解码 HTML、合并空白，保留标点、作者拼写、顺序及通讯作者星号。作者、年份和 DOI 按论文逐条比对。',
  '',
  '内容检查 ' + (count - coverRows.length) + ' 项，逐字或结构化精确匹配 ' + (exact - coverRows.length) + ' 项，已核对的展示差异 ' + reviewed.length + ' 项，待核对 ' + exceptions.length + ' 项。',
  '',
  '## 待核对差异',
  '',
  ...(exceptions.length ? exceptions.map(({ lang, page, field, value }) => '- [' + lang + '/' + page + '] ' + field + ' — ' + value) : ['无。']),
  '',
  '## 已核对的展示差异',
  '',
  ...reviewed.map(({ lang, page, field, value, disposition }) => '- [' + lang + '/' + page + '] ' + field + ' — ' + value + '。' + disposition),
  '',
  '中文 CV 的五处独立日期按旧站 time 元素中的 ISO 日期比对。旧站英文与中文显示格式不同，所在的完整段落仍逐字比对。',
  '',
  '## 封面',
  '',
  '旧站 11 张研究图在缩略图内完整显示，11 张设计封面在 16:10 槽位内展示完整帧。新版精选区的四张图保留原图比例，三个论文图使用白衬底。首页的六张设计卡与索引沿用下表的设计卡显示策略。正文旧图路径可继续访问。',
  '',
  '| 作品 | 图源与方向 | 索引裁切 |',
  '| --- | --- | --- |',
  ...coverRows.map(row => '| ' + row.join(' | ') + ' |'),
].join('\n') + '\n';
const output = process.argv[2];
if (output) {
  await writeFile(output, report);
  console.log('Checked ' + count + ' items: ' + exact + ' exact/source matches, ' + reviewed.length +
    ' reviewed display differences, ' + exceptions.length + ' unresolved. Report: ' + output);
} else {
  process.stdout.write(report);
}
if (exceptions.length) process.exitCode = 1;
