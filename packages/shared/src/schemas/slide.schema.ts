import { z } from 'zod';
import {
  SlideTransitionSchema,
  TimelineConfigSchema,
} from './animation.schema';
import { ElementSchema } from './element.schema';
import {
  AIAssistantConfigSchema,
  StateMachineConfigSchema,
} from './interaction.schema';

export const LayoutConstraintSchema = z.object({
  id: z.string(),
  type: z.enum(['align', 'position', 'size', 'spacing']),
  target: z.string(),
  value: z.any(),
});

export const SlideLayoutSchema = z.object({
  templateId: z.string(),
  variant: z.string().default('default'),
  constraints: z.array(LayoutConstraintSchema).default([]),
});

export const BackgroundSchema = z.object({
  color: z.string().optional(),
  imageAssetId: z.string().optional(),
  gradient: z.string().optional(),
  pattern: z.string().optional(),
});

export const SlideSchema = z.object({
  id: z.string(),
  order: z.number().int().min(0),
  title: z.string().optional(),
  learningObjective: z.string().optional(),
  /** 教学环节（v2：来自教学脚本） */
  phase: z
    .enum(['lead-in', 'objectives', 'teaching', 'practice', 'summary', 'homework'])
    .optional(),
  /** 教师讲稿备注 */
  speakerNotes: z.string().optional(),
  /** 内容溯源：引用的源文档段落 */
  sourceRefs: z.array(z.string()).optional(),
  layout: SlideLayoutSchema,
  background: BackgroundSchema.default({}),
  elements: z.array(ElementSchema),
  transition: SlideTransitionSchema.default({ type: 'fade', duration: 0.8 }),
  timeline: TimelineConfigSchema.default({ autoPlay: true }),
  stateMachine: StateMachineConfigSchema.optional(),
  aiAssistant: AIAssistantConfigSchema.optional(),
});
