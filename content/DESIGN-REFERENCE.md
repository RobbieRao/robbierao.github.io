# Homepage layout reference

Reference: [Jie Zhang's personal homepage](https://easy-shu.github.io/), inspected on 2026-10-08 after the owner requested this reference. The hostname includes a hyphen.

The source is public at [Easy-Shu/Easy-Shu.github.io](https://github.com/Easy-Shu/Easy-Shu.github.io), forked from MontaEllis/MontaEllis.github.io. Its README identifies the template as AcadHomepage, and its [LICENSE](https://github.com/Easy-Shu/Easy-Shu.github.io/blob/main/LICENSE) is MIT, copyright 2022 Yi Ren. The sidebar and masthead source files were inspected to confirm the responsive profile and sticky navigation structure. This site's implementation is static HTML and CSS and uses the owner's content and portrait.

The original template is [RayeRen/acad-homepage.github.io](https://github.com/RayeRen/acad-homepage.github.io).

The homepage follows the reference's information layout: a white page, a persistent personal profile column on desktop, a top section navigation, compact sans-serif text, blue links, and publications grouped by research topic. The mobile view brings the profile above the content and wraps navigation and profile links.

All biography text, publications, projects, honors, and the portrait are the owner's existing materials. The owner's publication name is emphasized in verified author lists. The personal statement “我致力于寻找世界的bug” has its own section. Full CV content remains on `/cv/`, and existing project/publication anchors remain available.

Recent updates now use full dates at the owner's request; date sources and the distinction between publication, event, and announcement dates are maintained in `UPDATES.md`. The DIVA DOI and author order were additionally verified against the exact Crossref title match: https://doi.org/10.52842/conf.ecaade.2025.1.111. The exact record is in `diva-publication-verification.json`.

## Editorial comparison — 2026-10-28

The reference homepage was inspected again after the owner flagged filler such as “alongside” and repeated conference periods in the news. Its useful conventions are a short introduction, one event per news entry, brief academic identifiers, and direct access to concrete outputs.

- Public news states the event. Date provenance and verification notes belong in `UPDATES.md`, and full talk titles and event details belong in the CV.
- Keep acceptance, publication, preprint, and selection status accurate while shortening sentences. A publication record does not establish personal attendance or an invited presentation.
- Describe roles directly instead of using comparisons between appointments to imply importance.
- Further presentation opportunities include a shorter introduction and research figures or artifact links for representative publications. These require content selection and assets; they are not implied by a text-only cleanup.
- The reference contains its own grammatical and formatting errors. Borrow its information hierarchy rather than reproduce its sentences or prestige claims.
