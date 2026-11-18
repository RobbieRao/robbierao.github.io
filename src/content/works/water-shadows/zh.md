<figure class="pair">
<a href="/images/design/water-shadows/installation-view.webp"><img src="/images/design/water-shadows/installation-view.webp" alt="Full-height photograph of a metal, plant, and projection installation" width="1600" height="2400" loading="lazy" decoding="async" /></a>
<a href="/images/design/water-shadows/virtual-landscape.webp"><img src="/images/design/water-shadows/virtual-landscape.webp" alt="Virtual landscape developed alongside the physical installation" width="1269" height="585" loading="lazy" decoding="async" /></a>
<figcaption>完成后的实体装置。</figcaption>
</figure>

## 让村庄留下居住过的痕迹

我做室外场景时，想让植物像是在慢慢收回村庄。湖面和岛屿交代地点，砖墙从植被里露出来，让人还能看见曾经居住过的痕迹。因此构图里需要留下墙面，不能把所有空隙都填满植物。

虚拟环境由我们分工完成：寒译做内部展厅，文康做村庄建筑改造，我把天空和粒子效果供整个工程共用。天空在 Ultra Dynamic Sky 的基础上修改，重载获取星星的函数，换入 Stable Diffusion 生成的天空盒，再对着场景调参数。共用天空让几个空间处在相近的氛围里，各自的建筑和构图仍可以不同。

## 让一条鱼也能离开鱼群

这是我第一次写 Niagara 暂存区脚本。样条能给鱼群一条路线，但都沿着同一路线走，队形很容易显得固定。我逐步做聚拢、离群和闪烁，再加入个体判断，让一条鱼既能跟随群体，也能暂时离开。路线负责把画面组织住，个体行为则让运动有变化。

<figure>
<a href="/images/design/water-shadows/niagara-workflow.webp"><img src="/images/design/water-shadows/niagara-workflow.webp" alt="样条提供路线，暂存区脚本让个体能够聚拢或离群。" width="1898" height="802" loading="lazy" decoding="async" /></a>
<figcaption>样条提供路线，暂存区脚本让个体能够聚拢或离群。</figcaption>
</figure>

村庄点云需要另一种输入。我用场景捕获把深度写进图像的 Alpha 通道，再交给 Niagara 输出点。鱼群和村庄都用了粒子工具，处理的却是两件事：一个更新个体运动，一个表现捕获到的几何。做完这两种效果，我对粒子的理解也具体了很多，看起来相近的画面，背后可能需要完全不同的数据。

<figure>
<a href="/images/design/water-shadows/depth-point-cloud.webp"><img src="/images/design/water-shadows/depth-point-cloud.webp" alt="场景深度通过 Alpha 进入 Niagara。这条路径表现村庄几何，不负责鱼群运动。" width="1883" height="699" loading="lazy" decoding="async" /></a>
<figcaption>场景深度通过 Alpha 进入 Niagara。这条路径表现村庄几何，不负责鱼群运动。</figcaption>
</figure>

## 一条曲线，换掉了骨架材料

形态讨论先往前走了，实体怎么做还没有完全分清。我在室外场景之外，把寒译和文康的想法带进 Rhino，推敲结构并准备切割图。我们买了钢管和弯管机，试弯后发现曲线太生硬。模型里看着顺的鱼形，用这套材料和工具并不容易做出来。

我提出把硬铝丝套进金属软管：铝丝保持弯曲，软管提供管状外表面。鱼皮也换了方案。敲制铁皮的工作量太大，3D 打印成本又高，最后采用投影纱。骨架撑出鱼的轮廓，变化的表面交给投影影像。

<figure>
<a href="/images/design/water-shadows/structure-drawing.webp"><img src="/images/design/water-shadows/structure-drawing.webp" alt="Fabrication drawings for the fish-shaped installation." width="1118" height="782" loading="lazy" decoding="async" /></a>
<figcaption>鱼形装置的制作图纸。</figcaption>
</figure>

这个决定也改变了实体制作的任务。细节不用再敲进金属里，骨架固定后，我仍能在 TouchDesigner 中调整表面。纱面、骨架和投影必须放在一起看，单独一条好看的曲线，还不能保证投上去的画面成立。

<figure class="diagram">
<a href="/images/figures/water-shadows-zh.svg"><img src="/images/figures/water-shadows-zh.svg" alt="结构示意，非尺寸图：硬铝丝套金属软管组成鱼骨，纱面承接粒子影像。下方剖面说明了钢管试弯后采用的材料组合。" width="900" height="580" loading="lazy" decoding="async" /></a>
<figcaption>结构示意，非尺寸图：硬铝丝套金属软管组成鱼骨，纱面承接粒子影像。下方剖面说明了钢管试弯后采用的材料组合。</figcaption>
</figure>

<figure>
<a href="/images/design/water-shadows/structural-detail.webp"><img src="/images/design/water-shadows/structural-detail.webp" alt="Structural connections and cabling." width="2400" height="1600" loading="lazy" decoding="async" /></a>
<figcaption>结构连接与布线。</figcaption>
</figure>

## 先做运动，再看它落到纱面上

投影粒子在 TouchDesigner 中用 Geometry COMP 的 Instance 方法建立。Remap TOP 按粒子当前位置采样流场，把力转成加速度，再更新速度，最后驱动可见的实例。改流场是在改粒子的运动方式，并不是在成片上换一张纹理。

<figure>
<a href="/images/design/water-shadows/touchdesigner-projection.webp"><img src="/images/design/water-shadows/touchdesigner-projection.webp" alt="TouchDesigner flow-field network and the particle imagery developed for projection." width="1269" height="609" loading="lazy" decoding="async" /></a>
<figcaption>TouchDesigner 流场节点网络与用于投影的粒子影像。</figcaption>
</figure>

输出影像再投到鱼形纱面上。读网络时，我把运动和绘制分开：流场更新决定实例去哪，Geometry COMP 决定在那里画什么。最后仍要回到纱面上判断，因为观众看到的画面里，也包含鱼骨和曲面本身。

<figure>
<a href="/images/design/water-shadows/projection-detail.webp"><img src="/images/design/water-shadows/projection-detail.webp" alt="Projection mesh and the fish-shaped structure." width="2400" height="1600" loading="lazy" decoding="async" /></a>
<figcaption>投影纱与鱼形结构。</figcaption>
</figure>

## 收尾的两夜

最后完成实体装置时，我们三个人在摄影棚熬了两夜。骨架、纱面和投影要一起收尾，场景、剪辑和写作也由同一组人承担。我还结合小组讨论，完成了以洪畈村为案例的项目论文，并报名挑战杯。

那两夜让我重新理解了装置的工作量。场景、骨架和投影没有在各自“看起来完成”时结束，装纱和对齐画面又把它们拉回了同一件事。换材料减少了实体表面的制作，却也把更多最终效果交给投影。这个取舍，直到整件装置收尾时才感受得最清楚。

<figure>
<a href="/images/design/water-shadows/planting-detail.webp"><img src="/images/design/water-shadows/planting-detail.webp" alt="Plants and the illuminated base." width="2400" height="1600" loading="lazy" decoding="async" /></a>
<figcaption>植物与发光底座。</figcaption>
</figure>

## 工具与方法

<dl class="tools">
<div><dt>Rhino</dt><dd>设计鱼骨结构并准备切割图。</dd></div>
<div><dt>Unreal Engine / Niagara</dt><dd>实现鱼群运动与场景深度点云，修改 UDS 天空蓝图。</dd></div>
<div><dt>TouchDesigner</dt><dd>生成流场粒子影像，投射到鱼形纱面。</dd></div>
</dl>
