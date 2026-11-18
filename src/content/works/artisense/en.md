<figure>
<a href="/images/design/artisense/learning-interfaces.webp"><img src="/images/design/artisense/learning-interfaces.webp" alt="Artisense phone and tablet interfaces for drawing, references, and feedback" width="2400" height="1215" loading="lazy" decoding="async" /></a>
<figcaption>Core learning interfaces across phone and tablet.</figcaption>
</figure>

## Keep the learner’s drawing on the page

In the sketch prototype, we reserved separate areas for the learner’s drawing and the generated reference. Brush sizes, colors, clear and subject presets stayed with the canvas. The result did not replace the original marks, so the learner could compare the two and continue drawing in the same place. That choice kept the act of drawing visible even after the system produced a more finished image.

The proposal used ControlNet to connect a sketch with reference generation. This made the input and result a pair rather than two unrelated illustrations. The side-by-side layout also exposed a limitation: after a new stroke, the older reference still belongs to the earlier drawing. I came away treating that correspondence as part of the learning interaction, not merely a question of where to place two images.

## Use the tablet width for comparison

Our phone layouts separated discovery, drawing and exercise discussion into different screens. On the tablet, discovery or the learning overview stayed beside the conversation. We used the extra width to keep the subject of the feedback visible while the learner read the reply. The larger screen changed what could be compared at the same time.

Brush sizes appeared as circles of different diameters beside the canvas, with a color area and slider for color selection. Topic presets were placed separately. This divided direct drawing controls from choices about the generated reference: changing the brush affects the next stroke, while changing the topic affects the next request. The layout made those two scopes visible.

<figure class="diagram">
<a href="/images/figures/artisense-en.svg"><img src="/images/figures/artisense-en.svg" alt="Layout study: the tablet keeps the reference visible beside the discussion." width="880" height="510" loading="lazy" decoding="async" /></a>
<figcaption>Layout study: the tablet keeps the reference visible beside the discussion.</figcaption>
</figure>

## A reply should lead back to the exercise

The exercise conversation keeps the still-life prompt, the request for a demonstration and the returned reference together. Nearby actions allow uploading a drawing, changing the exercise or asking for a revision. These actions answer different needs: change the assignment, discuss the current work, or submit another attempt.

The exercise and the current drawing stayed in the conversation, so a reply had a visible subject. That was the useful distinction between this page and a general chat screen. Its value depended on whether the reply could be used on the work already in front of the learner; another polished answer on a separate page would have broken that connection.

## The drawing and the reference kept different roles

The discovery page gathered artists, daily inspiration, learning reports, community and help. Text, voice and image inputs gave the assistant different ways to receive a question or a drawing. These pages covered exploration, while the sketch page kept the working surface separate from that browsing.

Looking back at the prototype, the strongest choice was keeping the learner’s marks visible beside the generated suggestion. A reference can offer a direction without becoming the work itself. The interface let those two roles remain legible. That became my way of reading the rest of the design: could I still tell what the learner had made and what the system had supplied?

## Tools, in context

<dl class="tools">
<div><dt>Drawing canvas</dt><dd>Combined a sketch area, brush-size controls, palette, theme presets, and generated-reference area.</dd></div>
<div><dt>Phone / tablet prototypes</dt><dd>Adapted discovery content, exercise discussion, and drawing controls to different screen sizes.</dd></div>
</dl>

## Project recognition

-   <strong>2024 · Provincial Bronze.</strong> Zhejiang Province International College Student Innovation Competition. [Official award list ↗](https://jyt.zj.gov.cn/module/download/downfile.jsp?classid=0&filename=39a780eaf6d14b24ae23a57c3a1569c6.pdf)
-   <strong>2024 · University Silver.</strong> China Academy of Art’s 10th International College Student Innovation Competition.
-   <strong>2023 · Provincial Bronze.</strong> 9th Zhejiang Province International “Internet+” College Student Innovation and Entrepreneurship Competition. [Official award list ↗](https://jyt.zj.gov.cn/module/download/downfile.jsp?classid=0&filename=b3eb0892477045789f80db524e3b5a7d.pdf)
-   <strong>2023 · University Gold.</strong> China Academy of Art’s 9th “Internet+” Innovation and Entrepreneurship Competition.
-   <strong>2023 · East China Division, Third Prize.</strong> Innovation Track, Mobile Application Innovation Contest, China Collegiate Computing Contest.

Team awards. [Project record ↗](https://5596041.cargo.site/《意绘artisense》-)
