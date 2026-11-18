# Rebuild brief — robbierao.github.io

Branch `redesign/astro-rebuild`. Replace the old hand-built artifact with an Astro source project and a distinctive editorial design. Readers are professors (MIT Media Lab-type labs) and UX-research recruiters who give the page 20 seconds: they must get the research question, the 3–4 strongest works, and proof that he builds.

Work through "Tasks" in order. Run `npm run build` after each task; fix before moving on. Do not push or deploy.

## Already done (do not redo)

- Astro 6.4.8, `astro.config.mjs`, `tsconfig.json` (`@/*` → `src/*`), `src/content.config.ts` (collection `notes`, ids like `contextcam/en`, `contextcam/project.zh`).
- Lossless migration of the old pages, text-verified: `src/content/works/<slug>/{en,zh}.md` (22 notebooks) + `project.{en,zh}.md` (3 project pages) + `src/content/pages/{privacy,image-credits}.{en,zh}.md`. Bodies contain raw `<figure>`, `<dl class="tools|actions|metrics|facts">`, `<ol class="steps">`, `<figure class="screens|legend|pair|diagram|video|portrait">`. Do not rewrite their prose.
- Media in `public/images`, `public/videos`; portrait at `src/assets/portrait.png`; analytics client at `public/assets/analytics.js` (do not edit).
- `src/i18n/index.ts` (helpers `to`, `alternate`, `langPaths`, `pick`, `ui`), `src/data/site.ts` (profile + all homepage copy, both languages).
- Reference data: `content/migration/home.json` and `works-meta.json` (bilingual metadata scraped from the old site). The old site is in git: `git show master:site/index.html`, `master:site/cv/index.html`.
- Fonts installed: `@fontsource/instrument-serif`, `@fontsource-variable/instrument-sans`, `@fontsource-variable/geist-mono`.

## Non-negotiables

- Stay on Astro 6 (local Node is 22.21; Astro 7 needs ≥ 22.23). No UI framework, no Tailwind. Plain CSS with custom properties. Ship < 15 KB gzipped JS in total.
- Never invent, round up or embellish a fact. Every name, date, venue, number, role and award comes from the old site or `content/*.md`. Author strings are copied exactly ("Tiantian Lo" and "Tian Tian Lo" both occur — keep each as published). Publication name is "Fenggui Rao"; `*` marks corresponding authors.
- No blocking intro or loader. Content is readable with JS off.
- URLs are stable: `/research/<slug>/`, `/design/<slug>/`, `/projects/<slug>/`, `/cv/`, `/privacy/`, `/image-credits/`. Chinese lives at `/zh/...` (real pages, not JS swapping). CV keeps ids `cor-2026`, `vivo-2023`, `doctoral-forum-2026`, `talk-2050-2024`, `caa-forum-2024`, `ip-title`. Privacy keeps `#analytics-choice` and `#analytics-status`.
- Analytics: `<script async src="/assets/analytics.js" data-endpoint={site.analyticsEndpoint} id="site-analytics">` on `/`, `/cv/`, `/privacy/` and all `/design/*` pages only. Hits badge `<img>` (eager, `referrerpolicy="no-referrer"`, src from the old homepage footer) on the English homepage only.
- Accessibility: one `h1` per page, visible focus, AA contrast in both themes, `prefers-reduced-motion` respected, all images have alt text and intrinsic `width`/`height`.

## Design direction — "ink and instrument"

A designer-scientist's notebook: one clear sans family for everything (headings 600, body 400), mono for dates and small labels only, warm paper, one vermilion accent used sparingly. Restraint is the point. **No serif and no italic headings** (see Round 3).

Tokens (`src/styles/tokens.css`), light / dark:

| token | light | dark |
| --- | --- | --- |
| `--paper` | `#f6f4ee` | `#0f0f0d` |
| `--surface` (figures, cards) | `#fffefb` | `#181816` |
| `--ink` | `#121210` | `#eceae3` |
| `--muted` | `#6a6861` | `#9b988e` |
| `--line` | `#dcd9cf` | `#2b2a26` |
| `--accent` | `oklch(57% 0.19 33)` | `oklch(69% 0.18 38)` |

- Dark mode via `prefers-color-scheme`, overridable by `html[data-theme]` (toggle in header, stored in `localStorage`, set by an inline head script to avoid flashing).
- Fonts: `--display` and `--body` are the same stack: `"Inter Variable", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", system-ui, sans-serif`; mono `"Geist Mono Variable", ui-monospace, monospace`. Preload the Inter Latin woff2.
- Scale: hero `clamp(2.25rem, 5vw, 4rem)` / 1.06; page titles `clamp(2rem, 4.2vw, 3.2rem)`; section titles `clamp(1.7rem, 3vw, 2.4rem)`; card titles 1.15rem; headings weight 600, tracking -0.02em; body 1.0625rem / 1.65; mono labels 0.76rem, uppercase, tracking 0.05em. Chinese: no uppercase, no letter-spacing, line-height 1.8.
- Layout: max width 1200px, gutter `clamp(20px, 5vw, 64px)`, 12-column grid, section spacing `clamp(72px, 11vw, 144px)`. 1px `--line` rules instead of boxes. Radius 4px on media only. Phone layout at 390px must have no horizontal scroll.
- Avoid: gradients, glass blur cards, drop shadows, emoji, pill-heavy UI, icon fonts, parallax, scroll-jacking, centred everything, more than one accent colour.
- Motion: 200–300 ms ease-out on hover; cross-document view transitions (`@view-transition { navigation: auto }`) with a shared `view-transition-name: work-<slug>` between a card's media and its detail hero (name must be unique per page — apply it to one occurrence only).
- Brand mark: a 22px vermilion square "seal" with 饶柏 in paper colour, used left of the name in the header and as `public/favicon.svg`.

## Tasks

1. **Data** — `src/data/works.ts`: typed array of 22 works built from `content/migration/*.json`.
   `{ slug, kind: 'research'|'design', year, name: Bi, subtitle?: Bi (title after the first colon), summary: Bi (first sentence of `lead`; design: home.json `summary`), lead: Bi, role?: Bi, themes: ('perception'|'interaction'|'art'|'design')[], tags?: Bi[], cover: { image, alt: Bi, video? }, venue?: { short, full, status? }, authors?: { name, me?, corresponding? }[], links: { paper?, code?, codeSoon?, project? }, featured?: number }`.
   Featured, in order: `disface3dnet`, `facial-social-traits`, `contextcam`, `flowing-ink`. Research order and theme grouping follow home.json. Also `src/data/updates.ts` (14 dated items from home.json `news`; the two Flowing Ink items are in the old HTML `data-project-recognition`) and `src/data/cv.ts` (education, experience, memberships, talks, honors, patents, skills, practice — from `master:site/cv/index.html`, both languages via its `page-translations` JSON). `src/lib/media.ts`: `imageSize(publicPath)` using `sharp` metadata, cached.
2. **Styles + shell** — `tokens.css`, `base.css`, `prose.css` (styles every raw block listed above; tables scroll horizontally; `figure.screens a.crop` shows a 313px-wide window of a 1400×795 image offset by `--x` px, scaled responsively; `figure.legend i` is a colour swatch from `--swatch`). `src/layouts/Base.astro` (props `lang, path, title, description, image?`; canonical, `hreflang` en / zh-Hans / x-default, OG + Twitter, JSON-LD `Person` on home, theme script, and a tiny script that redirects old `?lang=zh` URLs to `/zh`). `Header.astro` (seal + "Robbie Rao", nav Research `/#research`, Work `/work/`, About `/#about`, CV `/cv/`, language link to `alternate(path)`, theme toggle; sticky, 1px bottom rule on scroll). `Footer.astro` (large serif `copy.contact.title`, email, profile links, motto, © year, Privacy, Image credits).
3. **Home** — `src/pages/[...lang]/index.astro`, sections in this order:
   1. Hero: mono eyebrow; serif headline in two lines, second line italic; intro (`set:html`); actions "Selected work ↓", "CV", email; availability line with a small accent dot (hidden if `site.availability` is null). Right half: the face canvas (task 6) with `copy.hero.figure` as a mono caption.
   2. Latest: the 4 newest updates in a 4-column mono-dated strip; "All updates" expands the rest (`<details>`).
   3. `#research` — "What I work on": the three `copy.threads.items` as numbered columns, then the two current doctoral questions set large in serif italic under their label.
   4. Selected work: 4 featured works, large alternating rows (media 7 cols, text 5): venue + year in mono, serif name, summary, role badges ("First author" / "Corresponding author" derived from authors, plus `role`), links. Videos autoplay muted/looped only while in view and never under reduced motion or Save-Data.
   5. Publications: all 11, grouped by theme, one row each: 96px thumbnail, venue/year in mono, full title linking to `/research/<slug>/`, authors with **Fenggui Rao** bold and `*`, role line, links (Paper, Code, Project, Notes).
   6. `#practice` — Design & making: 11 design works, 3-column grid (2 tablet, 1 phone), 4:3 covers, hover plays video.
   7. Toolkit: the six skill groups from the CV as a 3×2 text grid.
   8. `#about`: portrait (`astro:assets` `<Picture>`, AVIF + WebP, 4:5 crop) with profile links; `copy.about.body`; compact lists for education, experience / teaching / service, honors; link to CV.
4. **Work pages** — `/work/` index (all 22, filter chips All / themes, state in the URL hash, works without JS). `[...lang]/research/[slug].astro` and `design/[slug].astro` share `layouts/Article.astro`: back link, mono kind · year, serif title + subtitle, lead, facts grid (venue, authors, role, links / year, practice, role), body in a 68ch column beside a sticky table of contents built from `h2` headings (collapses on phone), previous / next within the same kind. `projects/[slug].astro`: centred project header, body, BibTeX block with a copy button (bibtex is in works-meta.json `project.en.bibtex`), link to the notebook. A native `<dialog>` lightbox opens `figure a` images; without JS the links still work.
5. **CV, static pages, redirects** — `/cv/` from `cv.ts` with a print stylesheet (A4, black on white, no header/footer, links printed as text) and a "Print / Save PDF" button; `/privacy/`, `/image-credits/` render the `pages` Markdown (add a `pages` collection); `404.astro`. In `astro.config.mjs` add `redirects` for every key in `content/legacy-routes.json` plus `/canvas/` and `/notebooks/` → `/work/`; old `/#<slug>` targets become the work's detail page; `/#design` → `/#practice`. Disable Shiki (`markdown.syntaxHighlight: false`).
6. **Hero canvas** — `src/components/FaceField.astro`, a 2D canvas, no libraries, ≤ 200 lines. About 56 horizontal scan lines cross the whole canvas; a procedural face heightfield (smooth dome + nose ridge and tip, eye sockets, brow, cheekbones, lips, chin, built from Gaussians) displaces them like a structured-light scan. The head has a constant chin-up pitch so relief reads when frontal; yaw ±0.45 rad and pitch ±0.12 rad ease toward the pointer; a slow smile parameter moves the mouth corners. Draw back to front and fill under each line with `--paper` for hidden-line removal. One accent-coloured line sweeps top to bottom every ~6 s. Mono readouts in the corners: `YAW +00.0°  PITCH +00.0°  AU12 0.00`. Colours read from CSS variables and update on theme change. Pause off-screen and in hidden tabs; under reduced motion draw one static frame. If it does not look like a calm, legible face after honest effort, say so in the report rather than shipping something awkward.
7. **Tooling** — `scripts/check-site.mjs` (Node, no deps beyond what is installed): every `dist/**/*.html` has `lang`, `<title>`, viewport, no duplicate ids, alt on images, and every local `href`/`src`/anchor resolves. Point `analytics/client.test.mjs` at `../public/assets/analytics.js`. Rewrite `.github/workflows/pages.yml`: Node 22, `npm ci`, `npm run build`, `npm run check`, `npm test`, the existing Python analytics unittest, upload `dist`. Delete `scripts/check_site.py`. Rewrite `README.md` for the new structure (how to edit a work, add a publication, add an update, preview, deploy).

## Round 2 — Codex punch list

Round 1 is built. The homepage (`src/pages/[...lang]/index.astro`) and `src/components/FaceField.astro` were then redesigned by hand and are the visual reference: **do not restructure or restyle those two files**; copy their patterns elsewhere.

1. **Fact audit.** Write `scripts/audit-content.mjs`: extract the visible text of `master:site/index.html` and `master:site/cv/index.html` in both languages (use their `data-en`/`data-zh` attributes and `page-translations` JSON) and report every publication title, author list, venue, DOI, date, honor, patent number, role and membership that does not appear verbatim in the matching new page in `dist/`. Fix any real omission or alteration in `src/data/*`; list intentional wording changes in the report instead of "fixing" them.
2. **Cover orientation and crops.** Compare each cover in `works.ts` with how the old site showed it (`master:site/index.html`, classes such as `rotate-ccw`). Report any cover that is rotated, cropped differently or letterboxed; fix data-level problems only.
3. **Social card.** `scripts/og.mjs` (run locally, output committed): a 1200×630 `public/og.png` — paper background, the portrait cropped on the right third, name and the hero headline on the left, vermilion seal. Use it as the default `og:image`/`twitter:image` in `Base.astro`; work pages keep their own cover.
4. **Chinese typography.** CJK text must never be italic or letter-spaced: add `:lang(zh)` guards where needed in component-scoped styles you own (not `src/styles/`), and report any you find in the files you may not edit.
5. **Keyboard and no-JS pass.** Tab through `/`, `/work/`, one article and `/cv/`: visible focus everywhere, lightbox closes with Esc and returns focus, work filter operable by keyboard, everything readable with JS disabled. Fix what fails in files you own.

6. **Carry the homepage language to the other pages.** `/work/`, `layouts/Article.astro`, project pages and `/cv/` should use the same numbered section heads (mono accent index + large serif title), the same spacing rhythm, and the white "mount" (padding, 1px line border, `#fffefb`) for paper diagrams and SVG figures inside article bodies. Photographs stay full bleed.
7. **Responsive covers.** Covers in `WorkMedia.astro` are served at full size. Generate 480 / 960 / 1440-wide WebP variants at build time (sharp, cached) and emit `srcset` + `sizes`; keep the original public paths working for notebook bodies. Report total image bytes for the homepage before and after.
8. **Mobile length.** The phone homepage is about 13,400 px tall. Without removing content from desktop, propose (do not apply) two options to bring it under 10,000 px, with the pixel saving of each.
9. **Housekeeping.** Update `README.md` for the current structure; list any file in `src/` that is no longer imported.

## Round 3 — type system changed (owner feedback)

The owner compared this build with the live site and found the serif display and italics fussy and hard to read (on Windows the Chinese headings fell back to SimSun). `src/styles/tokens.css` and `base.css` now use one sans family; the homepage, `SectionHead.astro`, the `Article.astro` title and the footer were retuned by hand. Do not reintroduce a serif, italic headings, or mono text smaller than 0.76rem.

1. **Size sweep.** Headings on `/work/`, `/cv/`, article bodies (`prose.css`), project pages and `404` were sized for a condensed serif at weight 400. Check each at 1440 / 768 / 390 px in both languages: nothing wraps awkwardly or looks heavier than the same level on the homepage; reuse the scale above. Send before/after screenshots.
2. **Social card.** `scripts/og.mjs` still loads the Instrument fonts: switch it to Inter (600 for the headline), regenerate `public/og.png`, then uninstall `@fontsource/instrument-serif` and `@fontsource-variable/instrument-sans` and confirm nothing imports them.
3. **Bring back the canvas.** The old `/canvas/` (draggable, zoomable board of works that returns to the same position after a notebook is opened) became a redirect to `/work/`; the owner misses it. Port it back as real pages `/canvas/` and `/zh/canvas/` from `master:site/canvas/index.html` and `master:site/assets/infinite-canvas.js`: same behaviour, data from `src/data/works.ts`, current tokens, a plain link to `/work/` for keyboard and no-JS readers. Its script loads on that page only and is exempt from the 15 KB budget. Remove the redirect and link it from `/work/` as "Canvas view"; leave the main nav alone.
4. **Regression list.** Open the live site (https://robbierao.github.io/) next to this build and list every behaviour or piece of information the old site had that this build lacks or makes harder to reach. List only; do not implement.

## Report back

List what was built, anything skipped or uncertain, the build and check output, and the total JS size. Do not commit unless asked.
