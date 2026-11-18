<figure>
<a href="/images/design/artisense/learning-interfaces.webp"><img src="/images/design/artisense/learning-interfaces.webp" alt="Artisense phone and tablet interfaces for drawing, references, and feedback" width="2400" height="1215" loading="lazy" decoding="async" /></a>
<figcaption>手机与平板上的核心学习界面。</figcaption>
</figure>

## 生成以后，画板还要留着

简笔画原型把学习者的画和生成参考分成两块区域，笔刷粗细、颜色、清空和主题预设都留在画板旁。生成结果没有覆盖原来的几笔，学习者可以对照着看，再回到同一块画板继续画。我们用这个布局保留了动手的部分，避免更完整的生成图一出现，原画就退到看不见的地方。

方案用 ControlNet 把简笔输入接到参考生成，两张图因此是一组输入和结果。并排放置也让我看见一个容易忽略的细节：原画再添一笔，旧参考仍然对应之前的草图。对照关系本身就是学习交互的一部分，不只是把两张图排得整齐。

## 平板多出来的宽度，留给对照

手机稿把发现、绘画和练习讨论分成独立页面，平板稿则让发现内容或学习概览留在对话旁。多出来的宽度用来同时呈现讨论对象和反馈。手机上需要来回切换的内容，在平板上可以并排读，这比单纯放大原来的页面更有用。

笔刷粗细用画布旁不同直径的圆点表示，颜色用色板和滑条调整，主题预设则单独放置。改变笔刷影响接下来画出的笔迹，改变主题影响下一次请求的参考。把两组控制分开，也是在界面上说明它们各自会改动什么。

<figure class="diagram">
<a href="/images/figures/artisense-zh.svg"><img src="/images/figures/artisense-zh.svg" alt="布局示意：平板让参考与讨论同时可见。" width="880" height="510" loading="lazy" decoding="async" /></a>
<figcaption>布局示意：平板让参考与讨论同时可见。</figcaption>
</figure>

## 看完回复，能接着改这道练习

练习对话把静物题目、索取示范的提问和返回参考放在一起。附近提供上传绘画、更换题目和请求改画。这几个动作对应不同需要：换一道题、继续讨论手上的画，或者提交新的尝试。

题目和当前画作留在对话里，回复就有了看得见的对象。这也是我从这张稿子里得到的判断：练习助手的价值，要落到眼前这幅画还能怎么改。把回复移到另一张独立页面，即使写得完整，也会打断它与画作的关系。

## 原画与参考各有位置

发现页集合艺术家内容、每日灵感、学习报告、社区和帮助；文字、语音和图片入口分别接住提问和画作。这些页面处理浏览与探索，简笔画页则把动手的空间单独留下。两部分承担不同任务，没有把所有内容挤到画板旁。

回看原型，我最认可的是原画与生成参考始终分开。参考提供一种方向，学习者留下的线条仍然是自己的作品。这个区别让我读其他页面时也有了判断依据：画面里还能不能分清，哪些来自学习者，哪些是系统给的建议。

## 工具与方法

<dl class="tools">
<div><dt>Drawing canvas</dt><dd>组合简笔画区、笔刷粗细、色板、主题预设与生成参考区。</dd></div>
<div><dt>Phone / tablet prototypes</dt><dd>为不同屏幕安排发现内容、练习讨论与绘画控制。</dd></div>
</dl>

## 项目获奖

-   <strong>2024 · 省赛铜奖。</strong>浙江省国际大学生创新大赛。[官方获奖名单 ↗](https://jyt.zj.gov.cn/module/download/downfile.jsp?classid=0&filename=39a780eaf6d14b24ae23a57c3a1569c6.pdf)
-   <strong>2024 · 校赛银奖。</strong>中国美术学院第十届国际大学生创新大赛。
-   <strong>2023 · 省赛铜奖。</strong>第九届浙江省国际“互联网+”大学生创新创业大赛。[官方获奖名单 ↗](https://jyt.zj.gov.cn/module/download/downfile.jsp?classid=0&filename=b3eb0892477045789f80db524e3b5a7d.pdf)
-   <strong>2023 · 校赛金奖。</strong>中国美术学院第九届“互联网+”大学生创新创业大赛。
-   <strong>2023 · 华东赛区三等奖。</strong>中国高校计算机大赛——移动应用创新赛，创新赛道。

团队奖项。[项目记录 ↗](https://5596041.cargo.site/《意绘artisense》-)
