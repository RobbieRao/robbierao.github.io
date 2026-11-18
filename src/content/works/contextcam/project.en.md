<figure class="screens">
<ol>
<li><a class="crop" href="/images/research/cocreation/contextcam.webp" style="--x:14"><img src="/images/research/cocreation/contextcam.webp" alt="Choose a direction" width="1400" height="795" loading="lazy" decoding="async" /></a><h3>Choose a direction</h3><p>Tap one of three topics. Its detailed proposal appears in the same conversation before generation.</p></li>
<li><a class="crop" href="/images/research/cocreation/contextcam.webp" style="--x:544"><img src="/images/research/cocreation/contextcam.webp" alt="Request an image" width="1400" height="795" loading="lazy" decoding="async" /></a><h3>Request an image</h3><p>Paint sends the generation request. The image and its description return together.</p></li>
<li><a class="crop" href="/images/research/cocreation/contextcam.webp" style="--x:1073"><img src="/images/research/cocreation/contextcam.webp" alt="Revise this image" width="1400" height="795" loading="lazy" decoding="async" /></a><h3>Revise this image</h3><p>“Bridge” redirects the composition. EditID keeps the image being revised explicit.</p></li>
</ol>
<figcaption>My Android UI, shown in the original paper’s Figure 2. Each view opens the full figure.</figcaption>
</figure>

## Designing the path from an idea to an image

I organized the Android UI around three decisions: which direction to pursue, which context to use, and whether to generate or revise an image. The floating conversation keeps those decisions beside the person’s current mobile activity.

## Three interaction decisions

<ol class="steps">
<li><h3>Choose before generating</h3><p>I placed three topic suggestions before the detailed image proposal. Selection and Paint are separate steps, so the person can review the idea before requesting an image.</p></li>
<li><h3>Keep the inputs visible</h3><p>Five context icons stay at the top. Their states distinguish topic-specific relevance from a source the user has turned off; source control remains inside the creation flow.</p></li>
<li><h3>Name the action and its target</h3><p>Paint, Edit and Advice expose different intentions beside free input. Edit acts on the image identified by EditID, while the conversation retains the earlier result and the new instruction.</p></li>
</ol>

<figure class="diagram">
<a href="/images/notebook/contextcam/paper-figure-3.webp"><img src="/images/notebook/contextcam/paper-figure-3.webp" alt="The architecture diagram I drew for the paper. Yellow nodes show agents; blue nodes mark user input and choices." width="2110" height="805" loading="lazy" decoding="async" /></a>
<figcaption>The architecture diagram I drew for the paper. Yellow nodes show agents; blue nodes mark user input and choices.</figcaption>
</figure>

## How people used the complete system

<dl class="metrics">
<div><dt><span>participants in real-world use</span></dt><dd>16</dd></div>
<div><dt><span>distinct contexts</span></dt><dd>136</dd></div>
<div><dt><span>conversations using a suggested topic</span></dt><dd>92.9%</dd></div>
</dl>

Across 240 conversations over three days, mean ease of use was 5.88/7. Usage records showed a move from quick recommendations toward self-directed topics, images and selective source control. These are observations of the complete system, not a controlled measurement of individual UI decisions.

## Code & materials

I wrote the Android front end published in ArtAgent-android. The repository contains the client and Gradle project; backend\_config.json connects it to the separately hosted inference service.
