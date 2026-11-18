## What a historical sentence can support

The canal material contains literary descriptions of activities and sound sources, but few historical recordings. In supervising the research, I treated that as a constraint on what the work could claim. A sentence can support an interpretation of a scene; it rarely contains enough acoustic information to reconstruct what was actually heard.

I used semantic correspondence and cultural plausibility to frame the review of candidate sounds. The source sentence stays attached to the asset so that a choice can be checked later. This keeps the discussion specific: what in the text supports this sound, and which details come from our creative interpretation?

For the interaction study, I kept asset authoring separate from live control. The team prepared and reviewed a reusable library; visitors selected and modulated those materials through movement. Holding the library fixed let us compare input methods without also changing the sounds. It also kept generation out of the immediate response to a visitor’s movement.

#### A reusable event record

| Layer | Retained information |
| --- | --- |
| Text provenance | Original record → sentence-level sound description. |
| Semantic annotation | Scene, source category, temporal form and affect. |
| Curated assets | Reviewed and mixed sound clip; curated visual seed. |
| Live control | Event selection, layering and continuous modulation. |

## A plausible sound can still be wrong for the scene

The corpus contains 4,328 screened text records and 1,120 sentence-level sound descriptions. Each description carries scene, source category, temporal form and affect annotations. A scene-sound table connects the playable asset to its prompt, semantic unit and original record. During review, I used that connection to follow a candidate sound back to the passage, rather than judging its fit from the audio alone.

Recognizing the source was only one part of that review. A sustained background and an event with a clear onset have different roles; duration and rhythm determine how they can be layered. I read the affect annotation against the tone of the passage as well. A sound could be plausible in isolation yet pull the scene toward a mood the text did not support.

The team generates candidates from selected sentences, reviews them, and edits and mixes accepted material into reusable events. Ink seed images supply the visual conditions. At runtime, selection, layering and modulation operate on those prepared resources. This gives the user an immediate control surface while keeping the slower interpretive work in the authoring stage.

## A wrong event and a late response are different problems

The installation maps body input to both event selection and continuous change. MediaPipe supplies landmarks and gesture states; confidence filtering removes unreliable estimates and temporal smoothing stabilizes motion features. OSC carries control to Max/MSP for prepared audio and mixing, and to TouchDesigner for the current visual seed and StreamDiffusion rendering.

<figure>
<a href="/images/research/experience/flowing-ink-setup.webp"><img src="/images/research/experience/flowing-ink-setup.webp" alt="The embodied and button/keyboard conditions share the event library and modulation range. The comparison changes how a participant controls them." width="761" height="670" loading="lazy" decoding="async" /></a>
<figcaption>The embodied and button/keyboard conditions share the event library and modulation range. The comparison changes how a participant controls them.</figcaption>
</figure>

When interpreting the mapping and participants’ accounts, I separated an unintended trigger from an overly delayed continuous response. The first changes which content is selected. The second can make the correct content feel detached from the movement. “I could not control it” was too broad a description to explain both.

The two conditions made that distinction useful. Repeated buttons allowed an event to be checked; sustained movement made a changing parameter perceptible over time, including delay introduced by smoothing. With the event library and modulation range held constant, the comparison concerned how people controlled the material, rather than which set of sounds or visuals they preferred.

<figure class="diagram">
<a href="/images/figures/flowing-ink-en.svg"><img src="/images/figures/flowing-ink-en.svg" alt="The authoring pipeline produces a shared library; the two study conditions access the same events and modulation space. The signal sketches illustrate trigger and modulation behavior, rather than measured participant traces." width="900" height="690" loading="lazy" decoding="async" /></a>
<figcaption>The authoring pipeline produces a shared library; the two study conditions access the same events and modulation space. The signal sketches illustrate trigger and modulation behavior, rather than measured participant traces.</figcaption>
</figure>

## Why I kept the interviews beside the ratings

Six volunteers aged 11 to 75 completed both input conditions, giving twelve experiences. After each, four seven-point ratings covered control, presence, learning burden and satisfaction; semi-structured interviews recorded how participants understood the interaction. With a small, heterogeneous pilot, I treated themes as the main result and paired ratings with Cohen’s dz as descriptive support. We did not run hypothesis tests.

The team transcribed the recordings, coded meaning units and refined themes through comparison across conditions. Body input supported continuity: rhythmic effort could be felt alongside the scene’s change. Buttons supported checking: the same input could be repeated to confirm an effect. Descriptively, presence was higher and less variable with body input, while control was higher with symbolic input.

Similar mean learning-burden ratings concealed different experiences. An older participant could understand the rule but find sudden changes difficult; someone who preferred analyzing the interface could use repetition to work out cause and effect. I read those accounts against event selection and continuous modulation rather than turning the mean into one explanation for everyone.

The interviews changed how I read “control” in this project. For some participants it meant staying inside a continuous movement; for others it meant being able to repeat an action and verify its consequence. The ratings alone made those experiences look like positions on one scale. Reading them alongside the accounts showed why body input could strengthen presence without also producing the highest sense of control.

## Tools, in context

<dl class="tools">
<div><dt>Corpus annotation and asset review</dt><dd>Link events to source sentences and annotations; review, trim, and mix generated candidates before runtime.</dd></div>
<div><dt>MediaPipe · OSC</dt><dd>Filter and smooth body estimates, then transmit event states and continuous motion features.</dd></div>
<div><dt>TouchDesigner · StreamDiffusion · Max/MSP</dt><dd>Render conditioned ink imagery and mix prepared audio under shared controls.</dd></div>
</dl>

## Publication & selections

<time datetime="2026-04-13">2026-04-13</time> · Paper published

### CHI EA 2026 ↗

-   <time datetime="2026-08-14">2026-08-14</time>
    
    2nd China Conference on Human-Machine Collaborative Computing (HMCC 2026)Selected technical demo and design work
    
-   <time datetime="2025-12-26">2025-12-26</time>
    
    Inaugural CCF Conference on AI for Humanities (AI4Humanities 2025)Selected poster
