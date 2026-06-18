import { z } from 'zod';
import { BaseAgent, type AgentContext, type AgentResult } from './base.agent';

const ImageDecisionSchema = z.object({
  index: z.number(),
  type: z.enum(['url', 'svg']),
  provider: z.enum(['pollinations', 'unsplash']).optional(),
  prompt: z.string().optional(),
  svg: z.string().optional(),
});

const ImageAgentResultSchema = z.object({
  images: z.array(ImageDecisionSchema),
});

export type ImageAgentDecision = z.infer<typeof ImageDecisionSchema>;
export type ImageAgentResult = z.infer<typeof ImageAgentResultSchema>;

const IMAGE_AGENT_PROMPT = `你是一位擅长教育课件配图的专家。请根据下面的配图请求列表，为每个请求决定最佳生成方式，并给出可直接使用的生成素材。

输入数组（每项包含原始描述 alt、页面标题 slideTitle、正文摘要 bodyExcerpt、学科 subject）：
{{requests}}

决策规则：
1. **如果 subject 为 "math"，或 alt/slideTitle 中包含“方程、函数、几何、坐标、抛物线、公式、推导、示意图、流程图、步骤”等数学/理科图示关键词，必须输出 type="svg"**，生成一段自包含的 SVG 代码（width="640" height="480"），用简洁的几何图形、坐标网格、曲线、箭头等表达概念。**SVG 里不要写大段说明文字**，最多保留 1–2 个关键词。
2. 需要真实照片的场景（实验器材、动植物、地标、人物、日常物品）：输出 type="url"，provider="unsplash"，prompt 为 3–5 个简洁英文关键词（用逗号分隔）。
3. 其他抽象/情境/文学类配图：输出 type="url"，provider="pollinations"，prompt 为一段高质量英文教育插画描述（50 词以内），可附加风格词如 "flat vector illustration, educational, soft colors, no text, no watermark"。
4. 如果原始描述明显不合适生成图片（如只是“占位”、“暂无图”），也输出 type="svg"，生成一个与学科相关的抽象装饰 SVG。

输出严格 JSON（不要 markdown 代码块）：
{
  "images": [
    { "index": 0, "type": "url", "provider": "pollinations", "prompt": "..." },
    { "index": 1, "type": "svg", "svg": "<svg xmlns=...>...</svg>" }
  ]
}`;

export class ImageAgent extends BaseAgent<ImageAgentResult> {
  async execute(context: AgentContext): Promise<AgentResult> {
    const requests = context.previousResults?.imageRequests as unknown[] | undefined;
    const userPrompt = this.fillPrompt(IMAGE_AGENT_PROMPT, {
      requests: JSON.stringify(requests ?? [], null, 2),
    });
    const systemPrompt = '你是教育配图专家。请只输出符合 schema 的 JSON，不要解释。';

    return this.callLLMWithRepair(systemPrompt, userPrompt, (raw) => {
      const parsed = this.safeJsonParse(raw);
      const validated = ImageAgentResultSchema.safeParse(parsed);
      if (validated.success) {
        return { success: true, data: validated.data };
      }
      return { success: false, error: validated.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ') };
    });
  }
}
