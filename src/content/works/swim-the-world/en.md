<figure>
<a href="/images/design/swim-the-world/co-creation-system.webp"><img src="/images/design/swim-the-world/co-creation-system.webp" alt="Swim the World concept linking a mobile app, AI characters, and public displays" width="2400" height="1215" loading="lazy" decoding="async" /></a>
<figcaption>Mobile creation, character sharing, and exhibition touchpoints.</figcaption>
</figure>

## The character joins the pool after a preview

We put the WeChat QR code at the entrance. A participant chose a theme, entered a nickname and character name, then drew. Both names carried into the generated card. The final release used a slider at the bottom of that card.

We kept generation and release as separate decisions. A result can look attractive and still feel unlike the participant’s drawing. The preview lets them see what will go onto the public screen before they send it. In the super jelly example, the name remains beside the character, helping someone recognize their contribution after it joins the others.

## Keep theme changes inside the drawing task

The drawing screen placed Switch theme at the lower left, clear along the bottom and Generate at the lower right. Theme selection opened from below with Cancel and Done, leaving the drawing visible behind it. We kept that change inside the current task, so selecting another theme did not look like starting the visit again.

<figure>
<a href="/images/design/swim-the-world/mobile-journey.webp"><img src="/images/design/swim-the-world/mobile-journey.webp" alt="Theme selection stays over the drawing screen; generation leads to a named preview, with release on the next step. The controls follow the participant’s changing task." width="2400" height="1215" loading="lazy" decoding="async" /></a>
<figcaption>Theme selection stays over the drawing screen; generation leads to a named preview, with release on the next step. The controls follow the participant’s changing task.</figcaption>
</figure>

Generate then requests a character card. Editing tools belong to the canvas; release belongs to the card. That division also gives implementation distinct states to handle. Repeated generation changes a private candidate, while repeated release concerns a character already sent to the shared screen.

The original drawing, card name and visible character linked the screens. Reading the finished sequence through those references made its stages easier to distinguish: getting a preview, choosing to release it and seeing it on the public display were separate events, even though they belonged to one contribution.

## Put Stable Diffusion behind the phone interaction

We deployed Stable Diffusion on a computer and exposed it through an API. The mini program handled drawing, generation requests and the returned card. Participants stayed in that flow while the model ran on the computer; they did not need to operate the model interface themselves.

The API response finishes one task: obtaining an image. It does not mean a character has appeared on the exhibition screen. The preview between those steps lets the participant inspect the transformation and decide whether to release it.

Connecting the API made that division concrete for me. The computer produced an image; the exhibition still had to give it a place in the participant’s flow and then in the shared display. The service response was a technical result, while the preview and release turned it into a public contribution.

<figure class="diagram">
<a href="/images/figures/swim-the-world-en.svg"><img src="/images/figures/swim-the-world-en.svg" alt="Stable Diffusion runs on a computer behind an API. Generation returns to a private preview; a separate release gesture sends the character to the shared pool." width="880" height="740" loading="lazy" decoding="async" /></a>
<figcaption>Stable Diffusion runs on a computer behind an API. Generation returns to a private preview; a separate release gesture sends the character to the shared pool.</figcaption>
</figure>

## What should survive the transformation?

The jellyfish example kept the umbrella outline and tentacles from the sketch while changing color and surface detail. Those shapes gave the transformation a visible connection to the input. I found that comparison more revealing than judging the generated character’s finish on its own.

The name and silhouette do different jobs on a crowded screen. A name identifies who contributed; a silhouette helps someone find the character at a glance. Keeping both makes the public result easier to connect back to the private drawing.

## The phone and public screen do different work

The proposal connects exhibition, interaction, co-creation and a search activity. Outdoor QR entry points and the invitation for children to design lead into the same mini-program route. The phone gives each person room to draw and inspect; the shared screen gathers the released characters.

What stayed with me was the small private decision before joining the collective image. The participant could inspect the result, release it and recognize it among other drawings. The name and the surviving shape carried that decision onto the large screen. Without them, the shared display would lose much of its connection to the person who had just been drawing.

## Tools, in context

<dl class="tools">
<div><dt>WeChat mini program</dt><dd>Connected QR entry, theme selection, naming, drawing, generation, and release.</dd></div>
<div><dt>Stable Diffusion</dt><dd>Deployed on a computer as the image-generation component behind the participant-facing experience.</dd></div>
<div><dt>API integration</dt><dd>Connected the deployed generation service to the drawing and preview workflow.</dd></div>
<div><dt>Interaction storyboard</dt><dd>Specified the editable drawing, generated card, and public-display states.</dd></div>
</dl>

<div id="recognition"></div>

## Public installations & exhibition

-   <strong>Hangzhou, 2023.</strong> Installed in an Alibaba Cloud zero-waste space associated with the Asian Games and in Xihu District public settings. [Project record ↗](https://5596041.cargo.site/召唤海洋小精灵)
-   <strong>Selected exhibition, 2023.</strong> “AI Connects the Future, Drawing the Asian Games” — Zhejiang university student digital art invitational exhibition. [Official selection list ↗](https://di.zjnu.edu.cn/_upload/article/files/ba/2b/e008ba2e438db2175d14b06ab1b5/cc6e8b42-5c00-461a-9a9e-2c96d184f4b8.pdf)

<p lang="zh-Hans">Team: 饶冯桂, 周致远, 臧渠成, 庾智滔, 崔男, and 傅蓉.</p>
