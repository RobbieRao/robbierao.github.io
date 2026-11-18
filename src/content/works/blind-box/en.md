<figure>
<a href="/images/notebook/blind-box/guardian-dragon-render.webp"><img src="/images/notebook/blind-box/guardian-dragon-render.webp" alt="Rendered treasure-guarding dragon character from the auspicious-animal series." width="1920" height="1080" loading="lazy" decoding="async" /></a>
<figcaption>Rendered treasure-guarding dragon character from the auspicious-animal series.</figcaption>
</figure>

## Give the character a life after opening

The blind-box experience linked a physical figure with packaging, a character card, a mini-program collection and a possible spatial encounter. My concern was whether someone could recognize the same character as they moved between those forms. A reveal is brief; the figure and the record in the collection stay with the person afterward.

The musician series distinguished characters by instruments and performance poses; the animal series began with the nine-colored deer, blue bird, winged horse and treasure-guarding dragon. Packaging introduced a family, while the card identified one named character. The mini-program sequence followed the same change in scale: browse the series, then meet the particular character revealed.

<figure>
<a href="/images/notebook/blind-box/beast-series-packaging.webp"><img src="/images/notebook/blind-box/beast-series-packaging.webp" alt="Packaging visualization for the auspicious-animal series. The open and closed box views retain the same character family." width="1128" height="803" loading="lazy" decoding="async" /></a>
<figcaption>Packaging visualization for the auspicious-animal series. The open and closed box views retain the same character family.</figcaption>
</figure>

<figure class="portrait">
<a href="/images/notebook/blind-box/mini-program-box-selection.webp"><img src="/images/notebook/blind-box/mini-program-box-selection.webp" alt="Box-selection interface: choose a box within the active character series before the result is revealed." width="406" height="717" loading="lazy" decoding="async" /></a>
<figcaption>Box-selection interface: choose a box within the active character series before the result is revealed.</figcaption>
</figure>

## Keep the instrument readable in three dimensions

I worked on the models with the illustrators and other modelers. The drawings offered strong views, but the figures also had to remain recognizable from other angles. Silhouette, instrument, headdress and large color areas carried that identity across the turn. Those features gave the modeling work a clearer priority than treating every surface detail equally.

<figure>
<a href="/images/notebook/blind-box/pipa-model.webp"><img src="/images/notebook/blind-box/pipa-model.webp" alt="Weiqing’s pipa model from the musician series. The instrument, hand position, and clothing establish the figure’s readable structure." width="1920" height="1080" loading="lazy" decoding="async" /></a>
<figcaption>Weiqing’s pipa model from the musician series. The instrument, hand position, and clothing establish the figure’s readable structure.</figcaption>
</figure>

In the musician series, Weiqing carries a pipa, Yun Que a konghou, Lingmai a ruan and Zangzhu a pellet drum. The pipa model makes the spacing problem concrete: hands, instrument, clothes and body need to remain distinguishable from the main view. Merging them into one dense shape would lose the cue that identifies the character.

Antlers, wings and facial features carried more of the identity in the animal models. The renders and cards showed how lighting and material could change while the outline and color grouping still identified the figure. Working across those forms made scale a persistent concern: detail that reads in a large render can disappear in a product thumbnail.

<figure>
<a href="/images/notebook/blind-box/weiqing-character-card.webp"><img src="/images/notebook/blind-box/weiqing-character-card.webp" alt="The corresponding Weiqing card uses the same instrument and character cues within the series’ graphic frame." width="1167" height="1945" loading="lazy" decoding="async" /></a>
<figcaption>The corresponding Weiqing card uses the same instrument and character cues within the series’ graphic frame.</figcaption>
</figure>

<figure>
<a href="/images/notebook/blind-box/winged-horse-model.webp"><img src="/images/notebook/blind-box/winged-horse-model.webp" alt="The winged-horse character uses its head silhouette, side wings, and broad color regions as identification cues." width="2242" height="1624" loading="lazy" decoding="async" /></a>
<figcaption>The winged-horse character uses its head silhouette, side wings, and broad color regions as identification cues.</figcaption>
</figure>

## Check the box when it is open

The team explored a package derived from a grotto’s square plan, niches and truncated-pyramid roof. The flat net and white volume studies show different parts of that decision. The net locates folds and adjoining faces; the volume reveals the opening through which the figure will be seen.

<figure>
<a href="/images/notebook/blind-box/grotto-box-net.webp"><img src="/images/notebook/blind-box/grotto-box-net.webp" alt="Original structure study: flat net and folded forms for the grotto-inspired package." width="1317" height="1358" loading="lazy" decoding="async" /></a>
<figcaption>Original structure study: flat net and folded forms for the grotto-inspired package.</figcaption>
</figure>

The flat pattern and the volume did not produce the same emphasis. Printed bands became edges and recesses when folded, and strong colors could compete with the figure at the opening. Reading those studies beside the characters made the package’s two roles clear to me: it enclosed the object, but also framed the view of it. The protruding instruments and headdresses made that relationship especially visible.

<figure>
<a href="/images/notebook/blind-box/grotto-packaging-render.webp"><img src="/images/notebook/blind-box/grotto-packaging-render.webp" alt="Packaging visualization showing how the mural-derived pattern wraps around openings, edges, and display surfaces." width="1920" height="1297" loading="lazy" decoding="async" /></a>
<figcaption>Packaging visualization showing how the mural-derived pattern wraps around openings, edges, and display surfaces.</figcaption>
</figure>

## Connect capture to a character that can deform

The venue was a team proposal around a circular space and a central opening. My technical work concerned how a visitor’s action could reach a virtual character. The face-capture experiment used Unreal Engine 4 with iPhone X ARKit blendshapes, with the capture view and engine character visible together during development.

<figure>
<a href="/images/notebook/blind-box/face-capture-prototype.webp"><img src="/images/notebook/blind-box/face-capture-prototype.webp" alt="Development photograph of the UE4 and iPhone X ARKit face-capture experiment. It shows the capture-to-character connection." width="1920" height="1244" loading="lazy" decoding="async" /></a>
<figcaption>Development photograph of the UE4 and iPhone X ARKit face-capture experiment. It shows the capture-to-character connection.</figcaption>
</figure>

That experiment separated a finished-looking mesh from a responsive character for me. ARKit supplied changing facial values, while the character needed deformation controls that could receive them. The stylized proportions mattered at this connection: the same input had to become readable movement in a face with a different shape. Modeling and interaction met at the deformation, rather than at the camera alone.

The proposed questionnaire narrowed clothing, headwear, expression and color choices, while animation addressed how the selected character moved. The venue and personalized matching remained proposals around the capture experiment. Keeping those parts distinct helped me understand how much work remained between choosing an appearance and giving that appearance a response.

<figure>
<a href="/images/notebook/blind-box/experience-space-study.webp"><img src="/images/notebook/blind-box/experience-space-study.webp" alt="Team space study with circulation and the central experience area. This is a design model, not a photograph of a completed venue." width="2600" height="1223" loading="lazy" decoding="async" /></a>
<figcaption>Team space study with circulation and the central experience area. This is a design model, not a photograph of a completed venue.</figcaption>
</figure>

## Build the route into the collection

I learned mini-program development, WeChat Developer Tools and server setup through this project. The work followed a concrete route: browse a series, select a box, see the reveal and find the character in the collection. Connecting those pages gave the tools a purpose. Each screen changed what the user was selecting or looking at.

I separated the series being browsed, the selected box and the revealed character because their information changes at different moments. WeChat Developer Tools placed WXML beside the collection preview, connecting page structure to the visible result. A thumbnail, a name and a detail link could then be read as different presentations of the same character.

<figure class="portrait">
<a href="/images/notebook/blind-box/mini-program-home.webp"><img src="/images/notebook/blind-box/mini-program-home.webp" alt="Mini-program home with series promotion, recommendations, and product entry points." width="1170" height="2532" loading="lazy" decoding="async" /></a>
<figcaption>Mini-program home with series promotion, recommendations, and product entry points.</figcaption>
</figure>

Setting up the server made temporary selection and saved information distinct for me. A highlighted box describes the current action; a revealed character belongs to a collection the person expects to find again. Learning the server side was therefore also learning where the page’s temporary state ended and information had to outlast that page.

The reveal screen centered the character card and linked to the collection; gifting had its own explanation and confirmation. Looking back, these quieter screens mattered as much as the reveal animation. They explained what had been received and what the next operation would do. Sharing a picture and transferring an item might look similar in a compact menu, but they carry very different consequences.

<figure>
<a href="/images/notebook/blind-box/mini-program-development.webp"><img src="/images/notebook/blind-box/mini-program-development.webp" alt="Original development screenshot: the cabinet interface beside WXML source in the mini-program development tools." width="1733" height="978" loading="lazy" decoding="async" /></a>
<figcaption>Original development screenshot: the cabinet interface beside WXML source in the mini-program development tools.</figcaption>
</figure>

<figure class="portrait">
<a href="/images/notebook/blind-box/mini-program-reveal.webp"><img src="/images/notebook/blind-box/mini-program-reveal.webp" alt="The result overlay identifies the revealed character and points to the cabinet. The source screenshot is retained at its original resolution." width="404" height="668" loading="lazy" decoding="async" /></a>
<figcaption>The result overlay identifies the revealed character and points to the cabinet. The source screenshot is retained at its original resolution.</figcaption>
</figure>

<figure class="portrait">
<a href="/images/notebook/blind-box/mini-program-gifting.webp"><img src="/images/notebook/blind-box/mini-program-gifting.webp" alt="The gifting step includes an explanation and an explicit confirmation action." width="402" height="883" loading="lazy" decoding="async" /></a>
<figcaption>The gifting step includes an explanation and an explicit confirmation action.</figcaption>
</figure>

## Tools, in context

<dl class="tools">
<div><dt>3D modeling · character assets</dt><dd>Collaborative modeling of the musician and auspicious-animal series, with consistent silhouettes and character cues across product and interface views.</dd></div>
<div><dt>Unreal Engine 4 · ARKit</dt><dd>Face-capture prototype using iPhone X and blendshape-driven character deformation.</dd></div>
<div><dt>WeChat Mini Program · WXML</dt><dd>Product browsing, box selection, result display, cabinet records, and gifting interfaces.</dd></div>
<div><dt>WeChat Developer Tools</dt><dd>Learned the development and preview workflow while making the mini program; used the cabinet interface to connect WXML page structure with the visible screen.</dd></div>
<div><dt>Server setup</dt><dd>Learned to set up a server alongside the mini-program work, and to reason about the information passed between a page and the service it uses.</dd></div>
<div><dt>Packaging nets · spatial studies</dt><dd>Team design materials connecting grotto-inspired structure, printed patterns, and the proposed experience venue.</dd></div>
</dl>
