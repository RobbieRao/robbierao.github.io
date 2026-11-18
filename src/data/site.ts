import type { Bi } from '@/i18n';

export const site = {
  url: 'https://robbierao.github.io',
  name: 'Robbie Fenggui Rao',
  shortName: 'Robbie Rao',
  nameZh: '饶柏',
  publicationName: 'Fenggui Rao',
  email: 'robbie.rao@connect.polyu.hk',
  phone: '+852 8403 2765',
  location: { en: 'Hong Kong', zh: '香港' } satisfies Bi,
  affiliation: {
    en: 'School of Design, The Hong Kong Polytechnic University',
    zh: '香港理工大学设计学院',
  } satisfies Bi,
  /**
   * Shown in the hero and footer. Set to null to hide.
   * Keep this truthful and current — it is the first thing a host lab or recruiter reads.
   */
  availability: {
    en: 'Open to visiting-research and research-internship opportunities',
    zh: '正在寻找访问研究与研究实习机会',
  } satisfies Bi as Bi | null,
  motto: { en: 'Looking for bugs in the world.', zh: '寻找世界的 bug。' } satisfies Bi,
  analyticsEndpoint: 'https://robbierao-visitor-analytics.fengguirao.workers.dev/collect',
  links: {
    scholar: null as string | null,
    github: 'https://github.com/RobbieRao',
    orcid: 'https://orcid.org/0009-0000-8990-1515',
    researchgate: 'https://www.researchgate.net/profile/Fenggui-Rao',
    aedLab: 'https://sd.polyu.edu.hk/aedlab',
    designAnything: 'https://designanything.design',
  },
} as const;

/** Homepage and <meta> copy. Edit here; both languages render from this file. */
export const copy = {
  title: {
    en: 'Robbie Fenggui Rao — faces, perception and human–AI interaction',
    zh: '饶柏 Robbie Fenggui Rao — 面孔、知觉与人机智能交互',
  },
  description: {
    en: 'Robbie Fenggui Rao (饶柏) is a designer and PhD candidate at PolyU Design. He builds controllable 3D faces, explainable models and human experiments to study how a face becomes a social impression.',
    zh: '饶柏（Robbie Fenggui Rao），设计师，香港理工大学设计学院博士候选人。以可控三维面孔、可解释模型与人类实验，研究一张脸如何变成一种社会印象。',
  },
  hero: {
    eyebrow: {
      en: 'Designer · PhD candidate, PolyU Design',
      zh: '设计师 · 香港理工大学设计学院博士候选人',
    },
    // The headline is split so the second line can be set in italic.
    headline: {
      en: ['How does a face', 'become an impression?'],
      zh: ['一张脸，', '如何变成一种印象？'],
    },
    intro: {
      en: 'I’m <strong>Robbie Fenggui Rao</strong> <span lang="zh-Hans">(饶柏)</span>. I build controllable 3D faces, explainable models and human experiments to measure how facial appearance and movement shape judgments of attractiveness, trustworthiness and dominance — and I design the interfaces where people and generative AI make things together.',
      zh: '我是<strong>饶柏</strong>（Robbie Fenggui Rao）。我用可控三维面孔、可解释模型与人类实验，测量面部外观与动态如何塑造吸引力、可信度与支配感等判断；同时设计人与生成式 AI 共同创作的界面。',
    },
    figure: {
      en: 'Fig. 0 — Self-portrait in scan lines; line weight is luminance.',
      zh: '图 0 — 扫描线构成的自画像，线宽即明度。',
    },
  },
  pointerInstruction: { en: ' Move the pointer to read it as relief.', zh: '移动指针，把它读成起伏。' },
  threads: {
    title: { en: 'What I work on', zh: '研究方向' },
    items: [
      {
        key: 'perception',
        label: { en: 'Social perception of faces', zh: '面孔的社会知觉' },
        body: {
          en: 'Which parts of a face — shape, skin, light, expression, motion — drive the impressions people form, and can a model’s account of that judgment be inspected rather than trusted? I work with controllable 3D stimuli, explainable machine learning and human experiments.',
          zh: '面孔的哪些成分——形状、皮肤、光照、表情、运动——驱动了人们形成的印象？模型对这种判断的解释，能否被逐项检查而不只是被相信？我结合可控三维刺激、可解释机器学习与人类实验来回答。',
        },
      },
      {
        key: 'interaction',
        label: { en: 'Human–AI co-creation', zh: '人与 AI 共创' },
        body: {
          en: 'Interfaces where generative models respond to context, bodies and places: a context-aware camera for image co-creation, in-situ mixed reality for citizen-led street design, and embodied installations for cultural heritage.',
          zh: '让生成模型回应情境、身体与场所的界面：感知情境的图像共创相机、面向市民街道设计的原位混合现实，以及文化遗产主题的具身装置。',
        },
      },
      {
        key: 'instrument',
        label: { en: 'Building the instrument', zh: '先把仪器造出来' },
        body: {
          en: 'Trained as a designer, I write the software, build the Unity/VR prototypes and wire the physical systems that turn a research question into a study that can actually be run.',
          zh: '设计出身，我自己写软件、搭 Unity/VR 原型、接硬件，把研究问题变成真正能跑起来的实验。',
        },
      },
    ],
    current: {
      label: { en: 'Current doctoral work · ongoing', zh: '当前博士研究 · 进行中' },
      questions: [
        {
          en: 'How do the geometry, amplitude and timing of facial movements shape social impressions?',
          zh: '面部运动的几何特征、幅度与时序如何塑造社会印象？',
        },
        {
          en: 'How do EEG responses relate to the perception of dynamic faces?',
          zh: 'EEG 反应与动态面孔知觉有何关联？',
        },
      ],
    },
  },
  about: {
    title: { en: 'About', zh: '关于' },
    body: {
      en: [
        'I trained as a designer at the <strong>China Academy of Art</strong> and am now a PhD candidate in the <a href="https://sd.polyu.edu.hk/aedlab">Asian Ergonomics Design Lab</a> at the School of Design, <strong>The Hong Kong Polytechnic University</strong>, supervised by Yan Tina Luximon. I passed my confirmation of registration in June 2026.',
        'My research asks how facial appearance and movement shape social impressions. I approach it as a builder: 3D face processing and parametric stimuli, deep-learning models whose predictions can be decomposed and checked, and human experiments — from behavioural ratings to the EEG studies of my ongoing doctoral work.',
        'Outside the lab I am a serial entrepreneur: I run <strong>Bizzle Tech</strong>, a company building AI-driven digital products and interactive systems, and co-initiated <a href="https://designanything.design">Design Anything Lab</a>, an AI art-and-design community of workshops, salons, exhibitions and project incubation. I review for ACM CHI and JCCE, mentor URIS undergraduate projects, and teach SD4410 as a teaching assistant, preparing my own materials and teaching in English.',
      ],
      zh: [
        '我在<strong>中国美术学院</strong>接受设计训练，现为<strong>香港理工大学</strong>设计学院<a href="https://sd.polyu.edu.hk/aedlab">亚洲人类工效学设计实验室（AED Lab）</a>博士候选人，导师为 Yan Tina Luximon，2026 年 6 月通过注册确认（CoR）答辩。',
        '我的研究关注面部外观与动态如何塑造社会印象。我以“动手做”的方式进入这个问题：三维面部处理与参数化刺激、预测可拆解可核查的深度学习模型，以及人类实验——从行为评分，到正在进行的博士课题中的 EEG 研究。',
        '实验室之外，我是连续创业者：经营 <strong>Bizzle Tech</strong>（杭州白昼网络科技有限公司），做 AI 驱动的数字产品；联合发起 <a href="https://designanything.design">Design Anything Lab</a>，一个涵盖工作坊、沙龙、展览与项目孵化的 AI 艺术设计社群。我担任 ACM CHI 与 JCCE 审稿人、URIS 本科研究项目导师，并在 SD4410 课程任教学助理，独立准备课件并以英语授课。',
      ],
    },
  },
  contact: {
    title: { en: 'Let’s compare notes.', zh: '一起聊聊新的想法。' },
    body: {
      en: 'Research, design, and the questions in between. I read every email.',
      zh: '研究、设计，以及两者之间的问题。每封邮件我都会读。',
    },
  },
} as const;
