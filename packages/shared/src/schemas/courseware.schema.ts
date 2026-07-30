import { z } from 'zod';
import { SlideSchema } from './slide.schema';
import { TeachingScriptSchema } from './teaching-script.schema';

export const DocumentNodeType = z.enum([
  'heading',
  'paragraph',
  'list',
  'listItem',
  'table',
  'tableRow',
  'tableCell',
  'image',
  'formula',
  'pageBreak',
  'section',
]);

export const DocumentNodeSchema: z.ZodType = z.lazy(() =>
  z.object({
    id: z.string().optional(),
    type: DocumentNodeType,
    content: z.string().optional(),
    level: z.number().int().min(1).max(6).optional(),
    metadata: z.record(z.any()).optional(),
    children: z.array(DocumentNodeSchema).optional(),
  })
);

export const AssetSchema = z.object({
  id: z.string(),
  type: z.enum(['image', 'audio', 'video', 'font', 'other']),
  filename: z.string(),
  mimeType: z.string(),
  url: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
  size: z.number().optional(),
  description: z.string().optional(),
});

export const DesignTokenSchema = z.object({
  colors: z.record(z.string()),
  fonts: z.record(z.string()),
  fontSizes: z.record(z.number()),
  spacing: z.record(z.number()),
  borderRadius: z.record(z.number()),
  shadows: z.record(z.string()).optional(),
});

export const DesignSystemSchema = z.object({
  id: z.string(),
  name: z.string(),
  tokens: DesignTokenSchema,
  templates: z.array(z.string()).optional(),
});

export const SourceDocumentSchema = z.object({
  filename: z.string(),
  extractedText: z.string(),
  structure: z.array(DocumentNodeSchema),
});

export const CoursewareSchema = z.object({
  id: z.string(),
  version: z.literal('1.0'),
  /**
   * Persistence revision used for optimistic concurrency control.
   * Optional so coursewares created before document versioning remain valid.
   */
  revision: z.number().int().positive().optional(),
  title: z.string(),
  topicDescription: z.string(),
  /** 学科（v2） */
  subject: z.string().optional(),
  /** 学段（v2） */
  gradeLevel: z.enum(['primary', 'middle', 'high', 'unknown']).optional(),
  /** 教学分镜脚本（v2 两阶段生成产物，保留用于溯源与再生成） */
  teachingScript: TeachingScriptSchema.optional(),
  /** 预置问答（离线兜底：导出 HTML 无网络时 AI 助手本地应答） */
  presetQA: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .optional(),
  sourceDocument: SourceDocumentSchema.optional(),
  designSystem: DesignSystemSchema,
  slides: z.array(SlideSchema).min(1, '课件至少需要一页'),
  assets: z.array(AssetSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
