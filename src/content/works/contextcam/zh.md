## 先选方向，再补细节

界面首先要解决的是：还说不清想画什么时，怎么开始？团队的形成性研究中，23 人里有 15 人觉得提示词难写。我把界面的起点放在一个更小的决定上：先选一个方向，再补充细节。

我把主题选择、生成结果和修改留在同一段对话里。选中一个建议后，先展开更具体的画面构想，再用 Paint 生成图像。这样，用户有机会先判断方向是否合适，再决定要不要画出来。

<figure class="screens">
<ol>
<li><a class="crop" href="/images/research/cocreation/contextcam.webp" style="--x:14"><img src="/images/research/cocreation/contextcam.webp" alt="Choose a direction" width="1400" height="795" loading="lazy" decoding="async" /></a><h3>先选方向</h3><p>点选三个主题之一，再在同一段对话中查看细化构想，之后才生成。</p></li>
<li><a class="crop" href="/images/research/cocreation/contextcam.webp" style="--x:544"><img src="/images/research/cocreation/contextcam.webp" alt="Request an image" width="1400" height="795" loading="lazy" decoding="async" /></a><h3>明确生成</h3><p>Paint 发出生成请求，图像和文字描述一起返回。</p></li>
<li><a class="crop" href="/images/research/cocreation/contextcam.webp" style="--x:1073"><img src="/images/research/cocreation/contextcam.webp" alt="Revise this image" width="1400" height="795" loading="lazy" decoding="async" /></a><h3>修改这张图</h3><p>“Bridge”调整构图方向，EditID 标明正在修改的图像。</p></li>
</ol>
<figcaption>我设计并实现的 Android 界面，取自原论文 Figure 2。点击任一界面可查看完整原图。</figcaption>
</figure>

Android 端采用可调整大小的悬浮窗，让创作对话可以留在当前手机活动旁。推荐之外仍保留文字、语音和照片输入。我的考虑是，入口要容易开始，也要容得下用户已经明确的想法。

## 让推荐依据留在眼前

如果看不到输入，推荐就容易显得莫名其妙。我把位置、屏幕内容、面部表情、天气和音乐放在窗口顶部：看到主题时，也能看到哪些信息参与了它；不想使用的来源可以主动关闭。

我特别保留了“不相关”和“被我关闭”的区别：前者是系统的筛选，后者是用户的决定。下面是论文定义的完整五种状态。原始示例中，蓝色的位置参与主题 1、2，白色的屏幕内容则没有参与。

<figure class="legend">
<ul>
<li><i style="--swatch:#e9f2dc"></i>三个主题都使用</li>
<li><i style="--swatch:#d6f0fc"></i>主题 1、2 使用</li>
<li><i style="--swatch:#fff2b8"></i>仅主题 3 使用</li>
<li><i style="--swatch:#ffffff"></i>系统判断不相关</li>
<li><i style="--swatch:#d6d8dd"></i>用户主动关闭</li>
</ul>
<figcaption>§4.1 定义的来源状态。上方原界面显示蓝、绿、白三种，这里补全五种状态的含义。</figcaption>
</figure>

## 让下一步操作明确

只有聊天框，用户仍可能不知道怎样让系统出图、给建议，或修改之前的结果。我把这些意图拆成输入区旁的快捷动作：Recommend based on context、Paint、Edit、Advice。自由输入保留，高频动作则不必再组织一句提示词。

Paint 和 Edit 的对象不同：一个生成图像，一个修改顶部 EditID 指定的图像。论文示例里，输入“Bridge”改变构图，同时延续前一张图的风格。把图像、指令和回应留在一起，用户才能对照这次修改保留了什么、改变了什么。

<dl class="actions">
<div><dt>Recommend based on context</dt><dd>从当前情境开始构思</dd></div>
<div><dt>Paint</dt><dd>生成图像</dd></div>
<div><dt>Edit</dt><dd>修改 EditID 指定的图像</dd></div>
<div><dt>Advice</dt><dd>讨论画面构想</dd></div>
</dl>

## 把界面操作接到系统能力

绘制论文架构图时，我沿用界面的顺序：选择情境、确定主题、生成与修改。黄色节点表示智能体，蓝色节点表示用户输入与选择；单独的个性化路径说明哪些偏好会带到之后的会话。

团队系统把情境筛选、主题建议、创作讨论与工具执行分开。我在前端将这些能力转成主题选项、来源状态和快捷动作。用户可以围绕图像做决定，不必逐个操作五个智能体，也不必先配置模型参数。

<figure class="diagram">
<a href="/images/notebook/contextcam/paper-figure-3.webp"><img src="/images/notebook/contextcam/paper-figure-3.webp" alt="我为论文绘制的架构图：黄色节点表示智能体，蓝色节点表示用户输入与选择。" width="2110" height="805" loading="lazy" decoding="async" /></a>
<figcaption>我为论文绘制的架构图：黄色节点表示智能体，蓝色节点表示用户输入与选择。</figcaption>
</figure>

来源颜色背后是一组五维二进制向量。示例中，\[1,0,1,1,1\] 支持两个主题，\[0,0,1,1,1\] 支持第三个：移除位置，让构思可以走向另一个方向。界面通过来源状态呈现这个区别，无需用户理解向量。

<figure class="diagram">
<a href="/images/figures/contextcam-zh.svg"><img src="/images/figures/contextcam-zh.svg" alt="实际向量示例中，两个主题采用 [1,0,1,1,1]，第三个采用 [0,0,1,1,1]。移除位置改变了可用依据，其余被选模态保持一致。" width="900" height="640" loading="lazy" decoding="async" /></a>
<figcaption>实际向量示例中，两个主题采用 [1,0,1,1,1]，第三个采用 [0,0,1,1,1]。移除位置改变了可用依据，其余被选模态保持一致。</figcaption>
</figure>

## 用户怎样逐渐接管创作

后续三天研究中，16 位参与者进行了 240 次对话，覆盖 136 种情境。92.9% 的对话采用了推荐主题，易用性均值为 5.88/7。这些结果反映的是整套系统的使用，不能单独归因于某个界面控件。

使用记录让我重新理解了这两种创作入口。有些人起初依赖推荐，熟悉后开始输入自己的主题、照片或草图，也会选择性关闭来源。推荐给了他们一个起点；等他们形成自己的用法，开放输入和来源开关仍然用得上。

## 工具与方法

<dl class="tools">
<div><dt>Android floating window · Web APIs</dt><dd>收集五类情境，让对话留在当前移动活动旁。</dd></div>
<div><dt>GPT-4 · VisualGLM-6B</dt><dd>语义理解与构思，以及用于对话的图像描述。</dd></div>
<div><dt>Stable Diffusion v1.5 · ControlNet</dt><dd>生成与编辑；桥梁例子用 Shuffle 在重构图时保留风格。</dd></div>
<div><dt>Conversation memory · preference summaries</dt><dd>将当前编辑历史与可复用的题材、风格和主题偏好分开。</dd></div>
</dl>
