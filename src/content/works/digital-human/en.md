<figure>
<a href="/images/design/digital-human/live-demonstration-upright.webp"><img src="/images/design/digital-human/live-demonstration-upright.webp" alt="Upright digital character in a physical display with speakers below" width="720" height="1280" loading="lazy" decoding="async" /></a>
<figcaption>On-site digital-character demonstration.</figcaption>
</figure>

## Giving the character a spoken reply

I built the interaction in Unreal Engine, using Blueprints to connect the GPT-4 API with speech recognition and speech synthesis. A visitor spoke into the microphone, ASR turned the speech into text, GPT-4 produced a reply, and TTS made that reply audible through the speakers. This was the path behind the live conversation.

I kept the character and the interaction in the same engine. The language model supplied the reply; the Unreal scene gave that reply a visible presence. Working across those two parts meant handling both the service connection and what the visitor actually saw and heard.

## Connecting ASR, GPT-4 and TTS in Blueprints

I used Blueprints to connect the stages of the conversation. Their inputs and outputs had different forms: ASR returned recognized text, the GPT-4 API returned reply text, and TTS turned that reply into playable speech. The text returned by one service became the input to the next.

The useful skill I took from this work was connecting an external language service to an interactive scene. Blueprint logic could organize the flow, but I still had to understand what each service passed back. That distinction mattered more than treating all three services as a single AI function.

<figure class="diagram">
<a href="/images/figures/digital-human-en.svg"><img src="/images/figures/digital-human-en.svg" alt="The physical setup and the implemented voice path. This diagram explains the integration; it is not a capture of the Blueprint graph." width="880" height="800" loading="lazy" decoding="async" /></a>
<figcaption>The physical setup and the implemented voice path. This diagram explains the integration; it is not a capture of the Blueprint graph.</figcaption>
</figure>

## A transparent screen and an illuminated lightbox

We used a transparent screen together with an illuminated lightbox to create a hologram-like appearance. The character was presented as a full-body figure with space around the arms and feet. The display needed to carry the sense of a person occupying the installation, alongside the voice coming back from the system.

<figure>
<a href="/images/design/digital-human/character-display-upright.webp"><img src="/images/design/digital-human/character-display-upright.webp" alt="The transparent screen and illuminated lightbox in the live setup, with the microphone and speakers in front." width="720" height="1280" loading="lazy" decoding="async" /></a>
<figcaption>The transparent screen and illuminated lightbox in the live setup, with the microphone and speakers in front.</figcaption>
</figure>

A gooseneck microphone sat in front of the display, with two speakers on the table below. The microphone made it clear where to speak, and the speakers brought the synthesized reply back into the room. These physical components formed the two ends of the ASR–GPT-4–TTS path I connected in Unreal.

## A reply had to travel all the way back

The integration changed how I understood completion. Receiving reply text from GPT-4 completed one stage; the interaction continued through speech synthesis and playback. For the visitor, the answer arrived only when it could be heard beside the character.

## Tools, in context

<dl class="tools">
<div><dt>Unreal Engine · Blueprints</dt><dd>Connected the language and speech services to the character scene.</dd></div>
<div><dt>GPT-4 API</dt><dd>Produced the text response to the recognized speech.</dd></div>
<div><dt>ASR · TTS</dt><dd>Converted spoken input to text, then the generated reply to audible speech.</dd></div>
<div><dt>Transparent screen · Illuminated lightbox</dt><dd>Presented the full-body character with a hologram-like appearance.</dd></div>
</dl>
