import type { Element } from '@courseware/shared';
import { DEFAULT_SLIDE_SIZE } from '@courseware/shared';

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const CENTER_X = DEFAULT_SLIDE_SIZE.width / 2;
const CENTER_Y = DEFAULT_SLIDE_SIZE.height / 2;

export const USER_ELEMENT_Z_INDEX_MIN = 1;
export const USER_ELEMENT_Z_INDEX_MAX = 999;

export function clampElementZIndex(value: number | undefined): number {
  const finiteValue = typeof value === 'number' && Number.isFinite(value)
    ? Math.round(value)
    : USER_ELEMENT_Z_INDEX_MIN;
  return Math.max(
    USER_ELEMENT_Z_INDEX_MIN,
    Math.min(USER_ELEMENT_Z_INDEX_MAX, finiteValue),
  );
}

const PALETTE = {
  text: {
    title: '#1a1a2e',
    subtitle: '#4a4a68',
    body: '#334155',
  },
  shape: {
    fill: '#6366f1',
    stroke: '#4f46e5',
  },
  quiz: {
    background: '#f0f9ff',
    border: '#e0f2fe',
  },
  shadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
};

export interface FactoryOverrides {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

function baseElement(overrides: FactoryOverrides = {}): Pick<
  Element,
  'id' | 'geometry' | 'style' | 'animation' | 'interactions'
> {
  const width = overrides.width ?? 200;
  const height = overrides.height ?? 100;
  return {
    id: generateId('el'),
    geometry: {
      x: (overrides.x ?? CENTER_X) - width / 2,
      y: (overrides.y ?? CENTER_Y) - height / 2,
      width,
      height,
      zIndex: 1,
    },
    style: {},
    animation: {
      entrance: [
        {
          id: generateId('anim'),
          type: 'fade',
          duration: 0.5,
          delay: 0,
          easing: 'power2.out',
          trigger: 'auto',
        },
      ],
      exit: [],
    },
    interactions: [],
  };
}

export function createTextElement(text = '双击编辑文本', overrides: FactoryOverrides = {}): Element {
  const width = overrides.width ?? 400;
  const height = overrides.height ?? 80;
  return {
    ...baseElement({ ...overrides, width, height }),
    type: 'text',
    semanticRole: 'body',
    name: '文本',
    content: {
      text,
      html: false,
    },
    style: {
      color: PALETTE.text.body,
      fontSize: 20,
      fontFamily: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
      fontWeight: 400,
      lineHeight: 1.6,
      textAlign: 'left',
      padding: 8,
    },
  };
}

export function createShapeElement(
  shapeType: 'rectangle' | 'circle' | 'triangle' | 'arrow' | 'line' | 'star' | 'callout' = 'rectangle',
  overrides: FactoryOverrides = {},
): Element {
  const width = overrides.width ?? 160;
  const height = overrides.height ?? 160;
  return {
    ...baseElement({ ...overrides, width, height }),
    type: 'shape',
    semanticRole: 'example',
    name: '形状',
    content: {
      shapeType,
      fill: PALETTE.shape.fill,
      stroke: PALETTE.shape.stroke,
      strokeWidth: 2,
    },
    style: {
      opacity: 1,
      borderRadius: shapeType === 'rectangle' ? 8 : 0,
      shadow: PALETTE.shadow,
    },
  };
}

export function createImageElement(assetId = '', overrides: FactoryOverrides = {}): Element {
  const width = overrides.width ?? 320;
  const height = overrides.height ?? 240;
  return {
    ...baseElement({ ...overrides, width, height }),
    type: 'image',
    semanticRole: 'caption',
    name: '图片',
    content: {
      assetId,
      alt: '图片',
      objectFit: 'contain',
    },
    style: {
      borderRadius: 12,
      shadow: PALETTE.shadow,
    },
  };
}

export function createQuizElement(
  quizType: 'single-choice' | 'multiple-choice' | 'fill-blank' | 'reveal' | 'drag-drop' = 'single-choice',
  overrides: FactoryOverrides = {},
): Element {
  const width = overrides.width ?? 560;
  const height = overrides.height ?? 320;
  return {
    ...baseElement({ ...overrides, width, height }),
    type: 'quiz',
    semanticRole: 'quiz',
    name: '测验',
    content: {
      type: quizType,
      question: quizType === 'fill-blank' ? '请填写正确答案：____' : '请选择正确答案',
      options:
        quizType === 'fill-blank'
          ? undefined
          : [
              { id: 'opt-0', text: '选项 A', isCorrect: true },
              { id: 'opt-1', text: '选项 B', isCorrect: false },
              { id: 'opt-2', text: '选项 C', isCorrect: false },
            ],
      correctAnswer: quizType === 'fill-blank' ? '答案' : 'opt-0',
      explanation: '这是答案解析。',
      allowRetry: true,
    },
    style: {
      color: PALETTE.text.body,
      fontSize: 18,
      backgroundColor: PALETTE.quiz.background,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: PALETTE.quiz.border,
      borderStyle: 'solid',
      padding: 20,
      shadow: PALETTE.shadow,
    },
  };
}

export function createButtonElement(
  text = '点击这里',
  overrides: FactoryOverrides = {},
): Element {
  const element = createTextElement(text, {
    width: 220,
    height: 64,
    ...overrides,
  });
  return {
    ...element,
    semanticRole: 'option',
    name: '交互按钮',
    style: {
      color: '#ffffff',
      backgroundColor: '#2563eb',
      fontSize: 20,
      fontWeight: 600,
      lineHeight: 1.2,
      textAlign: 'center',
      borderRadius: 14,
      padding: 20,
      shadow: '0 8px 18px -8px rgba(37,99,235,0.7)',
    },
  };
}

export function createFormulaElement(overrides: FactoryOverrides = {}): Element {
  const width = overrides.width ?? 440;
  const height = overrides.height ?? 140;
  return {
    ...baseElement({ ...overrides, width, height }),
    type: 'formula',
    semanticRole: 'example',
    name: '数学公式',
    content: {
      latex: String.raw`\frac{-b\pm\sqrt{b^2-4ac}}{2a}`,
      displayMode: true,
    },
    style: {
      color: PALETTE.text.body,
      backgroundColor: '#ffffff',
      fontSize: 28,
      borderRadius: 12,
      padding: 16,
      shadow: PALETTE.shadow,
    },
  };
}

export function createDiagramElement(overrides: FactoryOverrides = {}): Element {
  const width = overrides.width ?? 560;
  const height = overrides.height ?? 320;
  return {
    ...baseElement({ ...overrides, width, height }),
    type: 'diagram',
    semanticRole: 'example',
    name: '流程图',
    content: {
      type: 'mermaid',
      definition: 'flowchart LR\n  A[开始] --> B[讲解]\n  B --> C[练习]',
    },
    style: {
      backgroundColor: '#ffffff',
      borderRadius: 12,
      padding: 12,
      shadow: PALETTE.shadow,
    },
  };
}

export function createTitleElement(text = '标题', overrides: FactoryOverrides = {}): Element {
  return {
    ...createTextElement(text, { width: 720, height: 90, ...overrides }),
    semanticRole: 'title',
    name: '标题',
    style: {
      color: PALETTE.text.title,
      fontSize: 48,
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: -0.02,
      textAlign: 'center',
      padding: 8,
    },
  };
}

export function createSubtitleElement(text = '副标题', overrides: FactoryOverrides = {}): Element {
  return {
    ...createTextElement(text, { width: 600, height: 56, ...overrides }),
    semanticRole: 'subtitle',
    name: '副标题',
    style: {
      color: PALETTE.text.subtitle,
      fontSize: 24,
      fontWeight: 400,
      lineHeight: 1.4,
      textAlign: 'center',
      padding: 8,
    },
  };
}

export function createBodyTextElement(text = '正文内容', overrides: FactoryOverrides = {}): Element {
  return {
    ...createTextElement(text, { width: 720, height: 140, ...overrides }),
    semanticRole: 'body',
    name: '正文',
    style: {
      color: PALETTE.text.body,
      fontSize: 20,
      fontWeight: 400,
      lineHeight: 1.7,
      padding: 8,
    },
  };
}

function groupChildren(element: Element): Element[] {
  if (element.type !== 'group') return [];
  const children = (element.content as { children?: unknown }).children;
  return Array.isArray(children) ? (children as Element[]) : [];
}

export function normalizeElementZIndices(elements: Element[]): void {
  elements.forEach((element) => {
    element.geometry.zIndex = clampElementZIndex(element.geometry.zIndex);
    normalizeElementZIndices(groupChildren(element));
  });
}

function collectElementIds(element: Element, ids: Map<string, string>) {
  ids.set(element.id, generateId('el'));
  groupChildren(element).forEach((child) => collectElementIds(child, ids));
}

function refreshClonedElementIds(element: Element, ids: Map<string, string>) {
  const replacement = ids.get(element.id);
  if (replacement) element.id = replacement;
  element.animation?.entrance?.forEach((step) => {
    step.id = generateId('anim');
  });
  element.animation?.exit?.forEach((step) => {
    step.id = generateId('anim');
  });
  groupChildren(element).forEach((child) => refreshClonedElementIds(child, ids));
}

export function remapElementTargetIds<T>(value: T, ids: Map<string, string>): T {
  const visit = (item: unknown, fieldName?: string): unknown => {
    if (typeof item === 'string') {
      return fieldName === 'targetId' ? ids.get(item) ?? item : item;
    }
    if (Array.isArray(item)) return item.map((entry) => visit(entry, fieldName));
    if (!item || typeof item !== 'object') return item;
    return Object.fromEntries(
      Object.entries(item as Record<string, unknown>).map(([key, entry]) => [
        key,
        visit(entry, key),
      ]),
    );
  };
  return visit(value) as T;
}

export function cloneElementSet(
  elements: Element[],
  offsets?: Array<{ x: number; y: number }>,
): { elements: Element[]; idMap: Map<string, string> } {
  const idMap = new Map<string, string>();
  elements.forEach((element) => collectElementIds(element, idMap));

  const clones = elements.map((element, index) => {
    const cloned = JSON.parse(JSON.stringify(element)) as Element;
    refreshClonedElementIds(cloned, idMap);
    const offset = offsets?.[index] ?? { x: 0, y: 0 };
    cloned.geometry.x += offset.x;
    cloned.geometry.y += offset.y;
    const remapped = remapElementTargetIds(cloned, idMap);
    normalizeElementZIndices([remapped]);
    return remapped;
  });

  return { elements: clones, idMap };
}

export function cloneElement(element: Element, offsetX = 20, offsetY = 20): Element {
  return cloneElementSet([element], [{ x: offsetX, y: offsetY }]).elements[0];
}
