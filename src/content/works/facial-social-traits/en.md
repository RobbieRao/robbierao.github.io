## The same trait name did not mean the same thing

The first organizing problem was that papers used the same trait names for different things. A geometric measurement, an observer’s trustworthiness rating and a model trained on mean ratings can all appear in one discussion. I gave perception, interpretation and prediction separate places in the review, then connected them through the stimulus and measurement that define the target.

For the interpretation section, I grouped methods by the operation they perform. A gradient map locates sensitivity; occlusion removes information; a generative edit changes an attribute. An eye-region highlight leaves shape, texture and lighting mixed together. An edit that also changes identity or image quality makes attribution difficult. This was more useful to me than arranging a list of visualization names: the reader can see what experiment a method actually permits.

I also kept the method map and the performance table separate. Figure 7 covers eight task objectives, including temporal prediction, few-shot learning, lightweight deployment and multimodal prediction. Table V is narrower: regression models evaluated on SCUT-FBP5500 with reported MAE, RMSE and PCC. A broad map helps find an approach; a numeric table needs a shared evaluation basis.

## A stimulus only makes sense beside its measurement

I organized stimulus formats by what each let a study vary. A 2D photograph is inexpensive and easy to standardize, but includes camera pose and lighting. Video retains the time course of expression and head motion. Reconstructed, scanned or synthesized 3D stimuli make depth and shape available; dynamic 3D adds controlled motion. This gave the comparison a concrete axis: which variable changed, and which variables the study actually held fixed.

<figure class="diagram">
<a href="/images/research/perception/facial-social-traits.webp"><img src="/images/research/perception/facial-social-traits.webp" alt="The review connects a model’s target back to the stimulus and the human measurement that produced it." width="1400" height="347" loading="lazy" decoding="async" /></a>
<figcaption>The review connects a model’s target back to the stimulus and the human measurement that produced it.</figcaption>
</figure>

The instrument table followed the same logic. Ratings define the judgment being modeled, eye tracking describes visual sampling, EEG resolves timing, and fMRI provides spatial activation information. In Table II, I placed those capabilities beside their costs. This also exposed overlap: adding an instrument does not necessarily add a new observation of the judgment process.

I kept processing steps close to the conclusions. Eye tracking needs calibration and checks for drift and missing samples before comparing fixation, saccades or areas of interest. EEG needs artifact removal and filtering before a temporal interpretation. Early structural encoding such as N170 and later evaluative responses such as LPP should not disappear into one generic “EEG evidence” label.

The comparison changed how I described a prediction result. A trustworthiness score records the impression of particular observers, under particular instructions, looking at particular stimuli. I kept those conditions attached to the target instead of treating the rating as an inherent property of the face. They remain part of the result even when the final predictor accepts only an image.

<figure class="diagram">
<a href="/images/figures/facial-social-traits-en.svg"><img src="/images/figures/facial-social-traits-en.svg" alt="Stimulus formats and measurement capabilities from the review. The instrument sketches illustrate measurement types; ratings, gaze, timing and activation location have different roles in the study." width="900" height="640" loading="lazy" decoding="async" /></a>
<figcaption>Stimulus formats and measurement capabilities from the review. The instrument sketches illustrate measurement types; ratings, gaze, timing and activation location have different roles in the study.</figcaption>
</figure>

## What belongs beside a benchmark score

I built the dataset comparison around stimulus format, size, demographic coverage, trait labels and measurement scales. Figure 4 shows examples from twelve datasets; Table III records their differences. SCUT-FBP5500 supplies attractiveness ratings, while other resources include trustworthiness, dominance, binary attributes or EEG-linked material. A dataset name alone does not specify the learning problem.

<figure class="diagram">
<a href="/images/research/perception/facial-social-traits-datasets.webp"><img src="/images/research/perception/facial-social-traits-datasets.webp" alt="Twelve dataset examples. Similar-looking portraits can differ in available traits, rating scales and observer coverage." width="1800" height="527" loading="lazy" decoding="async" /></a>
<figcaption>Twelve dataset examples. Similar-looking portraits can differ in available traits, rating scales and observer coverage.</figcaption>
</figure>

When placing model results together, I checked inputs, targets and protocols separately. Natural photographs and controlled 3D stimuli contain different variation. A binary attribute and a mean rating require different objectives. Shared identities or capture conditions across train and test also change what a result establishes. This was the reason for keeping the dataset and protocol comparison close to the performance table: a smaller error is only interpretable once the target and test conditions are clear.

I gave aggregation its own place in the comparison. Standardizing within each rater can reduce scale-use differences before averaging, but the resulting consensus still belongs to that observer group. Individual ratings permit other questions about disagreement, groups or the full distribution. Recording the aggregation rule beside the scale range made an easily missed distinction visible: one collection of responses can produce several different prediction targets.

#### A study-design reading grid

| Decision | What to inspect |
| --- | --- |
| Stimulus | Static or dynamic; natural image or 3D; changed and held-constant variables. |
| Response | Named trait, task instructions, scale and observer population. |
| Interpretation | Which facial feature is linked to which judgment, under which conditions. |
| Prediction | Target aggregation, held-out protocol, uncertainty and population coverage. |

## Two equal means can hide different judgments

The distinction I keep returning to is what averaging removes. Two faces can have the same mean score even if observers agree about one and sharply disagree about the other. Scalar regression treats those means alike. Distribution learning can preserve the difference; ranking retains relative order but does not by itself calibrate the score gap.

That is why I read MAE, RMSE and PCC together. They describe absolute error, sensitivity to large errors and correlation. Architecture adds another consideration: convolutions favor local receptive fields, while nonlocal attention and Transformers capture broader relationships such as symmetry. The Transformer and hybrid methods in the review also depend on augmentation and enough training material. Their performance needs to be read alongside the data and training cost.

Organizing the review made me notice how much of an impression is lost before modeling even begins. A static mean removes both disagreement between observers and change over time. Dynamic stimuli preserve part of that time course, but only measurements tied to the stimulus timing can describe it. The tables on stimuli, instruments and labels ended up answering different parts of the same question: what, exactly, survived into the prediction target?

## Tools, in context

<dl class="tools">
<div><dt>Stimulus and measurement comparison</dt><dd>Compare static/dynamic and 2D/3D stimuli alongside questionnaire, eye-tracking, EEG, and fMRI measurements.</dd></div>
<div><dt>Dataset and benchmark tables</dt><dd>Record label construction and population coverage; restrict numerical comparisons to a shared task and evaluation dataset.</dd></div>
</dl>
