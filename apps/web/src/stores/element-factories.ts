import type { Element } from '@courseware/shared';
import { DEFAULT_SLIDE_SIZE } from '@courseware/shared';

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const CENTER_X = DEFAULT_SLIDE_SIZE.width / 2;
const CENTER_Y = DEFAULT_SLIDE_SIZE.height / 2;

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

export function cloneElement(element: Element, offsetX = 20, offsetY = 20): Element {
  const cloned = JSON.parse(JSON.stringify(element)) as Element;
  cloned.id = generateId('el');
  cloned.geometry.x += offsetX;
  cloned.geometry.y += offsetY;
  if (cloned.animation?.entrance) {
    cloned.animation.entrance.forEach((step) => {
      step.id = generateId('anim');
    });
  }
  return cloned;
}
