import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DESIGN_THEMES } from '@courseware/shared';
import type { Courseware, Slide, Element, Asset, DesignSystem, AnimationStep, InteractionAction, InteractionConfig } from '@courseware/shared';
import type { OutlineResult } from '../agents/outline.agent';
import type { ContentResult } from '../agents/content.agent';
import type { DesignResult } from '../agents/design.agent';
import type { AnimationResult } from '../agents/animation.agent';
import type { ImageAgentDecision } from '../agents/image.agent';
import { createPlaceholderAsset } from './placeholder-assets';
import { createImageAsset } from './image-provider';
import type { ImageContext, ImageProvider } from './image-provider';
import { fitAllTextElements } from './text-layout';

const logger = new Logger('CoursewareAssembler');

const SLIDE_WIDTH = 1280;
const SLIDE_HEIGHT = 720;

const VALID_ANIMATION_TYPES: AnimationStep['type'][] = [
  'fade', 'morph', 'slide-up', 'slide-down', 'slide-left', 'slide-right',
  'scale-in', 'scale-out', 'rotate', 'draw', 'typewriter', 'bounce',
];

const VALID_EASINGS: AnimationStep['easing'][] = [
  'power1.in', 'power1.out', 'power1.inOut',
  'power2.in', 'power2.out', 'power2.inOut',
  'power3.in', 'power3.out', 'power3.inOut',
  'power4.in', 'power4.out', 'power4.inOut',
  'back.in', 'back.out', 'back.inOut',
  'elastic.in', 'elastic.out', 'elastic.inOut',
  'bounce.in', 'bounce.out', 'bounce.inOut',
  'circ.in', 'circ.out', 'circ.inOut',
  'expo.in', 'expo.out', 'expo.inOut',
  'none',
];

const VALID_SEMANTIC_ROLES = new Set([
  'title', 'subtitle', 'body', 'caption', 'question', 'answer', 'option',
  'explanation', 'example', 'tip', 'annotation', 'quiz', 'decoration',
  'shape', 'image', 'icon', 'divider',
]);

const VALID_SLIDE_TRANSITIONS = new Set([
  'slide', 'fade', 'zoom', 'flip', 'wipe', 'morph', 'parallax',
]);

function sanitizeTransition(transition: Record<string, unknown> | undefined): Slide['transition'] {
  const base = transition || {};
  const type = typeof base.type === 'string' && VALID_SLIDE_TRANSITIONS.has(base.type)
    ? base.type
    : 'fade';
  const validDirections = new Set(['left', 'right', 'up', 'down']);
  const direction = typeof base.direction === 'string' && validDirections.has(base.direction)
    ? (base.direction as 'left' | 'right' | 'up' | 'down')
    : undefined;
  return {
    type: type as Slide['transition']['type'],
    duration: typeof base.duration === 'number' ? Math.min(base.duration, 0.8) : 0.5,
    easing: VALID_EASINGS.includes(base.easing as AnimationStep['easing'])
      ? (base.easing as AnimationStep['easing'])
      : 'power2.out',
    direction,
  };
}

const generateId = (prefix: string) => `${prefix}-${randomUUID()}`;

const numericStyleKeys = new Set([
  'fontSize',
  'lineHeight',
  'borderRadius',
  'borderWidth',
  'padding',
  'opacity',
  'letterSpacing',
]);

function getDefaultStyleForRole(role: Element['semanticRole'], designSystem: DesignSystem): Record<string, unknown> {
  const { colors, fontSizes } = designSystem.tokens;
  switch (role) {
    case 'title':
      return { color: colors.text, fontSize: fontSizes['4xl'], fontWeight: 700, textAlign: 'center' };
    case 'subtitle':
      return { color: colors.text, fontSize: fontSizes['2xl'], fontWeight: 600 };
    case 'body':
      return { color: colors.textMuted, fontSize: fontSizes.xl, lineHeight: 1.7 };
    case 'caption':
      return { color: colors.textMuted, fontSize: fontSizes.lg };
    case 'question':
      return { color: colors.text, fontSize: fontSizes['2xl'], fontWeight: 600 };
    case 'option':
      return { color: colors.text, fontSize: fontSizes.xl };
    case 'answer':
      return { color: colors.success, fontSize: fontSizes.xl, fontWeight: 600 };
    case 'explanation':
      return { color: colors.textMuted, fontSize: fontSizes.lg, lineHeight: 1.6 };
    case 'tip':
    case 'annotation':
      return { color: colors.textMuted, fontSize: fontSizes.base };
    case 'decoration':
      return { fill: colors.primary, opacity: 0.35 };
    default:
      return {};
  }
}

function sanitizeStyle(style: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(style || {})) {
    if (numericStyleKeys.has(key) && typeof value === 'string') {
      const parsed = parseFloat(value);
      if (!Number.isNaN(parsed)) {
        sanitized[key] = parsed;
        continue;
      }
    }
    sanitized[key] = value;
  }
  return sanitized;
}

function mergeStyle(role: Element['semanticRole'], designSystem: DesignSystem, designStyle: Record<string, unknown> | undefined): Record<string, unknown> {
  const defaults = getDefaultStyleForRole(role, designSystem);
  const overrides = sanitizeStyle(designStyle || {});
  return { ...defaults, ...overrides };
}

function enforceMinOpacity(opacity: number | undefined, min: number): number {
  const value = typeof opacity === 'number' ? opacity : 1;
  return Math.max(min, Math.min(1, value));
}

function sanitizeTextContent(text: string): string {
  if (typeof text !== 'string') return text;
  return (
    text
      // Strip LaTeX inline/display delimiters.
      .replace(/\\\(|\\\)/g, '')
      .replace(/\\\[|\\\]/g, '')
      .replace(/\$+/g, '')
      // Convert common LaTeX commands to Unicode or plain text.
      .replace(/\\sqrt\{([^}]+)\}/g, '√$1')
      .replace(/\\sqrt/g, '√')
      .replace(/\\neq/g, '≠')
      .replace(/\\pm/g, '±')
      .replace(/\\times/g, '×')
      .replace(/\\div/g, '÷')
      .replace(/\\cdot/g, '·')
      .replace(/\\le(?![a-zA-Z])/g, '≤')
      .replace(/\\ge(?![a-zA-Z])/g, '≥')
      .replace(/\\alpha(?![a-zA-Z])/g, 'α')
      .replace(/\\beta(?![a-zA-Z])/g, 'β')
      .replace(/\\gamma(?![a-zA-Z])/g, 'γ')
      .replace(/\\delta(?![a-zA-Z])/g, 'δ')
      .replace(/\\Delta(?![a-zA-Z])/g, 'Δ')
      .replace(/\\pi(?![a-zA-Z])/g, 'π')
      .replace(/\\theta(?![a-zA-Z])/g, 'θ')
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1/$2)')
      .replace(/\\_/g, '_')
      // Simple superscripts/subscripts for single digits.
      .replace(/\^2(?![0-9])/g, '²')
      .replace(/\^3(?![0-9])/g, '³')
      .replace(/_1(?![0-9])/g, '₁')
      .replace(/_2(?![0-9])/g, '₂')
      .replace(/_3(?![0-9])/g, '₃')
      // Remove stray backslashes and braces.
      .replace(/\\([a-zA-Z]+)/g, '$1')
      .replace(/\\([^a-zA-Z])/g, '$1')
      .replace(/[{}]/g, '')
      .trim()
  );
}

function normalizeElement(el: Element, designSystem: DesignSystem): Element {
  const role = el.semanticRole;
  const fontSizes = designSystem.tokens.fontSizes;

  // Strip LaTeX delimiters from all text content so formulas render directly.
  if (el.type === 'text' && typeof el.content.text === 'string') {
    el.content.text = sanitizeTextContent(el.content.text);
  }

  // Make decorations visible enough to matter without overwhelming content.
  if (el.type === 'shape' && role === 'decoration') {
    const fill = (el.content.fill as string) || '';
    const isGradient = /gradient/i.test(fill);
    const hasCardStyle = typeof el.style.borderRadius === 'number' && el.style.borderRadius > 0;
    const hasShadow = typeof el.style.shadow === 'string' && el.style.shadow.length > 0;

    if (isGradient) {
      el.style.opacity = enforceMinOpacity(el.style.opacity, 0.35);
    } else if (hasCardStyle || hasShadow) {
      el.style.opacity = enforceMinOpacity(el.style.opacity, 0.8);
    } else {
      el.style.opacity = enforceMinOpacity(el.style.opacity, 0.22);
    }
  }

  // Ensure body text is comfortably readable on classroom screens.
  if (role === 'body' && typeof el.style.fontSize === 'number' && el.style.fontSize < 20) {
    el.style.fontSize = fontSizes.xl;
  }
  if (role === 'option' && typeof el.style.fontSize === 'number' && el.style.fontSize < 20) {
    el.style.fontSize = fontSizes.xl;
  }
  if (role === 'question' && typeof el.style.fontSize === 'number' && el.style.fontSize < 24) {
    el.style.fontSize = fontSizes['2xl'];
  }
  if (role === 'title' && typeof el.style.fontSize === 'number' && el.style.fontSize < 40) {
    el.style.fontSize = fontSizes['4xl'];
  }
  if (role === 'subtitle' && typeof el.style.fontSize === 'number' && el.style.fontSize < 28) {
    el.style.fontSize = fontSizes['2xl'];
  }

  // Prevent multi-line text from overlapping when the design agent sets a very tight lineHeight.
  if (el.type === 'text') {
    if (typeof el.style.lineHeight === 'number' && el.style.lineHeight < 1.2) {
      el.style.lineHeight = 1.5;
    }
    if (el.style.lineHeight === undefined || el.style.lineHeight === null) {
      el.style.lineHeight = 1.6;
    }
  }

  return el;
}

function buildQuizSlideElements(
  slideId: string,
  quiz: NonNullable<ContentResult['slides'][number]['quiz']>,
  designSystem: DesignSystem,
  existingElements: Element[],
): Element[] {
  const colors = designSystem.tokens.colors;

  // Preserve title, image and decoration elements from the design output so the quiz slide doesn't feel empty.
  const kept = existingElements.filter(
    (e) => e.semanticRole === 'title' || e.semanticRole === 'decoration' || e.type === 'image',
  );

  const quizContent: Record<string, unknown> = {
    type: quiz.type || 'single-choice',
    question: quiz.question || '请选择正确答案',
    explanation: quiz.explanation || '',
    allowRetry: true,
  };

  if ((quiz.type === 'single-choice' || quiz.type === 'multiple-choice') && quiz.options?.length) {
    const mappedOptions = quiz.options.map((opt, i) => ({
      id: `opt-${i}`,
      text: opt.text?.trim() ? opt.text.trim() : `选项 ${String.fromCharCode(65 + i)}`,
      isCorrect: !!opt.isCorrect,
    }));
    quizContent.options = mappedOptions;
    const correctOptions = mappedOptions.filter((o) => o.isCorrect);
    quizContent.correctAnswer = quiz.type === 'multiple-choice'
      ? correctOptions.map((o) => o.id)
      : (correctOptions[0]?.text || quiz.answer || '');
  } else if (quiz.type === 'fill-blank') {
    quizContent.correctAnswer = Array.isArray(quiz.answer) ? quiz.answer[0] || '' : quiz.answer || '';
    quizContent.placeholder = '请输入答案';
  } else if (quiz.type === 'reveal') {
    quizContent.correctAnswer = Array.isArray(quiz.answer) ? quiz.answer.join(', ') : quiz.answer || '';
  }

  // Find a good vertical position below the title if present.
  const titleElement = kept.find((e) => e.semanticRole === 'title');
  const quizY = titleElement ? titleElement.geometry.y + titleElement.geometry.height + 40 : 160;
  const quizHeight = Math.max(240, SLIDE_HEIGHT - quizY - 60);

  kept.push({
    id: generateId('el'),
    type: 'quiz',
    semanticRole: 'quiz',
    name: 'quiz',
    geometry: clampGeometry({ x: 60, y: quizY, width: 1160, height: quizHeight, zIndex: 2 }),
    content: quizContent,
    style: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
    },
    animation: {
      entrance: [{ id: generateId('anim'), type: 'fade', duration: 0.5, delay: 0.2, easing: 'power2.out', trigger: 'auto' }],
      exit: [],
    },
    interactions: [],
  });

  return kept;
}

function sanitizeSemanticRole(role: unknown): Element['semanticRole'] {
  if (typeof role === 'string' && VALID_SEMANTIC_ROLES.has(role)) {
    return role as Element['semanticRole'];
  }
  return 'tip';
}

function ensureDecorations(elements: Element[], designSystem: DesignSystem): void {
  const decorationCount = elements.filter((e) => e.type === 'shape' && e.semanticRole === 'decoration').length;
  if (decorationCount >= 2) return;

  const colors = designSystem.tokens.colors;
  const needed = 2 - decorationCount;
  for (let i = 0; i < needed; i++) {
    elements.push({
      id: generateId('el'),
      type: 'shape',
      semanticRole: 'decoration',
      name: 'decoration',
      geometry: clampGeometry({
        x: i === 0 ? 980 : 60,
        y: i === 0 ? 420 : 520,
        width: i === 0 ? 240 : 160,
        height: i === 0 ? 240 : 160,
        zIndex: 0,
      }),
      content: {
        shapeType: 'circle',
        fill: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
      },
      style: { opacity: 0.12 },
      animation: { entrance: [{ id: generateId('anim'), type: 'fade', duration: 0.5, delay: 0.2, easing: 'power2.out', trigger: 'auto' }], exit: [] },
      interactions: [],
    } as Element);
  }
}

function ensureDefaultAnimations(elements: Element[]): void {
  // Any visible element should have an entrance animation so SlideView doesn't leave it at opacity:0.
  // Only explicitly hidden roles (explanation/answer) should stay un-animated.
  const hiddenRoles = new Set(['explanation', 'answer']);
  let visibleIndex = 0;
  elements.forEach((el) => {
    const role = el.semanticRole || '';
    const isVisual = el.type === 'text' || el.type === 'image' || el.type === 'shape';
    if (!isVisual) return;
    if (hiddenRoles.has(role)) return;
    const entrance = el.animation?.entrance || [];
    if (entrance.length > 0) return;
    visibleIndex += 1;
    el.animation = {
      entrance: [
        {
          id: generateId('anim'),
          type: 'fade',
          duration: 0.4,
          delay: Math.min(visibleIndex * 0.08, 0.4),
          easing: 'power2.out',
          trigger: 'auto',
        },
      ],
      exit: [],
    };
  });
}

function clampGeometry(geometry: Element['geometry']): Element['geometry'] {
  const x = Math.max(0, Math.min(SLIDE_WIDTH, geometry.x));
  const y = Math.max(0, Math.min(SLIDE_HEIGHT, geometry.y));
  const width = Math.max(20, Math.min(SLIDE_WIDTH - x, geometry.width));
  const height = Math.max(20, Math.min(SLIDE_HEIGHT - y, geometry.height));
  return {
    ...geometry,
    x,
    y,
    width,
    height,
  };
}

function chooseDesignTheme(subjectHint?: string, description = ''): keyof typeof DESIGN_THEMES {
  const text = `${subjectHint || ''} ${description}`.toLowerCase();
  if (/语文|历史|政治|思政|地理|道德|法治|人文|文学/.test(text)) return 'humanities';
  if (/英语|日语|法语|德语|俄语|外语|语言/.test(text)) return 'language';
  if (/美术|音乐|体育|艺术|书法/.test(text)) return 'language';
  return 'academic';
}

function resolveDesignSystem(designSystemInput: Record<string, unknown> | undefined, subjectHint?: string, description = ''): DesignSystem {
  const themeKey = chooseDesignTheme(subjectHint, description);
  const theme = DESIGN_THEMES[themeKey].tokens;
  const tokens = (designSystemInput?.tokens || designSystemInput || {}) as Record<string, unknown>;
  const colors = (tokens.colors || {}) as Record<string, string>;
  const fonts = (tokens.fonts || {}) as Record<string, string>;
  const fontSizes = (tokens.fontSizes || {}) as Record<string, number>;
  const spacing = (tokens.spacing || {}) as Record<string, number>;
  const borderRadius = (tokens.borderRadius || {}) as Record<string, number>;
  const shadows = (tokens.shadows || {}) as Record<string, string>;

  return {
    id: (designSystemInput?.id as string) || DESIGN_THEMES[themeKey].id,
    name: (designSystemInput?.name as string) || DESIGN_THEMES[themeKey].name,
    tokens: {
      colors: {
        primary: colors.primary ?? theme.colors.primary,
        secondary: colors.secondary ?? theme.colors.secondary,
        success: colors.success ?? theme.colors.success,
        warning: colors.warning ?? theme.colors.warning,
        danger: colors.danger ?? theme.colors.danger,
        background: colors.background ?? theme.colors.background,
        surface: colors.surface ?? theme.colors.surface,
        text: colors.text ?? theme.colors.text,
        textMuted: colors.textMuted ?? theme.colors.textMuted,
        border: colors.border ?? theme.colors.border,
        accent: colors.accent ?? (theme.colors as Record<string, string>).accent ?? colors.primary ?? theme.colors.primary,
      },
      fonts: {
        heading: fonts.heading ?? theme.fonts.heading,
        body: fonts.body ?? theme.fonts.body,
        mono: fonts.mono ?? theme.fonts.mono,
      },
      fontSizes: {
        xs: fontSizes.xs ?? theme.fontSizes.xs,
        sm: fontSizes.sm ?? theme.fontSizes.sm,
        base: fontSizes.base ?? theme.fontSizes.base,
        lg: fontSizes.lg ?? theme.fontSizes.lg,
        xl: fontSizes.xl ?? theme.fontSizes.xl,
        '2xl': fontSizes['2xl'] ?? theme.fontSizes['2xl'],
        '3xl': fontSizes['3xl'] ?? theme.fontSizes['3xl'],
        '4xl': fontSizes['4xl'] ?? theme.fontSizes['4xl'],
      },
      spacing: {
        xs: spacing.xs ?? theme.spacing.xs,
        sm: spacing.sm ?? theme.spacing.sm,
        md: spacing.md ?? theme.spacing.md,
        lg: spacing.lg ?? theme.spacing.lg,
        xl: spacing.xl ?? theme.spacing.xl,
        '2xl': spacing['2xl'] ?? theme.spacing['2xl'],
      },
      borderRadius: {
        sm: borderRadius.sm ?? theme.borderRadius.sm,
        md: borderRadius.md ?? theme.borderRadius.md,
        lg: borderRadius.lg ?? theme.borderRadius.lg,
        xl: borderRadius.xl ?? theme.borderRadius.xl,
        full: borderRadius.full ?? theme.borderRadius.full,
      },
      shadows: {
        sm: shadows.sm ?? (theme.shadows ? theme.shadows.sm : '0 1px 2px 0 rgb(0 0 0 / 0.05)'),
        md: shadows.md ?? (theme.shadows ? theme.shadows.md : '0 4px 6px -1px rgb(0 0 0 / 0.1)'),
        lg: shadows.lg ?? (theme.shadows ? theme.shadows.lg : '0 10px 15px -3px rgb(0 0 0 / 0.1)'),
      },
    },
  };
}

interface AssembleInput {
  documentId: string;
  filename: string;
  description: string;
  outline: OutlineResult;
  content: ContentResult;
  design: DesignResult;
  animation: AnimationResult;
  imageDecisions?: Map<string, ImageAgentDecision>;
  imageProvider?: ImageProvider;
}

function inferSubject(input: AssembleInput): string {
  const text = `${input.description} ${input.filename} ${input.outline.title}`.toLowerCase();
  if (/语文|历史|政治|思政|地理|道德|法治|人文|文学/.test(text)) return 'humanities';
  if (/英语|日语|法语|德语|俄语|外语|语言/.test(text)) return 'language';
  if (/美术|音乐|体育|艺术|书法/.test(text)) return 'language';
  if (/数学|物理|化学|生物|科学|信息技术|编程|ai|人工智能|计算机/.test(text)) return 'science';
  return 'general';
}

function extractBodyExcerpt(slide: { elements: Element[] }): string {
  const parts: string[] = [];
  const roles = new Set(['body', 'caption', 'question', 'explanation', 'example']);
  for (const el of slide.elements) {
    if (el.type !== 'text') continue;
    if (!roles.has(el.semanticRole || '')) continue;
    const text = (el.content as { text?: string }).text || '';
    if (text.trim()) parts.push(text.trim());
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim().slice(0, 80);
}

function getVisibleElements(slide: Slide): Element[] {
  return slide.elements.filter((el) => {
    // Ignore pure decorations when judging content balance.
    if (el.type === 'shape' && el.semanticRole === 'decoration') return false;
    return true;
  });
}

function computeBalanceMetrics(slide: Slide): { visibleElements: Element[]; totalArea: number; leftArea: number; rightArea: number } {
  const visibleElements = getVisibleElements(slide);
  const totalArea = visibleElements.reduce((sum, el) => sum + el.geometry.width * el.geometry.height, 0);
  const leftArea = visibleElements
    .filter((el) => el.geometry.x + el.geometry.width / 2 < SLIDE_WIDTH / 2)
    .reduce((sum, el) => sum + el.geometry.width * el.geometry.height, 0);
  const rightArea = totalArea - leftArea;
  return { visibleElements, totalArea, leftArea, rightArea };
}

function checkVisualBalance(slide: Slide, index: number): void {
  const { visibleElements, totalArea, leftArea, rightArea } = computeBalanceMetrics(slide);
  if (visibleElements.length === 0 || totalArea <= 0) return;

  if (leftArea / totalArea > 0.55 && rightArea / totalArea < 0.2) {
    logger.warn(
      `Slide ${index + 1} (${slide.title || '未命名'}) is left-heavy: left=${Math.round((leftArea / totalArea) * 100)}%, right=${Math.round((rightArea / totalArea) * 100)}%`,
    );
  }

  if (visibleElements.length > 6) {
    logger.warn(`Slide ${index + 1} (${slide.title || '未命名'}) has ${visibleElements.length} visible elements, exceeding recommended 6`);
  }

  const images = visibleElements.filter((el) => el.type === 'image');
  const texts = visibleElements.filter((el) => el.type === 'text');
  for (const img of images) {
    const imgCenterX = img.geometry.x + img.geometry.width / 2;
    const imgCenterY = img.geometry.y + img.geometry.height / 2;
    let minDist = Infinity;
    for (const t of texts) {
      const cx = t.geometry.x + t.geometry.width / 2;
      const cy = t.geometry.y + t.geometry.height / 2;
      const dx = cx - imgCenterX;
      const dy = cy - imgCenterY;
      minDist = Math.min(minDist, Math.sqrt(dx * dx + dy * dy));
    }
    if (minDist > 200) {
      logger.warn(
        `Slide ${index + 1} (${slide.title || '未命名'}) has an isolated image: distance to nearest text is ${Math.round(minDist)}px`,
      );
    }
  }
}

function findNearestTextDistance(img: Element, texts: Element[]): number {
  const imgCenterX = img.geometry.x + img.geometry.width / 2;
  const imgCenterY = img.geometry.y + img.geometry.height / 2;
  let minDist = Infinity;
  for (const t of texts) {
    const cx = t.geometry.x + t.geometry.width / 2;
    const cy = t.geometry.y + t.geometry.height / 2;
    const dx = cx - imgCenterX;
    const dy = cy - imgCenterY;
    minDist = Math.min(minDist, Math.sqrt(dx * dx + dy * dy));
  }
  return minDist;
}

function hasNearbyCaption(img: Element, elements: Element[]): boolean {
  const imgCenterX = img.geometry.x + img.geometry.width / 2;
  const imgCenterY = img.geometry.y + img.geometry.height / 2;
  for (const el of elements) {
    if (el.type !== 'text' || el.semanticRole !== 'caption') continue;
    const cx = el.geometry.x + el.geometry.width / 2;
    const cy = el.geometry.y + el.geometry.height / 2;
    const dx = cx - imgCenterX;
    const dy = cy - imgCenterY;
    if (Math.sqrt(dx * dx + dy * dy) < 240) return true;
  }
  return false;
}

function fixIsolatedImages(slide: Slide, designSystem: DesignSystem): void {
  const visibleElements = getVisibleElements(slide);
  const images = visibleElements.filter((el) => el.type === 'image');
  const texts = visibleElements.filter((el) => el.type === 'text');
  if (images.length === 0 || texts.length === 0) return;

  for (const img of images) {
    if (findNearestTextDistance(img, texts) <= 200) continue;
    if (hasNearbyCaption(img, slide.elements)) continue;

    const captionText = ((img.content.alt as string) || slide.title || '配图说明').slice(0, 24);
    const caption: Element = {
      id: generateId('el'),
      type: 'text',
      semanticRole: 'caption',
      name: '配图说明',
      geometry: clampGeometry({
        x: img.geometry.x + 20,
        y: img.geometry.y + img.geometry.height + 16,
        width: Math.max(60, img.geometry.width - 40),
        height: 40,
        zIndex: (img.geometry.zIndex || 1) + 1,
      }),
      content: { text: captionText },
      style: {
        color: designSystem.tokens.colors.textMuted,
        fontSize: designSystem.tokens.fontSizes.lg,
        textAlign: 'center',
        lineHeight: 1.4,
      },
      animation: {
        entrance: [{ id: generateId('anim'), type: 'fade', duration: 0.4, delay: 0.1, easing: 'power2.out', trigger: 'auto' }],
        exit: [],
      },
      interactions: [],
    };
    slide.elements.push(caption);
    texts.push(caption);
    logger.log(`Added caption for isolated image on slide "${slide.title || '未命名'}"`);
  }
}

function fixLeftHeavySlides(slide: Slide, designSystem: DesignSystem): void {
  const { visibleElements, totalArea, leftArea, rightArea } = computeBalanceMetrics(slide);
  if (visibleElements.length === 0 || totalArea <= 0) return;
  if (!(leftArea / totalArea > 0.55 && rightArea / totalArea < 0.2)) return;

  const colors = designSystem.tokens.colors;
  const seed = slide.order ?? 0;
  const palette = [colors.primary, colors.accent, colors.secondary];
  const fill = palette[seed % palette.length];
  const shapes: Array<'circle' | 'rectangle' | 'rounded-rectangle'> = ['circle', 'rectangle', 'rounded-rectangle'];
  const shapeType = shapes[seed % shapes.length];

  const anchor: Element = {
    id: generateId('el'),
    type: 'shape',
    semanticRole: 'shape',
    name: 'balance-anchor',
    geometry: clampGeometry({
      x: 1000 + (seed % 3) * 40,
      y: 280 + (seed % 4) * 60,
      width: 80 + (seed % 3) * 20,
      height: 80 + (seed % 3) * 20,
      zIndex: 0,
    }),
    content: {
      shapeType,
      fill,
    },
    style: { opacity: 0.14 },
    animation: {
      entrance: [{ id: generateId('anim'), type: 'fade', duration: 0.5, delay: 0.2, easing: 'power2.out', trigger: 'auto' }],
      exit: [],
    },
    interactions: [],
  };
  slide.elements.push(anchor);
  logger.log(`Added right-side anchor for left-heavy slide "${slide.title || '未命名'}"`);
}

function fixVisualBalance(slide: Slide, designSystem: DesignSystem): void {
  fixIsolatedImages(slide, designSystem);
  fixLeftHeavySlides(slide, designSystem);
}

function normalizeBackground(
  background: Slide['background'] | undefined,
  designSystem: DesignSystem,
): Slide['background'] {
  const bg = background || { color: designSystem.tokens.colors.background };
  const color = bg.color || designSystem.tokens.colors.background;
  // Add a subtle theme-aware gradient to any plain background so pages feel layered and lively.
  if (!bg.gradient) {
    return { ...bg, gradient: `linear-gradient(135deg, ${color}, ${designSystem.tokens.colors.surface})` };
  }
  return bg;
}

export async function assembleCourseware(input: AssembleInput): Promise<Courseware> {
  const { filename, description, outline, content, design, animation, imageDecisions } = input;

  const subject = inferSubject(input);
  const designSystem = resolveDesignSystem(design.designSystem, subject, description);
  const now = new Date().toISOString();

  const slides: Slide[] = outline.slides.map((outlineSlide, index) => {
    const order = outlineSlide.order ?? index;
    const contentSlide = content.slides.find((s) => (s.order ?? -1) === order) || content.slides[index];
    const designSlide = design.slides.find((s) => (s.order ?? -1) === order) || design.slides[index];
    const animationSlide = animation.slides.find((s) => (s.order ?? -1) === order) || animation.slides[index];

    const slideId = generateId('slide');

    const elements: Element[] = (designSlide?.elements || []).map((designEl, elIndex) => {
      const semanticRole = sanitizeSemanticRole(designEl.semanticRole);
      const animationEl = animationSlide?.elements?.find(
        (ae) => ae.semanticRole === designEl.semanticRole || ae.semanticRole === semanticRole || ae.semanticRole === `el-${elIndex}`,
      );

      const baseContent: Record<string, unknown> = { ...(designEl.content || {}) };

      if (designEl.type === 'text') {
        const text = (baseContent.text as string) || contentSlide?.body || '';
        baseContent.text = text;
      }

      if (designEl.type === 'quiz' && contentSlide?.quiz) {
        const q = contentSlide.quiz;
        baseContent.type = q.type || 'reveal';
        baseContent.question = q.question;
        baseContent.options = q.options?.map((o, i) => ({
          id: `opt-${i}`,
          text: o.text,
          isCorrect: o.isCorrect ?? false,
          explanation: q.explanation,
        }));
        baseContent.correctAnswer = q.answer;
        baseContent.explanation = q.explanation;
        baseContent.allowRetry = true;
      }

      if (designEl.type === 'shape') {
        baseContent.shapeType = baseContent.shapeType || 'rectangle';
        if (!baseContent.fill && designEl.style?.fill) {
          baseContent.fill = designEl.style.fill;
        }
        if (!baseContent.fill && designEl.style?.backgroundColor) {
          baseContent.fill = designEl.style.backgroundColor;
        }
        if (!baseContent.fill) {
          baseContent.fill = designSystem.tokens.colors.primary;
        }
      }

      const geometry = clampGeometry({
        x: designEl.geometry?.x ?? 80,
        y: designEl.geometry?.y ?? 80,
        width: designEl.geometry?.width ?? 200,
        height: designEl.geometry?.height ?? 100,
        zIndex: designEl.geometry?.zIndex ?? elIndex + 1,
      });

      const style = mergeStyle(semanticRole, designSystem, designEl.style);

      return {
        id: generateId('el'),
        type: designEl.type as Element['type'],
        semanticRole,
        name: (designEl.semanticRole as string) || `${designEl.type}-${elIndex}`,
        geometry,
        content: baseContent,
        style,
        animation: {
          entrance: (animationEl?.animation?.entrance || []).map((step) => {
            const type = VALID_ANIMATION_TYPES.includes(step.type as AnimationStep['type'])
              ? (step.type as AnimationStep['type'])
              : 'fade';
            const easing = VALID_EASINGS.includes(step.easing as AnimationStep['easing'])
              ? (step.easing as AnimationStep['easing'])
              : 'power2.out';
            return {
              id: generateId('anim'),
              type,
              duration: typeof step.duration === 'number' ? Math.min(Math.max(step.duration, 0.1), 0.5) : 0.4,
              delay: Math.min(step.delay ?? 0, 0.5),
              easing,
              trigger: step.trigger ?? 'auto',
            };
          }),
          exit: [],
        },
        interactions: [],
      };
    });

    if (!elements.some((e) => e.semanticRole === 'title')) {
      elements.unshift({
        id: generateId('el'),
        type: 'text',
        semanticRole: 'title',
        name: '标题',
        geometry: clampGeometry({ x: 80, y: 60, width: 1120, height: 80, zIndex: 1 }),
        content: { text: outlineSlide.title },
        style: {
          color: designSystem.tokens.colors.text,
          fontSize: 44,
          fontWeight: 700,
        },
        animation: {
          entrance: [{ id: generateId('anim'), type: 'fade', duration: 0.5, delay: 0, easing: 'power2.out', trigger: 'auto' }],
          exit: [],
        },
        interactions: [],
      });
    }

    // Normalize visual defaults so AI output never feels faint or too small.
    elements.forEach((el) => normalizeElement(el, designSystem));

    // Reflow text elements to avoid clipping/overflow on classroom screens.
    fitAllTextElements(elements);

    // Guarantee a minimum level of decoration so slides never feel empty.
    ensureDecorations(elements, designSystem);

    // Rebuild quiz slides with truly interactive elements for all supported quiz types.
    if (contentSlide?.quiz && (contentSlide.quiz.options?.length || contentSlide.quiz.answer)) {
      const rebuilt = buildQuizSlideElements(slideId, contentSlide.quiz, designSystem, elements);
      elements.length = 0;
      elements.push(...rebuilt);
      ensureDecorations(elements, designSystem);
    }

    // Make sure every visible element has at least a quick entrance animation.
    ensureDefaultAnimations(elements);

    const hasQuiz = !!contentSlide?.quiz;

    const slide: Slide = {
      id: slideId,
      order,
      title: outlineSlide.title,
      learningObjective: outlineSlide.learningObjective || contentSlide?.title,
      layout: {
        templateId: outlineSlide.layoutTemplateId || 'content',
        variant: 'default',
        constraints: [],
      },
      background: normalizeBackground(designSlide?.background, designSystem),
      elements,
      transition: sanitizeTransition(animationSlide?.transition),
      timeline: { autoPlay: true },
      aiAssistant: hasQuiz
        ? {
            enabled: true,
            contextScope: 'slide',
            welcomeMessage: '我是本页 AI 助手，可以帮你理解这道题目。',
            suggestedQuestions: ['这道题考查什么？', '为什么选这个答案？'],
          }
        : undefined,
    };

    // Auto-fix visual balance issues (isolated images, left-heavy slides) before the final check.
    fixVisualBalance(slide, designSystem);
    fitAllTextElements(slide.elements);
    ensureDefaultAnimations(slide.elements);

    return slide;
  });

  slides.forEach((slide, index) => checkVisualBalance(slide, index));

  const assets: Asset[] = [];
  const assetIdSet = new Set<string>();

  // Generate themed images or SVG placeholders for any image element without a real asset.
  // We process sequentially to avoid hammering the image provider and to get clearer logs.
  const imageRequests: { slide: Slide; el: Element; key: string }[] = [];
  for (const slide of slides) {
    for (const el of slide.elements) {
      if (el.type === 'image') {
        imageRequests.push({ slide, el, key: `${slide.order}-${el.id}` });
      }
    }
  }
  logger.log(`Generating ${imageRequests.length} image assets`);

  // Process images with limited concurrency to reduce total time while respecting provider rate limits.
  const CONCURRENCY = 2;
  const queue = [...imageRequests];
  async function processNext(): Promise<void> {
    while (queue.length > 0) {
      const { slide, el, key } = queue.shift()!;
      const assetId = (el.content.assetId as string) || '';
      const alt = (el.content.alt as string) || '';
      if (!assetId && alt && !assetIdSet.has(alt)) {
        try {
          const decision = imageDecisions?.get(key);
          if (decision?.type === 'svg' && decision.svg) {
            const svgDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(decision.svg.replace(/\n\s*/g, ''))}`;
            const asset: Asset = {
              id: `asset-img-svg-${key}`,
              type: 'image',
              filename: `image-${key}.svg`,
              mimeType: 'image/svg+xml',
              url: svgDataUrl,
              width: el.geometry.width,
              height: el.geometry.height,
              description: alt,
            };
            el.content.assetId = asset.id;
            assets.push(asset);
            assetIdSet.add(alt);
            continue;
          }
          const context: ImageContext = {
            slideTitle: slide.title,
            bodyExcerpt: extractBodyExcerpt(slide),
            subject: description,
          };
          const asset = await createImageAsset(alt, designSystem, el.geometry.width, el.geometry.height, context, decision, input.imageProvider);
          el.content.assetId = asset.id;
          assets.push(asset);
          assetIdSet.add(alt);
        } catch (err) {
          logger.warn(`Failed to create image asset for "${alt.slice(0, 60)}": ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => processNext()));

  logger.log(`Asset generation complete: ${assets.length}/${imageRequests.length} assets`);

  return {
    id: generateId('cw'),
    version: '1.0',
    title: outline.title || filename.replace(/\.[^/.]+$/, ''),
    topicDescription: description,
    designSystem,
    slides,
    assets,
    createdAt: now,
    updatedAt: now,
  } as Courseware;
}
