# Robbie Fenggui Rao — personal website

A bilingual Astro 6 portfolio for research on facial perception, human–AI interaction, and design practice. The site is statically generated with plain CSS and browser-native interactions. The public site is at [robbierao.github.io](https://robbierao.github.io/).

## Preview and verify

Use Node.js 22.21 or newer within the Node 22 release line.

```sh
npm ci
npm run dev
npm run build
npm run check
npm test
python3 -m unittest discover -s analytics -p 'test_*.py'
npm run preview
```

The build writes `dist/`. The checker verifies page metadata, IDs, local links and anchors, image markup, and the compressed JavaScript budget. During the migration, `node scripts/audit-content.mjs` compares the built bilingual pages with the legacy HTML on the local `master` branch. Pass a file path to save the report.

## Edit content

- **Homepage and contact details.** Edit the bilingual copy and profile in `src/data/site.ts`. The layout is in `src/pages/[...lang]/index.astro` and the scan portrait is in `src/components/FaceField.astro`. Set `availability` to `null` to hide the availability line. Run `node scripts/og.mjs` after changing the name, headline or portrait to regenerate the default 1200 × 630 sharing image.
- **Works and publications.** Update the card and publication metadata for both languages in `content/migration/home.json` and the notebook header metadata in `content/migration/works-meta.json`. To add a publication, add matching entries under the same slug and create `src/content/works/<slug>/en.md` and `zh.md`. Keep published author spellings, order, corresponding-author marks, venue and status as sourced. To add a standalone project, also provide project metadata, BibTeX, and `project.en.md` and `project.zh.md`.
- **Updates and CV.** Add an entry with the same date to both news lists in `content/migration/home.json`, newest first. Edit the CV in `src/data/cv.ts` and retain its public anchor IDs.
- **Static pages and media.** Privacy and image credits live in `src/content/pages/`. Put images and videos in `public/images/` and `public/videos/`. Give each content image meaningful alt text and intrinsic dimensions. Theme tokens and Markdown styles live in `src/styles/`. `WorkMedia.astro` uses generated WebP covers at up to 480, 960 and 1440 pixels. Astro generates them in the ignored `public/_covers/` cache and keeps original paths available for full-size views. For archive, article and CV headings use `SectionHead.astro`.

English lives at the root and Chinese under `/zh/`. Legacy paths are mapped in `content/legacy-routes.json`. Older `?lang=zh` and work-fragment links are handled at navigation time. The existing analytics client controls which production paths send events. Private analytics and retention are documented in [analytics/README.md](analytics/README.md).

## Portfolio canvas

Both language versions have a canvas at `/canvas/` and `/zh/canvas/`, linked from Work. The Astro pages and notebook reader use the same work records and Markdown as the archive. `public/assets/canvas/` contains the port of the published canvas and media scheduler. Only the canvas pages load these modules. `npm run check` reports their compressed size separately. With JavaScript disabled, the canvas URL exposes a plain notebook index.

## Deploy

GitHub Actions validates pull requests. A verified run on `master` uploads `dist/` and deploys the same artifact to GitHub Pages. The prior public site is available in Git history. Content provenance and author-role notes are kept under `content/`.
