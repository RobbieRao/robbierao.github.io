<figure>
<a href="/images/design/digital-human/live-demonstration-upright.webp"><img src="/images/design/digital-human/live-demonstration-upright.webp" alt="Upright digital character in a physical display with speakers below" width="720" height="1280" loading="lazy" decoding="async" /></a>
<figcaption>数字角色的现场演示。</figcaption>
</figure>

## 让角色接住一句话

我在 Unreal Engine 里用蓝图连接 GPT-4 API，并接入 ASR 语音识别和 TTS 语音合成。观众对着麦克风说话，ASR 把语音转成文字，GPT-4 生成回复，再由 TTS 合成为声音，通过音箱播放出来。现场的实时对话就是这样接起来的。

我把角色呈现和交互都留在同一个引擎里处理。语言模型提供回复，Unreal 场景则给这段回复一个可见的形象。做这件事时，服务连接、画面和声音都在我的工作范围里，只把角色放进场景还远没有完成交互。

## 在蓝图里接通 ASR、GPT-4 与 TTS

我用蓝图串联这几个处理环节。它们接收和返回的东西不同：ASR 返回识别文字，GPT-4 API 返回回复文字，TTS 再把回复变成可以播放的语音。上一环节返回的文字，就是下一环节继续处理的输入。

这次真正练到的是把外部语言服务接进交互场景。蓝图可以组织流程，但每个服务返回什么，仍然需要弄清楚。把 ASR、语言模型和 TTS 分开理解以后，整个交互的结构也清楚了。

<figure class="diagram">
<a href="/images/figures/digital-human-zh.svg"><img src="/images/figures/digital-human-zh.svg" alt="实体布置与已实现的语音链路。下方示意蓝图如何连接各环节，并非蓝图工程截图。" width="880" height="800" loading="lazy" decoding="async" /></a>
<figcaption>实体布置与已实现的语音链路。下方示意蓝图如何连接各环节，并非蓝图工程截图。</figcaption>
</figure>

## 透明屏幕与发光灯箱

我们用了透明屏幕和发光灯箱，让数字人呈现出类似全息的效果。角色以全身形象出现，手臂和脚部四周留出空间。这一部分处理的是角色怎样出现在观众面前：语音系统让它能够回答，屏幕与灯箱则让这个回答有了现场的形象。

<figure>
<a href="/images/design/digital-human/character-display-upright.webp"><img src="/images/design/digital-human/character-display-upright.webp" alt="现场的透明屏幕与发光灯箱，前方布置麦克风和音箱。" width="720" height="1280" loading="lazy" decoding="async" /></a>
<figcaption>现场的透明屏幕与发光灯箱，前方布置麦克风和音箱。</figcaption>
</figure>

显示区域前方摆着鹅颈麦克风，下方桌面放两只音箱。麦克风把说话的位置直接交代出来，音箱负责把合成后的回复带回房间。它们对应着我在 Unreal 中接通的 ASR—GPT-4—TTS 链路的两端。

## 回复要一直走到观众耳边

这次整合改变了我对“做完”的判断。收到 GPT-4 的回复文字，只完成了其中一段；后面还有语音合成和播放。对观众来说，回答是在角色旁边真正被听到时才到达的。

## 工具与方法

<dl class="tools">
<div><dt>Unreal Engine · Blueprints</dt><dd>把语言与语音服务接入角色场景。</dd></div>
<div><dt>GPT-4 API</dt><dd>根据识别文字生成对话回复。</dd></div>
<div><dt>ASR · TTS</dt><dd>将语音输入转成文字，再将回复文字转成可听的语音。</dd></div>
<div><dt>Transparent screen · Illuminated lightbox</dt><dd>呈现全身角色，营造类似全息的现场效果。</dd></div>
</dl>
