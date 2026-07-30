/**
 * 组件面板的默认内容工厂。
 * - makeDefaultBlock：按 BLOCK_CATALOG 的 SlotDef 生成有意义的示例槽位内容
 * - makeDefaultInteractive：7 种课堂互动组件的示例 config
 * - makeBlockElement / makeInteractiveElement：包装成可插入画布的完整 Element
 *   （crypto.randomUUID、淡入入场动画、interactions: []）
 */
import type { Element, SlotDef } from '@courseware/shared';
import { getBlockDef } from '@courseware/shared';

/** 画布内容区（1280×720 画布，四周 40px 内边距） */
export const CONTENT_AREA = { x: 40, y: 40, width: 1200, height: 640 } as const;

const newId = (): string => crypto.randomUUID();

/** 统一的淡入入场动画 */
function fadeInEntrance(): Element['animation']['entrance'][number] {
  return {
    id: newId(),
    type: 'fade' as const,
    duration: 0.6,
    delay: 0,
    easing: 'power2.out' as const,
    trigger: 'auto' as const,
  };
}

/* ------------------------------------------------------------------ */
/* Block 槽位默认值                                                    */
/* ------------------------------------------------------------------ */

/** 按槽位类型生成有意义的默认内容 */
function defaultSlotValue(slot: SlotDef): unknown {
  switch (slot.type) {
    case 'text':
      return '点击编辑标题';
    case 'richtext':
      return '点击编辑内容…';
    case 'list':
      return ['要点一', '要点二'];
    case 'image':
      return { description: '示例配图描述' };
    case 'table':
      return {
        headers: ['项目', '说明'],
        rows: [
          ['示例一', '内容一'],
          ['示例二', '内容二'],
          ['示例三', '内容三'],
        ],
      };
    case 'steps':
      return [
        { title: '第一步', detail: '点击编辑本步的详细说明' },
        { title: '第二步', detail: '点击编辑本步的详细说明' },
        { title: '第三步', detail: '点击编辑本步的详细说明' },
      ];
    case 'pairs':
      return [
        { left: '概念甲', right: '点击编辑说明' },
        { left: '概念乙', right: '点击编辑说明' },
        { left: '概念丙', right: '点击编辑说明' },
      ];
    case 'events':
      return [
        { time: '1900年', event: '事件一', detail: '点击编辑事件详情' },
        { time: '1950年', event: '事件二', detail: '点击编辑事件详情' },
        { time: '2000年', event: '事件三', detail: '点击编辑事件详情' },
      ];
    case 'words':
      return [
        { word: 'apple', phonetic: '/ˈæpl/', meaning: '苹果', example: 'I eat an apple every day.' },
        { word: 'book', phonetic: '/bʊk/', meaning: '书', example: 'This is my favorite book.' },
      ];
    case 'dialogue':
      return [
        { speaker: 'A', text: 'Hello! How are you?', translation: '你好！你好吗？' },
        { speaker: 'B', text: "I'm fine, thank you.", translation: '我很好，谢谢。' },
      ];
    case 'quiz':
      return {
        question: '示例：中国的首都是哪里？',
        type: 'single-choice',
        options: [
          { text: '上海', isCorrect: false },
          { text: '北京', isCorrect: true },
          { text: '广州', isCorrect: false },
          { text: '深圳', isCorrect: false },
        ],
        correctAnswer: 'B',
        explanation: '北京是中华人民共和国的首都。',
      };
    case 'poem':
      return {
        title: '静夜思',
        author: '李白',
        dynasty: '唐',
        lines: ['床前明月光', '疑是地上霜', '举头望明月', '低头思故乡'],
        translation:
          '明亮的月光洒在床前，仿佛地上泛起一层白霜；抬头望着天上的明月，低头思念远方的故乡。',
        appreciation:
          '全诗以"月"为线索，借景抒情，语言清新朴素而韵味含蓄无穷，是千古传诵的思乡名篇。',
      };
    case 'experiment':
      return {
        name: '观察水的沸腾',
        materials: ['烧杯', '酒精灯', '温度计', '铁架台'],
        steps: [
          { title: '组装器材', detail: '将烧杯置于铁架台上，加入适量清水。' },
          { title: '加热观察', detail: '用酒精灯加热，观察水中气泡的变化。' },
          { title: '记录温度', detail: '水沸腾时读取并记录温度计的示数。' },
        ],
        observation: '加热过程中气泡逐渐增多、变大，沸腾时温度保持不变。',
        conclusion: '水在标准大气压下沸腾时温度约为 100℃，沸腾过程中持续吸热但温度不变。',
      };
    default:
      return '';
  }
}

export interface DefaultBlockContent {
  variant: string;
  slots: Record<string, unknown>;
  emphasis: string[];
}

/** 生成 block 元素的默认 content（variant 取目录中第一个变体） */
export function makeDefaultBlock(blockType: string): DefaultBlockContent {
  const def = getBlockDef(blockType);
  const slots: Record<string, unknown> = {};
  def?.slots.forEach((slot) => {
    slots[slot.key] = defaultSlotValue(slot);
  });
  return {
    variant: def?.variants[0]?.id ?? 'default',
    slots,
    emphasis: [],
  };
}

/* ------------------------------------------------------------------ */
/* 互动组件默认 config                                                  */
/* ------------------------------------------------------------------ */

export function makeDefaultInteractive(interactiveType: string): Record<string, unknown> {
  switch (interactiveType) {
    case 'matching':
      return {
        title: '连线题',
        pairs: [
          { id: 'pair-1', left: '苹果', right: 'apple' },
          { id: 'pair-2', left: '香蕉', right: 'banana' },
          { id: 'pair-3', left: '橙子', right: 'orange' },
        ],
      };
    case 'categorize':
      return {
        title: '拖拽分类',
        categories: [
          { id: 'cat-1', name: '水果' },
          { id: 'cat-2', name: '动物' },
        ],
        items: [
          { id: 'item-1', text: '苹果', categoryId: 'cat-1' },
          { id: 'item-2', text: '香蕉', categoryId: 'cat-1' },
          { id: 'item-3', text: '小狗', categoryId: 'cat-2' },
          { id: 'item-4', text: '小猫', categoryId: 'cat-2' },
        ],
      };
    case 'ordering':
      return {
        title: '排序挑战',
        items: [
          { id: 'step-1', text: '第一步：审题' },
          { id: 'step-2', text: '第二步：分析' },
          { id: 'step-3', text: '第三步：解答' },
          { id: 'step-4', text: '第四步：检查' },
        ],
        correctOrder: ['step-1', 'step-2', 'step-3', 'step-4'],
      };
    case 'timer':
      return { label: '课堂计时', seconds: 300, autoStart: false };
    case 'scoreboard':
      return {
        title: '小组计分',
        teams: [
          { id: 'team-1', name: '第一组' },
          { id: 'team-2', name: '第二组' },
          { id: 'team-3', name: '第三组' },
          { id: 'team-4', name: '第四组' },
        ],
      };
    case 'picker':
      return {
        title: '随机点名',
        names: ['小明', '小红', '小刚', '小丽', '小华', '小芳'],
      };
    case 'card-flip':
      return {
        title: '翻翻卡',
        cards: [
          { id: 'card-1', front: '问题一', back: '答案一' },
          { id: 'card-2', front: '问题二', back: '答案二' },
          { id: 'card-3', front: '问题三', back: '答案三' },
          { id: 'card-4', front: '问题四', back: '答案四' },
        ],
      };
    default:
      return {};
  }
}

/* ------------------------------------------------------------------ */
/* 完整 Element 包装                                                    */
/* ------------------------------------------------------------------ */

/** 包装成完整 block 元素；geometry 缺省占满内容区 */
export function makeBlockElement(
  blockType: string,
  geometry?: Partial<Element['geometry']>,
): Element {
  const def = getBlockDef(blockType);
  return {
    id: newId(),
    type: 'block',
    name: def?.name ?? blockType,
    geometry: { zIndex: 1, ...CONTENT_AREA, ...geometry },
    content: { blockType, ...makeDefaultBlock(blockType) },
    style: {},
    animation: { entrance: [fadeInEntrance()], exit: [] },
    interactions: [],
  };
}

/** 包装成完整 interactive 元素；geometry 缺省占满内容区 */
export function makeInteractiveElement(
  interactiveType: string,
  geometry?: Partial<Element['geometry']>,
  name?: string,
): Element {
  return {
    id: newId(),
    type: 'interactive',
    name: name ?? interactiveType,
    geometry: { zIndex: 1, ...CONTENT_AREA, ...geometry },
    content: { interactiveType, config: makeDefaultInteractive(interactiveType) },
    style: {},
    animation: { entrance: [fadeInEntrance()], exit: [] },
    interactions: [],
  };
}
