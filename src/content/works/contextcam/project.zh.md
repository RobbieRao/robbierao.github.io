<figure class="screens">
<ol>
<li><a class="crop" href="/images/research/cocreation/contextcam.webp" style="--x:14"><img src="/images/research/cocreation/contextcam.webp" alt="Choose a direction" width="1400" height="795" loading="lazy" decoding="async" /></a><h3>先选方向</h3><p>点选三个主题之一，再在同一段对话中查看细化构想，之后才生成。</p></li>
<li><a class="crop" href="/images/research/cocreation/contextcam.webp" style="--x:544"><img src="/images/research/cocreation/contextcam.webp" alt="Request an image" width="1400" height="795" loading="lazy" decoding="async" /></a><h3>明确生成</h3><p>Paint 发出生成请求，图像和文字描述一起返回。</p></li>
<li><a class="crop" href="/images/research/cocreation/contextcam.webp" style="--x:1073"><img src="/images/research/cocreation/contextcam.webp" alt="Revise this image" width="1400" height="795" loading="lazy" decoding="async" /></a><h3>修改这张图</h3><p>“Bridge”调整构图方向，EditID 标明正在修改的图像。</p></li>
</ol>
<figcaption>我设计并实现的 Android 界面，取自原论文 Figure 2。点击任一界面可查看完整原图。</figcaption>
</figure>

## 我如何设计从想法到图像的路径

我围绕三个决定组织 Android 界面：想往哪个方向创作、使用哪些情境，以及现在要生成还是修改。悬浮对话窗让这些决定留在用户当前的手机活动旁。

## 三个交互设计决定

<ol class="steps">
<li><h3>先选方向，再生成</h3><p>我把三个主题建议放在详细构想之前。选择主题和 Paint 分成两步，让用户先判断想法，再请求生成。</p></li>
<li><h3>让输入依据可见</h3><p>五类情境图标保留在顶部，区分不同主题使用的来源，以及用户主动关闭的来源；控制输入不必脱离创作流程。</p></li>
<li><h3>明确动作与对象</h3><p>Paint、Edit、Advice 与自由输入并存。Edit 作用于 EditID 指定的图像，对话中则保留前一张图与新的修改指令。</p></li>
</ol>

<figure class="diagram">
<a href="/images/notebook/contextcam/paper-figure-3.webp"><img src="/images/notebook/contextcam/paper-figure-3.webp" alt="我为论文绘制的架构图：黄色节点表示智能体，蓝色节点表示用户输入与选择。" width="2110" height="805" loading="lazy" decoding="async" /></a>
<figcaption>我为论文绘制的架构图：黄色节点表示智能体，蓝色节点表示用户输入与选择。</figcaption>
</figure>

## 用户怎样使用整套系统

<dl class="metrics">
<div><dt><span>名真实情境研究参与者</span></dt><dd>16</dd></div>
<div><dt><span>种不同情境</span></dt><dd>136</dd></div>
<div><dt><span>的对话采用推荐主题</span></dt><dd>92.9%</dd></div>
</dl>

三天共记录 240 次对话，易用性均值为 5.88/7。使用记录呈现了从快捷推荐走向自主主题、图像输入和选择性来源控制的变化。这是对整套系统的观察，不是针对单项 UI 设计的对照测量。

## 代码与材料

我编写的 Android 前端代码收录于 ArtAgent-android，包含客户端与 Gradle 工程；backend\_config.json 用于连接独立部署的推理服务。
