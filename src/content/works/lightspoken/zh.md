<figure>
<a href="/images/design/lightspoken/lighting-installation.webp"><img src="/images/design/lightspoken/lighting-installation.webp" alt="Purple and blue illuminated modules forming the LightSpoken installation" width="2400" height="1215" loading="lazy" decoding="async" /></a>
<figcaption>模块化灯光装置。</figcaption>
</figure>

## 外壳怎么开口，光就怎么出来

我们做了四层结构，各层有独立灯光空间，整体也设置灯光。点光源对应小开孔，灯带对应条状开孔。我也把层间空隙当作设计的一部分，因为它决定有多少光会越过花纹透出来。

<figure>
<a href="/images/design/lightspoken/model-making.webp"><img src="/images/design/lightspoken/model-making.webp" alt="亚克力、镜面与开孔一起决定光的呈现：点状、连续光带，或围绕中心形状的光晕。" width="2400" height="1215" loading="lazy" decoding="async" /></a>
<figcaption>亚克力、镜面与开孔一起决定光的呈现：点状、连续光带，或围绕中心形状的光晕。</figcaption>
</figure>

模型用了 5 mm 亚克力和镜面纸。初版轮廓粗糙，我们用镜面纸重新处理外观，让可见灯光更柔和。中心的音符形状由内部点光源照出光晕。材料表面怎么收，直接改变了最后看到的光，也改变了物件的轮廓。

<figure class="diagram">
<a href="/images/figures/lightspoken-zh.svg"><img src="/images/figures/lightspoken-zh.svg" alt="开孔、光源与独立伸缩模块的结构示意。" width="880" height="560" loading="lazy" decoding="async" /></a>
<figcaption>开孔、光源与独立伸缩模块的结构示意。</figcaption>
</figure>

## 颜色调好以后，再调整节奏

Unity 面板把模式和参数分开：Single 选择单色，Rainbow 改变颜色模式，Breath 让亮度有节奏地起伏，通过 UniOSC 传递控制。大面积触控区处理 HSB 调整，呼吸频率另外控制。

<figure>
<a href="/images/design/lightspoken/light-interface.webp"><img src="/images/design/lightspoken/light-interface.webp" alt="Single、Rainbow、Breath 与各自的实体效果并排显示；HSB 触控区和频率控制处理不同的调整。" width="2261" height="1600" loading="lazy" decoding="async" /></a>
<figcaption>Single、Rainbow、Breath 与各自的实体效果并排显示；HSB 触控区和频率控制处理不同的调整。</figcaption>
</figure>

这种分法在看实体灯光时很有用：颜色合适之后，调整节奏不必再重选颜色。我们在装配完成的模块上分别测试单色、彩虹和呼吸状态。界面图把操作与实体结果并排放，设置改变后可以直接对照光发生了什么。

## 让面板上的位置对应运动的模块

运动面板按九个单元的编号与排列安排控制，各自提供上升和下降；内部由电机驱动伸缩杆。一个控制对应一个单元，调整时才可以落到排列中的某一处，而不是只能把整组装置当成一个动作。

<figure>
<a href="/images/design/lightspoken/kinetic-interface.webp"><img src="/images/design/lightspoken/kinetic-interface.webp" alt="编号控制对应模块排列。升起、降下和中间位置的照片，说明停止与复位为什么要分开。" width="2261" height="1600" loading="lazy" decoding="async" /></a>
<figcaption>编号控制对应模块排列。升起、降下和中间位置的照片，说明停止与复位为什么要分开。</figcaption>
</figure>

Stop 保留当前排列，Reset 让单元回到参照位置。检查机构时，我把这两个动作用途分开。模块升到中途，外壳的重叠和透光会随之变化；先停在那里，才能看清这一个位置的花纹，再让整组复位。

<figure class="video">
<video src="/videos/lightspoken-sound.mp4" poster="/images/motion-covers/lightspoken.webp" width="1024" height="576" autoplay muted loop playsinline></video>
<figcaption>九单元声光编排复原：随节拍升降，灯光同步变色。点击播放声音。</figcaption>
</figure>

## 给运动留间隙，也给导线留余量

运动测试里，相邻模块要留间隙，避免摩擦和碰撞，走线也要能跟着机构活动。为了降低负载，我们尝试过一根相连的灯带，装配时又遇到导线缠绕。模块挤得更紧，这些位置就更难看清，也更难伸手处理。

露出的一段灯带会照亮接缝或导线，抢过预定花纹。装配让我把灯控和机构放到一起看：一种颜色设置并不能单独决定最后的光斑，开孔、线的位置和模块高度也都在参与。Stop 和 Reset 的用处也因此不同，一个留下当前状态供人看清，另一个恢复参照排列。

<figure>
<a href="/images/design/lightspoken/lighting-controls.webp"><img src="/images/design/lightspoken/lighting-controls.webp" alt="Interface development, communication controls, and lighting states." width="2400" height="1216" loading="lazy" decoding="async" /></a>
<figcaption>界面开发、通信控制与灯光状态。</figcaption>
</figure>

## 工具与方法

<dl class="tools">
<div><dt>Unity / UniOSC</dt><dd>控制灯光模式、HSB、呼吸频率与伸缩运动。</dd></div>
<div><dt>Acrylic / mirror paper</dt><dd>用 5 mm 亚克力与镜面纸制作四层外壳。</dd></div>
</dl>
