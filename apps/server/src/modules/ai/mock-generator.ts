import { v4 as uuidv4 } from 'uuid';
import type { Courseware, Slide, Element, DocumentNode } from '@courseware/shared';
import { DEFAULT_DESIGN_SYSTEM } from '@courseware/shared';

interface MockGenerationInput {
  title: string;
  description: string;
  structure: DocumentNode[];
  extractedText: string;
}

const generateId = (prefix: string) => `${prefix}-${uuidv4().slice(0, 8)}`;

export function generateMockCourseware(input: MockGenerationInput): Courseware {
  const { title, description, structure, extractedText } = input;
  const headings = structure.filter((n) => n.type === 'heading');
  const paragraphs = structure.filter((n) => n.type === 'paragraph');

  // Build 3-5 slides based on available headings
  const slideCount = Math.min(Math.max(headings.length + 1, 3), 5);
  const slides: Slide[] = [];

  // Title slide
  slides.push(createTitleSlide(title, description));

  // Content slides
  for (let i = 0; i < slideCount - 2; i++) {
    const heading = headings[i];
    const body = paragraphs[i]?.content || '暂无详细内容';
    slides.push(createContentSlide(i + 1, heading?.content || `要点 ${i + 1}`, body));
  }

  // Summary or quiz slide
  slides.push(createQuizSlide(slideCount - 1, paragraphs));

  return {
    id: generateId('cw'),
    version: '1.0',
    title,
    topicDescription: description,
    sourceDocument: {
      filename: 'generated',
      extractedText,
      structure,
    },
    designSystem: DEFAULT_DESIGN_SYSTEM,
    slides,
    assets: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function createTitleSlide(title: string, subtitle: string): Slide {
  return {
    id: generateId('slide'),
    order: 0,
    title,
    learningObjective: '了解课程主题',
    layout: { templateId: 'title', variant: 'center', constraints: [] },
    background: { color: '#fef3c7' },
    elements: [
      createTextElement('el-title', 'title', 240, 200, 800, 100, title, {
        color: '#92400e',
        fontSize: 64,
        fontWeight: 700,
        textAlign: 'center',
      }, [{ type: 'scale-in', duration: 0.8, delay: 0.2, easing: 'back.out', trigger: 'auto' }]),
      createTextElement('el-subtitle', 'subtitle', 340, 340, 600, 60, subtitle, {
        color: '#b45309',
        fontSize: 28,
        textAlign: 'center',
      }, [{ type: 'slide-up', duration: 0.6, delay: 0.6, easing: 'power2.out', trigger: 'auto' }]),
    ],
    transition: { type: 'fade', duration: 0.8, easing: 'power2.inOut' },
    timeline: { autoPlay: true },
  };
}

function createContentSlide(order: number, heading: string, body: string): Slide {
  return {
    id: generateId('slide'),
    order,
    title: heading,
    learningObjective: '理解核心知识点',
    layout: { templateId: 'content', variant: 'left-title', constraints: [] },
    background: { color: '#ffffff' },
    elements: [
      createTextElement('el-heading', 'title', 80, 60, 800, 70, heading, {
        color: '#1e293b',
        fontSize: 44,
        fontWeight: 700,
      }, [{ type: 'slide-right', duration: 0.5, delay: 0, easing: 'power2.out', trigger: 'auto' }]),
      createTextElement('el-body', 'body', 80, 160, 700, 300, body, {
        color: '#334155',
        fontSize: 22,
        lineHeight: 1.8,
      }, [{ type: 'fade', duration: 0.6, delay: 0.3, easing: 'power2.out', trigger: 'auto' }]),
    ],
    transition: { type: 'slide', duration: 0.8, easing: 'power2.inOut', direction: 'right' },
    timeline: { autoPlay: true },
  };
}

function createQuizSlide(order: number, paragraphs: DocumentNode[]): Slide {
  const answerText = paragraphs.length > 0 ? paragraphs[0].content?.slice(0, 50) || '请回顾课程内容' : '请回顾课程内容';

  return {
    id: generateId('slide'),
    order,
    title: '课堂小测',
    learningObjective: '巩固所学知识',
    layout: { templateId: 'quiz', variant: 'center', constraints: [] },
    background: { color: '#f0fdf4' },
    elements: [
      createTextElement('el-question', 'question', 80, 60, 800, 70, '本节课的核心内容是什么？', {
        color: '#1e293b',
        fontSize: 36,
        fontWeight: 700,
      }, [{ type: 'slide-down', duration: 0.5, easing: 'power2.out', trigger: 'auto' }]),
      createTextElement('el-answer', 'answer', 80, 160, 700, 100, `✅ 答案：${answerText}`, {
        color: '#166534',
        fontSize: 24,
        backgroundColor: '#dcfce7',
        padding: 16,
        borderRadius: 12,
        opacity: 0,
      }, [{ type: 'scale-in', duration: 0.4, easing: 'back.out', trigger: 'auto' }]),
      createShapeElement('el-reveal-btn', 80, 300, 160, 48, '#2563eb', [
        { type: 'bounce', duration: 0.5, delay: 0.6, easing: 'bounce.out', trigger: 'auto' },
      ]),
      createTextElement('el-btn-text', 'caption', 80, 300, 160, 48, '点击查看答案', {
        color: '#ffffff',
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 2.8,
      }, [], [
        {
          id: 'int-reveal',
          trigger: 'click',
          actions: [
            { id: 'act-show-answer', type: 'show', targetId: 'el-answer' },
            { id: 'act-hide-btn', type: 'hide', targetId: 'el-reveal-btn' },
          ],
        },
      ]),
    ],
    transition: { type: 'zoom', duration: 0.8, easing: 'power2.inOut' },
    timeline: { autoPlay: true },
    stateMachine: {
      id: 'sm-quiz-1',
      initial: 'hidden',
      states: {
        hidden: {
          on: {
            INT_REVEAL: { target: 'revealed' },
          },
        },
        revealed: {
          entry: [{ id: 'entry-show', type: 'show', targetId: 'el-answer' }],
        },
      },
    },
  };
}

function createTextElement(
  id: string,
  semanticRole: string,
  x: number,
  y: number,
  width: number,
  height: number,
  text: string,
  style: Record<string, unknown>,
  entrance: Array<Record<string, unknown>>,
  interactions = [],
): Element {
  return {
    id,
    type: 'text',
    semanticRole: semanticRole as Element['semanticRole'],
    geometry: { x, y, width, height, zIndex: 1 },
    content: { text },
    style: style as Element['style'],
    animation: {
      entrance: entrance.map((step, index) => ({
        id: `${id}-anim-${index}`,
        type: step.type as Element['animation']['entrance'][0]['type'],
        duration: step.duration as number,
        delay: (step.delay as number) || 0,
        easing: step.easing as Element['animation']['entrance'][0]['easing'],
        trigger: step.trigger as Element['animation']['entrance'][0]['trigger'],
      })),
      exit: [],
    },
    interactions: interactions as Element['interactions'],
  };
}

function createShapeElement(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
  entrance: Array<Record<string, unknown>>,
): Element {
  return {
    id,
    type: 'shape',
    semanticRole: 'tip',
    geometry: { x, y, width, height, zIndex: 2 },
    content: { shapeType: 'rectangle', fill },
    style: { borderRadius: 8 },
    animation: {
      entrance: entrance.map((step, index) => ({
        id: `${id}-anim-${index}`,
        type: step.type as Element['animation']['entrance'][0]['type'],
        duration: step.duration as number,
        delay: (step.delay as number) || 0,
        easing: step.easing as Element['animation']['entrance'][0]['easing'],
        trigger: step.trigger as Element['animation']['entrance'][0]['trigger'],
      })),
      exit: [],
    },
    interactions: [],
  };
}
