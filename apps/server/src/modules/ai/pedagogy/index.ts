/**
 * 教学法知识库：内置的教学设计规则，作为 prompt 资产注入教学设计师 Agent。
 * 这是"课件能不能把控课堂节奏"的核心依据。
 */

export interface GradePedagogy {
  label: string;
  pageDensity: string;
  rhythmRule: string;
  languageStyle: string;
  interactionStyle: string;
}

export const GRADE_PEDAGOGY: Record<string, GradePedagogy> = {
  primary: {
    label: '小学',
    pageDensity: '一页只讲一个知识点，正文不超过 60 字，多用短句、图片和故事化表达',
    rhythmRule: '每 3-4 页必须安排一个互动点（提问/小游戏/测验），单次连续讲解不超过 3 页',
    languageStyle: '亲切活泼，多用"小朋友们""我们一起来"，例句贴近儿童生活',
    interactionStyle: '游戏化：开火车、摘苹果、猜猜看、同桌互说',
  },
  middle: {
    label: '初中',
    pageDensity: '一页 1-2 个知识点，正文不超过 120 字，概念需配示例',
    rhythmRule: '每 5-6 页一个互动点，练习环节要有分层任务（基础+提升）',
    languageStyle: '清晰准确，适当幽默，例子贴近校园生活与社会热点',
    interactionStyle: '探究式：小组讨论、正反方辨析、实验观察、情境代入',
  },
  high: {
    label: '高中',
    pageDensity: '信息密度可以提高，但一页聚焦一个核心逻辑链，突出推导过程',
    rhythmRule: '每 6-8 页一个互动点，重视变式训练与高考链接',
    languageStyle: '严谨简练，术语规范，强调逻辑与方法论',
    interactionStyle: '思辨式：问题链追问、一题多解、误区辨析、高考真题链接',
  },
  unknown: {
    label: '通用',
    pageDensity: '一页 1-2 个知识点，正文不超过 120 字',
    rhythmRule: '每 4-6 页一个互动点',
    languageStyle: '清晰准确，通俗易懂',
    interactionStyle: '提问、练习、讨论',
  },
};

/** 经典教学环节模型（五环节） */
export const PHASE_MODEL = {
  name: '经典五环节教学法',
  phases: [
    { phase: 'lead-in', label: '导入', guide: '用情境/故事/问题/复习旧知激发兴趣，1-2 页，时长约占 10%' },
    { phase: 'objectives', label: '目标呈现', guide: '明确本课学习目标，1 页，可并入导入' },
    { phase: 'teaching', label: '新授', guide: '核心知识讲解，占 40-50% 页数，知识按逻辑链分层递进' },
    { phase: 'practice', label: '巩固练习', guide: '练习与反馈，占 20% 页数，至少含 1 页测验互动' },
    { phase: 'summary', label: '总结', guide: '知识结构梳理，1-2 页' },
    { phase: 'homework', label: '作业拓展', guide: '分层作业与拓展任务，1 页' },
  ],
};

/** 学科教学法 */
export const SUBJECT_PEDAGOGY: Record<string, string> = {
  chinese: '语文教学法：朗读感知→品词析句→领悟写法→迁移运用。古诗词按"知作者→解诗题→读诗句→明诗意→悟诗情"展开。重视朗读设计与语言品味。',
  math: '数学教学法：情境导入→探究新知→归纳法则→变式练习。概念教学要"实例→抽象→定义→辨析"，计算教学要"算理→算法→练习"。突出推导过程而非结论。',
  english: '英语教学法：呈现(Presentation)→操练(Practice)→产出(Production)。词汇教学"音形义用"结合，对话教学创设情境，语法教学归纳法为主。',
  science: '理科教学法：提出问题→猜想假设→实验探究→得出结论→应用拓展。重视实验现象观察记录与科学思维方法。',
  history: '历史教学法：时空定位→史料实证→因果分析→以史鉴今。用时间轴建立框架，用史料培养证据意识。',
  geography: '地理教学法：地图先行→要素分析→人地关系→区域认知。图文结合，重视读图能力。',
  general: '通用教学法：激趣导入→新知讲解→巩固练习→总结拓展。逻辑清晰，讲练结合。',
};

export function gradePedagogyPrompt(gradeLevel: string): string {
  const g = GRADE_PEDAGOGY[gradeLevel] || GRADE_PEDAGOGY.unknown;
  return `【学段特征（${g.label}）】
- 信息密度：${g.pageDensity}
- 节奏规则：${g.rhythmRule}
- 语言风格：${g.languageStyle}
- 互动方式：${g.interactionStyle}`;
}

export function phaseModelPrompt(): string {
  return `【教学环节模型：${PHASE_MODEL.name}】
${PHASE_MODEL.phases.map((p) => `- ${p.phase}（${p.label}）：${p.guide}`).join('\n')}
要求：完整覆盖教学环节闭环；teaching 环节内部知识必须分层递进，不能简单堆砌。`;
}

export function subjectPedagogyPrompt(subject: string): string {
  return `【学科教学法】${SUBJECT_PEDAGOGY[subject] || SUBJECT_PEDAGOGY.general}`;
}
