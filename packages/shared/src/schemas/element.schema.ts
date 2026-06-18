import { z } from 'zod';
import { ElementAnimationSchema } from './animation.schema';
import { InteractionConfigSchema } from './interaction.schema';

export const ElementType = z.enum([
  'text',
  'image',
  'shape',
  'quiz',
  'group',
  'ai-chat',
  'pointer',
  'formula',
  'diagram',
  'audio',
  'video',
]);

export const SemanticRole = z.enum([
  'title',
  'subtitle',
  'body',
  'caption',
  'question',
  'answer',
  'option',
  'option-bg',
  'explanation',
  'example',
  'tip',
  'annotation',
  'quiz',
  'decoration',
  'shape',
  'image',
  'icon',
  'divider',
]);

export const GeometrySchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  rotation: z.number().optional(),
  zIndex: z.number().int().default(0),
});

export const ElementStyleSchema = z.object({
  color: z.string().optional(),
  backgroundColor: z.string().optional(),
  fontSize: z.number().optional(),
  fontFamily: z.string().optional(),
  fontWeight: z.union([z.string(), z.number()]).optional(),
  fontStyle: z.string().optional(),
  lineHeight: z.number().optional(),
  letterSpacing: z.number().optional(),
  textAlign: z.enum(['left', 'center', 'right', 'justify']).optional(),
  textDecoration: z.string().optional(),
  borderRadius: z.number().optional(),
  borderWidth: z.number().optional(),
  borderColor: z.string().optional(),
  borderStyle: z.enum(['solid', 'dashed', 'dotted', 'none']).optional(),
  padding: z.number().optional(),
  opacity: z.number().min(0).max(1).optional(),
  shadow: z.string().optional(),
});

export const TextContentSchema = z.object({
  text: z.string(),
  html: z.boolean().default(false),
  placeholder: z.string().optional(),
});

export const ImageContentSchema = z.object({
  assetId: z.string(),
  alt: z.string().optional(),
  objectFit: z.enum(['cover', 'contain', 'fill']).default('contain'),
});

export const ShapeType = z.enum([
  'rectangle',
  'circle',
  'triangle',
  'arrow',
  'line',
  'star',
  'callout',
]);

export const ShapeContentSchema = z.object({
  shapeType: ShapeType,
  fill: z.string().optional(),
  stroke: z.string().optional(),
  strokeWidth: z.number().default(1),
});

export const QuizType = z.enum([
  'single-choice',
  'multiple-choice',
  'fill-blank',
  'reveal',
  'drag-drop',
]);

export const QuizOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
  isCorrect: z.boolean().default(false),
  explanation: z.string().optional(),
});

export const QuizContentSchema = z.object({
  question: z.string(),
  type: QuizType,
  options: z.array(QuizOptionSchema).optional(),
  correctAnswer: z.union([z.string(), z.array(z.string())]).optional(),
  explanation: z.string().optional(),
  hint: z.string().optional(),
  allowRetry: z.boolean().default(true),
});

export const AIChatContentSchema = z.object({
  welcomeMessage: z.string().optional(),
  suggestedQuestions: z.array(z.string()).optional(),
});

export const PointerContentSchema = z.object({
  pointerType: z.enum(['laser', 'spotlight', 'magnifier']).default('laser'),
  size: z.number().default(20),
  color: z.string().default('#ff0000'),
});

export const FormulaContentSchema = z.object({
  latex: z.string(),
  displayMode: z.boolean().default(false),
});

export const DiagramContentSchema = z.object({
  type: z.enum(['mermaid', 'excalidraw', 'custom']),
  definition: z.string(),
});

export const AudioContentSchema = z.object({
  assetId: z.string(),
  autoPlay: z.boolean().default(false),
  loop: z.boolean().default(false),
});

export const VideoContentSchema = z.object({
  assetId: z.string(),
  autoPlay: z.boolean().default(false),
  loop: z.boolean().default(false),
  controls: z.boolean().default(true),
});

export const ElementContentSchema = z.union([
  TextContentSchema,
  ImageContentSchema,
  ShapeContentSchema,
  QuizContentSchema,
  AIChatContentSchema,
  PointerContentSchema,
  FormulaContentSchema,
  DiagramContentSchema,
  AudioContentSchema,
  VideoContentSchema,
]);

export const ElementSchema = z.object({
  id: z.string(),
  type: ElementType,
  semanticRole: SemanticRole.optional(),
  name: z.string().optional(),
  geometry: GeometrySchema,
  content: z.record(z.any()), // Runtime validation per type
  style: ElementStyleSchema.default({}),
  animation: ElementAnimationSchema.default({ entrance: [], exit: [] }),
  interactions: z.array(InteractionConfigSchema).default([]),
});
