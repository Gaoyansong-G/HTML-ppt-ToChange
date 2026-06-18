import { z } from 'zod';
import { BaseAgent, type AgentContext, type AgentResult } from './base.agent';
import { VISUAL_PROMPT } from '../prompts';

const AnimationStepSchema = z.object({
  type: z.string(),
  duration: z.number(),
  delay: z.number().default(0),
  easing: z.string().default('power2.out'),
  trigger: z.enum(['auto', 'click', 'after-prev', 'with-prev']).default('auto'),
});

const GeometrySchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  zIndex: z.number().default(1),
});

const VisualElementSchema = z.object({
  type: z.enum(['text', 'shape', 'image', 'quiz']),
  semanticRole: z.string().optional(),
  geometry: GeometrySchema,
  style: z.record(z.any()).default({}),
  content: z.record(z.any()).optional(),
  animation: z.object({
    entrance: z.array(AnimationStepSchema).default([]),
    exit: z.array(AnimationStepSchema).default([]),
  }).default({ entrance: [], exit: [] }),
});

const VisualSlideSchema = z.object({
  order: z.number(),
  background: z.record(z.any()).default({}),
  transition: z.record(z.any()).default({}),
  elements: z.array(VisualElementSchema),
});

const VisualResultSchema = z.object({
  designSystem: z.record(z.any()),
  slides: z.array(VisualSlideSchema),
});

export type VisualElement = z.infer<typeof VisualElementSchema>;
export type VisualSlide = z.infer<typeof VisualSlideSchema>;
export type VisualResult = z.infer<typeof VisualResultSchema>;

export class VisualAgent extends BaseAgent<VisualResult> {
  async execute(context: AgentContext): Promise<AgentResult<VisualResult>> {
    const userPrompt = this.fillPrompt(VISUAL_PROMPT, {
      content: JSON.stringify(context.previousResults?.content, null, 2),
      subject: context.subject,
    });

    const systemPrompt = '你是课件视觉与动画设计专家。请严格按用户要求的 JSON Schema 输出，包含 designSystem 和 slides 两个顶层字段；每页元素必须包含 animation.entrance，每页必须包含 transition。';

    const result = await this.callLLMWithRepair(systemPrompt, userPrompt, (raw) => {
      const parsed = this.safeJsonParse(raw);
      const validated = VisualResultSchema.safeParse(parsed);
      if (validated.success) {
        return { success: true, data: validated.data };
      }
      return { success: false, error: validated.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ') };
    });

    return result;
  }
}
