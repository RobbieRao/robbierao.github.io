<figure>
<a href="/images/design/liangzhu/exhibition-concept.webp"><img src="/images/design/liangzhu/exhibition-concept.webp" alt="Rendered exhibition table with interactive surfaces and textile displays" width="2400" height="1697" loading="lazy" decoding="async" /></a>
<figcaption>Exhibition-table concept — rendered visualization.</figcaption>
</figure>

## Keep a motif I can compare against

In Loomed Zenith, I developed the AI workflow, interaction and hardware programming, and contributed models and scenes. Jiaqi Zheng organized and digitized the motifs and designed the displays; Ziqi Wang worked on garment concepts, modeling and textures. I connected those visual studies to the generation controls and presentation scenes.

<figure>
<a href="/images/design/liangzhu/motif-library.webp"><img src="/images/design/liangzhu/motif-library.webp" alt="The motif library gives each generation a specific reference: axis, contour, internal divisions or repeat structure." width="2400" height="1696" loading="lazy" decoding="async" /></a>
<figcaption>The motif library gives each generation a specific reference: axis, contour, internal divisions or repeat structure.</figcaption>
</figure>

The library included the deity-and-beast mask, jade birds, fish and cloud scrolls. When selecting generated outputs, I checked the mask’s axis and internal divisions, the direction of a cloud scroll and the joins between repeated units. These gave the selection a more definite basis than whether the image looked ancient overall.

The physical displays put the sculptural forms above their flat counterparts in transparent cases. A line that reads clearly from the front can disappear behind another surface at the side; a small blank area can become a strong hole or shadow. Keeping the flat motif beside the volume gives those changes a reference.

<figure>
<a href="/images/design/liangzhu/three-dimensional-motifs.webp"><img src="/images/design/liangzhu/three-dimensional-motifs.webp" alt="Flat motifs beside their sculptural forms reveal what becomes thickness, an opening or an overlap after translation into volume." width="2400" height="1500" loading="lazy" decoding="async" /></a>
<figcaption>Flat motifs beside their sculptural forms reveal what becomes thickness, an opening or an overlap after translation into volume.</figcaption>
</figure>

## Separate structure, color and refinement

In ComfyUI, I separated the reference motif, text conditions and palette. This kept a visible connection between the inputs and the output I was selecting. A color change and a structural change could then be traced to different parts of the workflow, instead of being buried together in a single prompt.

<figure>
<a href="/images/design/liangzhu/generative-workflow.webp"><img src="/images/design/liangzhu/generative-workflow.webp" alt="The reference, conditioning, sampling and refinement stages stay separate, so a change can be traced back to its input." width="2400" height="1697" loading="lazy" decoding="async" /></a>
<figcaption>The reference, conditioning, sampling and refinement stages stay separate, so a change can be traced back to its input.</figcaption>
</figure>

The workflow encoded the reference with a VAE, applied SDXL positive and negative conditions in latent space, and sampled with the advanced KSampler. A separate Refiner stage preceded VAE decoding. I reviewed the outputs in the same order: the motif’s organization first, then the line and surface detail. That kept refinement subordinate to a structure I could still recognize.

The node view can explain the process to a visitor, but it does not all need to become a control panel. I brought forward the choices a person can judge visually, such as palette and array. The rest remains in the workflow supporting those choices.

## Sliders for proportions, buttons for arrangements

For the interaction table, I mapped the proportions of eight Liangzhu colors to physical sliders and the rectangular, circular and random arrays to three buttons. The generation order runs left to right. A slider permits a continuous adjustment; a button selects a different organizing rule.

<figure>
<a href="/images/notebook/liangzhu/workflow-palette-controls.webp"><img src="/images/notebook/liangzhu/workflow-palette-controls.webp" alt="Eight separate proportions control the palette; these are adjustable color conditions rather than eight preset looks." width="1600" height="1071" loading="lazy" decoding="async" /></a>
<figcaption>Eight separate proportions control the palette; these are adjustable color conditions rather than eight preset looks.</figcaption>
</figure>

The palette contains Baoyu red, Bi green, carbon-rice black, jade yellow, chicken-bone white, mist gray, pottery pink and cong yellow. Each has an adjustable proportion. That lets someone make a specific choice, such as retaining a dark contour while opening more light space inside a dense motif, instead of selecting one fixed color filter.

The array buttons change how the same unit occupies a surface. A grid makes spacing and repetition visible; a circle establishes a center; a random array loosens the regularity. Hardware programming and generation therefore share a vocabulary: the control changes a color proportion or an arrangement that the person can inspect.

<figure>
<a href="/images/notebook/liangzhu/workflow-array-controls.webp"><img src="/images/notebook/liangzhu/workflow-array-controls.webp" alt="Rectangular, circular and random arrays use the same motif unit with different placement rules." width="800" height="1093" loading="lazy" decoding="async" /></a>
<figcaption>Rectangular, circular and random arrays use the same motif unit with different placement rules.</figcaption>
</figure>

## Read the motif at the scale of a sleeve

The team developed the garments in Style3D, including pattern pieces, stitching, fabric and textures, drawing on Tang, Song and Ming silhouettes. Once a motif moves onto clothing, placement and scale become part of its reading. A narrow trim needs continuity; a broad panel needs room between the larger forms.

<figure>
<a href="/images/notebook/liangzhu/garment-variants.webp"><img src="/images/notebook/liangzhu/garment-variants.webp" alt="Front, side, back and detail views make motif scale and continuity comparable across garment parts." width="1509" height="2118" loading="lazy" decoding="async" /></a>
<figcaption>Front, side, back and detail views make motif scale and continuity comparable across garment parts.</figcaption>
</figure>

The working views included front, side, back and details. I used them to compare the collar, placket, cuffs and hem. A motif could read clearly across the skirt and turn into a dense patch at the cuff. The side and detail views exposed breaks in the repeat and lines lost in folds that the front view did not show.

My model and scene work brought the garments into an Unreal Engine 5 rotation display. I judged the reflections, sky and ground by how they rendered the clothing: tonal changes on a light body, readable gold details and room around the sleeves and hem. The scene served the garment’s shape and surface rather than competing with them.

<figure>
<a href="/images/notebook/liangzhu/digital-garment-lineup.webp"><img src="/images/notebook/liangzhu/digital-garment-lineup.webp" alt="The display scene needs to retain garment silhouettes and texture details as the viewing angle changes." width="1803" height="401" loading="lazy" decoding="async" /></a>
<figcaption>The display scene needs to retain garment silhouettes and texture details as the viewing angle changes.</figcaption>
</figure>

## Two kinds of motion need different checks

The project has two motion paths. In ComfyUI, the motif image enters SVD conditioning, sampling and VAE decoding, followed by RIFE interpolation and video assembly. In Unreal Engine 5, the garment is shown as a three-dimensional object. The first changes the image over time; the second reveals an existing form from different angles.

<figure>
<a href="/images/notebook/liangzhu/workflow-animation-branch.webp"><img src="/images/notebook/liangzhu/workflow-animation-branch.webp" alt="SVD creates the sequence; RIFE interpolates between frames. Smooth motion still needs a check on what the motif becomes." width="2200" height="1022" loading="lazy" decoding="async" /></a>
<figcaption>SVD creates the sequence; RIFE interpolates between frames. Smooth motion still needs a check on what the motif becomes.</figcaption>
</figure>

I compared adjacent frames of the generated sequence to follow what happened to a motif. RIFE smoothed the intervals, but could not undo an unwanted change of form. In the garment view, I instead compared the placket, seams and hem as the angle changed. Working with both outputs made the distinction practical: a smooth video could still contain a motif problem, while a garment problem might belong to texture placement or the scene.

<figure class="video">
<video src="/videos/liangzhu-film.mp4" poster="/images/motion-covers/liangzhu-film.webp" width="1280" height="720" controls playsinline preload="none"></video>
<figcaption>Original project film · motif research, generative workflow, garment mapping, and exhibition design. Original soundtrack.</figcaption>
</figure>

## Give each exhibit a reason to be there

In the exhibition, horizontal screens extend the scene and a portrait screen keeps the garments’ proportions. Transparent tabletop cases pair sculptural motifs with gold-on-black flat references. From farther away, the screens establish the overall setting; at the table, the contour and medium can be compared more closely.

<figure>
<a href="/images/notebook/liangzhu/exhibition-screens.webp"><img src="/images/notebook/liangzhu/exhibition-screens.webp" alt="Horizontal and portrait displays give the scene and garments different viewing proportions." width="1080" height="608" loading="lazy" decoding="async" /></a>
<figcaption>Horizontal and portrait displays give the scene and garments different viewing proportions.</figcaption>
</figure>

The exhibition brought the parts of my work into one viewing sequence. A flat motif identified the source; the object exposed its thickness and negative space; the controls made variation tangible; the garment showed what those decisions did to a whole surface. Seeing them together changed how I judged an output: a good isolated image still had to survive a change of scale, medium and viewpoint.

<figure>
<a href="/images/notebook/liangzhu/exhibition-motif-objects.webp"><img src="/images/notebook/liangzhu/exhibition-motif-objects.webp" alt="A sculptural motif sits beside its flat reference, letting a visitor compare contour, thickness and negative space." width="1080" height="607" loading="lazy" decoding="async" /></a>
<figcaption>A sculptural motif sits beside its flat reference, letting a visitor compare contour, thickness and negative space.</figcaption>
</figure>

## Tools, in context

<dl class="tools">
<div><dt>ComfyUI · SDXL · Refiner</dt><dd>Reference-image encoding, text and palette conditioning, sampling, and refinement.</dd></div>
<div><dt>SVD · RIFE</dt><dd>Image-to-video generation and frame interpolation for motifs, separate from garment-scene presentation.</dd></div>
<div><dt>Unreal Engine 5</dt><dd>Rotating garment visualization and exhibition-scene production.</dd></div>
<div><dt>Style3D</dt><dd>Pattern pieces, sewing, fabric, and textures in the team’s garment workflow.</dd></div>
<div><dt>Physical controls</dt><dd>Interaction mapping for eight color-proportion sliders and rectangular, circular, and random arrangement buttons.</dd></div>
</dl>
