import { z } from 'zod';
import { BaseAgent, type AgentContext, type AgentResult } from './base.agent';
import { ANIMATION_PROMPT } from '../prompts';

const AnimationStepSchema = z.object({
  type: z.string(),
  duration: z.number(),
  delay: z.number().default(0),
  easing: z.string().default('power2.out'),
  trigger: z.enum(['auto', 'click', 'after-prev', 'with-prev']).default('auto'),
});

const AnimationElementSchema = z.object({
  semanticRole: z.string(),
  animation: z.object({
    entrance: z.array(AnimationStepSchema).default([]),
  }),
});

const AnimationSlideSchema = z.object({
  order: z.number(),
  transition: z.record(z.any()).default({}),
  elements: z.array(AnimationElementSchema),
});

const AnimationResultSchema = z.object({
  slides: z.array(AnimationSlideSchema),
});

export type AnimationResult = z.infer<typeof AnimationResultSchema>;

export class AnimationAgent extends BaseAgent<AnimationResult> {
  async execute(context: AgentContext): Promise<AgentResult<AnimationResult>> {
    const userPrompt = this.fillPrompt(ANIMATION_PROMPT, {
      slides: JSON.stringify(context.previousResults?.design, null, 2),
    });

    const systemPrompt = '你是课件动画编排专家。请严格按要求的 JSON Schema 输出。';

    const result = await this.callLLMWithRepair(systemPrompt, userPrompt, (raw) => {
      const parsed = this.safeJsonParse(raw);
      const validated = AnimationResultSchema.safeParse(parsed);
      if (validated.success) {
        return { success: true, data: validated.data };
      }
      return { success: false, error: validated.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ') };
    });

    return result;
  }
}
