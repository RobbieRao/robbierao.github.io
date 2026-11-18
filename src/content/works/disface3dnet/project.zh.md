<figure class="diagram">
<a href="/images/research/perception/disface3dnet.webp"><img src="/images/research/perception/disface3dnet.webp" alt="The paper’s overview contrasts an overall prediction with component-specific representations and score fusion." width="1400" height="616" loading="lazy" decoding="async" /></a>
<figcaption>论文概览图对照整体预测，以及成分专属表征与评分融合的方式。</figcaption>
</figure>

## 哪些视觉成分影响了预测？

整体评分本身无法说明中性面部形状、皮肤外观、头发、光照、背景、表情和姿态各起了什么作用。DisFace3DNet 为这些成分指定输入表征与数值读出，再让它们直接参与最终预测。

## 从分离输入到可相加的评分

<figure class="diagram">
<a href="/images/figures/disface3dnet-zh.svg"><img src="/images/figures/disface3dnet-zh.svg" alt="DisFace3DNet 的输入形式与训练状态。训练行指分支中可训练的参数，部分预训练 EfficientNet 块始终冻结；最终融合只拟合 Wst、Wdy 和 b₀。" width="900" height="620" loading="lazy" decoding="async" /></a>
<figcaption>DisFace3DNet 的输入形式与训练状态。训练行指分支中可训练的参数，部分预训练 EfficientNet 块始终冻结；最终融合只拟合 Wst、Wdy 和 b₀。</figcaption>
</figure>

<ol class="steps">
<li><h3>准备七种表征</h3><p>三维重建分离中性几何、反照率与照明，分割提供头发和背景输入。表情表示为同一身份的有表情网格相对中性网格的位移；姿态以俯仰、偏航和翻滚单独保留。</p></li>
<li><h3>训练成分专属分支</h3><p>EfficientNet-B0 编码 UV 图与头发图像，MLP 处理紧凑的背景及姿态向量。五项静态评分非负，表情与姿态提供有符号调整。整体人类评分联合训练各分支，弱语义监督约束评分方向。</p></li>
<li><h3>冻结、校准与核算</h3><p>检查点选定后，编码器冻结。训练集统计量用于标准化静态与动态总分，约束融合拟合两个非负权重及截距。展开该表达式后，七项贡献可精确重建截断前的预测。</p></li>
</ol>

## 分别检验预测与解释

<dl class="metrics">
<div><dt><span>项成分贡献</span></dt><dd>7</dd></div>
<div><dt><span>平均 Pearson 相关系数</span></dt><dd>0.8904</dd></div>
<div><dt><span>SCUT-FBP5500 五折评估</span></dt><dd>5 folds</dd></div>
</dl>

预印本报告：与平均人类评分比较，五折 PCC 为 0.8904 ± 0.0063。匹配对照检验表征及训练选择，人类比较检验成分评分方向是否可理解；身份形状、皮肤和头发获得的方向支持比表情更明确。贡献在于可核算的模型解释，而不是把成分分数视为独立的人类判断或因果解释。

## 代码与材料

公开仓库目前包含项目说明与引用信息。实现代码、预处理脚本及允许分发的模型和数据计划在论文录用后发布。
