# Robbie Fenggui Rao — personal website

A static personal website with research, design projects, creative practice, and a printable CV. The public site is in `site/`; it uses HTML, CSS, and a small optional analytics script, with no build dependencies.

The homepage uses a desktop profile sidebar and compact topical publication lists, following the owner's reference to [Jie Zhang's homepage](https://easy-shu.github.io/). See `content/DESIGN-REFERENCE.md` for the layout decisions.

The publication list includes ten compact research-figure previews, with full-size images available on click. The original sidebar, typography, topic grouping, paper metadata, and section order are retained. Image sources and preparation are recorded in `content/research-image-sources.json` and acknowledged at `/image-credits/`. The TAFFC preview uses two panels from its framework and links to the full figure. TrailTracking remains text-only because a verified image was not available. These images reuse verified materials from the cancelled redesign draft; that redesign's layout was not applied.

`content/PROFILE.md` records the owner's latest bilingual biography, professional roles, memberships, and teaching experience. Public profile text uses Robbie Fenggui Rao / 饶柏; publications retain the verified author name Fenggui Rao.

`content/UPDATES.md` records the sources and date meanings for the homepage updates and its collapsible archive.

The homepage footer shows a [Hits](https://github.com/silentsoft/hits) page-view badge, started on October 28, 2026. It uses the dedicated key `robbierao.github.io`, separate from GitHub profile or repository traffic. Only the homepage embeds the badge; the CV and project pages do not increment it. The image loads eagerly so a visit can count without scrolling to the footer. Counts include repeat visits and verification requests, are subject to browser caching or blocking, and are not unique people or historical traffic. Click the badge for the service's statistics. This external image requires no account, script, or build dependency; if it cannot load, its alt text remains and the rest of the site works normally. Keep the key stable to preserve the count, and do not use the service's `extraCount` parameter to inflate it.

Private analytics is connected to `https://robbierao-visitor-analytics.fengguirao.workers.dev/collect` on the homepage, CV, and eight design pages. `analytics/README.md` documents the private Cloudflare Worker + D1 collector, unique-browser/session definitions, account-only access, CSV export, 365-day retention, tests, and deployment steps. Raw visitor data and Cloudflare credentials are never included in the public Pages artifact or repository.

## Edit and preview

- `site/index.html`: homepage and project descriptions.
- `site/cv/index.html`: detailed CV.
- `site/assets/styles.css`: shared layout and typography.
- `site/design/`: eight illustrated design-project pages.
- `site/images/design/`: optimized project images.
- `content/design-projects.json` and `content/DESIGN-WORKS.md`: approved years, source mapping, and editing decisions.
- `site/images/profile-2026.png`: portrait supplied by Robbie on October 8, 2026.

From the repository root:

```sh
python3 -m http.server 4173 --directory site
python3 scripts/check_site.py
```

GitHub Actions validates local links and metadata on pull requests. Changes merged into `master` deploy `site/` to https://robbierao.github.io/.

## Original content and recovery

The pre-rebuild website is preserved on `archive/pre-rebuild-2026-10-08` at commit `f3b1e23d285ea85a4841d08875eb19532fe68409`. It includes the original site, assets, and history.

`content/CONTENT-INVENTORY.md` is the readable inventory of the original information. `content/original-homepage.json` contains all original homepage data; `content/original-sources/` retains the original profile, CV, publication, and portfolio files. These files are not published by the deployment workflow.

Original publication-year inconsistencies and role/degree differences are recorded in the inventory. The art-therapy paper (2025) and ICLC paper (2024) were checked against Crossref and Zenodo. The Flowing Ink Resonator, CityCure, and ContextCam DOI records were checked against Crossref. The personal statement comes directly from the owner; see `content/PERSONAL-NOTES.md`.

Legacy publication, portfolio, CV, terminal, and office URLs remain as simple redirects to the relevant section or CV. The CV supports the browser’s Print / Save as PDF command.

The 2026 ResearchGate audit and profile draft are in `content/RESEARCHGATE-AUDIT.md`. Three additional publications were verified through Crossref and institutional records and added to the homepage and CV; their exact metadata is in `content/researchgate-publication-verification.json`. The TAFFC review is labeled Accepted / In press, and no unverified publication month is displayed.
