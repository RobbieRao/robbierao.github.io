<figure>
<a href="/images/design/lost-homeland/circular-corridor.webp"><img src="/images/design/lost-homeland/circular-corridor.webp" alt="A dark science-fiction environment built around a circular corridor" width="2400" height="1334" loading="lazy" decoding="async" /></a>
<figcaption>短片中的完成画面。</figcaption>
</figure>

## 围合与破碎，先在空间上区分

《家源》的数据宇宙用了暗色环形走廊和青色建筑碎片两种环境。走廊围成连续路径，碎片之间则留出空隙，让光和纵深进入。影片关于归属的叙事，由这两种不同的空间关系展开。

<figure>
<a href="/images/design/lost-homeland/data-universe.webp"><img src="/images/design/lost-homeland/data-universe.webp" alt="A contrasting, luminous environment within the film." width="2400" height="1124" loading="lazy" decoding="async" /></a>
<figcaption>片中与暗色场景形成对照的明亮环境。</figcaption>
</figure>

成片画面里，走廊靠开口与围合组织空间，碎片场靠部件之间的空隙拉开距离。细部材质还没看清时，这些关系已经把两个环境分开了。把它们放在一起看，我更能理解为什么多加一些纹理，并不能代替空间本身的区别。

## 建模时就给光留位置

圆环用同心层次组织，房间体积沿圆周排布。房间内部留平地放家具，圆环的其他位置则留给布光。几何不只描述外轮廓，也提前安排了物件和光能够共存的位置。

亮开口和暗走廊共同构成画面：光把纵深带进圆环，房间剪影又保留了围合感。几何给了光一个明确的表现对象。这个关系让我认识到，布光已经参与了空间设计，不能等模型完成后再把它当成一层表面效果。

<figure class="diagram">
<a href="/images/figures/lost-homeland-zh.svg"><img src="/images/figures/lost-homeland-zh.svg" alt="房间与布光分区示意，将圆环布局对应到镜头中的明亮开口。" width="880" height="560" loading="lazy" decoding="async" /></a>
<figcaption>房间与布光分区示意，将圆环布局对应到镜头中的明亮开口。</figcaption>
</figure>

## 先判断该改几何，还是材质

制作视图里，Blender 的建模与材质和 Unreal Engine 的材质函数、BP\_FirstPersonCharacter 事件图并排出现。这些编辑位置处理不同的问题：材质函数改变表面的表现，事件图处理随时间发生的行为。

<figure>
<a href="/images/design/lost-homeland/material-development.webp"><img src="/images/design/lost-homeland/material-development.webp" alt="圆环草图分别预留房间地面与布光区域；制作视图把几何、表面处理和场景行为放在各自的编辑位置。" width="2400" height="1556" loading="lazy" decoding="async" /></a>
<figcaption>圆环草图分别预留房间地面与布光区域；制作视图把几何、表面处理和场景行为放在各自的编辑位置。</figcaption>
</figure>

中央开口给这些工具提供了共同参照。圆环和房间体积定义轮廓，光照与材质响应决定周围表面能看见多少。制作视图让我把画面里的变化对应到具体编辑位置：哪一部分来自几何，哪一部分来自表面，而不是笼统地把整张图都叫作一个效果。

## 效果和镜头，判断的尺度不同

我们还在 TouchDesigner 中试验了蓝白色流体效果。fluid1 分别提供压力、速度扩散、密度扩散、浮力和涡旋强度，输出和网络放在一起，便于把参数变化与实际运动对照。

<figure>
<a href="/images/design/lost-homeland/scene-development.webp"><img src="/images/design/lost-homeland/scene-development.webp" alt="Further scene and effect development." width="2400" height="1556" loading="lazy" decoding="async" /></a>
<figcaption>更多场景与效果开发过程。</figcaption>
</figure>

流体试验也让我更清楚地区分了效果和镜头。压力、扩散这些参数解释了运动怎样产生，却不能单独决定观众在影片里看哪里。开口、房间剪影和碎片间隙仍在组织注意力。对这组空间来说，技术上更复杂的效果，未必更适合放进画面。

## 工具与方法

<dl class="tools">
<div><dt>Unreal Engine</dt><dd>通过材质函数发展表面外观，通过事件图组织场景行为。</dd></div>
<div><dt>Blender</dt><dd>建模并预览场景几何与材质处理。</dd></div>
<div><dt>TouchDesigner</dt><dd>通过节点网络与参数控制研究流体运动。</dd></div>
</dl>
