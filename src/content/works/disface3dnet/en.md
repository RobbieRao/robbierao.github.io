## The explanation began with the inputs

A highlighted cheek was not enough for the explanation I wanted. Shape, skin and lighting all occupy that region, so a Grad-CAM map cannot tell me which one drove the score. I designed the inputs first: each branch gets a representation of a particular component, then contributes a score to the final prediction.

The supervision made this choice difficult. SCUT-FBP5500 provides 5,500 photographs with overall ratings from 1 to 5, but no separate human ratings for the seven components. I trained the branches together on the overall target and used weak semantic labels to guide their interpretation. The five static branches produce scores in \[0,1\]; expression and pose make signed adjustments. A component label is therefore a design constraint on the model, not an independently measured human judgment.

I kept the official five folds for every comparison. Each fold has 4,400 training and 1,100 test images; the training portion becomes 3,960 internal training and 440 validation images. Validation PCC selects the checkpoint. Normalization statistics and fusion coefficients are fitted only on the internal training set, then fixed before testing. Matched controls share the split and paired random seeds, so changing the model does not quietly change the comparison.

#### Input contract for the seven routes

| Route | Representation | Design decision |
| --- | --- | --- |
| Identity | 9 UV channels + 7 descriptors | Normals, positions and curvatures; symmetry and scale; no skin texture. |
| Skin | 12 UV channels | RGB albedo plus fine, middle and coarse texture detail; no shape coordinates. |
| Light | 3 UV channels | 27 spherical-harmonic coefficients evaluated on neutral-mesh normals. |
| Hair | Masked RGB image | Zero non-hair pixels, then square-pad and resize. |
| Background | 15-dimensional vector | Color, texture, area and skin-contrast statistics. |
| Expression | 7 UV channels | Displacement normals, compressed displacements and log magnitude. |
| Pose | Pitch / yaw / roll | Original-image view information kept outside the neutral geometry. |

## Why the skin branch gets no shape coordinates

I used FFHQ-UV, Deep3DFaceRecon and HiFi3D++ for neutral geometry, albedo and illumination; 3DDFA-V3 supplies expression and pose, and BiSeNet separates hair and background. The image and UV inputs are cached at 384 × 384 before attractiveness training. Reusing that cache across folds and controls makes preprocessing a fixed part of the experiment.

<figure class="diagram">
<a href="/images/research/perception/disface3dnet.webp"><img src="/images/research/perception/disface3dnet.webp" alt="The inputs are part of the explanation design: neutral shape, albedo and illumination are separated before their scores are learned." width="1400" height="616" loading="lazy" decoding="async" /></a>
<figcaption>The inputs are part of the explanation design: neutral shape, albedo and illumination are separated before their scores are learned.</figcaption>
</figure>

For shape, I kept position, normals and three curvature measures as nine UV channels, with three symmetry and four scale descriptors. Skin gets twelve channels: RGB albedo and RGB detail at fine, medium and coarse scales. It does not receive shape coordinates. Illumination is reconstructed into three UV channels by applying 27 spherical-harmonic coefficients to neutral-mesh normals. These assignments do some of the separation before a loss function ever sees the scores.

Expression needed a reference for the same identity. I subtract the neutral BFM mesh from its expressive version while keeping identity coefficients fixed, then transfer the displacement to HiFi3D++ and UV space. Three displacement-normal channels, three compressed-displacement channels and one log-magnitude channel retain the deformation. Compression uses 3 tanh(z(ΔU)/3); invalid pixels become zero. The fixed cache supplies statistics from 500 samples for all folds.

The remaining inputs are deliberately smaller. Pose is pitch, yaw and roll in radians; background is a 15-dimensional summary of color, gradient, area and skin contrast. Hair retains its segmented RGB pixels and zeros elsewhere. EfficientNet-B0 handles UV maps and hair, while MLPs handle pose and background. Independent FiLM scales and offsets condition each branch on a shared eight-dimensional benchmark-group embedding. Those group labels are supplied externally and remain necessary at inference.

## A good total can hide a branch that stopped learning

I trained all seven branches jointly in PyTorch with AdamW and a batch size of 12: 70 epochs at 3 × 10⁻⁴, then 30 at 3 × 10⁻⁵. EfficientNet-B0 starts from ImageNet weights with some feature blocks frozen; augmentation stops during fine-tuning. At inference, I average the original and horizontally flipped predictions, including the corresponding changes to geometry, displacement and yaw.

The total-rating objective alone allows an unhelpful solution: some branches can become nearly constant while others do most of the fitting. I therefore checked the variation of the component scores as well as PCC. A balance term constrains differences between the log standard deviations of the five static scores. Removing it changes their scale coefficient of variation from 0.082 to 0.377, with only a small change in PCC. That comparison explains why the aggregate metric was insufficient for this model.

Weak semantics are another constraint, not another set of ground truth. GPT-5.5 jointly generates seven labels per image: static targets in \[0,1\], expression in \[−0.10,0.10\] and pose in \[−0.05,0.05\]. Their mean valid-label absolute error is weighted by λsem = 0.2. The joint objective also includes overall error, FPEM distillation, a 21-bin rating distribution, scalar-distribution consistency and pairwise ranking. The consistency term stops gradients through the distribution expectation; ranking uses pairs with sufficiently different ratings.

After checkpoint selection, I freeze the network before fitting fusion. Static and dynamic totals are standardized with internal-training statistics. Convex optimization fits two nonnegative weights and a free intercept against the benchmark target plus an FPEM target term weighted at 0.3. The teacher is fine-tuned within the same outer fold and selected on internal validation. Only fusion coefficients change in this stage; the teacher, weak labels and distribution head are training aids, while FiLM conditioning remains at deployment.

I report the component accounting before clipping. Expanding fusion gives seven contributions and an effective intercept that reconstruct the normalized prediction exactly. Multiplying contributions by four expresses them in rating points; the final score is clip(1 + 4y, 1, 5). At either endpoint clipping can change the reported total without changing the underlying contributions, so mixing the two stages would make a correct decomposition appear inconsistent.

<figure class="diagram">
<a href="/images/figures/disface3dnet-en.svg"><img src="/images/figures/disface3dnet-en.svg" alt="Input formats and trainable states in DisFace3DNet. The training rows refer to trainable route parameters; some pretrained EfficientNet blocks remain frozen throughout. Final fusion fits only Wst, Wdy and b₀." width="900" height="620" loading="lazy" decoding="async" /></a>
<figcaption>Input formats and trainable states in DisFace3DNet. The training rows refer to trainable route parameters; some pretrained EfficientNet blocks remain frozen throughout. Final fusion fits only Wst, Wdy and b₀.</figcaption>
</figure>

#### The score accounting, condensed from Eqs. 7–11

```
Z_static  = (S_static  - mean_static)  / std_static
Z_dynamic = (S_dynamic - mean_dynamic) / std_dynamic
y_normalized = b0 + W_static * Z_static + W_dynamic * Z_dynamic
             = b_effective + sum(component_contributions)
y_rating = clip(1 + 4 * y_normalized, 1, 5)

# Means, standard deviations and fusion coefficients: inner-training only.
# Each contribution × 4 is in rating points before clipping.
```

## What I learned from the matched controls

The five-fold result is PCC 0.8904 ± 0.0063, with MAE 0.258 and RMSE 0.337 in Table I. FPEM predicts the overall rating more accurately. To measure the cost of the component design, I replaced only the seven readouts and additive fusion with a scalar head, keeping the inputs, encoders, conditioning and schedule. That control has just 224 fewer parameters. The additive model raises mean MAE by 0.0108 rating points, with a 95% CI of 0.0078 to 0.0138.

The component checks changed my reading of the training results. Without semantic guidance, expression correlation with the weak labels moves from 0.116 to −0.188 and pose from 0.212 to −0.022. With compute-matched staged training, expression-score standard deviation falls from 0.0190 to 0.0023 and the fitted dynamic coefficient from 0.0242 to 0.0034. A branch can remain in the architecture while contributing very little variation. These results support keeping joint training.

I selected λsem on validation results rather than on the test folds. Moving it from 0 to 0.2 improves alignment with weak labels for all seven components across five validation seeds. Larger weights help some components further, but reduce overall PCC and do not consistently help illumination. The selected value reflects that tradeoff.

The human comparison asked a different question. Twenty adults completed 103 trials each, including practice, component comparisons, repeats, separate overall comparisons and attention checks. They could answer “uncertain.” For shape, skin and hair, held-out component directions agreed with 676 of 960 definite responses: 70.4%, with a participant-clustered 95% CI of 67.1% to 73.7%. Counting uncertainty as nonagreement gives 676/1,200, or 56.3%. I keep both denominators visible because they describe different claims.

Expression was less convincing: 123 of 294 definite comparisons agreed, about 41.8%. Participants saw only the current photographs but had to judge which expression added more attractiveness relative to each face’s imagined neutral version. Interpersonal agreement was also lower. That result made the missing reference hard to ignore: the model had a reconstructed neutral face, while each observer had to imagine one. The disagreement therefore cannot be attributed to the model alone. Lighting, pose and background were not included in the formal human comparison.

After these comparisons, I became more precise about the word “explanation.” The seven terms account for a prediction, and some of their directions agree with human judgments under specified tasks. Neither result measures what would happen to a person’s impression if one facial component were changed in isolation. Keeping those claims separate helped me understand both the value of the decomposition and the limits of the experiment.

#### Matched diagnostics reported in the paper

| Change and diagnostic | Full model | Control |
| --- | --- | --- |
| No semantic guidance: expression ρ | 0.116 | −0.188 |
| No semantic guidance: pose ρ | 0.212 | −0.022 |
| Staged training: expression-score SD | 0.0190 | 0.0023 |
| Staged training: dynamic fusion coefficient | 0.0242 | 0.0034 |

Five-fold means from Supplement S3-C. Here ρ is the within-fold Spearman correlation with auxiliary weak labels, not agreement with human judgments.

## Tools, in context

<dl class="tools">
<div><dt>FFHQ-UV · Deep3DFaceRecon · HiFi3D++</dt><dd>Construct and cache neutral geometry, albedo, and illumination on a shared UV representation.</dd></div>
<div><dt>3DDFA-V3 · BiSeNet</dt><dd>Reconstruct expression and pose; segment the hair and background inputs.</dd></div>
<div><dt>PyTorch · EfficientNet-B0 · AdamW</dt><dd>Train the component encoders jointly, then freeze them for constrained fusion fitting.</dd></div>
</dl>
