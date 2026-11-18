<figure>
<a href="/images/design/swim-the-world/co-creation-system.webp"><img src="/images/design/swim-the-world/co-creation-system.webp" alt="Swim the World concept linking a mobile app, AI characters, and public displays" width="2400" height="1215" loading="lazy" decoding="async" /></a>
<figcaption>移动端创作、角色分享与展览触点。</figcaption>
</figure>

## 先看清自己的角色，再放进泳池

我们把微信二维码放在入口。参与者选择主题，填昵称和角色名，再进入绘画；这两个名字随后带到生成卡片上。最后的放出操作留在卡片底部，用滑条完成。

我们把生成和放出分成两次决定。一张结果可以很好看，却不像参与者刚才画的东西。预览让人先看清将要出现在公共屏幕上的角色，再决定发送。super jelly 示例一直把名字留在角色旁，加入其他画作后，参与者还能认出自己的那一份。

## 换主题时，画板还在身后

画板左下角是 Switch theme，底部安排清空，右下角是 Generate。换主题从下方打开选择器，提供 Cancel 和 Done，原画板仍留在后面。我们把这个选择留在当前任务里，让它看起来是在调整手上的创作，而不是重新开始一次体验。

<figure>
<a href="/images/design/swim-the-world/mobile-journey.webp"><img src="/images/design/swim-the-world/mobile-journey.webp" alt="主题选择保留在画板上方，生成后进入带名字的预览，再执行放出。控制项随参与者当前任务变化。" width="2400" height="1215" loading="lazy" decoding="async" /></a>
<figcaption>主题选择保留在画板上方，生成后进入带名字的预览，再执行放出。控制项随参与者当前任务变化。</figcaption>
</figure>

Generate 接着请求角色卡。编辑工具留在画布，放出操作留在卡片，这也给实现划出了不同状态。再次生成改变的是个人候选图，再次放出却涉及已经送到共享屏幕的角色。

原画、卡片名字和可见角色把几个页面接了起来。回看完整流程，这些参照让几个时刻分得很清楚：得到预览、决定放出、在公共屏幕上出现，虽然都属于同一次创作，却是不同事件。

## 把电脑上的 Stable Diffusion 接到手机交互里

我们在一台电脑上部署 Stable Diffusion，再通过 API 接出来。小程序承接绘画、生成请求和返回的角色卡，模型在电脑上运行。参与者留在手机上的创作流程里，不需要自己操作模型界面。

API 返回完成的是得到图像这一步，还不代表角色已经进入展览大屏。两步之间的预览让参与者检查转化结果，再决定是否放出。

把 API 接进来以后，我更具体地理解了这段分工：电脑完成图像生成，展览还要把它放回参与者的操作，再送入共享画面。接口返回的是技术结果，预览和放出则把这个结果变成了一次公共参与。

<figure class="diagram">
<a href="/images/figures/swim-the-world-zh.svg"><img src="/images/figures/swim-the-world-zh.svg" alt="Stable Diffusion 部署在电脑上，通过 API 接入创作流程。生成回到个人预览，放出再进入共享泳池。" width="880" height="740" loading="lazy" decoding="async" /></a>
<figcaption>Stable Diffusion 部署在电脑上，通过 API 接入创作流程。生成回到个人预览，放出再进入共享泳池。</figcaption>
</figure>

## 生成之后，还能不能认出原画

水母示例保留了草图的伞形轮廓和触须，颜色与表面细节则发生变化。这些形态让生成结果与输入之间有了看得见的联系。我觉得把两张图放在一起看，比单独判断角色做得是否精细，更能说明这次转化有没有接住原画。

在热闹的大屏上，名字和轮廓各有用途。名字说明是谁的作品，轮廓帮助人一眼找到角色。两个线索都保留，公共结果才更容易与刚才的个人绘画接起来。

## 手机上的决定，怎样进入公共画面

方案把展陈、互动、共创和搜索活动接在一起。户外二维码与“请儿童设计”的邀请都进入同一条小程序路径。手机给每个人画画和检查结果的空间，共享屏幕则汇集已经放出的角色。

这件作品留给我的一个具体认识，是加入集体画面之前，那段很小的个人决定也占分量。参与者先看结果，再放出，随后从别人的作品中认出自己的角色。名字与保留下来的形态把这次选择带到了大屏上，也把共享画面与刚才画画的人接在了一起。

## 工具与方法

<dl class="tools">
<div><dt>WeChat mini program</dt><dd>连接扫码、选题、命名、绘画、生成与放出操作。</dd></div>
<div><dt>Stable Diffusion</dt><dd>部署在一台电脑上，作为参与者创作流程背后的图像生成端。</dd></div>
<div><dt>API integration</dt><dd>把电脑上的生成服务接入绘画与预览流程，让小程序能够调用生成能力。</dd></div>
<div><dt>Interaction storyboard</dt><dd>区分可编辑画作、生成卡片与公共显示状态。</dd></div>
</dl>

<div id="recognition"></div>

## 公共空间落地与展览

-   <strong>杭州，2023。</strong>装置落地于阿里云亚运相关无废空间及西湖区公共场景。[项目记录 ↗](https://5596041.cargo.site/召唤海洋小精灵)
-   <strong>2023 · 入选展览。</strong>“AI 联未来，绘聚亚运”浙江省大学生数字艺术作品邀请展。[官方入选名单 ↗](https://di.zjnu.edu.cn/_upload/article/files/ba/2b/e008ba2e438db2175d14b06ab1b5/cc6e8b42-5c00-461a-9a9e-2c96d184f4b8.pdf)

<p lang="zh-Hans">团队：饶冯桂、周致远、臧渠成、庾智滔、崔男、傅蓉。</p>
