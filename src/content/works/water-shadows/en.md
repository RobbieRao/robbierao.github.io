<figure class="pair">
<a href="/images/design/water-shadows/installation-view.webp"><img src="/images/design/water-shadows/installation-view.webp" alt="Full-height photograph of a metal, plant, and projection installation" width="1600" height="2400" loading="lazy" decoding="async" /></a>
<a href="/images/design/water-shadows/virtual-landscape.webp"><img src="/images/design/water-shadows/virtual-landscape.webp" alt="Virtual landscape developed alongside the physical installation" width="1269" height="585" loading="lazy" decoding="async" /></a>
<figcaption>The completed physical installation.</figcaption>
</figure>

## Let the village keep its traces

For my outdoor scene, I wanted plants to appear to be reclaiming the village. The lake and islands establish the setting; brick walls interrupt the vegetation so that a place people once inhabited remains visible. That gave me a reason to keep the walls in the composition instead of filling every gap with foliage.

The environment was shared work: Hanyi developed the interior exhibition space, and Wenkang modeled the architectural remodeling. I made the sky and particle effects available across the project. For the sky, I modified Ultra Dynamic Sky’s star-retrieval function, replaced the skybox with Stable Diffusion imagery, and adjusted the parameters against the scene. A shared sky helped the different spaces belong to the same environment without making their architecture identical.

## A fish needs a reason to leave the group

This was my first time writing Niagara scratch-pad scripts. A spline gave the fish a route, but following the same route was not enough to make a group interesting. I worked on gathering, separation and blinking, then added individual decisions so a fish could follow the group or leave it. The path holds the composition together; those departures keep the movement from settling into a fixed formation.

<figure>
<a href="/images/design/water-shadows/niagara-workflow.webp"><img src="/images/design/water-shadows/niagara-workflow.webp" alt="The spline supplies the route; scratch-pad behavior allows individual fish to gather and separate." width="1898" height="802" loading="lazy" decoding="async" /></a>
<figcaption>The spline supplies the route; scratch-pad behavior allows individual fish to gather and separate.</figcaption>
</figure>

The village point cloud needed a different input. I captured scene depth into the image’s alpha channel and passed it to Niagara to place the points. The fish and the village used the same particle tool for different jobs: one updated individual movement, while the other represented captured geometry. Working on both made the input to an effect much more important to me than its surface resemblance to another particle effect.

<figure>
<a href="/images/design/water-shadows/depth-point-cloud.webp"><img src="/images/design/water-shadows/depth-point-cloud.webp" alt="Scene depth travels through alpha into Niagara. This effect represents the village rather than simulating fish." width="1883" height="699" loading="lazy" decoding="async" /></a>
<figcaption>Scene depth travels through alpha into Niagara. This effect represents the village rather than simulating fish.</figcaption>
</figure>

## The curve changed our choice of material

The shape discussions had moved ahead of the fabrication plan. Alongside the outdoor scene, I took Hanyi’s and Wenkang’s ideas into Rhino and prepared cutting drawings. We bought steel tubing and a tube bender, but the trial bends were too stiff for the fish shape. A curve that looked plausible in the model was much harder to make with that combination of material and tool.

I proposed hard aluminum wire inside flexible metal tubing. The wire holds the bend while the outer tubing gives it a tubular surface. We also replaced the planned hammered sheet-metal skin: the labor was too much, and 3D printing was expensive. Projection mesh let the frame define the fish’s outline while the projected image supplied its changing surface.

<figure>
<a href="/images/design/water-shadows/structure-drawing.webp"><img src="/images/design/water-shadows/structure-drawing.webp" alt="Fabrication drawings for the fish-shaped installation." width="1118" height="782" loading="lazy" decoding="async" /></a>
<figcaption>Fabrication drawings for the fish-shaped installation.</figcaption>
</figure>

That choice also changed what I had to finish physically. Surface detail no longer had to be formed in metal; I could continue developing it in TouchDesigner after the frame was fixed. The mesh, frame and projected image therefore had to be judged together. A good curve on its own did not guarantee a good projection surface.

<figure class="diagram">
<a href="/images/figures/water-shadows-en.svg"><img src="/images/figures/water-shadows-en.svg" alt="Construction principle, not to scale: aluminum wire inside flexible metal tubing forms the ribs; projection mesh carries the particle image. The curved-rib detail explains the change from the steel-tube trial." width="900" height="580" loading="lazy" decoding="async" /></a>
<figcaption>Construction principle, not to scale: aluminum wire inside flexible metal tubing forms the ribs; projection mesh carries the particle image. The curved-rib detail explains the change from the steel-tube trial.</figcaption>
</figure>

<figure>
<a href="/images/design/water-shadows/structural-detail.webp"><img src="/images/design/water-shadows/structural-detail.webp" alt="Structural connections and cabling." width="2400" height="1600" loading="lazy" decoding="async" /></a>
<figcaption>Structural connections and cabling.</figcaption>
</figure>

## Draw the motion, then project it

I built the projected particles with Geometry COMP instancing in TouchDesigner. Remap TOP samples the flow field at each particle’s position; that force updates acceleration and velocity, and the updated state drives the visible instances. Changing the field changes how the particles move, rather than just placing a new texture over them.

<figure>
<a href="/images/design/water-shadows/touchdesigner-projection.webp"><img src="/images/design/water-shadows/touchdesigner-projection.webp" alt="TouchDesigner flow-field network and the particle imagery developed for projection." width="1269" height="609" loading="lazy" decoding="async" /></a>
<figcaption>TouchDesigner flow-field network and the particle imagery developed for projection.</figcaption>
</figure>

The output then lands on the fish-shaped mesh. I separate motion from rendering when reading the network: the field update determines where an instance goes, and Geometry COMP determines what gets drawn there. But the final judgment has to happen on the mesh. The frame’s ribs and the curved surface are part of the image the audience sees.

<figure>
<a href="/images/design/water-shadows/projection-detail.webp"><img src="/images/design/water-shadows/projection-detail.webp" alt="Projection mesh and the fish-shaped structure." width="2400" height="1600" loading="lazy" decoding="async" /></a>
<figcaption>Projection mesh and the fish-shaped structure.</figcaption>
</figure>

## The last two nights in the studio

The three of us spent two nights in the studio finishing the physical installation. The frame, mesh and projection had to come together, while the same team was also handling scenes, editing and writing. I wrote the project paper around Hongfan Village and entered the Challenge Cup with the team’s work.

Those two nights changed how I understood the amount of work in an installation. Scene production, frame fabrication and projection were not independent jobs that ended when each looked finished. Attaching the mesh and aligning the image brought them back together. The material change saved fabrication work, but also moved more of the final appearance into projection. That was the trade I felt most clearly during the final assembly.

<figure>
<a href="/images/design/water-shadows/planting-detail.webp"><img src="/images/design/water-shadows/planting-detail.webp" alt="Plants and the illuminated base." width="2400" height="1600" loading="lazy" decoding="async" /></a>
<figcaption>Plants and the illuminated base.</figcaption>
</figure>

## Tools, in context

<dl class="tools">
<div><dt>Rhino</dt><dd>Designed the fish frame and prepared cutting drawings.</dd></div>
<div><dt>Unreal Engine / Niagara</dt><dd>Implemented fish movement and a scene-depth point cloud; modified the UDS sky blueprint.</dd></div>
<div><dt>TouchDesigner</dt><dd>Generated flow-field particles for projection onto mesh.</dd></div>
</dl>
