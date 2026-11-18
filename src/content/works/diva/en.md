## Choose a model I can change

For the DIVA VR prototype, the environment had to support separate changes to greenery, amenities and spatial sequence. The material combined eye-level and aerial records of a Hong Kong healthy trail in Polycam. The team chose photogrammetry after comparison because the geometry could join conventional scene assets and support the edits in the proposed study.

This made the representation decision practical for my Unity work. Moving a facility or changing planting needs to leave unrelated visual cues stable. The neural-rendering approach considered in the project had integration and viewing-range constraints that did not suit this purpose.

That choice gave the prototype two separate jobs: retain a recognizable trail and make the intended factors editable. I found the second requirement more consequential than a reconstruction’s appearance alone. A detailed scene was useful to this study only if its controlled changes remained manageable in Unity.

## Eight conditions need controlled differences

The proposed design crossed high/low greenery, many/few amenities and changing/unchanging spatial sequences into eight combinations. I used this matrix to define the scope of scene changes in Unity. A density change belonged to one factor; moving amenities or changing the route belonged to others.

<figure class="diagram">
<a href="/images/research/cocreation/diva.webp"><img src="/images/research/cocreation/diva.webp" alt="The proposed protocol connects editable scenes with physiological recording and post-exposure ratings. Scene condition and exposure interval need to stay identifiable throughout." width="1400" height="639" loading="lazy" decoding="async" /></a>
<figcaption>The proposed protocol connects editable scenes with physiological recording and post-exposure ratings. Scene condition and exposure interval need to stay identifiable throughout.</figcaption>
</figure>

The matrix makes the comparisons explicit. Vertical pairs change greenery while retaining the other levels; horizontal pairs change amenities; corresponding cells across the two groups change spatial sequence. This organizes the scene variants, separately from the exposure order specified in the proposed protocol.

The example protocol specifies random assignment of three scenes to each participant, controlled navigation speed and PRS-11 after each exposure. I treated the condition identifier and planned viewing order as different parts of the prototype flow. One describes the environment; the other specifies the sequence in which it would be presented.

<figure class="diagram">
<a href="/images/figures/diva-en.svg"><img src="/images/figures/diva-en.svg" alt="The matrix varies greenery, facilities, and spatial sequence independently. Each row holds greenery density constant; each column holds facility level constant. Moving between panels changes spatial arrangement." width="900" height="650" loading="lazy" decoding="async" /></a>
<figcaption>The matrix varies greenery, facilities, and spatial sequence independently. Each row holds greenery density constant; each column holds facility level constant. Moving between panels changes spatial arrangement.</figcaption>
</figure>

#### The factorial scenario specification

| Factor | Level A | Level B |
| --- | --- | --- |
| Greenery density | Low | High |
| Spatial facilities | Few | Many |
| Spatial sequence | Unchanging | Varying |

## Give the exposure a clear start and end

The proposed flow separated loading, calibration, environmental exposure and the questionnaire. Working through that sequence made the timing issue clear to me: opening a scene file did not define the start of an exposure. The measurement interval belonged to the experience being studied, rather than to a software-loading event.

The planned EDA processing uses NeuroKit2 for filtering, artifact correction and separation of slow skin-conductance level from faster responses. PPG processing extracts pulse peaks and interbeat intervals for measures including SDNN and RMSSD. These are the team’s analysis plans; the client needs to provide an exposure interval they can be paired with.

PRS-11 used a different time scale: eleven five-point items described the preceding exposure through fascination, being away, coherence and scope. Continuous signals instead described variation within that interval. Writing these measures into one protocol clarified why the interval itself had to remain identifiable across both.

## What the prototype fixed, and what remained a protocol

DIVA remained a proposed protocol rather than a completed intervention study. My prototype work concentrated on the repeated sequence: enter a condition, navigate at a controlled speed, end the exposure, answer the questions and move to another assigned condition. That sequence gave the scene variants a common structure for presentation.

VR made weather, traffic and ambient noise easier to control, while leaving out some cues from the real trail. ANOVA, random forests and K-means were part of the planned analysis; calibration, synchronization and fatigue remained deployment considerations. The work left me with a useful distinction: an editable scene and a repeatable exposure protocol are different pieces of the experiment, and neither is supplied by visual fidelity alone.

## Tools, in context

<dl class="tools">
<div><dt>Unity · VR</dt><dd>My prototype work: scene presentation, condition changes, and the exposure sequence.</dd></div>
<div><dt>Polycam · photogrammetry</dt><dd>Team reconstruction from human-eye and bird’s-eye recordings for editable geometry.</dd></div>
<div><dt>EDA · PPG · PRS-11</dt><dd>Proposed physiological and subjective measures tied to each VR exposure.</dd></div>
<div><dt>NeuroKit2 · ANOVA · RF · K-means</dt><dd>Team preprocessing and analysis plan; no completed intervention results are reported.</dd></div>
</dl>
