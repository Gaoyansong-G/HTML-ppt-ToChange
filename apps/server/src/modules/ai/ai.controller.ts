import {
  Controller,
  Post,
  Get,
  Body,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIService } from './ai.service';
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
  };
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

  @Post('chat')
  async chat(@Body() body: ChatRequest) {
    const lastMessage = body.messages[body.messages.length - 1];
    if (!lastMessage) {
      throw new BadRequestException('No message provided');
    }

    const courseware = this.coursewareService.findById(body.coursewareId);
    const slide = courseware?.slides.find((s) => s.id === body.slideId);

    const deepseekEndpoint = this.configService.get('ARK_DEEPSEEK_V4_FLASH_ENDPOINT')
      || this.configService.get('ARK_DEEPSEEK_V4_PRO_ENDPOINT');
    const fallbackEndpoint = this.configService.get('ARK_ARTIFACT_ENDPOINT');
    let endpoint = deepseekEndpoint || fallbackEndpoint;
    if (!endpoint) {
      throw new BadRequestException('AI endpoint not configured');
    }

    const slideContext = slide
      ? `当前页面标题：${slide.title || '未命名'}\n教学目标：${slide.learningObjective || '无'}\n页面文本内容：${slide.elements
          .filter((e) => e.type === 'text')
          .map((e) => (e.content as { text?: string }).text)
          .filter(Boolean)
          .join('\n')}`
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
      if (status === 404 && deepseekEndpoint && fallbackEndpoint && endpoint === deepseekEndpoint) {
        this.logger.warn(`DeepSeek endpoint ${deepseekEndpoint} not accessible, falling back to ${fallbackEndpoint}`);
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
