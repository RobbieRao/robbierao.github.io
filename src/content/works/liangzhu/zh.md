<figure>
<a href="/images/design/liangzhu/exhibition-concept.webp"><img src="/images/design/liangzhu/exhibition-concept.webp" alt="Rendered exhibition table with interactive surfaces and textile displays" width="2400" height="1697" loading="lazy" decoding="async" /></a>
<figcaption>展台概念方案——渲染效果图。</figcaption>
</figure>

## 变了以后，还要认得出是哪一个纹样

《帛纹良徵》中，我负责 AI 流程、交互与硬件编程，以及模型和场景制作。郑珈麒整理、数字化纹样并设计展示装置，王子琪负责服饰概念、建模与贴图。我把这些视觉研究接进生成控制和展示场景。

<figure>
<a href="/images/design/liangzhu/motif-library.webp"><img src="/images/design/liangzhu/motif-library.webp" alt="纹样库为每次生成提供具体参照：轴线、轮廓、内部分区或重复结构。" width="2400" height="1696" loading="lazy" decoding="async" /></a>
<figcaption>纹样库为每次生成提供具体参照：轴线、轮廓、内部分区或重复结构。</figcaption>
</figure>

纹样库里有神人兽面、玉鸟、鱼和卷云。我选生成结果时，对照兽面纹的轴线与内部分区、卷云的旋转方向，以及重复单元之间的连接。这些关系给选择提供了具体依据，不必只凭整体看起来是否古朴来判断。

实体展品在透明盒中把立体形态与对应平面纹样放在一起。正面清楚的一条线，侧面可能被另一个表面挡住；平面里很小的留白，也可能成为明显的孔洞或阴影。把平面留在体积旁边，这些变化就有参照可看。

<figure>
<a href="/images/design/liangzhu/three-dimensional-motifs.webp"><img src="/images/design/liangzhu/three-dimensional-motifs.webp" alt="平面纹样与立体形态并置，可以对照哪些部分变成了厚度、开孔或重叠。" width="2400" height="1500" loading="lazy" decoding="async" /></a>
<figcaption>平面纹样与立体形态并置，可以对照哪些部分变成了厚度、开孔或重叠。</figcaption>
</figure>

## 把结构、颜色和细化分开处理

搭 ComfyUI 时，我把参照纹样、文本条件和色板分开接入。这样选结果时，颜色变化和结构变化可以分别回到相应输入查看，不必在一整段提示词里猜是哪一项起了作用。

<figure>
<a href="/images/design/liangzhu/generative-workflow.webp"><img src="/images/design/liangzhu/generative-workflow.webp" alt="参照、条件、采样与细化分开，图像变化可以回到相应输入检查。" width="2400" height="1697" loading="lazy" decoding="async" /></a>
<figcaption>参照、条件、采样与细化分开，图像变化可以回到相应输入检查。</figcaption>
</figure>

工作流先用 VAE 编码参照，在 latent 空间接入 SDXL 正负条件，经高级 KSampler 采样，再通过独立 Refiner 阶段细化，最后 VAE 解码。我也按这个顺序看结果：先核对纹样的组织，再看线条与表面细节。细化围绕已经能够辨认的结构展开。

节点图可以帮助观众理解流程，但没必要把全部节点都搬成控制面板。我把色板、阵列这类能直接判断视觉结果的选择放到前面，其余参数留在流程里支持它们。

## 比例用滑杆，排列用按钮

做交互桌时，我把良渚八色的比例映射到物理滑杆，把矩形、环形和随机阵列映射到三个按钮，操作沿生成顺序从左到右展开。滑杆允许连续调整，按钮则选择另一种组织规则。

<figure>
<a href="/images/notebook/liangzhu/workflow-palette-controls.webp"><img src="/images/notebook/liangzhu/workflow-palette-controls.webp" alt="八种颜色分别调整占比，控制的是配色条件，而非八套预设风格。" width="1600" height="1071" loading="lazy" decoding="async" /></a>
<figcaption>八种颜色分别调整占比，控制的是配色条件，而非八套预设风格。</figcaption>
</figure>

色板包含抱玉朱、璧青、碳稻黑、玉沁黄、鸡骨白、雾灰、泥陶粉和琮黄，各自可以调整比例。用户能够作出具体选择，例如保留深色轮廓，同时给密集纹样增加浅色空间，而不是只能选择一套固定滤镜。

阵列按钮改变同一单元怎样铺到表面。网格让间距和重复可见，环形建立中心，随机阵列打散规整的节奏。硬件编程与生成流程在这里使用同一套含义：操作改变某个颜色比例，或一种可以直接看到的排列。

<figure>
<a href="/images/notebook/liangzhu/workflow-array-controls.webp"><img src="/images/notebook/liangzhu/workflow-array-controls.webp" alt="矩形、环形和随机阵列，用不同放置规则组织同一个纹样单元。" width="800" height="1093" loading="lazy" decoding="async" /></a>
<figcaption>矩形、环形和随机阵列，用不同放置规则组织同一个纹样单元。</figcaption>
</figure>

## 纹样缩到袖口以后，还读得清吗

团队在 Style3D 中处理裁片、缝合、面料和贴图，参考唐、宋、明时期的服饰廓形。纹样落到衣服以后，位置和尺度就参与了阅读：狭长边饰需要连续性，大面积衣身则要给主要形象留出间隔。

<figure>
<a href="/images/notebook/liangzhu/garment-variants.webp"><img src="/images/notebook/liangzhu/garment-variants.webp" alt="正、侧、背面与局部视图，用来比较不同部位的纹样尺度与连续性。" width="1509" height="2118" loading="lazy" decoding="async" /></a>
<figcaption>正、侧、背面与局部视图，用来比较不同部位的纹样尺度与连续性。</figcaption>
</figure>

服饰工作图保留正、侧、背面和局部。我用这些视图分别看领口、前襟、袖口与裙摆。同一个纹样在裙摆上读得清，缩到袖口就可能挤成一块。侧面与局部视图把正面看不出的重复断点和褶皱里的线条显了出来。

我参与的模型与场景制作把服饰接入 Unreal Engine 5 的旋转展示。我根据衣服的呈现调整倒影、天空与地面：浅色衣身的明暗、金色细节，以及宽袖和长摆周围的空间。场景的作用落在这些具体部位上，没有另做一套与服饰争夺注意力的效果。

<figure>
<a href="/images/notebook/liangzhu/digital-garment-lineup.webp"><img src="/images/notebook/liangzhu/digital-garment-lineup.webp" alt="观看角度变化时，展示场景仍需保留服饰轮廓与纹样细节。" width="1803" height="401" loading="lazy" decoding="async" /></a>
<figcaption>观看角度变化时，展示场景仍需保留服饰轮廓与纹样细节。</figcaption>
</figure>

## 图样变化和服饰旋转，要分开判断

项目有两条动态路径。ComfyUI 中，纹样图进入 SVD 条件、采样与 VAE 解码，再经过 RIFE 插帧和视频合成；Unreal Engine 5 则展示三维服饰。前者让图像随时间变化，后者从不同角度展开已有形态。

<figure>
<a href="/images/notebook/liangzhu/workflow-animation-branch.webp"><img src="/images/notebook/liangzhu/workflow-animation-branch.webp" alt="SVD 生成序列，RIFE 补帧。运动顺滑之后，还需要检查纹样本身变成了什么。" width="2200" height="1022" loading="lazy" decoding="async" /></a>
<figcaption>SVD 生成序列，RIFE 补帧。运动顺滑之后，还需要检查纹样本身变成了什么。</figcaption>
</figure>

看生成序列时，我对照相邻帧里同一个形态怎样变化。RIFE 补顺了间隔，却不能撤回形态本身不合适的变化。服饰展示则对照前襟、侧缝和衣摆在不同角度下的状态。两种输出一起做过后，这个区别很实际：视频顺滑，纹样仍可能有问题；衣服上的问题，又可能来自贴图位置或场景。

<figure class="video">
<video src="/videos/liangzhu-film.mp4" poster="/images/motion-covers/liangzhu-film.webp" width="1280" height="720" controls playsinline preload="none"></video>
<figcaption>项目原片 · 纹饰调研、生成流程、数字服饰映射与展陈设计，保留原声。</figcaption>
</figure>

## 桌面、屏幕和衣服各自解释一件事

现场横向多屏展开场景，竖屏保留服饰比例；透明桌盒把立体纹样与黑底金色的平面参照放在一起。远处先看到整体，走近桌面后，可以更细地比较轮廓和媒介变化。

<figure>
<a href="/images/notebook/liangzhu/exhibition-screens.webp"><img src="/images/notebook/liangzhu/exhibition-screens.webp" alt="横屏与竖屏分别照顾场景展开和服饰比例。" width="1080" height="608" loading="lazy" decoding="async" /></a>
<figcaption>横屏与竖屏分别照顾场景展开和服饰比例。</figcaption>
</figure>

展陈把我做的几部分工作放进了同一段观看：平面纹样交代来源，实体露出厚度与留白，控制项让变化可以被操作，服饰再呈现这些决定落在完整表面上的样子。它们放在一起以后，我判断结果的尺度也变了。一张单独成立的图，还要经得起尺寸、媒介和视角的变化。

<figure>
<a href="/images/notebook/liangzhu/exhibition-motif-objects.webp"><img src="/images/notebook/liangzhu/exhibition-motif-objects.webp" alt="立体纹样与平面参照并置，便于比较轮廓、厚度与留白。" width="1080" height="607" loading="lazy" decoding="async" /></a>
<figcaption>立体纹样与平面参照并置，便于比较轮廓、厚度与留白。</figcaption>
</figure>

## 工具与方法

<dl class="tools">
<div><dt>ComfyUI · SDXL · Refiner</dt><dd>搭建参照图、文本条件、色板、采样与细化流程。</dd></div>
<div><dt>SVD · RIFE</dt><dd>纹样图生视频与帧插值；与三维服饰展示分开处理。</dd></div>
<div><dt>Unreal Engine 5</dt><dd>三维服饰旋转可视化与展示场景制作。</dd></div>
<div><dt>Style3D</dt><dd>团队服饰流程中的裁片、缝合、面料与贴图设置。</dd></div>
<div><dt>Physical controls</dt><dd>八色比例滑块，以及矩形、环形、随机阵列按钮的交互映射。</dd></div>
</dl>
