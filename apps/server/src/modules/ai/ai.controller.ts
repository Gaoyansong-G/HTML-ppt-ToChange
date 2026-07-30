import {
  Controller,
  Post,
  Get,
  Body,
  BadRequestException,
  Logger,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { TeachingScriptSchema, type TeachingScript } from '@courseware/shared';
import { AIService } from './ai.service';
import { AIV2Service, type ProgressEvent } from './ai-v2.service';
import { DocumentsService } from '../documents/documents.service';
import { CoursewareService } from '../courseware/courseware.service';

import { ArkClient } from './clients/ark.client';

export interface GenerateRequest {
  documentId: string;
  description: string;
  options?: {
    pageCount?: number;
    style?: string;
    includeQuiz?: boolean;
    imageProvider?: 'pollinations' | 'unsplash' | 'svg';
  };
}

export interface GenerateV2Request extends GenerateRequest {
  script?: TeachingScript;
}

export interface ChatRequest {
  coursewareId: string;
  slideId: string;
  messages: { role: string; content: string }[];
}

@Controller('ai')
export class AIController {
  private readonly logger = new Logger(AIController.name);

  constructor(
    private readonly aiService: AIService,
    private readonly aiV2Service: AIV2Service,
    private readonly documentsService: DocumentsService,
    private readonly coursewareService: CoursewareService,
    private readonly arkClient: ArkClient,
    private readonly configService: ConfigService,
  ) {}

  @Get('config')
  getConfig() {
    const apiKey = this.configService.get('ARK_API_KEY');
    const endpoint = this.configService.get('ARK_ARTIFACT_ENDPOINT')
      || this.configService.get('ARK_DEEPSEEK_V4_PRO_ENDPOINT');
    return {
      hasKey: !!apiKey && apiKey !== 'dummy-key',
      endpoint: endpoint || null,
      cwd: process.cwd(),
    };
  }

  @Post('outline')
  async outline(@Body() body: GenerateRequest) {
    const document = this.documentsService.findById(body.documentId);
    if (!document) {
      throw new BadRequestException('Document not found');
    }

    const outline = await this.aiService.generateOutline({
      documentId: document.id,
      filename: document.filename,
      description: body.description,
      structure: document.structure,
      extractedText: document.extractedText,
      options: body.options || {},
    });

    return { outline };
  }

  @Post('generate')
  async generate(@Body() body: GenerateRequest) {
    const document = this.documentsService.findById(body.documentId);
    if (!document) {
      throw new BadRequestException('Document not found');
    }

    const result = await this.aiService.generateCourseware({
      documentId: document.id,
      filename: document.filename,
      description: body.description,
      structure: document.structure,
      extractedText: document.extractedText,
      options: body.options || {},
    });

    // Persist the generated courseware so it survives server restarts and appears in "My Courseware".
    if (result.valid && result.courseware) {
      try {
        const saved = this.coursewareService.create(result.courseware as any);
        return { ...result, coursewareId: saved.id };
      } catch (saveErr) {
        this.logger.warn(
          `Failed to persist generated courseware: ${saveErr instanceof Error ? saveErr.message : String(saveErr)}`,
        );
      }
    }

    return result;
  }

  /* ---------------- v2 两阶段生成管线 ---------------- */

  /** 阶段一：生成教学分镜脚本（供用户确认/编辑） */
  @Post('v2/script')
  async generateScript(@Body() body: GenerateRequest) {
    const document = this.documentsService.findById(body.documentId);
    if (!document) {
      throw new BadRequestException('Document not found');
    }
    const script = await this.aiV2Service.generateScript({
      documentId: document.id,
      filename: document.filename,
      description: body.description,
      structure: document.structure,
      extractedText: document.extractedText,
      options: body.options || {},
    });
    return { script, mock: this.aiV2Service.isMock() };
  }

  /**
   * 阶段二：按确认后的脚本逐页生成（SSE 推送逐页进度）。
   * 事件：stage / page:start / page:done / assets / done / error
   * 用原生 Response 手写 SSE（NestJS @Sse 不支持 POST）。
   */
  @Post('v2/generate')
  async generateV2(@Body() body: GenerateV2Request, @Res() res: Response): Promise<void> {
    const document = this.documentsService.findById(body.documentId);
    if (!document) {
      throw new BadRequestException('Document not found');
    }
    const scriptParse = TeachingScriptSchema.safeParse(body.script);
    if (!scriptParse.success) {
      throw new BadRequestException(`Invalid teaching script: ${scriptParse.error.message.slice(0, 300)}`);
    }
    const script = scriptParse.data;

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    const push = (data: unknown) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };
    const onProgress = (event: ProgressEvent) => push(event);
    // SSE 心跳：防止前置代理掐断长连接
    const heartbeat = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        /* 连接已断开 */
      }
    }, 20000);

    try {
      const result = await this.aiV2Service.generateFromScript(
        {
          documentId: document.id,
          filename: document.filename,
          description: body.description,
          structure: document.structure,
          extractedText: document.extractedText,
          options: body.options || {},
          script,
        },
        onProgress,
      );

      let coursewareId: string | undefined;
      if (result.courseware) {
        try {
          const saved = this.coursewareService.create(result.courseware as never);
          coursewareId = saved.id;
        } catch (saveErr) {
          this.logger.warn(`课件持久化失败：${saveErr instanceof Error ? saveErr.message : String(saveErr)}`);
        }
      }
      push({ type: 'done', courseware: result.courseware, coursewareId, valid: result.valid, schemaError: result.error });
    } catch (err) {
      this.logger.error(`v2 生成失败: ${err instanceof Error ? err.message : String(err)}`);
      push({ type: 'error', message: err instanceof Error ? err.message : String(err) });
    } finally {
      clearInterval(heartbeat);
      res.end();
    }
  }

  @Post('chat')
  async chat(@Body() body: ChatRequest) {
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      throw new BadRequestException('messages must be a non-empty array');
    }
    const lastMessage = body.messages[body.messages.length - 1];
    if (!lastMessage) {
      throw new BadRequestException('No message provided');
    }

    const courseware = this.coursewareService.findById(body.coursewareId);
    const slide = courseware?.slides.find((s) => s.id === body.slideId);

    // AI 助手走轻量模型（flash：成本为主模型的 1/15）
    const flashEndpoint = this.configService.get('ARK_FLASH_ENDPOINT')
      || this.configService.get('ARK_DEEPSEEK_V4_FLASH_ENDPOINT');
    const fallbackEndpoint = this.configService.get('ARK_ARTIFACT_ENDPOINT');
    let endpoint = flashEndpoint || fallbackEndpoint;
    if (!endpoint) {
      throw new BadRequestException('AI endpoint not configured');
    }

    // 页面上下文：提取文本元素 + block 元素槽位文本
    const extractText = (el: { type: string; content: unknown }): string => {
      if (el.type === 'text') {
        return (el.content as { text?: string }).text || '';
      }
      if (el.type === 'block') {
        const slots = (el.content as { slots?: Record<string, unknown> }).slots || {};
        return JSON.stringify(slots).slice(0, 800);
      }
      return '';
    };
    const slideContext = slide
      ? `当前页面标题：${slide.title || '未命名'}\n教学环节：${slide.phase || '未知'}\n页面内容：${slide.elements
          .map(extractText)
          .filter(Boolean)
          .join('\n')
          .slice(0, 2000)}`
      : '当前页面上下文不可用';

    const systemPrompt = `你是一位耐心的教学助手，正在回答学生关于当前课件页面内容的问题。请基于以下页面上下文用中文回答，语言简洁、适合学生理解，不要编造上下文以外的内容。\n\n${slideContext}`;

    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
      ...body.messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ];

    const callChat = async (targetEndpoint: string) => {
      const isDeepSeekV4 = /deepseek-v4/i.test(targetEndpoint);
      return this.arkClient.chat(
        targetEndpoint,
        messages,
        {
          temperature: 0.7,
          stream: false,
          ...(isDeepSeekV4
            ? {
                extra_body: {
                  thinking: { type: 'disabled' },
                },
              }
            : {}),
        } as any,
      );
    };

    let response;
    try {
      response = await callChat(endpoint);
    } catch (err) {
      const status = (err as any)?.status;
      if (status === 404 && flashEndpoint && fallbackEndpoint && endpoint === flashEndpoint) {
        this.logger.warn(`Flash endpoint ${flashEndpoint} not accessible, falling back to ${fallbackEndpoint}`);
        endpoint = fallbackEndpoint;
        response = await callChat(endpoint);
      } else {
        throw err;
      }
    }

    const content = (response.choices[0]?.message?.content as string) || '抱歉，我没有理解，请再试一次。';

    return {
      message: {
        role: 'assistant',
        content,
      },
    };
  }
}
