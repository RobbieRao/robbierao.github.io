<figure>
<a href="/images/design/lost-homeland/circular-corridor.webp"><img src="/images/design/lost-homeland/circular-corridor.webp" alt="A dark science-fiction environment built around a circular corridor" width="2400" height="1334" loading="lazy" decoding="async" /></a>
<figcaption>A finished scene from the short film.</figcaption>
</figure>

## Build two different kinds of enclosure

For the data universe in The Lost Homeland, we developed a dark ring corridor and a field of cyan architectural fragments. The corridor encloses a continuous route; the fragments leave gaps through which light and depth can enter. Those two arrangements give the film different ways to approach its subject of belonging.

<figure>
<a href="/images/design/lost-homeland/data-universe.webp"><img src="/images/design/lost-homeland/data-universe.webp" alt="A contrasting, luminous environment within the film." width="2400" height="1124" loading="lazy" decoding="async" /></a>
<figcaption>A contrasting, luminous environment within the film.</figcaption>
</figure>

In the finished views, the corridor is held together by its opening and enclosure; the fragment field is held apart by gaps. Those large relationships distinguish the settings before the surface detail becomes visible. Reading the two together taught me why extra texture alone would not have made the environments feel different.

## Reserve space for the light

The ring is organized in concentric layers, with room volumes arranged around it. Inside each room, a flat area supports furniture; other parts of the ring are reserved for lighting. This lets the geometry do more than describe the exterior shape. It also establishes where objects and illumination can coexist.

The bright opening and dark corridor worked as a pair. Light brought depth into the ring, while the room silhouettes retained its enclosure. The geometry gave the illumination something definite to reveal. That relationship was more convincing to me than treating lighting as a final surface treatment after the model was complete.

<figure class="diagram">
<a href="/images/figures/lost-homeland-en.svg"><img src="/images/figures/lost-homeland-en.svg" alt="Schematic room and lighting zones connect the ring plan to its bright central opening." width="880" height="560" loading="lazy" decoding="async" /></a>
<figcaption>Schematic room and lighting zones connect the ring plan to its bright central opening.</figcaption>
</figure>

## Find the layer that needs changing

Our production views put Blender modeling and materials beside Unreal Engine’s material functions and BP\_FirstPersonCharacter event graph. These are different editing locations for different parts of the scene. The material function changes how the surface responds; the event graph changes behavior over time.

<figure>
<a href="/images/design/lost-homeland/material-development.webp"><img src="/images/design/lost-homeland/material-development.webp" alt="The ring sketch reserves separate room floors and lighting areas; the production views keep geometry, surface treatment and scene behavior in different editors." width="2400" height="1556" loading="lazy" decoding="async" /></a>
<figcaption>The ring sketch reserves separate room floors and lighting areas; the production views keep geometry, surface treatment and scene behavior in different editors.</figcaption>
</figure>

The central opening gives these tools a common visual reference. Ring and room geometry define its outline; lighting and material response determine how much of the surrounding surface can be read. The production views helped me connect each visible feature to an editing location, instead of treating the whole image as one indistinct effect.

## An effect and a shot asked different things

We also tried a blue-and-white fluid effect in TouchDesigner. The fluid1 controls expose pressure, velocity diffusion, density diffusion, buoyancy and vorticity separately. Keeping the output next to the network makes it possible to compare a parameter adjustment with the resulting motion.

<figure>
<a href="/images/design/lost-homeland/scene-development.webp"><img src="/images/design/lost-homeland/scene-development.webp" alt="Further scene and effect development." width="2400" height="1556" loading="lazy" decoding="async" /></a>
<figcaption>Further scene and effect development.</figcaption>
</figure>

The fluid study also sharpened the difference between an effect and a shot for me. Its pressure and diffusion controls explain the motion, but they do not decide what the audience attends to in the film. The opening, room silhouettes and gaps still organize that attention. A technically richer effect was not automatically the more useful one for this setting.

## Tools, in context

<dl class="tools">
<div><dt>Unreal Engine</dt><dd>Developed surface appearance with material functions and scene behavior with event graphs.</dd></div>
<div><dt>Blender</dt><dd>Modeled and previewed the scene geometry and material treatment.</dd></div>
<div><dt>TouchDesigner</dt><dd>Explored fluid motion through a node network and parameter controls.</dd></div>
</dl>
