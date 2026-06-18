import { z } from 'zod';
import { BaseAgent, type AgentContext, type AgentResult } from './base.agent';
import { DESIGN_PROMPT } from '../prompts';

const GeometrySchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  zIndex: z.number().default(1),
});

const DesignElementSchema = z.object({
  type: z.enum(['text', 'shape', 'image', 'quiz']),
  semanticRole: z.string().optional(),
  geometry: GeometrySchema,
  style: z.record(z.any()).default({}),
  content: z.record(z.any()).optional(),
});

const DesignSlideSchema = z.object({
  order: z.number(),
  background: z.record(z.any()).default({}),
  elements: z.array(DesignElementSchema),
});

const DesignResultSchema = z.object({
  designSystem: z.record(z.any()),
  slides: z.array(DesignSlideSchema),
});

export type DesignResult = z.infer<typeof DesignResultSchema>;

export class DesignAgent extends BaseAgent<DesignResult> {
  async execute(context: AgentContext): Promise<AgentResult<DesignResult>> {
    const content = context.previousResults?.content as { slides?: { order: number }[] } | undefined;
    const userPrompt = this.fillPrompt(DESIGN_PROMPT, {
      content: JSON.stringify(content, null, 2),
      subject: context.subject,
      slideCount: String(content?.slides?.length ?? 0),
      gradeLevel: context.options?.gradeLevel ?? 'unknown',
    });

    const systemPrompt = '你是课件视觉设计专家。请严格按用户要求的 JSON Schema 输出，包含 designSystem 和 slides 两个顶层字段。';

    const result = await this.callLLMWithRepair(systemPrompt, userPrompt, (raw) => {
      const parsed = this.safeJsonParse(raw);
      const validated = DesignResultSchema.safeParse(parsed);
      if (validated.success) {
        return { success: true, data: validated.data };
      }
      return { success: false, error: validated.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ') };
    });

    return result;
  }
}
