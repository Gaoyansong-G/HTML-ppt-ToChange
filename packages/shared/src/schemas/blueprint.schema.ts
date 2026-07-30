import { z } from 'zod';

/**
 * PageBlueprint：LLM 语义编排层的输出契约。
 * LLM 只输出"选什么版式、填什么槽位"，绝不输出坐标/字号/颜色。
 * 几何与视觉由确定性布局引擎 + Block 渲染器负责。
 */

/* ---------- 复杂槽位值的 Schema（用于校验 LLM 输出） ---------- */

export const TableSlotSchema = z.object({
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())),
});

export const StepSlotSchema = z.object({
  title: z.string(),
  detail: z.string().default(''),
});

export const PairSlotSchema = z.object({
  left: z.string(),
  right: z.string(),
});

export const TimelineEventSlotSchema = z.object({
  time: z.string(),
  event: z.string(),
  detail: z.string().default(''),
});

export const VocabWordSlotSchema = z.object({
  word: z.string(),
  phonetic: z.string().default(''),
  meaning: z.string(),
  example: z.string().default(''),
});

export const DialogueTurnSlotSchema = z.object({
  speaker: z.string(),
  text: z.string(),
  translation: z.string().default(''),
});

export const QuizSlotSchema = z.object({
  question: z.string(),
  type: z.enum(['single-choice', 'multiple-choice', 'fill-blank', 'reveal']),
  options: z
    .array(
      z.object({
        text: z.string(),
        isCorrect: z.boolean().default(false),
      }),
    )
    .optional(),
  correctAnswer: z.union([z.string(), z.array(z.string())]).optional(),
  explanation: z.string().default(''),
});

export const PoemSlotSchema = z.object({
  title: z.string(),
  author: z.string(),
  dynasty: z.string().default(''),
  lines: z.array(z.string()),
  translation: z.string().default(''),
  appreciation: z.string().default(''),
});

export const ExperimentSlotSchema = z.object({
  name: z.string(),
  materials: z.array(z.string()),
  steps: z.array(StepSlotSchema),
  observation: z.string().default(''),
  conclusion: z.string().default(''),
});

/* ---------- Block 蓝图 ---------- */

export const BlockBlueprintSchema = z.object({
  blockType: z.string(),
  variant: z.string().default('default'),
  slots: z.record(z.any()),
  emphasis: z.array(z.string()).default([]), // 需要视觉强调的槽位 key
  assetRequest: z
    .object({
      slot: z.string(),              // 需要配图的槽位
      description: z.string(),       // 配图内容描述
      style: z.string().optional(),  // 风格要求
    })
    .optional(),
});

export const PageBlueprintSchema = z.object({
  id: z.string(),
  title: z.string(),
  phase: z
    .enum(['lead-in', 'objectives', 'teaching', 'practice', 'summary', 'homework'])
    .default('teaching'),
  speakerNotes: z.string().default(''),
  sourceRefs: z.array(z.string()).default([]),
  blocks: z.array(BlockBlueprintSchema).min(1),
});

export type TableSlot = z.infer<typeof TableSlotSchema>;
export type StepSlot = z.infer<typeof StepSlotSchema>;
export type PairSlot = z.infer<typeof PairSlotSchema>;
export type TimelineEventSlot = z.infer<typeof TimelineEventSlotSchema>;
export type VocabWordSlot = z.infer<typeof VocabWordSlotSchema>;
export type DialogueTurnSlot = z.infer<typeof DialogueTurnSlotSchema>;
export type QuizSlot = z.infer<typeof QuizSlotSchema>;
export type PoemSlot = z.infer<typeof PoemSlotSchema>;
export type ExperimentSlot = z.infer<typeof ExperimentSlotSchema>;
export type BlockBlueprint = z.infer<typeof BlockBlueprintSchema>;
export type PageBlueprint = z.infer<typeof PageBlueprintSchema>;
