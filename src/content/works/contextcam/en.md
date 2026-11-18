## Start by choosing a direction

The interface had to help someone begin before they could describe a finished image. In the team’s formative study, 15 of 23 participants found suitable prompts difficult to write. I organized the UI around a smaller first decision: choose a direction, then refine it.

I kept topic choices, generated images and revisions in one conversation. Choosing a suggestion leads to a more detailed proposal; Paint then requests the image. That separation gives the person a point to judge the idea before committing to generation.

<figure class="screens">
<ol>
<li><a class="crop" href="/images/research/cocreation/contextcam.webp" style="--x:14"><img src="/images/research/cocreation/contextcam.webp" alt="Choose a direction" width="1400" height="795" loading="lazy" decoding="async" /></a><h3>Choose a direction</h3><p>Tap one of three topics. Its detailed proposal appears in the same conversation before generation.</p></li>
<li><a class="crop" href="/images/research/cocreation/contextcam.webp" style="--x:544"><img src="/images/research/cocreation/contextcam.webp" alt="Request an image" width="1400" height="795" loading="lazy" decoding="async" /></a><h3>Request an image</h3><p>Paint sends the generation request. The image and its description return together.</p></li>
<li><a class="crop" href="/images/research/cocreation/contextcam.webp" style="--x:1073"><img src="/images/research/cocreation/contextcam.webp" alt="Revise this image" width="1400" height="795" loading="lazy" decoding="async" /></a><h3>Revise this image</h3><p>“Bridge” redirects the composition. EditID keeps the image being revised explicit.</p></li>
</ol>
<figcaption>My Android UI, shown in the original paper’s Figure 2. Each view opens the full figure.</figcaption>
</figure>

I implemented this as a resizable Android floating window, so the conversation can sit beside the current mobile activity. Text, voice and photo input remain available alongside recommendations. The design needs both an easy way to begin and room for a more specific intention.

## Show what a suggestion uses

A suggestion can feel arbitrary if its inputs are invisible. I kept location, screen content, facial expression, weather and music at the top of the window. Their states explain which information contributes to each topic, while the person can turn a source off.

I kept “irrelevant” separate from “turned off by me.” The first is the system’s selection; the second is the person’s choice. The full five-state scheme below is described in the paper. In the captured example, blue location contributes to topics 1 and 2; white screen content is excluded.

<figure class="legend">
<ul>
<li><i style="--swatch:#e9f2dc"></i>All three topics</li>
<li><i style="--swatch:#d6f0fc"></i>Topics 1 &amp; 2</li>
<li><i style="--swatch:#fff2b8"></i>Topic 3 only</li>
<li><i style="--swatch:#ffffff"></i>Not relevant</li>
<li><i style="--swatch:#d6d8dd"></i>Turned off by the user</li>
</ul>
<figcaption>Source states defined in §4.1. The captured interface above shows blue, green and white; all five states are explained here.</figcaption>
</figure>

## Make the next action explicit

A conversation alone does not tell someone how to request an image, ask for advice or edit an earlier result. I gave those intentions separate shortcuts beside the input: Recommend based on context, Paint, Edit and Advice. Free input stays available; common actions do not require another carefully worded prompt.

Paint and Edit need different targets: one creates an image; the other acts on the image identified by EditID at the top. In the paper’s example, “Bridge” changes the composition while retaining the earlier style. Keeping the image, instruction and response together makes that continuity inspectable.

<dl class="actions">
<div><dt>Recommend based on context</dt><dd>Begin with the current situation</dd></div>
<div><dt>Paint</dt><dd>Generate an image</dd></div>
<div><dt>Edit</dt><dd>Revise the image in EditID</dd></div>
<div><dt>Advice</dt><dd>Discuss the image idea</dd></div>
</dl>

## Connect the interface to the system

When drawing the paper’s architecture, I followed the same sequence as the interface: select context, choose a topic, then generate and revise. Yellow nodes show the agents; blue nodes show user input and choices. The separate personalization path explains what carries into later sessions.

The team’s system separates context selection and topic proposals from creative discussion and tool execution. My front end exposes those capabilities through topic options, source states and action shortcuts. The user can make decisions about the image without navigating the five agents or setting model parameters.

<figure class="diagram">
<a href="/images/notebook/contextcam/paper-figure-3.webp"><img src="/images/notebook/contextcam/paper-figure-3.webp" alt="The architecture diagram I drew for the paper. Yellow nodes show agents; blue nodes mark user input and choices." width="2110" height="805" loading="lazy" decoding="async" /></a>
<figcaption>The architecture diagram I drew for the paper. Yellow nodes show agents; blue nodes mark user input and choices.</figcaption>
</figure>

Under the source colors, a five-dimensional binary vector selects inputs. In this example, \[1,0,1,1,1\] supports two topics and \[0,0,1,1,1\] supports the third: removing location opens another direction. The interface shows that difference through source states rather than asking the person to read a vector.

<figure class="diagram">
<a href="/images/figures/contextcam-en.svg"><img src="/images/figures/contextcam-en.svg" alt="The actual vector example uses [1,0,1,1,1] for two topic recommendations and [0,0,1,1,1] for the third. Removing location changes the available evidence while the other selected modalities remain the same." width="900" height="640" loading="lazy" decoding="async" /></a>
<figcaption>The actual vector example uses [1,0,1,1,1] for two topic recommendations and [0,0,1,1,1] for the third. Removing location changes the available evidence while the other selected modalities remain the same.</figcaption>
</figure>

## How users took over the conversation

In the subsequent three-day study, 16 participants held 240 conversations across 136 contexts. Suggested topics were used in 92.9% of conversations; mean ease of use was 5.88/7. These describe the complete system, rather than the effect of any one interface control.

The usage records changed how I understood the two ways of starting a conversation. Some participants first relied on recommendations, then supplied their own topics, photos or sketches and selectively disabled sources. The suggestions gave them somewhere to begin; the open input and source controls remained useful after they had developed their own approach.

## Tools, in context

<dl class="tools">
<div><dt>Android floating window · Web APIs</dt><dd>Collect five context sources and keep conversation beside the current mobile activity.</dd></div>
<div><dt>GPT-4 · VisualGLM-6B</dt><dd>Semantic interpretation and ideation, plus image descriptions for conversation.</dd></div>
<div><dt>Stable Diffusion v1.5 · ControlNet</dt><dd>Generation and editing; the bridge example uses Shuffle to retain style through recomposition.</dd></div>
<div><dt>Conversation memory · preference summaries</dt><dd>Keep current editing history separate from reusable subject, style, and theme preferences.</dd></div>
</dl>
