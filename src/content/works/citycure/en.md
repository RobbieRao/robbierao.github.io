## Keep the street beside the request

I worked on the Unity/VR side of CityCure. The flow began with a gesture to capture the street, a spoken request for change and a seven-point rating of the existing place. That sequence clarified what the comparison was about: a generated proposal belonged to a particular place the person had just observed. The captured street gave it a reference.

<figure class="diagram">
<a href="/images/research/cocreation/citycure.webp"><img src="/images/research/cocreation/citycure.webp" alt="Capture and voice feed a comparison view. The optional box marks an intervention area; the candidates still need to be read against the surrounding street." width="1356" height="670" loading="lazy" decoding="async" /></a>
<figcaption>Capture and voice feed a comparison view. The optional box marks an intervention area; the candidates still need to be read against the surrounding street.</figcaption>
</figure>

The storyboard asks for shade and a bench while keeping the sidewalk clear. I read the last part as a spatial constraint, not an optional addition to the prompt. The original scene showed where the change belonged; the spoken request explained what the person wanted to keep or alter. Those two inputs gave the comparison different kinds of information.

## Select an area, then a proposal

The optional bounding box gave the request a target inside the captured image. I read it together with the surrounding street: the box located the change, while the full view showed access, neighboring objects and scale. A close crop of the bench would have removed much of the information needed to judge its placement.

The person then chose between three candidates. Refinement continued from the selected image, so changing the selection also changed the editing reference. This was why I distinguished the candidate from the following request in the Unity flow: one specified which image was being edited, the other what to change.

The bench example also clarified a distinction for me. An object can sit inside the selected box and still obstruct the route beside it. The box located the intervention; the uncropped street made its consequences visible. Both belonged in the comparison.

<figure class="diagram">
<a href="/images/figures/citycure-en.svg"><img src="/images/figures/citycure-en.svg" alt="Spatial interaction schematic. The selected region locates the requested intervention; the surrounding street and walking route remain the basis for judging it." width="900" height="570" loading="lazy" decoding="async" /></a>
<figcaption>Spatial interaction schematic. The selected region locates the requested intervention; the surrounding street and walking route remain the basis for judging it.</figcaption>
</figure>

#### Reading the five-step interaction

| Step | Information carried forward |
| --- | --- |
| Walk & notice | A situated concern about one place. |
| Capture | A visual reference for that concern. |
| Voice | Desired change plus street-quality appraisal. |
| Generate & choose | Alternative proposals and a selected direction. |
| Share & discuss | A proposal card with collective constraints and comments. |

## The original scene survives each edit

In the Unity flow, I separated the captured street, the selected candidate and the subsequent request. The capture recorded the place before intervention. The candidate carried changes the person had accepted. The next request continued from that candidate. Keeping these meanings separate was more useful than treating every visible image as the same kind of screen content.

Returning to comparison meant reconsidering the candidate, while the capture remained the original reference. A panel refresh was only a display operation. This was the distinction I took from organizing the flow: a change on screen does not always mean a change in what the person is editing.

The proposal card then gave a selected result to other people. The author’s temporary comparison state and the shared proposal had different purposes. A comment about access had to refer to a particular proposal, rather than to whichever candidate happened to be open in the author’s view.

## Design the card for someone who was not there

The community feed brought a different audience to a proposal. Someone reading it had not necessarily made the capture or heard the initial conversation. Looking at that change of audience, I saw why an appealing image alone could not explain what a person wanted to alter in the street.

The example comments raised emergency access, shade, feasibility and regulations. I found those responses useful when reading the proposals: adding a bench was also a question about circulation, and adding shade invited questions about what could actually be installed. They made the gap between a convincing image and a workable intervention concrete.

## Tools, in context

<dl class="tools">
<div><dt>Unity · VR/MR</dt><dd>Immersive client for scene capture, proposal comparison, selection, and refinement.</dd></div>
<div><dt>Scene image · bounding box · voice</dt><dd>Input components specifying the place, intervention region, and intended change.</dd></div>
<div><dt>Proposal cards</dt><dd>Share the selected alternative with the context needed for comments.</dd></div>
</dl>
