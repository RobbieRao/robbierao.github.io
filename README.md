# Robbie Rao — personal website

A static personal website with research, design projects, creative practice, and a printable CV. The public site is in `site/`; it uses HTML and CSS with no JavaScript or build dependencies.

## Edit and preview

- `site/index.html`: homepage and project descriptions.
- `site/cv/index.html`: detailed CV.
- `site/assets/styles.css`: shared layout and typography.
- `site/images/profile.png`: original portrait.

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
