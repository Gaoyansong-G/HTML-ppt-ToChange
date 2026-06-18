import { z } from 'zod';
import { BaseAgent, type AgentContext, type AgentResult } from './base.agent';
import { OUTLINE_PROMPT } from '../prompts';

const OutlineSchema = z.object({
  title: z.string(),
  slides: z.array(
    z.object({
      order: z.number(),
      title: z.string(),
      learningObjective: z.string().optional(),
      layoutTemplateId: z.string(),
      keyPoints: z.array(z.string()).optional(),
    }),
  ),
});

export type OutlineResult = z.infer<typeof OutlineSchema>;

export class OutlineAgent extends BaseAgent<OutlineResult> {
  async execute(context: AgentContext): Promise<AgentResult<OutlineResult>> {
    const userPrompt = this.fillPrompt(OUTLINE_PROMPT, {
      description: context.description,
      structure: JSON.stringify(context.documentStructure, null, 2),
      options: JSON.stringify(context.options || {}, null, 2),
      subject: context.subject,
    });

    const systemPrompt = '你是课件大纲设计专家，擅长将教学材料转化为结构清晰的课件页面。请严格按要求的 JSON Schema 输出。';

    const result = await this.callLLMWithRepair(systemPrompt, userPrompt, (raw) => {
      const parsed = this.safeJsonParse(raw);
      const validated = OutlineSchema.safeParse(parsed);
      if (validated.success) {
        return { success: true, data: validated.data };
      }
      return { success: false, error: validated.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ') };
    });

    return result;
  }
}
