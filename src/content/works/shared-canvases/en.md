## Starting from a place or from someone’s idea

Capture starts with the street in front of the person; Explore starts with an existing proposal. Both collect a spoken intention and a short restorative rating from 1 to 7. For my Unity interface work, the important difference was the image each request referred to: a new capture in one mode, a previous proposal in the other.

<figure class="diagram">
<a href="/images/research/cocreation/shared-canvases.webp"><img src="/images/research/cocreation/shared-canvases.webp" alt="Capture creates a starting point; Explore continues from a selected proposal. The reference image determines what the next edit inherits." width="483" height="303" loading="lazy" decoding="async" /></a>
<figcaption>Capture creates a starting point; Explore continues from a selected proposal. The reference image determines what the next edit inherits.</figcaption>
</figure>

Consider the shade-and-bench example. Capture produces a shaded version of the street; Explore then adds seating to that version. The second proposal inherits the shade. Sending the same seating request with the original photograph would start another branch. A date or position in a feed cannot explain which operation happened.

I treated the reference image as part of the current task, so the next request had a visible starting point. The study also kept the rating short at each stop and placed SEQ and SUS after the walk. In the interface, that left the brief scene judgment close to the action it described.

<figure class="diagram">
<a href="/images/figures/shared-canvases-en.svg"><img src="/images/figures/shared-canvases-en.svg" alt="An illustrative image lineage: a second edit inherits its selected reference, including the first proposal’s changes. The field pilot stored these reference relationships alongside the event context." width="900" height="600" loading="lazy" decoding="async" /></a>
<figcaption>An illustrative image lineage: a second edit inherits its selected reference, including the first proposal’s changes. The field pilot stored these reference relationships alongside the event context.</figcaption>
</figure>

## A returned image still needs a decision

The team’s pipeline turns the spoken request into a semantic description and uses NanoBanana to modify the reference scene. In the field deployment, generation finished within ten seconds. Proposals were then screened for semantic consistency, scene fidelity and plausible scale.

For the client, receiving an image and adopting a proposal were separate moments. The team’s screening made that distinction unavoidable: an image could arrive normally and still place a bench in the walking route. A rejected result was not a useful starting point for someone else’s Explore task.

Looking back at that sequence, the ten-second generation time tells only part of the story. A person still had to see and judge the result before continuing. I came to read the wait, the result and the decision together when describing the interaction, rather than using the network response as its finish line.

## Keep the reference as well as the location

The pilot covered 400 meters of Chatham Road South. Twenty participants were assigned to the two pedestrian sides and walked for twenty minutes, completing about ten Capture or Explore tasks each. The platform retained location, rating, spoken feedback and interaction events, producing 196 valid co-creation events.

Those records need two references. A coordinate tells us where an activity happened. A link to the preceding image tells us how a proposal developed. Several photographs of one location need not be revisions of each other; several generated images may all descend from one photograph.

The records made a client-side distinction visible outside the headset: the final picture was only one part of the event. The scene, chosen reference and spoken request explained why it existed. Keeping the reference relationship gave the image sequence a history that a folder of outputs would not contain.

## The walk sets the interface’s pace

The prototype ran on Meta Quest 3, standing in for the lightweight MR glasses envisaged in the design. Mean SEQ was 6.0 and SUS was 73.9, with Cronbach’s α of 0.867. I read those results as accounts of this headset and walking task; they were not measurements of the lighter device in the original concept.

After co-creation, 70.62% of samples received a higher perceived-restorativeness rating, 19.07% were unchanged and 10.31% were lower. Participants judged visual proposals; the street had not been rebuilt. The study captured how the represented changes were perceived, with the scene and request still available for interpretation.

The team organized spoken feedback into five themes and thirteen subthemes, using MiniLM, UMAP and HDBSCAN before researcher interpretation. Seating and small planting often received positive comments; maintenance and mismatched facades were also frequent but associated with lower ratings. The explanation matters: mentioning a feature often can mean wanting more of it or wanting it fixed.

#### What the provenance graph stores

| Object | Meaning |
| --- | --- |
| Node | One captured or generated scene image. |
| Directed reference | A later proposal explicitly uses an earlier image as its reference. |
| Branch | A sequence of edits that can be inspected back to the original street capture. |
| Associated records | Place, rating, verbal feedback and interaction event. |

## Tools, in context

<dl class="tools">
<div><dt>Unity · Meta Quest 3</dt><dd>Capture and Explore interfaces for the field pilot on Chatham Road South.</dd></div>
<div><dt>LLM · NanoBanana</dt><dd>Interpret spoken intent and generate scene-conditioned alternatives, followed by fidelity and scale screening.</dd></div>
<div><dt>Geospatial and reference records</dt><dd>Associate coordinates, appraisals, speech, and image derivation for the team’s analysis.</dd></div>
</dl>
