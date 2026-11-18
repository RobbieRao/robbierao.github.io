## Turn the categories into answerable questions

Within this research line, I worked on Unity/VR development. For StreetCure, I approached the categories through their use in a scene: what the person was looking at, what question was asked and which answer belonged to that view. This connected the research vocabulary to the presentation and input work I was responsible for.

In Crowd-Define, the team held roughly one-hour AI-assisted interviews with ten residents viewing specified street videos. MiniLM embeddings, twelve-dimensional UMAP and HDBSCAN helped organize the accounts. Researchers made the final coding decisions, producing five environmental themes and thirteen subthemes. A label such as spatial order is useful, but the resident’s original description still tells us what they reacted to.

The mobile application was only partly deployed during the workshop. Some tasks used prepared media and interface substitutes. That shaped what the pilot could tell us: it exposed the relation between the stages without demonstrating every transition in an integrated live client.

## Keep each answer attached to its image

In Crowd-Measure, ten residents assessed fifty street photographs. Each image received two independent ratings, whose mean entered the image-level analysis. For the presentation work, the photograph was the unit that held the question and answer together. A score belonged to that view, not to every view of the same street.

<figure class="diagram">
<a href="/images/research/cocreation/streetcure.webp"><img src="/images/research/cocreation/streetcure.webp" alt="The study connects residents’ accounts, image-level assessment and responses to prepared proposals. My client work concerns how each response stays associated with its scene." width="1075" height="664" loading="lazy" decoding="async" /></a>
<figcaption>The study connects residents’ accounts, image-level assessment and responses to prepared proposals. My client work concerns how each response stays associated with its scene.</figcaption>
</figure>

A response concerns a particular view and question. The photograph, GPS metadata and rating cannot be treated as interchangeable labels for a whole street. Pointing the camera elsewhere may change the amount of sky or greenery in the image even when the place itself has not changed.

The team used Mask2Former for visible green, water and sky ratios, while people rated restorative quality, comfort, visual pleasure and environmental subthemes. I keep those measures distinct: pixel area describes what is in the frame; a comfort rating describes a person’s response. The individual ratings also retain disagreement that their mean no longer shows.

<figure class="diagram">
<a href="/images/figures/streetcure-en.svg"><img src="/images/figures/streetcure-en.svg" alt="Segmentation produces area ratios; two residents provide ratings for each photograph. Their averaged scores and image features meet at the photograph level before normalization and theme aggregation. The drawn scene and masks are schematic." width="900" height="680" loading="lazy" decoding="async" /></a>
<figcaption>Segmentation produces area ratios; two residents provide ratings for each photograph. Their averaged scores and image features meet at the photograph level before normalization and theme aggregation. The drawn scene and masks are schematic.</figcaption>
</figure>

## Prepared proposals change what can be tested

Crowd-Remix used Gemini 2.5 Flash Image to prepare fifty alternatives addressing missing greenery, weak visual order and insufficient seating. Ten residents each contributed ten likes and ten comments. Preparing images ahead of time removed generation waiting from that workshop.

That choice also defined what the workshop did not evaluate. The residents responded to prepared proposals in front of them; they were not testing recovery from a late response or a failed generation request. I kept those situations separate when interpreting the prototype, because a smooth workshop with prepared media says little about the handling of live requests.

More-liked proposals often improved seating, small planting, facade color and spatial order while keeping the ordinary logic of the street. The comment belongs beside its exact proposal: it explains whether a like concerns a place to sit, a clearer path or a surface treatment.

## What the analysis changed in my reading of a scene

The team compared multiple linear regression with random forest on the fifty images. The fitted linear model reached R² = 0.770, with VIF below 5, and performed better in cross-validation. Random forest remained exploratory; its SHAP analysis ranked aesthetic factors highest, followed by spatial, natural and multisensory themes.

The analysis separated objects that can otherwise blur into a general impression of a better street. Mediation used OLS with 5,000 bootstrap samples: comfort carried indirect effects across several domains, while visual pleasure retained an independent indirect effect in aesthetics. This gave me a more precise way to read seating, maintenance and facade treatment in the scenes.

The photographs came from one city, with views and categories selected for the study. I took the strongest associations as a reading of those scenes. For my development work, the useful lesson was the level of detail in the record: an image, a question and a proposal referred to related but different things. Their correspondence mattered more than collapsing them into one street-level score.

## Tools, in context

<dl class="tools">
<div><dt>Unity · VR prototyping</dt><dd>My contribution in this research line: scene presentation and participant interaction.</dd></div>
<div><dt>all-MiniLM-L12-v2 · UMAP · HDBSCAN</dt><dd>Team workflow for organizing interviews into categories used by the assessment.</dd></div>
<div><dt>Mask2Former · regression · random forest</dt><dd>Team analysis combining image segmentation, resident ratings, and model comparison.</dd></div>
<div><dt>Gemini 2.5 Flash Image</dt><dd>Prepared the fifty redesign alternatives used in the workshop.</dd></div>
</dl>
