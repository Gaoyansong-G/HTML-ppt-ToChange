import {
  Controller,
  Post,
  Body,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ElementSchema, SlideSchema, type Courseware } from '@courseware/shared';
import { ArkClient } from './clients/ark.client';
import { normalizeSlots } from './assembler/block-assembler';

/** quiz block 的 quiz 内容可能被 LLM 平铺到 slots 顶层而非 slots.quiz 内，归位 + 归一化 */
function normalizeBlockElement(element: unknown): unknown {
  const el = element as { type?: string; content?: Record<string, unknown> };
  if (el?.type !== 'block' || !el.content) return element;
  const content = el.content as {
    blockType?: string;
    slots?: Record<string, unknown>;
  };
  const slots = { ...(content.slots || {}) };
  if (content.blockType === 'quiz' && !slots.quiz && (slots.question || slots.options)) {
    const { question, options, correctAnswer, answer, explanation, type, ...rest } = slots as Record<string, unknown>;
    slots.quiz = {
      question,
      options,
      correctAnswer: correctAnswer ?? answer,
      explanation,
      type: type || 'single-choice',
    };
    content.slots = { ...rest, quiz: slots.quiz };
  } else {
    content.slots = slots;
  }
  content.slots = normalizeSlots(content.blockType || '', content.slots || {});
  return el;
}

/**
 * AI 编辑接口：编辑器内"对话式修改"。
 * 三级作用域：element（单元素）/ slide（整页）/ courseware（全局）。
 * 返回结构化结果（完整替换片段），前端应用后接入撤销链。
 */

interface EditRequest {
  scope: 'element' | 'slide' | 'courseware';
  instruction: string;
  courseware: Courseware;
  slideId?: string;
  elementId?: string;
}

@Controller('ai')
export class AIEditController {
  private readonly logger = new Logger(AIEditController.name);

  constructor(
    private readonly arkClient: ArkClient,
    private readonly configService: ConfigService,
  ) {}

  @Post('edit')
  async edit(@Body() body: EditRequest) {
    if (!body.instruction?.trim()) {
      throw new BadRequestException('instruction is required');
    }
    const endpoint =
      this.configService.get('ARK_FLASH_ENDPOINT') || this.configService.get('ARK_ARTIFACT_ENDPOINT');
    if (!endpoint) throw new BadRequestException('AI endpoint not configured');

    switch (body.scope) {
      case 'element':
        return this.editElement(body, endpoint);
      case 'slide':
        return this.editSlide(body, endpoint);
      case 'courseware':
        return this.editCourseware(body, endpoint);
      default:
        throw new BadRequestException(`unknown scope: ${body.scope}`);
    }
  }

  /** 单元素编辑：返回完整替换的 element */
  private async editElement(body: EditRequest, endpoint: string) {
    const slide = body.courseware.slides.find((s) => s.id === body.slideId);
    const element = slide?.elements.find((e) => e.id === body.elementId);
    if (!slide || !element) throw new BadRequestException('element not found');

    const prompt = `你是课件编辑器助手。用户要修改课件中的一个元素。
【页面标题】${slide.title || ''}
【元素 JSON】
${JSON.stringify(element, null, 1)}
【用户指令】${body.instruction}

要求：
1. 直接输出修改后的完整元素 JSON（保持 id/type/geometry 不变，除非指令明确要求移动/缩放）。
2. block 元素：优先修改 content.slots 中的内容；variant 只能从该 blockType 的合法变体中选。
3. 文本内容遵循教师语气、简洁准确。
4. 只输出 JSON，不要解释。`;

    const raw = await this.callJson(prompt, endpoint);
    const normalized = normalizeBlockElement(raw);
    const parsed = ElementSchema.safeParse(normalized);
    if (!parsed.success) {
      throw new BadRequestException(`AI 返回的元素不合法: ${parsed.error.message.slice(0, 200)}`);
    }
    return { scope: 'element', element: parsed.data };
  }

  /** 整页编辑：返回完整替换的 slide（保留 id/order/transition） */
  private async editSlide(body: EditRequest, endpoint: string) {
    const slide = body.courseware.slides.find((s) => s.id === body.slideId);
    if (!slide) throw new BadRequestException('slide not found');

    const prompt = `你是课件编辑器助手。用户要修改课件中的一整页。
【页面 JSON】
${JSON.stringify(slide, null, 1)}
【用户指令】${body.instruction}

要求：
1. 直接输出修改后的完整页面 JSON（保持 id/order 不变）。
2. 如果是"换成XX布局/版式"：把 blocks 改成对应 blockType 的 block 元素，内容槽位从原页内容迁移。
3. 如果是"加一道题"：追加一个 quiz 类型的 block 元素（geometry 与前序 block 合理分配，页面高 720、宽 1280，边距 40，block 间距 24，纵向堆叠）。
4. 只输出 JSON，不要解释。`;

    const raw = await this.callJson(prompt, endpoint, 16000);
    // 对 AI 返回的 block 元素做归一化（quiz 归位/槽位类型纠正）
    if (raw && typeof raw === 'object' && Array.isArray((raw as { elements?: unknown[] }).elements)) {
      (raw as { elements: unknown[] }).elements = (raw as { elements: unknown[] }).elements.map(
        (el) => normalizeBlockElement(el),
      );
    }
    const parsed = SlideSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException(`AI 返回的页面不合法: ${parsed.error.message.slice(0, 200)}`);
    }
    return { scope: 'slide', slide: parsed.data };
  }

  /** 全局编辑：designSystem tokens 调整 / 标题调整 / 批量文案语气 */
  private async editCourseware(body: EditRequest, endpoint: string) {
    const cw = body.courseware;
    const prompt = `你是课件编辑器助手。用户要对整个课件做全局修改。
【课件标题】${cw.title}
【当前 designSystem.tokens】
${JSON.stringify(cw.designSystem.tokens, null, 1)}
【用户指令】${body.instruction}

要求：
1. 输出 JSON：{ "tokens": 修改后的完整 tokens 对象, "title": 新标题(可选) }
2. 字号类指令：整体放大/缩小 fontSizes 各档（保持比例）。
3. 配色类指令：调整 colors（保持 text 与 background 对比度可读）。
4. 不要改 fonts/spacing/borderRadius，除非指令明确要求。
5. 只输出 JSON，不要解释。`;

    const raw = (await this.callJson(prompt, endpoint)) as {
      tokens?: Courseware['designSystem']['tokens'];
      title?: string;
    };
    return { scope: 'courseware', tokens: raw.tokens || null, title: raw.title || null };
  }

  private async callJson(userPrompt: string, endpoint: string, maxTokens = 8000): Promise<unknown> {
    const response = await this.arkClient.chat(
      endpoint,
      [
        { role: 'system', content: '你是课件编辑助手，只输出合法 JSON。' },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0.4,
        response_format: { type: 'json_object' },
        stream: false,
        max_tokens: maxTokens,
        extra_body: { thinking: { type: 'disabled' } },
      } as Parameters<ArkClient['chat']>[2],
    );
    const content = (response.choices[0]?.message?.content as string) || '{}';
    try {
      return JSON.parse(content);
    } catch {
      const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) return JSON.parse(match[1]);
      throw new BadRequestException('AI 输出不是合法 JSON');
    }
  }
}
