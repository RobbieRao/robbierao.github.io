# Robbie Fenggui Rao — personal website

A static bilingual personal website with eleven research publications, eleven design projects, illustrated notebooks, an infinite portfolio canvas, three independent research project pages, and a printable CV. `site/` is the complete public artifact. GitHub Pages serves it directly; no runtime backend or build dependencies are needed.

The white homepage spans the viewport, keeps the photograph sidebar and presents About me before Recent updates, followed by research, design, and experience. English is the default, with Chinese available throughout. Project actions link to Project, Paper, Code, and Notebook when available. Historical publication metadata and original public URLs are preserved.

The full-page 3D opening appears only on the first enhanced page in a tab session. Later documents and embedded notebooks display immediately. Real cover previews remain visible as higher-resolution images and videos arrive. The initial portfolio view decodes its embedded project images while a two-job queue sharpens them during the opening; slow full-size image transfers do not extend the completed animation. The portfolio uses bounded video players and preserves pan, zoom, mobile scroll, and per-language reading positions. Its reader reuses up to three visited notebooks; hidden media pauses. Intent prefetch fetches only inert same-origin HTML/CSS/module bytes and never executes a speculative document or analytics.

Notebook photographs carry small real-image previews while native full-resolution images load. Project covers display one proportionally scaled image on white, with a fine dark frame and restrained shadow; decoded images remove their preview layer so letterboxing never reveals a repeated or second copy. The canvas gives visible content priority, cancels unfinished off-screen downloads, and waits briefly for scrolling to settle before fetching visible mobile cover videos; every visible mobile cover loops automatically without a tap. Desktop dragging retains a verified frame rather than exposing an undecoded video surface. Common stylesheet groups are shared across routes with the original cascade preserved; nonessential analytics loads asynchronously without blocking the localized reader, and runtime graphs live under immutable `assets/runtime/<fingerprint>/` paths, while previously published asset URLs remain available for cached documents.

The November 2026 release includes project-specific diagrams and first-person notebooks, updated conference recognition, the original mini-program interfaces, and the approved corrected dates and roles. Unused experiments, private source material, and the owner-supplied certificate are excluded from the public artifact. Older `content/` notes record their original source audits; the current public pages reflect subsequent owner corrections.

`content/PROFILE.md` records the owner's latest bilingual biography, professional roles, memberships, and teaching experience. Public profile text uses Robbie Fenggui Rao / 饶柏; publications retain the verified author name Fenggui Rao.

`content/UPDATES.md` records the sources and date meanings for the homepage updates and its collapsible archive.

The homepage footer shows a [Hits](https://github.com/silentsoft/hits) page-view badge, started on October 28, 2026. It uses the dedicated key `robbierao.github.io`, separate from GitHub profile or repository traffic. Only the homepage embeds the badge; the CV and project pages do not increment it. The image loads eagerly so a visit can count without scrolling to the footer. Counts include repeat visits and verification requests, are subject to browser caching or blocking, and are not unique people or historical traffic. Click the badge for the service's statistics. This external image requires no account, script, or build dependency; if it cannot load, its alt text remains and the rest of the site works normally. Keep the key stable to preserve the count, and do not use the service's `extraCount` parameter to inflate it.

Private analytics is connected to `https://robbierao-visitor-analytics.fengguirao.workers.dev/collect` on the homepage, CV, and eight design pages. `analytics/README.md` documents the private Cloudflare Worker + D1 collector, unique-browser/session definitions, account-only access, CSV export, 365-day retention, tests, and deployment steps. Raw visitor data and Cloudflare credentials are never included in the public Pages artifact or repository.

## Edit and preview

- `site/index.html`: bilingual homepage, publication metadata and work filters.
- `site/canvas/index.html`: portfolio data and accessible project index.
- `site/research/` and `site/design/`: the complete canonical notebooks, also used by the canvas reader.
- `site/projects/`: independent project pages for DisFace3DNet, ContextCam, and art therapy.
- `site/cv/index.html`: detailed, printable CV.
- `site/assets/`: content-addressed shared styles and immutable runtime module graphs for localization, navigation, the 3D opening, and progressive media; older public assets are retained for compatibility.
- `site/images/` and `site/videos/`: public project media and short cover derivatives.

This repository contains the validated deployment artifact. The independent authoring workspace retains an immutable copy of the previous approved site/content at commit `76ae9a2e45052558ecac2c39d973f54738815057`, so publishing this artifact does not change its build inputs. Only the selected public dependency closure is copied here; authoring sources and QA remain outside `site/`.

From the repository root:

```sh
python3 -m http.server 4173 --directory site
python3 scripts/check_site.py
node --test analytics/worker.test.mjs analytics/client.test.mjs
python3 -m unittest discover -s analytics -p 'test_*.py'
```

GitHub Actions validates the static artifact and existing analytics contracts on pull requests. Changes merged into `master` deploy `site/` to https://robbierao.github.io/. The release retains the existing analytics client and allowlist, privacy controls, and homepage Hits key; it does not redeploy the analytics Worker.

## Original content and recovery

The pre-rebuild website is preserved on `archive/pre-rebuild-2026-10-08` at commit `f3b1e23d285ea85a4841d08875eb19532fe68409`. It includes the original site, assets, and history.

`content/CONTENT-INVENTORY.md` is the readable inventory of the original information. `content/original-homepage.json` contains all original homepage data; `content/original-sources/` retains the original profile, CV, publication, and portfolio files. These files are not published by the deployment workflow.

Original publication-year inconsistencies and role/degree differences are recorded in the inventory. The art-therapy paper (2025) and ICLC paper (2024) were checked against Crossref and Zenodo. The Flowing Ink Resonator, CityCure, and ContextCam DOI records were checked against Crossref. The personal statement comes directly from the owner; see `content/PERSONAL-NOTES.md`.

Legacy publication, portfolio, CV, terminal, and office URLs remain as simple redirects to the relevant section or CV. The CV supports the browser’s Print / Save as PDF command.

The 2026 ResearchGate audit and profile draft are in `content/RESEARCHGATE-AUDIT.md`. Three additional publications were verified through Crossref and institutional records and added to the homepage and CV; their exact metadata is in `content/researchgate-publication-verification.json`. The TAFFC review is labeled Accepted / In press, and no unverified publication month is displayed.
