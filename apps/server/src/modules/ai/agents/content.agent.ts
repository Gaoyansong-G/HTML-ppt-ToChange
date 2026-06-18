import { z } from 'zod';
import { BaseAgent, type AgentContext, type AgentResult } from './base.agent';
import { CONTENT_PROMPT } from '../prompts';

const QuizSchema = z.object({
  question: z.string().optional(),
  type: z.enum(['single-choice', 'multiple-choice', 'fill-blank', 'reveal', 'drag-drop']).optional(),
  options: z.array(
    z.object({
      text: z.string(),
      isCorrect: z.boolean().optional(),
    }),
  ).optional(),
  answer: z.union([z.string(), z.array(z.string())]).optional(),
  explanation: z.string().optional(),
});

const ContentSlideSchema = z.object({
  order: z.number(),
  title: z.string(),
  body: z.string().optional(),
  quiz: QuizSchema.optional(),
});

const ContentResultSchema = z.object({
  slides: z.array(ContentSlideSchema),
});

export type ContentResult = z.infer<typeof ContentResultSchema>;

export class ContentAgent extends BaseAgent<ContentResult> {
  async execute(context: AgentContext): Promise<AgentResult<ContentResult>> {
    const outline = context.previousResults?.outline as { slides?: { order: number }[] } | undefined;
    const userPrompt = this.fillPrompt(CONTENT_PROMPT, {
      outline: JSON.stringify(outline, null, 2),
      sourceText: context.extractedText.slice(0, 6000),
      subject: context.subject,
      pageCount: String(context.options?.pageCount ?? outline?.slides?.length ?? 0),
      gradeLevel: context.options?.gradeLevel ?? 'unknown',
    });

    const systemPrompt = '你是教育内容生成专家。请严格按要求的 JSON Schema 输出。';

    const result = await this.callLLMWithRepair(systemPrompt, userPrompt, (raw) => {
      const parsed = this.safeJsonParse(raw);
      const validated = ContentResultSchema.safeParse(parsed);
      if (validated.success) {
        return { success: true, data: validated.data };
      }
      return { success: false, error: validated.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ') };
    });

    return result;
  }
}
