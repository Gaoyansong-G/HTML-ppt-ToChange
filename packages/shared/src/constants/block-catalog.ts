/**
 * Block 组件目录：前后端共享的版式契约。
 * - 后端：生成 prompt（告诉 LLM 有哪些版式可"选"）
 * - 前端：渲染器注册表 key、编辑器槽位表单、组件面板
 * - 布局引擎：region 决定 Block 在页面中的占位方式
 */

export type SlotType =
  | 'text'       // 单行文本
  | 'richtext'   // 多行文本
  | 'list'       // string[]
  | 'image'      // { assetId?, alt?, description? }
  | 'table'      // TableSlot
  | 'steps'      // StepSlot[]
  | 'pairs'      // PairSlot[]
  | 'events'     // TimelineEventSlot[]
  | 'words'      // VocabWordSlot[]
  | 'dialogue'   // DialogueTurnSlot[]
  | 'quiz'       // QuizSlot
  | 'poem'       // PoemSlot
  | 'experiment';// ExperimentSlot

export interface SlotDef {
  key: string;
  type: SlotType;
  label: string;
  required?: boolean;
  maxItems?: number;   // list 类槽位条目上限（溢出控制）
}

export type BlockRegion =
  | 'full'        // 独占页面主体
  | 'header'      // 页首条带
  | 'footer'      // 页尾条带
  | 'half'        // 半页（与同排 block 平分）
  | 'main';       // 页面主体（默认，可与其他 main/half 纵向堆叠）

export interface BlockDef {
  blockType: string;
  name: string;
  category: 'opening' | 'explain' | 'chinese' | 'math' | 'english' | 'science' | 'humanity' | 'interactive' | 'closing';
  description: string;          // 给 LLM 的使用场景说明
  slots: SlotDef[];
  variants: { id: string; label: string }[];
  region: BlockRegion;
  minHeightRatio?: number;      // 占页面主体高度的最小比例
}

export const BLOCK_CATALOG: BlockDef[] = [
  /* ---------- 开篇 ---------- */
  {
    blockType: 'cover', name: '封面页', category: 'opening', region: 'full',
    description: '课件封面。全课件仅首页使用一次。',
    slots: [
      { key: 'title', type: 'text', label: '主标题', required: true },
      { key: 'subtitle', type: 'text', label: '副标题' },
      { key: 'info', type: 'text', label: '信息行（年级/学科/教师）' },
      { key: 'image', type: 'image', label: '封面配图' },
    ],
    variants: [
      { id: 'center', label: '居中' },
      { id: 'left', label: '左对齐带图' },
    ],
  },
  {
    blockType: 'toc', name: '目录页', category: 'opening', region: 'full',
    description: '目录/学习导航，条目对应后续章节。',
    slots: [
      { key: 'title', type: 'text', label: '标题', required: true },
      { key: 'items', type: 'list', label: '目录条目', required: true, maxItems: 6 },
    ],
    variants: [{ id: 'numbered', label: '编号式' }, { id: 'cards', label: '卡片式' }],
  },
  {
    blockType: 'section-header', name: '章节过渡页', category: 'opening', region: 'full',
    description: '大章节之间的过渡页，仅有标题与简述。',
    slots: [
      { key: 'title', type: 'text', label: '章节标题', required: true },
      { key: 'subtitle', type: 'text', label: '章节简述' },
      { key: 'index', type: 'text', label: '章节序号（如 01）' },
    ],
    variants: [{ id: 'center', label: '居中' }, { id: 'band', label: '横带式' }],
  },
  {
    blockType: 'objectives', name: '学习目标卡', category: 'opening', region: 'full',
    description: '呈现本课学习目标，通常紧随封面/导入。',
    slots: [
      { key: 'title', type: 'text', label: '标题', required: true },
      { key: 'items', type: 'list', label: '目标条目', required: true, maxItems: 4 },
    ],
    variants: [{ id: 'cards', label: '卡片式' }, { id: 'list', label: '清单式' }],
  },

  /* ---------- 讲解 ---------- */
  {
    blockType: 'title-content', name: '标题要点页', category: 'explain', region: 'full',
    description: '最通用的讲解页：一个标题 + 若干要点。',
    slots: [
      { key: 'title', type: 'text', label: '标题', required: true },
      { key: 'points', type: 'list', label: '要点', required: true, maxItems: 6 },
      { key: 'note', type: 'richtext', label: '补充说明' },
    ],
    variants: [{ id: 'default', label: '标准' }, { id: 'numbered', label: '编号徽章' }],
  },
  {
    blockType: 'text-image', name: '图文页', category: 'explain', region: 'full',
    description: '文字与配图并列，适合概念+示意、原文+插图。',
    slots: [
      { key: 'title', type: 'text', label: '标题', required: true },
      { key: 'text', type: 'richtext', label: '正文', required: true },
      { key: 'image', type: 'image', label: '配图', required: true },
      { key: 'caption', type: 'text', label: '图注' },
    ],
    variants: [
      { id: 'text-left', label: '左文右图' },
      { id: 'text-right', label: '右文左图' },
      { id: 'text-top', label: '上文下图' },
    ],
  },
  {
    blockType: 'image-focus', name: '大图赏析页', category: 'explain', region: 'full',
    description: '以大图为主体，配少量说明文字。地图/实物/场景图适用。',
    slots: [
      { key: 'image', type: 'image', label: '主图', required: true },
      { key: 'title', type: 'text', label: '标题' },
      { key: 'note', type: 'richtext', label: '说明' },
    ],
    variants: [{ id: 'default', label: '标准' }, { id: 'overlay', label: '文字叠加' }],
  },
  {
    blockType: 'quote', name: '金句页', category: 'explain', region: 'full',
    description: '突出展示一句名言/核心观点/课文金句。',
    slots: [
      { key: 'quote', type: 'richtext', label: '金句', required: true },
      { key: 'source', type: 'text', label: '出处' },
    ],
    variants: [{ id: 'center', label: '居中大字' }, { id: 'card', label: '卡片式' }],
  },
  {
    blockType: 'concept', name: '概念定义卡', category: 'explain', region: 'full',
    description: '讲解一个核心概念：术语 + 定义 + 示例 + 提示。',
    slots: [
      { key: 'term', type: 'text', label: '术语', required: true },
      { key: 'definition', type: 'richtext', label: '定义', required: true },
      { key: 'example', type: 'richtext', label: '示例' },
      { key: 'tip', type: 'text', label: '易错提示' },
    ],
    variants: [{ id: 'card', label: '卡片' }, { id: 'split', label: '左右分栏' }],
  },
  {
    blockType: 'steps', name: '步骤流程条', category: 'explain', region: 'full',
    description: '有序步骤/流程/推导过程。',
    slots: [
      { key: 'title', type: 'text', label: '标题', required: true },
      { key: 'steps', type: 'steps', label: '步骤', required: true, maxItems: 6 },
    ],
    variants: [{ id: 'vertical', label: '纵向' }, { id: 'horizontal', label: '横向' }],
  },
  {
    blockType: 'compare', name: '对比双栏', category: 'explain', region: 'full',
    description: '两个概念/事物/观点的对比。',
    slots: [
      { key: 'title', type: 'text', label: '标题' },
      { key: 'leftTitle', type: 'text', label: '左栏标题', required: true },
      { key: 'rightTitle', type: 'text', label: '右栏标题', required: true },
      { key: 'pairs', type: 'pairs', label: '对比项', required: true, maxItems: 5 },
    ],
    variants: [{ id: 'columns', label: '双栏' }, { id: 'vs', label: 'VS 对抗式' }],
  },
  {
    blockType: 'table', name: '表格页', category: 'explain', region: 'full',
    description: '结构化数据/知识归纳表格。',
    slots: [
      { key: 'title', type: 'text', label: '标题', required: true },
      { key: 'table', type: 'table', label: '表格', required: true },
      { key: 'note', type: 'text', label: '表下注释' },
    ],
    variants: [{ id: 'striped', label: '斑马纹' }, { id: 'bordered', label: '全边框' }],
  },

  /* ---------- 语文 ---------- */
  {
    blockType: 'poem', name: '古诗词赏析页', category: 'chinese', region: 'full',
    description: '古诗词教学：诗句 + 译文 + 赏析 + 作者信息。',
    slots: [{ key: 'poem', type: 'poem', label: '诗词内容', required: true }],
    variants: [{ id: 'classic', label: '经典米纸' }, { id: 'ink', label: '水墨风' }],
  },
  {
    blockType: 'reading', name: '阅读理解页', category: 'chinese', region: 'full',
    description: '现代文阅读：左侧原文摘录，右侧赏析/思考问题。',
    slots: [
      { key: 'title', type: 'text', label: '标题', required: true },
      { key: 'excerpt', type: 'richtext', label: '原文摘录', required: true },
      { key: 'questions', type: 'list', label: '思考问题', required: true, maxItems: 4 },
    ],
    variants: [{ id: 'split', label: '左右分栏' }, { id: 'stack', label: '上下堆叠' }],
  },

  /* ---------- 数学 ---------- */
  {
    blockType: 'formula-card', name: '公式定理框', category: 'math', region: 'full',
    description: '定理/公式/法则的呈现与解读。formula 槽位填 LaTeX。',
    slots: [
      { key: 'title', type: 'text', label: '名称', required: true },
      { key: 'formula', type: 'text', label: '公式（LaTeX）', required: true },
      { key: 'explanation', type: 'richtext', label: '解读' },
      { key: 'example', type: 'richtext', label: '例题' },
    ],
    variants: [{ id: 'card', label: '卡片' }, { id: 'banner', label: '横幅' }],
  },
  {
    blockType: 'worked-example', name: '例题讲解页', category: 'math', region: 'full',
    description: '例题 + 分步解答过程。',
    slots: [
      { key: 'problem', type: 'richtext', label: '题目', required: true },
      { key: 'steps', type: 'steps', label: '解答步骤', required: true, maxItems: 6 },
      { key: 'answer', type: 'text', label: '最终答案' },
    ],
    variants: [{ id: 'split', label: '左题右解' }, { id: 'stack', label: '上题下解' }],
  },

  /* ---------- 英语 ---------- */
  {
    blockType: 'vocab-cards', name: '词汇卡片墙', category: 'english', region: 'full',
    description: '单词/短语卡片阵列，含音标、释义、例句。',
    slots: [
      { key: 'title', type: 'text', label: '标题' },
      { key: 'words', type: 'words', label: '单词', required: true, maxItems: 6 },
    ],
    variants: [{ id: 'grid2', label: '2×N 网格' }, { id: 'grid3', label: '3×N 网格' }],
  },
  {
    blockType: 'dialogue', name: '对话气泡页', category: 'english', region: 'full',
    description: '情景对话：交替气泡呈现，可带中文翻译。',
    slots: [
      { key: 'title', type: 'text', label: '场景标题' },
      { key: 'turns', type: 'dialogue', label: '对话', required: true, maxItems: 8 },
    ],
    variants: [{ id: 'bubbles', label: '气泡式' }, { id: 'script', label: '剧本式' }],
  },

  /* ---------- 理科 ---------- */
  {
    blockType: 'experiment', name: '实验探究页', category: 'science', region: 'full',
    description: '科学实验：器材 + 步骤 + 观察记录 + 结论。',
    slots: [{ key: 'experiment', type: 'experiment', label: '实验内容', required: true }],
    variants: [{ id: 'default', label: '标准' }, { id: 'compact', label: '紧凑' }],
  },
  {
    blockType: 'data-chart', name: '数据图表页', category: 'science', region: 'full',
    description: '数据表格 + 结论卡（图表以表格形式呈现数据）。',
    slots: [
      { key: 'title', type: 'text', label: '标题', required: true },
      { key: 'table', type: 'table', label: '数据表', required: true },
      { key: 'conclusion', type: 'richtext', label: '结论' },
    ],
    variants: [{ id: 'default', label: '标准' }],
  },

  /* ---------- 文科 ---------- */
  {
    blockType: 'timeline', name: '历史时间轴', category: 'humanity', region: 'full',
    description: '时间轴：事件沿时间线上下交替排布。',
    slots: [
      { key: 'title', type: 'text', label: '标题', required: true },
      { key: 'events', type: 'events', label: '事件', required: true, maxItems: 6 },
    ],
    variants: [{ id: 'horizontal', label: '横向' }, { id: 'vertical', label: '纵向' }],
  },
  {
    blockType: 'mindmap', name: '知识结构图', category: 'humanity', region: 'full',
    description: '中心主题 + 分支要点的放射式结构图。',
    slots: [
      { key: 'center', type: 'text', label: '中心主题', required: true },
      { key: 'branches', type: 'pairs', label: '分支（left=分支名 right=说明）', required: true, maxItems: 6 },
    ],
    variants: [{ id: 'radial', label: '放射式' }, { id: 'tree', label: '树状式' }],
  },

  /* ---------- 互动 ---------- */
  {
    blockType: 'quiz', name: '课堂测验页', category: 'interactive', region: 'full',
    description: '课堂即时测验：选择/填空/揭示答案。每个练习环节至少一页。',
    slots: [
      { key: 'title', type: 'text', label: '标题' },
      { key: 'quiz', type: 'quiz', label: '题目', required: true },
    ],
    variants: [{ id: 'card', label: '卡片式' }, { id: 'full', label: '整页式' }],
  },
  {
    blockType: 'discussion', name: '讨论任务页', category: 'interactive', region: 'full',
    description: '小组讨论/探究任务：问题 + 要求 + 提示。',
    slots: [
      { key: 'question', type: 'richtext', label: '讨论问题', required: true },
      { key: 'requirements', type: 'list', label: '任务要求', maxItems: 4 },
      { key: 'hint', type: 'text', label: '提示' },
      { key: 'time', type: 'text', label: '建议时长（如 5分钟）' },
    ],
    variants: [{ id: 'card', label: '卡片' }, { id: 'poster', label: '海报式' }],
  },

  /* ---------- 收尾 ---------- */
  {
    blockType: 'summary', name: '总结回顾页', category: 'closing', region: 'full',
    description: '本课知识要点总结。',
    slots: [
      { key: 'title', type: 'text', label: '标题', required: true },
      { key: 'points', type: 'list', label: '要点回顾', required: true, maxItems: 6 },
      { key: 'takeaway', type: 'text', label: '一句话收获' },
    ],
    variants: [{ id: 'cards', label: '卡片式' }, { id: 'list', label: '清单式' }],
  },
  {
    blockType: 'homework', name: '作业布置页', category: 'closing', region: 'full',
    description: '课后作业与拓展任务。',
    slots: [
      { key: 'title', type: 'text', label: '标题', required: true },
      { key: 'items', type: 'list', label: '作业条目', required: true, maxItems: 5 },
      { key: 'extension', type: 'richtext', label: '拓展挑战' },
    ],
    variants: [{ id: 'list', label: '清单' }, { id: 'ticket', label: '任务卡' }],
  },
];

export const BLOCK_MAP: Record<string, BlockDef> = Object.fromEntries(
  BLOCK_CATALOG.map((b) => [b.blockType, b]),
);

export function getBlockDef(blockType: string): BlockDef | undefined {
  return BLOCK_MAP[blockType];
}

/** 生成给 LLM 的版式目录摘要（prompt 用） */
export function blockCatalogPrompt(): string {
  return BLOCK_CATALOG.map(
    (b) =>
      `- ${b.blockType}（${b.name}）：${b.description}\n  槽位：${b.slots
        .map((s) => `${s.key}<${s.type}>${s.required ? '*' : ''}${s.maxItems ? `(≤${s.maxItems}条)` : ''}`)
        .join('，')}；变体：${b.variants.map((v) => v.id).join('/')}`,
  ).join('\n');
}
