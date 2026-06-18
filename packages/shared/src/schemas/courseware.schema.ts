import { z } from 'zod';
import { SlideSchema } from './slide.schema';

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
  title: z.string(),
  topicDescription: z.string(),
  sourceDocument: SourceDocumentSchema.optional(),
  designSystem: DesignSystemSchema,
  slides: z.array(SlideSchema),
  assets: z.array(AssetSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
