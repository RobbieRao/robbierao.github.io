<figure class="diagram">
<a href="/images/research/perception/disface3dnet.webp"><img src="/images/research/perception/disface3dnet.webp" alt="The paper’s overview contrasts an overall prediction with component-specific representations and score fusion." width="1400" height="616" loading="lazy" decoding="async" /></a>
<figcaption>The paper’s overview contrasts an overall prediction with component-specific representations and score fusion.</figcaption>
</figure>

## What contributes to a prediction?

An overall rating does not show how neutral facial shape, skin appearance, hair, lighting, background, expression and pose contribute. DisFace3DNet gives those components designated inputs and numerical readouts, then makes them participate directly in the final prediction.

## From separated inputs to an additive score

<figure class="diagram">
<a href="/images/figures/disface3dnet-en.svg"><img src="/images/figures/disface3dnet-en.svg" alt="Input formats and trainable states in DisFace3DNet. The training rows refer to trainable route parameters; some pretrained EfficientNet blocks remain frozen throughout. Final fusion fits only Wst, Wdy and b₀." width="900" height="620" loading="lazy" decoding="async" /></a>
<figcaption>Input formats and trainable states in DisFace3DNet. The training rows refer to trainable route parameters; some pretrained EfficientNet blocks remain frozen throughout. Final fusion fits only Wst, Wdy and b₀.</figcaption>
</figure>

<ol class="steps">
<li><h3>Prepare seven representations</h3><p>3D reconstruction separates neutral geometry, albedo and illumination. Segmentation isolates hair and background; expression is represented as displacement from the same identity’s neutral mesh. Pose stays outside the neutral geometry as pitch, yaw and roll.</p></li>
<li><h3>Train component-specific routes</h3><p>EfficientNet-B0 encodes UV maps and the hair image; MLPs handle compact background and pose vectors. Five static scores are nonnegative, while expression and pose provide signed adjustments. Overall human ratings train the routes jointly, with weak semantic guidance for score direction.</p></li>
<li><h3>Freeze, calibrate, account</h3><p>After checkpoint selection, the encoders are frozen. Training-set statistics standardize the static and dynamic totals; constrained fusion fits two nonnegative weights and an intercept. Expanding that expression gives seven contributions that exactly reconstruct the unclipped prediction.</p></li>
</ol>

## Prediction and explanation are evaluated separately

<dl class="metrics">
<div><dt><span>component contributions</span></dt><dd>7</dd></div>
<div><dt><span>mean Pearson correlation</span></dt><dd>0.8904</dd></div>
<div><dt><span>SCUT-FBP5500 evaluation</span></dt><dd>5 folds</dd></div>
</dl>

The preprint reports PCC 0.8904 ± 0.0063 across five folds, compared with mean human ratings. Matched controls examine representation and training choices; human comparisons examine whether component-score directions are understandable. Identity, skin and hair receive clearer directional support than expression. The contribution is explicit model accounting, not a claim that the learned components are independent human judgments or causal explanations.

## Code & materials

The public repository currently contains the project description and citation. Implementation, preprocessing scripts and permitted model/data releases are planned after acceptance.
