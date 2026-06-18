import { X } from 'lucide-react';
import type { Slide } from '@courseware/shared';
import {
  createTitleElement,
  createSubtitleElement,
  createBodyTextElement,
  createImageElement,
  createQuizElement,
  createShapeElement,
} from '../stores/element-factories';

export type TemplateId =
  | 'blank'
  | 'title'
  | 'content'
  | 'two-column'
  | 'image'
  | 'quiz'
  | 'comparison'
  | 'timeline'
  | 'cards'
  | 'section'
  | 'toc'
  | 'steps'
  | 'quote'
  | 'reading'
  | 'experiment'
  | 'grammar'
  | 'formula'
  | 'dialogue'
  | 'poetry'
  | 'data-chart'
  | 'map'
  | 'source-material'
  | 'vocabulary'
  | 'derivation'
  | 'mindmap';

interface Template {
  id: TemplateId;
  name: string;
  description: string;
  preview: React.ReactNode;
  buildSlide: () => Partial<Slide>;
}

function MiniSlide({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded bg-white shadow-sm">
      {children}
    </div>
  );
}

function Rect({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <div className={`absolute ${className || ''}`} style={style} />;
}

const TEMPLATES: Template[] = [
  {
    id: 'blank',
    name: '空白',
    description: '从空白页面开始',
    preview: (
      <MiniSlide>
        <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-300">空白</div>
      </MiniSlide>
    ),
    buildSlide: () => ({
      title: '空白页面',
      elements: [],
    }),
  },
  {
    id: 'title',
    name: '标题页',
    description: '大标题 + 副标题',
    preview: (
      <MiniSlide>
        <Rect className="rounded bg-blue-200" style={{ left: '10%', top: '30%', width: '80%', height: '12%' }} />
        <Rect className="rounded bg-slate-200" style={{ left: '20%', top: '50%', width: '60%', height: '8%' }} />
      </MiniSlide>
    ),
    buildSlide: () => ({
      title: '标题页',
      layout: { templateId: 'title', variant: 'center', constraints: [] },
      elements: [
        createTitleElement('标题', { x: 640, y: 260, width: 900, height: 100 }),
        createSubtitleElement('副标题', { x: 640, y: 380, width: 600, height: 60 }),
      ],
    }),
  },
  {
    id: 'content',
    name: '内容页',
    description: '标题 + 正文',
    preview: (
      <MiniSlide>
        <Rect className="rounded bg-blue-200" style={{ left: '8%', top: '12%', width: '60%', height: '10%' }} />
        <Rect className="rounded bg-slate-200" style={{ left: '8%', top: '30%', width: '84%', height: '8%' }} />
        <Rect className="rounded bg-slate-200" style={{ left: '8%', top: '44%', width: '80%', height: '8%' }} />
        <Rect className="rounded bg-slate-200" style={{ left: '8%', top: '58%', width: '75%', height: '8%' }} />
      </MiniSlide>
    ),
    buildSlide: () => ({
      title: '内容页',
      layout: { templateId: 'content', variant: 'default', constraints: [] },
      elements: [
        createTitleElement('页面标题', { x: 640, y: 80, width: 900, height: 80 }),
        createBodyTextElement('正文内容', { x: 660, y: 220, width: 1040, height: 360 }),
      ],
    }),
  },
  {
    id: 'two-column',
    name: '左右分栏',
    description: '标题 + 两栏内容',
    preview: (
      <MiniSlide>
        <Rect className="rounded bg-blue-200" style={{ left: '8%', top: '10%', width: '60%', height: '10%' }} />
        <Rect className="rounded bg-slate-200" style={{ left: '8%', top: '32%', width: '38%', height: '50%' }} />
        <Rect className="rounded bg-slate-200" style={{ left: '54%', top: '32%', width: '38%', height: '50%' }} />
      </MiniSlide>
    ),
    buildSlide: () => ({
      title: '左右分栏',
      layout: { templateId: 'two-column', variant: 'default', constraints: [] },
      elements: [
        createTitleElement('页面标题', { x: 640, y: 80, width: 900, height: 80 }),
        createBodyTextElement('左侧内容', { x: 330, y: 300, width: 480, height: 320 }),
        createBodyTextElement('右侧内容', { x: 950, y: 300, width: 480, height: 320 }),
      ],
    }),
  },
  {
    id: 'image',
    name: '图片页',
    description: '标题 + 图片',
    preview: (
      <MiniSlide>
        <Rect className="rounded bg-blue-200" style={{ left: '8%', top: '10%', width: '60%', height: '10%' }} />
        <Rect className="rounded bg-slate-100" style={{ left: '20%', top: '32%', width: '60%', height: '48%' }} />
      </MiniSlide>
    ),
    buildSlide: () => ({
      title: '图片页',
      layout: { templateId: 'image', variant: 'default', constraints: [] },
      elements: [
        createTitleElement('图片标题', { x: 640, y: 80, width: 900, height: 80 }),
        createImageElement('', { x: 640, y: 400, width: 700, height: 420 }),
      ],
    }),
  },
  {
    id: 'quiz',
    name: '测验页',
    description: '标题 + 单选题',
    preview: (
      <MiniSlide>
        <Rect className="rounded bg-blue-200" style={{ left: '8%', top: '10%', width: '60%', height: '10%' }} />
        <Rect className="rounded bg-slate-100" style={{ left: '8%', top: '30%', width: '84%', height: '55%' }} />
        <Rect className="rounded-full bg-slate-300" style={{ left: '12%', top: '40%', width: '6%', height: '8%' }} />
        <Rect className="rounded-full bg-slate-300" style={{ left: '12%', top: '54%', width: '6%', height: '8%' }} />
      </MiniSlide>
    ),
    buildSlide: () => ({
      title: '测验页',
      layout: { templateId: 'quiz', variant: 'default', constraints: [] },
      elements: [
        createTitleElement('课堂测验', { x: 640, y: 80, width: 900, height: 80 }),
        createQuizElement('single-choice', { x: 640, y: 380, width: 800, height: 400 }),
      ],
    }),
  },
  {
    id: 'comparison',
    name: '对比页',
    description: '左右对比两个概念',
    preview: (
      <MiniSlide>
        <Rect className="rounded bg-blue-200" style={{ left: '8%', top: '10%', width: '60%', height: '10%' }} />
        <Rect className="rounded bg-slate-200" style={{ left: '8%', top: '30%', width: '38%', height: '55%' }} />
        <Rect className="rounded bg-slate-200" style={{ left: '54%', top: '30%', width: '38%', height: '55%' }} />
        <Rect className="rounded-full bg-slate-300" style={{ left: '46%', top: '48%', width: '8%', height: '12%' }} />
      </MiniSlide>
    ),
    buildSlide: () => ({
      title: '对比页',
      layout: { templateId: 'comparison', variant: 'default', constraints: [] },
      elements: [
        createTitleElement('概念对比', { x: 640, y: 80, width: 900, height: 80 }),
        createShapeElement('rectangle', { x: 310, y: 360, width: 420, height: 320 }),
        createBodyTextElement('左侧概念描述', { x: 310, y: 360, width: 360, height: 240 }),
        createShapeElement('rectangle', { x: 970, y: 360, width: 420, height: 320 }),
        createBodyTextElement('右侧概念描述', { x: 970, y: 360, width: 360, height: 240 }),
        createShapeElement('circle', { x: 640, y: 360, width: 80, height: 80 }),
      ],
    }),
  },
  {
    id: 'timeline',
    name: '时间轴',
    description: '横向时间轴展示',
    preview: (
      <MiniSlide>
        <Rect className="rounded bg-blue-200" style={{ left: '8%', top: '10%', width: '60%', height: '10%' }} />
        <Rect className="rounded bg-slate-300" style={{ left: '8%', top: '50%', width: '84%', height: '3%' }} />
        <Rect className="rounded-full bg-blue-400" style={{ left: '15%', top: '44%', width: '6%', height: '10%' }} />
        <Rect className="rounded-full bg-slate-300" style={{ left: '45%', top: '44%', width: '6%', height: '10%' }} />
        <Rect className="rounded-full bg-slate-300" style={{ left: '75%', top: '44%', width: '6%', height: '10%' }} />
      </MiniSlide>
    ),
    buildSlide: () => ({
      title: '时间轴',
      layout: { templateId: 'timeline', variant: 'default', constraints: [] },
      elements: [
        createTitleElement('发展历程', { x: 640, y: 80, width: 900, height: 80 }),
        createShapeElement('rectangle', { x: 640, y: 360, width: 1000, height: 6 }),
        createShapeElement('circle', { x: 180, y: 360, width: 24, height: 24 }),
        createBodyTextElement('阶段一', { x: 180, y: 440, width: 240, height: 80 }),
        createShapeElement('circle', { x: 640, y: 360, width: 24, height: 24 }),
        createBodyTextElement('阶段二', { x: 640, y: 440, width: 240, height: 80 }),
        createShapeElement('circle', { x: 1100, y: 360, width: 24, height: 24 }),
        createBodyTextElement('阶段三', { x: 1100, y: 440, width: 240, height: 80 }),
      ],
    }),
  },
  {
    id: 'cards',
    name: '卡片网格',
    description: '四宫格要点卡片',
    preview: (
      <MiniSlide>
        <Rect className="rounded bg-blue-200" style={{ left: '8%', top: '10%', width: '60%', height: '10%' }} />
        <Rect className="rounded bg-slate-100" style={{ left: '8%', top: '32%', width: '38%', height: '24%' }} />
        <Rect className="rounded bg-slate-100" style={{ left: '54%', top: '32%', width: '38%', height: '24%' }} />
        <Rect className="rounded bg-slate-100" style={{ left: '8%', top: '62%', width: '38%', height: '24%' }} />
        <Rect className="rounded bg-slate-100" style={{ left: '54%', top: '62%', width: '38%', height: '24%' }} />
      </MiniSlide>
    ),
    buildSlide: () => ({
      title: '卡片网格',
      layout: { templateId: 'cards', variant: 'default', constraints: [] },
      elements: [
        createTitleElement('核心要点', { x: 640, y: 80, width: 900, height: 80 }),
        createShapeElement('rectangle', { x: 330, y: 260, width: 460, height: 180 }),
        createBodyTextElement('要点一', { x: 330, y: 260, width: 400, height: 120 }),
        createShapeElement('rectangle', { x: 950, y: 260, width: 460, height: 180 }),
        createBodyTextElement('要点二', { x: 950, y: 260, width: 400, height: 120 }),
        createShapeElement('rectangle', { x: 330, y: 500, width: 460, height: 180 }),
        createBodyTextElement('要点三', { x: 330, y: 500, width: 400, height: 120 }),
        createShapeElement('rectangle', { x: 950, y: 500, width: 460, height: 180 }),
        createBodyTextElement('要点四', { x: 950, y: 500, width: 400, height: 120 }),
      ],
    }),
  },
  {
    id: 'section',
    name: '章节页',
    description: '大标题章节过渡页',
    preview: (
      <MiniSlide>
        <Rect className="rounded bg-blue-200" style={{ left: '15%', top: '35%', width: '70%', height: '14%' }} />
        <Rect className="rounded bg-slate-200" style={{ left: '25%', top: '55%', width: '50%', height: '8%' }} />
        <Rect className="rounded-full bg-blue-100" style={{ left: '75%', top: '15%', width: '20%', height: '30%' }} />
      </MiniSlide>
    ),
    buildSlide: () => ({
      title: '章节页',
      layout: { templateId: 'section', variant: 'default', constraints: [] },
      elements: [
        createTitleElement('章节标题', { x: 640, y: 320, width: 900, height: 100 }),
        createSubtitleElement('章节副标题', { x: 640, y: 440, width: 700, height: 60 }),
        createShapeElement('circle', { x: 1020, y: 180, width: 160, height: 160 }),
      ],
    }),
  },
  {
    id: 'toc',
    name: '目录页',
    description: '章节或学习目标列表',
    preview: (
      <MiniSlide>
        <Rect className="rounded bg-blue-200" style={{ left: '8%', top: '10%', width: '60%', height: '10%' }} />
        <Rect className="rounded bg-slate-100" style={{ left: '8%', top: '30%', width: '84%', height: '12%' }} />
        <Rect className="rounded bg-slate-100" style={{ left: '8%', top: '46%', width: '84%', height: '12%' }} />
        <Rect className="rounded bg-slate-100" style={{ left: '8%', top: '62%', width: '84%', height: '12%' }} />
      </MiniSlide>
    ),
    buildSlide: () => ({
      title: '目录页',
      layout: { templateId: 'toc', variant: 'default', constraints: [] },
      elements: [
        createTitleElement('本课目录', { x: 640, y: 80, width: 900, height: 80 }),
        createShapeElement('rectangle', { x: 120, y: 200, width: 1040, height: 64 }),
        createShapeElement('circle', { x: 152, y: 216, width: 32, height: 32 }),
        createBodyTextElement('第一章节', { x: 210, y: 210, width: 900, height: 44 }),
        createShapeElement('rectangle', { x: 120, y: 288, width: 1040, height: 64 }),
        createShapeElement('circle', { x: 152, y: 304, width: 32, height: 32 }),
        createBodyTextElement('第二章节', { x: 210, y: 298, width: 900, height: 44 }),
        createShapeElement('rectangle', { x: 120, y: 376, width: 1040, height: 64 }),
        createShapeElement('circle', { x: 152, y: 392, width: 32, height: 32 }),
        createBodyTextElement('第三章节', { x: 210, y: 386, width: 900, height: 44 }),
      ],
    }),
  },
  {
    id: 'steps',
    name: '步骤流程',
    description: '横向步骤卡片',
    preview: (
      <MiniSlide>
        <Rect className="rounded bg-blue-200" style={{ left: '8%', top: '10%', width: '60%', height: '10%' }} />
        <Rect className="rounded bg-slate-100" style={{ left: '8%', top: '32%', width: '24%', height: '55%' }} />
        <Rect className="rounded bg-slate-100" style={{ left: '38%', top: '32%', width: '24%', height: '55%' }} />
        <Rect className="rounded bg-slate-100" style={{ left: '68%', top: '32%', width: '24%', height: '55%' }} />
      </MiniSlide>
    ),
    buildSlide: () => ({
      title: '步骤流程',
      layout: { templateId: 'steps', variant: 'default', constraints: [] },
      elements: [
        createTitleElement('操作步骤', { x: 640, y: 80, width: 900, height: 80 }),
        createShapeElement('rectangle', { x: 205, y: 360, width: 300, height: 360 }),
        createShapeElement('circle', { x: 205, y: 220, width: 48, height: 48 }),
        createBodyTextElement('步骤一', { x: 205, y: 300, width: 260, height: 160 }),
        createShapeElement('rectangle', { x: 640, y: 360, width: 300, height: 360 }),
        createShapeElement('circle', { x: 640, y: 220, width: 48, height: 48 }),
        createBodyTextElement('步骤二', { x: 640, y: 300, width: 260, height: 160 }),
        createShapeElement('rectangle', { x: 1075, y: 360, width: 300, height: 360 }),
        createShapeElement('circle', { x: 1075, y: 220, width: 48, height: 48 }),
        createBodyTextElement('步骤三', { x: 1075, y: 300, width: 260, height: 160 }),
      ],
    }),
  },
  {
    id: 'quote',
    name: '引用/总结',
    description: '名言或课堂小结',
    preview: (
      <MiniSlide>
        <Rect className="rounded bg-blue-200" style={{ left: '10%', top: '25%', width: '80%', height: '30%' }} />
        <Rect className="rounded bg-slate-200" style={{ left: '30%', top: '62%', width: '40%', height: '8%' }} />
      </MiniSlide>
    ),
    buildSlide: () => ({
      title: '引用页',
      layout: { templateId: 'quote', variant: 'default', constraints: [] },
      elements: [
        createTitleElement('“核心观点”', { x: 640, y: 300, width: 1000, height: 140 }),
        createSubtitleElement('—— 来源', { x: 640, y: 460, width: 600, height: 60 }),
      ],
    }),
  },
  {
    id: 'reading',
    name: '阅读理解',
    description: '原文摘录 + 赏析',
    preview: (
      <MiniSlide>
        <Rect className="rounded bg-blue-200" style={{ left: '8%', top: '8%', width: '50%', height: '10%' }} />
        <Rect className="rounded bg-slate-100" style={{ left: '8%', top: '26%', width: '42%', height: '62%' }} />
        <Rect className="rounded bg-slate-50" style={{ left: '54%', top: '26%', width: '40%', height: '62%' }} />
      </MiniSlide>
    ),
    buildSlide: () => ({
      title: '阅读理解',
      layout: { templateId: 'reading', variant: 'default', constraints: [] },
      elements: [
        createTitleElement('文本精读', { x: 640, y: 70, width: 900, height: 80 }),
        createShapeElement('rectangle', { x: 300, y: 280, width: 560, height: 380 }),
        createBodyTextElement('原文摘录……', { x: 300, y: 280, width: 500, height: 300 }),
        createShapeElement('rectangle', { x: 900, y: 280, width: 520, height: 380 }),
        createBodyTextElement('赏析与思考问题', { x: 900, y: 280, width: 460, height: 300 }),
      ],
    }),
  },
  {
    id: 'experiment',
    name: '实验探究',
    description: '器材 / 步骤 / 结论',
    preview: (
      <MiniSlide>
        <Rect className="rounded bg-blue-200" style={{ left: '8%', top: '8%', width: '50%', height: '10%' }} />
        <Rect className="rounded bg-slate-50" style={{ left: '8%', top: '26%', width: '25%', height: '62%' }} />
        <Rect className="rounded bg-slate-50" style={{ left: '37.5%', top: '26%', width: '25%', height: '62%' }} />
        <Rect className="rounded bg-slate-50" style={{ left: '67%', top: '26%', width: '25%', height: '62%' }} />
      </MiniSlide>
    ),
    buildSlide: () => ({
      title: '实验探究',
      layout: { templateId: 'experiment', variant: 'default', constraints: [] },
      elements: [
        createTitleElement('实验名称', { x: 640, y: 70, width: 900, height: 80 }),
        createShapeElement('rectangle', { x: 225, y: 360, width: 320, height: 440 }),
        createBodyTextElement('实验器材', { x: 225, y: 360, width: 260, height: 340 }),
        createShapeElement('rectangle', { x: 640, y: 360, width: 320, height: 440 }),
        createBodyTextElement('操作步骤', { x: 640, y: 360, width: 260, height: 340 }),
        createShapeElement('rectangle', { x: 1055, y: 360, width: 320, height: 440 }),
        createBodyTextElement('实验结论', { x: 1055, y: 360, width: 260, height: 340 }),
      ],
    }),
  },
  {
    id: 'grammar',
    name: '语法讲解',
    description: '例句 + 规则 + 练习',
    preview: (
      <MiniSlide>
        <Rect className="rounded bg-blue-200" style={{ left: '8%', top: '8%', width: '50%', height: '10%' }} />
        <Rect className="rounded bg-slate-100" style={{ left: '8%', top: '24%', width: '84%', height: '20%' }} />
        <Rect className="rounded bg-slate-50" style={{ left: '8%', top: '50%', width: '40%', height: '40%' }} />
        <Rect className="rounded bg-slate-50" style={{ left: '52%', top: '50%', width: '40%', height: '40%' }} />
      </MiniSlide>
    ),
    buildSlide: () => ({
      title: '语法讲解',
      layout: { templateId: 'grammar', variant: 'default', constraints: [] },
      elements: [
        createTitleElement('语法点', { x: 640, y: 70, width: 900, height: 80 }),
        createShapeElement('rectangle', { x: 640, y: 180, width: 1100, height: 120 }),
        createBodyTextElement('典型例句', { x: 640, y: 180, width: 1040, height: 80 }),
        createShapeElement('rectangle', { x: 330, y: 380, width: 500, height: 300 }),
        createBodyTextElement('规则说明', { x: 330, y: 380, width: 440, height: 240 }),
        createShapeElement('rectangle', { x: 950, y: 380, width: 500, height: 300 }),
        createBodyTextElement('即时练习', { x: 950, y: 380, width: 440, height: 240 }),
      ],
    }),
  },
  {
    id: 'formula',
    name: '公式定理',
    description: '公式 + 条件/例题',
    preview: (
      <MiniSlide>
        <Rect className="rounded bg-blue-200" style={{ left: '8%', top: '8%', width: '84%', height: '10%' }} />
        <Rect className="rounded bg-slate-100" style={{ left: '20%', top: '24%', width: '60%', height: '22%' }} />
        <Rect className="rounded bg-slate-50" style={{ left: '8%', top: '52%', width: '40%', height: '40%' }} />
        <Rect className="rounded bg-slate-50" style={{ left: '52%', top: '52%', width: '40%', height: '40%' }} />
      </MiniSlide>
    ),
    buildSlide: () => ({
      title: '公式定理',
      layout: { templateId: 'formula', variant: 'default', constraints: [] },
      elements: [
        createTitleElement('定理名称', { x: 640, y: 70, width: 1100, height: 80 }),
        createShapeElement('rectangle', { x: 640, y: 180, width: 760, height: 120 }),
        createTitleElement('公式', { x: 640, y: 180, width: 720, height: 100 }),
        createShapeElement('rectangle', { x: 330, y: 380, width: 500, height: 300 }),
        createBodyTextElement('适用条件', { x: 330, y: 380, width: 440, height: 240 }),
        createShapeElement('rectangle', { x: 950, y: 380, width: 500, height: 300 }),
        createBodyTextElement('典型例题', { x: 950, y: 380, width: 440, height: 240 }),
      ],
    }),
  },
  {
    id: 'dialogue',
    name: '情景对话',
    description: '角色 A/B 对话气泡',
    preview: (
      <MiniSlide>
        <Rect className="rounded bg-blue-200" style={{ left: '8%', top: '8%', width: '50%', height: '10%' }} />
        <Rect className="rounded bg-slate-100" style={{ left: '8%', top: '22%', width: '84%', height: '10%' }} />
        <Rect className="rounded bg-slate-100" style={{ left: '8%', top: '38%', width: '55%', height: '18%' }} />
        <Rect className="rounded bg-slate-50" style={{ left: '37%', top: '60%', width: '55%', height: '18%' }} />
        <Rect className="rounded bg-slate-100" style={{ left: '8%', top: '84%', width: '84%', height: '10%' }} />
      </MiniSlide>
    ),
    buildSlide: () => ({
      title: '情景对话',
      layout: { templateId: 'dialogue', variant: 'default', constraints: [] },
      elements: [
        createTitleElement('对话主题', { x: 640, y: 70, width: 900, height: 80 }),
        createShapeElement('rectangle', { x: 640, y: 140, width: 1100, height: 70 }),
        createBodyTextElement('场景说明', { x: 640, y: 140, width: 1040, height: 50 }),
        createShapeElement('rectangle', { x: 280, y: 270, width: 500, height: 100 }),
        createBodyTextElement('A: 你好！', { x: 280, y: 270, width: 440, height: 60 }),
        createShapeElement('rectangle', { x: 1000, y: 410, width: 500, height: 100 }),
        createBodyTextElement('B: 你好！', { x: 1000, y: 410, width: 440, height: 60 }),
        createShapeElement('rectangle', { x: 640, y: 560, width: 1100, height: 70 }),
        createBodyTextElement('关键词 / 句型', { x: 640, y: 560, width: 1040, height: 50 }),
      ],
    }),
  },
  {
    id: 'poetry',
    name: '古诗词',
    description: '原诗 + 注释赏析',
    preview: (
      <MiniSlide>
        <Rect className="rounded bg-blue-200" style={{ left: '25%', top: '8%', width: '50%', height: '10%' }} />
        <Rect className="rounded bg-slate-100" style={{ left: '8%', top: '24%', width: '40%', height: '66%' }} />
        <Rect className="rounded bg-slate-50" style={{ left: '52%', top: '24%', width: '40%', height: '66%' }} />
      </MiniSlide>
    ),
    buildSlide: () => ({
      title: '古诗词',
      layout: { templateId: 'poetry', variant: 'default', constraints: [] },
      elements: [
        createTitleElement('诗题', { x: 640, y: 70, width: 900, height: 80 }),
        createShapeElement('rectangle', { x: 320, y: 340, width: 560, height: 480 }),
        createBodyTextElement('诗句一\n诗句二\n诗句三\n诗句四', { x: 320, y: 340, width: 480, height: 400 }),
        createShapeElement('rectangle', { x: 960, y: 340, width: 480, height: 480 }),
        createBodyTextElement('注释与赏析', { x: 960, y: 340, width: 400, height: 400 }),
      ],
    }),
  },
  {
    id: 'data-chart',
    name: '数据图表',
    description: '图表 + 结论',
    preview: (
      <MiniSlide>
        <Rect className="rounded bg-blue-200" style={{ left: '8%', top: '8%', width: '50%', height: '10%' }} />
        <Rect className="rounded bg-slate-200" style={{ left: '8%', top: '24%', width: '84%', height: '42%' }} />
        <Rect className="rounded bg-blue-400" style={{ left: '16%', top: '52%', width: '10%', height: '10%' }} />
        <Rect className="rounded bg-slate-300" style={{ left: '32%', top: '42%', width: '10%', height: '20%' }} />
        <Rect className="rounded bg-slate-300" style={{ left: '48%', top: '36%', width: '10%', height: '26%' }} />
        <Rect className="rounded bg-slate-200" style={{ left: '8%', top: '72%', width: '84%', height: '20%' }} />
      </MiniSlide>
    ),
    buildSlide: () => ({
      title: '数据分析',
      layout: { templateId: 'data-chart', variant: 'default', constraints: [] },
      elements: [
        createTitleElement('数据标题', { x: 640, y: 70, width: 900, height: 80 }),
        createShapeElement('rectangle', { x: 640, y: 270, width: 1100, height: 260 }),
        createBodyTextElement('图表结论与解读', { x: 640, y: 540, width: 1040, height: 100 }),
      ],
    }),
  },
  {
    id: 'map',
    name: '地图/区域',
    description: '地图 + 区域要点',
    preview: (
      <MiniSlide>
        <Rect className="rounded bg-blue-200" style={{ left: '8%', top: '8%', width: '50%', height: '10%' }} />
        <Rect className="rounded bg-slate-200" style={{ left: '8%', top: '24%', width: '42%', height: '66%' }} />
        <Rect className="rounded bg-slate-100" style={{ left: '54%', top: '24%', width: '40%', height: '20%' }} />
        <Rect className="rounded bg-slate-100" style={{ left: '54%', top: '50%', width: '40%', height: '20%' }} />
        <Rect className="rounded bg-slate-100" style={{ left: '54%', top: '76%', width: '40%', height: '14%' }} />
      </MiniSlide>
    ),
    buildSlide: () => ({
      title: '地图/区域',
      layout: { templateId: 'map', variant: 'default', constraints: [] },
      elements: [
        createTitleElement('区域标题', { x: 640, y: 70, width: 900, height: 80 }),
        createShapeElement('rectangle', { x: 300, y: 360, width: 560, height: 420 }),
        createBodyTextElement('区域特征一', { x: 920, y: 220, width: 440, height: 100 }),
        createBodyTextElement('区域特征二', { x: 920, y: 360, width: 440, height: 100 }),
        createBodyTextElement('区域特征三', { x: 920, y: 500, width: 440, height: 100 }),
      ],
    }),
  },
  {
    id: 'source-material',
    name: '史料文献',
    description: '史料摘录 + 解读',
    preview: (
      <MiniSlide>
        <Rect className="rounded bg-blue-200" style={{ left: '8%', top: '8%', width: '50%', height: '10%' }} />
        <Rect className="rounded bg-slate-100" style={{ left: '8%', top: '24%', width: '84%', height: '30%' }} />
        <Rect className="rounded bg-slate-50" style={{ left: '8%', top: '60%', width: '84%', height: '30%' }} />
      </MiniSlide>
    ),
    buildSlide: () => ({
      title: '史料文献',
      layout: { templateId: 'source-material', variant: 'default', constraints: [] },
      elements: [
        createTitleElement('史料主题', { x: 640, y: 70, width: 900, height: 80 }),
        createShapeElement('rectangle', { x: 640, y: 200, width: 1100, height: 180 }),
        createBodyTextElement('史料摘录……', { x: 640, y: 200, width: 1040, height: 140 }),
        createShapeElement('rectangle', { x: 640, y: 460, width: 1100, height: 180 }),
        createBodyTextElement('史料解读与问题', { x: 640, y: 460, width: 1040, height: 140 }),
      ],
    }),
  },
  {
    id: 'vocabulary',
    name: '词汇讲解',
    description: '单词 / 音标 / 例句',
    preview: (
      <MiniSlide>
        <Rect className="rounded bg-blue-200" style={{ left: '8%', top: '8%', width: '50%', height: '10%' }} />
        <Rect className="rounded bg-slate-100" style={{ left: '8%', top: '22%', width: '40%', height: '68%' }} />
        <Rect className="rounded bg-slate-50" style={{ left: '52%', top: '22%', width: '40%', height: '68%' }} />
      </MiniSlide>
    ),
    buildSlide: () => ({
      title: '词汇讲解',
      layout: { templateId: 'vocabulary', variant: 'default', constraints: [] },
      elements: [
        createTitleElement('Word', { x: 640, y: 70, width: 900, height: 80 }),
        createShapeElement('rectangle', { x: 320, y: 360, width: 520, height: 480 }),
        createTitleElement('单词', { x: 320, y: 300, width: 440, height: 80 }),
        createSubtitleElement('音标 / 词性', { x: 320, y: 380, width: 440, height: 60 }),
        createShapeElement('rectangle', { x: 880, y: 360, width: 520, height: 480 }),
        createBodyTextElement('释义\n例句\n搭配', { x: 880, y: 360, width: 440, height: 400 }),
      ],
    }),
  },
  {
    id: 'derivation',
    name: '推导演算',
    description: '条件 / 步骤 / 结论',
    preview: (
      <MiniSlide>
        <Rect className="rounded bg-blue-200" style={{ left: '8%', top: '8%', width: '84%', height: '10%' }} />
        <Rect className="rounded bg-slate-100" style={{ left: '8%', top: '24%', width: '84%', height: '14%' }} />
        <Rect className="rounded bg-slate-100" style={{ left: '8%', top: '44%', width: '25%', height: '46%' }} />
        <Rect className="rounded bg-slate-100" style={{ left: '37.5%', top: '44%', width: '25%', height: '46%' }} />
        <Rect className="rounded bg-slate-100" style={{ left: '67%', top: '44%', width: '25%', height: '46%' }} />
      </MiniSlide>
    ),
    buildSlide: () => ({
      title: '推导演算',
      layout: { templateId: 'derivation', variant: 'default', constraints: [] },
      elements: [
        createTitleElement('推导标题', { x: 640, y: 70, width: 1100, height: 80 }),
        createShapeElement('rectangle', { x: 640, y: 170, width: 1100, height: 80 }),
        createBodyTextElement('已知条件', { x: 640, y: 170, width: 1040, height: 50 }),
        createShapeElement('rectangle', { x: 225, y: 360, width: 320, height: 360 }),
        createBodyTextElement('步骤一', { x: 225, y: 360, width: 260, height: 280 }),
        createShapeElement('rectangle', { x: 640, y: 360, width: 320, height: 360 }),
        createBodyTextElement('步骤二', { x: 640, y: 360, width: 260, height: 280 }),
        createShapeElement('rectangle', { x: 1055, y: 360, width: 320, height: 360 }),
        createBodyTextElement('结论', { x: 1055, y: 360, width: 260, height: 280 }),
      ],
    }),
  },
  {
    id: 'mindmap',
    name: '思维导图',
    description: '中心主题 + 分支',
    preview: (
      <MiniSlide>
        <Rect className="rounded bg-blue-200" style={{ left: '8%', top: '8%', width: '50%', height: '10%' }} />
        <Rect className="rounded bg-slate-300" style={{ left: '42%', top: '40%', width: '16%', height: '18%' }} />
        <Rect className="rounded bg-slate-100" style={{ left: '8%', top: '22%', width: '24%', height: '16%' }} />
        <Rect className="rounded bg-slate-100" style={{ left: '8%', top: '66%', width: '24%', height: '16%' }} />
        <Rect className="rounded bg-slate-100" style={{ left: '68%', top: '22%', width: '24%', height: '16%' }} />
        <Rect className="rounded bg-slate-100" style={{ left: '68%', top: '66%', width: '24%', height: '16%' }} />
      </MiniSlide>
    ),
    buildSlide: () => ({
      title: '思维导图',
      layout: { templateId: 'mindmap', variant: 'default', constraints: [] },
      elements: [
        createTitleElement('主题', { x: 640, y: 70, width: 900, height: 80 }),
        createShapeElement('circle', { x: 640, y: 360, width: 160, height: 160 }),
        createBodyTextElement('中心主题', { x: 640, y: 360, width: 120, height: 80 }),
        createShapeElement('rectangle', { x: 220, y: 190, width: 240, height: 100 }),
        createBodyTextElement('分支一', { x: 220, y: 190, width: 200, height: 60 }),
        createShapeElement('rectangle', { x: 220, y: 530, width: 240, height: 100 }),
        createBodyTextElement('分支二', { x: 220, y: 530, width: 200, height: 60 }),
        createShapeElement('rectangle', { x: 1060, y: 190, width: 240, height: 100 }),
        createBodyTextElement('分支三', { x: 1060, y: 190, width: 200, height: 60 }),
        createShapeElement('rectangle', { x: 1060, y: 530, width: 240, height: 100 }),
        createBodyTextElement('分支四', { x: 1060, y: 530, width: 200, height: 60 }),
      ],
    }),
  },
];

interface SlideTemplatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: TemplateId) => void;
}

export function SlideTemplatePicker({ isOpen, onClose, onSelect }: SlideTemplatePickerProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-24"
      onClick={onClose}
    >
      <div
        className="my-auto w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">选择幻灯片模板</h2>
            <p className="text-sm text-slate-500">选择一个布局开始新页面</p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {TEMPLATES.map((template) => (
            <button
              key={template.id}
              data-testid={`template-${template.id}`}
              onClick={() => onSelect(template.id)}
              className="group flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 text-left transition-colors hover:border-blue-400 hover:bg-blue-50"
            >
              <div className="aspect-video w-full overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                {template.preview}
              </div>
              <div>
                <div className="font-medium text-slate-800">{template.name}</div>
                <div className="text-xs text-slate-500">{template.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function buildSlideFromTemplate(templateId: TemplateId): Partial<Slide> {
  const template = TEMPLATES.find((t) => t.id === templateId);
  return template?.buildSlide() || { title: '新页面', elements: [] };
}

export { TEMPLATES };
