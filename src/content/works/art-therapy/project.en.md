<figure>
<a href="/images/research/experience/art-therapy.webp"><img src="/images/research/experience/art-therapy.webp" alt="Installation view: a participant interacts with generated characters and particle trails across the projected environment." width="841" height="372" loading="lazy" decoding="async" /></a>
<figcaption>Installation view: a participant interacts with generated characters and particle trails across the projected environment.</figcaption>
</figure>

## Give the child an active role in the scene

Interviews with children, family members and specialists informed three design priorities: creative expression, immersion and approachable fear-related imagery. The installation connects physical input to visible changes in stylized characters and particle trails across the surrounding space.

## Two update paths meet in the projection

<figure class="diagram">
<a href="/images/figures/art-therapy-en.svg"><img src="/images/figures/art-therapy-en.svg" alt="The local coordinate stream and generated image return have separate timing. TouchDesigner composites them before Spout and Resolume map the output to two vertical walls and the floor." width="900" height="660" loading="lazy" decoding="async" /></a>
<figcaption>The local coordinate stream and generated image return have separate timing. TouchDesigner composites them before Spout and Resolume map the output to two vertical walls and the floor.</figcaption>
</figure>

<ol class="steps">
<li><h3>Shape the visual material</h3><p>A LoRA trained on children’s drawings guides the generated visual style. The OpenSketch client provides a drawing canvas and image-generation requests; its upload service receives the resulting assets. These assets enter the installation’s composition workflow.</p></li>
<li><h3>Keep movement responsive</h3><p>Python detects ArUco marker identities and coordinates, then streams movement to TouchDesigner over UDP. This stream continues while the generation service prepares an image, so spatial feedback and the arrival of a new asset follow separate update paths.</p></li>
<li><h3>Compose and route the scene</h3><p>GrabCut separates the returned image’s foreground. TouchDesigner combines the prepared assets with movement, while Spout and Resolume route the composition onto two walls and the floor. The resulting environment couples a participant’s actions with surrounding visual changes.</p></li>
</ol>

## Expert review sets the next design priorities

Specialists reviewed the system diagrams and a demonstration video. Their feedback emphasized gradual exposure, individual needs and parental involvement: pace and intensity need to suit the child, and supporting adults need a role in the experience. The work establishes an interaction framework and technical prototype; this review does not establish clinical effectiveness.

## Code & materials

OpenSketch releases the uni-app drawing client and Flask upload service. The generation endpoints are configured in utils/api-config.js; the upload example is server/upload\_server.py. The repository covers this authoring component of the installation.
