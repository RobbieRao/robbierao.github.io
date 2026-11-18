## What “feeling safe” meant for this prototype

The team’s ten interviews with children, family members and specialists gave us themes such as fear of darkness and enclosure, reassurance from light and company, and the role of making something. Members coded the Chinese transcripts independently before discussing the themes. My part as corresponding author was to connect those findings to decisions that could be examined in the prototype.

If light is part of reassurance, its intensity and transitions belong in the interaction design. If enclosure matters, the layout matters. If company matters, a parent or facilitator needs a place in the activity. I used those connections when reviewing the surrounding projection, stylized fear-related imagery and bodily input, rather than treating the interview themes as a separate introductory section.

This brought my review back to a small, observable relation: could the child find a consequence of their own action in the image? A visually rich environment could still obscure that relation. It gave me a more specific way to discuss agency in the prototype without treating visual immersion as evidence of a therapeutic effect.

## Finding one’s own action inside the projection

For the visual material, the team trained a LoRA on 423 drawings by children aged 7 to 12. Images were cropped, DeepBooru supplied content and style tags, and Kohya trained the image-text pairs.

The markers connect a physical object to both a prompt and a position. Their identity selects associated content; their movement changes the visual feedback. Characters and particle trails extend across two walls and the floor. I reviewed the suitability of the material and the legibility of the action response separately. A fitting visual style did not guarantee that the participant could identify what their movement had changed.

That distinction kept the discussion of particles and characters tied to the interaction. More elements changed the composition, but also made an individual response harder to isolate. I read the footage through the object’s movement and its trace across the surfaces, rather than judging the experience only from the overall projection.

## Two update paths on the same wall

The implementation has two update paths. Python detects ArUco identities and positions, sends prompt and trajectory information to generation, and streams coordinates directly to TouchDesigner over UDP. I used that separation in the technical review: continuous movement should be discussed separately from the arrival of a newly generated asset.

<figure>
<a href="/images/research/experience/art-therapy.webp"><img src="/images/research/experience/art-therapy.webp" alt="Installation view. In review, I follow the participant’s input through the characters and particle feedback, rather than judging the scene only as a finished image." width="841" height="372" loading="lazy" decoding="async" /></a>
<figcaption>Installation view. In review, I follow the participant’s input through the characters and particle feedback, rather than judging the scene only as a finished image.</figcaption>
</figure>

Identity determines the associated prompt; position describes motion. Trajectories are packaged as JSON for the generation service, while the direct coordinate stream continues to drive the current scene. If those operations were coupled, a movement would have to wait for an image before receiving visual feedback. The existing split lets us examine the two delays independently.

I also separated material problems from projection problems in the system review. OpenCV GrabCut prepares a foreground mask, TouchDesigner composes the scene, Spout transfers it, and Resolume slices and transforms it onto the two perpendicular walls and floor. These are different outputs in the diagram: a mask boundary, a scene coordinate and a mapped surface. Reading the diagram beside the footage made “the image looks wrong” a less ambiguous comment.

The two paths explained an important part of the experience to me. A generated image can arrive later while the current scene still follows the body. The system’s response is therefore not described by generation time alone; the direct coordinate stream carries part of the interaction throughout that wait.

<figure class="diagram">
<a href="/images/figures/art-therapy-en.svg"><img src="/images/figures/art-therapy-en.svg" alt="The local coordinate stream and generated image return have separate timing. TouchDesigner composites them before Spout and Resolume map the output to two vertical walls and the floor." width="900" height="660" loading="lazy" decoding="async" /></a>
<figcaption>The local coordinate stream and generated image return have separate timing. TouchDesigner composites them before Spout and Resolume map the output to two vertical walls and the floor.</figcaption>
</figure>

#### Inspect the chain one boundary at a time

| Stage | Output to inspect |
| --- | --- |
| Python / ArUco | Detected marker identity and movement coordinates. |
| Generation service | Prompt and trajectory request; returned stylized image. |
| GrabCut | Foreground separation before compositing. |
| TouchDesigner / UDP | Coordinate-driven visual response. |
| Spout / Resolume | Output mapping to two walls and the floor. |

## The specialist review changed how I read immersion

Three psychologists and one art-therapy specialist reviewed diagrams and a demonstration video. Their feedback emphasized gradual exposure, individual needs and parental participation. I had to read the surrounding projection through those concerns: visual intensity meant different things for different children, and the accompanying adult was part of the experience rather than someone watching from outside it.

The word “immersive” had initially been easy to associate with the size and continuity of the image. After the review, it no longer seemed sufficient on its own. The child’s ability to recognize a response, the adult’s role and the pace of exposure all affected how that space could be experienced. Those concerns made the specialist feedback more useful than a general verdict on whether the projection was engaging.

What we completed was a prototype and a specialist review of its design. That gave the work a basis for discussing the interaction, while leaving sustained therapeutic effects unmeasured. For me, the useful outcome was a clearer account of where the technology supported participation and where the therapeutic interpretation depended on more than the system itself.

## Tools, in context

<dl class="tools">
<div><dt>LoRA · DeepBooru · Kohya</dt><dd>Prepare and tag children’s drawings, then train the visual style used for generated assets.</dd></div>
<div><dt>Python · ArUco · UDP</dt><dd>Detect marker identity and coordinates; send generation requests and stream movement separately.</dd></div>
<div><dt>GrabCut · TouchDesigner · Spout · Resolume</dt><dd>Extract foregrounds, compose the scene, and map output to the walls and floor.</dd></div>
</dl>
