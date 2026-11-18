<figure>
<a href="/images/research/experience/art-therapy.webp"><img src="/images/research/experience/art-therapy.webp" alt="Installation view: a participant interacts with generated characters and particle trails across the projected environment." width="841" height="372" loading="lazy" decoding="async" /></a>
<figcaption>装置现场：参与者与投影环境中的生成角色和粒子轨迹交互。</figcaption>
</figure>

## 让孩子主动影响周围的场景

对儿童、家庭成员和专业人士的访谈形成三项设计重点：创作表达、沉浸体验，以及容易接近的恐惧相关图像。装置将身体输入连接到周围空间中风格化角色与粒子轨迹的可见变化。

## 两条更新路径在投影中汇合

<figure class="diagram">
<a href="/images/figures/art-therapy-zh.svg"><img src="/images/figures/art-therapy-zh.svg" alt="本地坐标流与生成图像返回具有不同时间尺度，TouchDesigner 合成后，Spout 与 Resolume 将输出映射到两面垂直墙体和地面。" width="900" height="660" loading="lazy" decoding="async" /></a>
<figcaption>本地坐标流与生成图像返回具有不同时间尺度，TouchDesigner 合成后，Spout 与 Resolume 将输出映射到两面垂直墙体和地面。</figcaption>
</figure>

<ol class="steps">
<li><h3>形成视觉素材</h3><p>基于儿童绘画训练的 LoRA 引导生成图像的风格。OpenSketch 客户端提供绘画画布与图像生成请求，上传服务接收生成素材，再将素材送入装置的合成流程。</p></li>
<li><h3>持续响应运动输入</h3><p>Python 检测 ArUco 标记身份与坐标，通过 UDP 将运动数据持续发送给 TouchDesigner。生成服务准备图像时，这条数据流仍继续更新，因此空间反馈与新素材返回采用不同的更新路径。</p></li>
<li><h3>合成并映射场景</h3><p>GrabCut 分离返回图像的前景，TouchDesigner 将处理后的素材与运动数据合成，再通过 Spout 和 Resolume 映射到两面墙与地面。参与者的动作因此能够引起周围视觉环境的变化。</p></li>
</ol>

## 专家反馈明确了后续设计重点

专业人士审阅了系统图示与演示视频。反馈强调渐进接触、个体需求和家长参与：节奏与强度需要适合具体的孩子，陪同成人也需要在体验中发挥作用。项目建立了交互框架与技术原型；这次评审尚不能证明临床效果。

## 代码与材料

OpenSketch 开源了 uni-app 绘画客户端与 Flask 上传服务。生成端点配置在 utils/api-config.js，上传示例位于 server/upload\_server.py。仓库覆盖装置中的这部分创作组件。
