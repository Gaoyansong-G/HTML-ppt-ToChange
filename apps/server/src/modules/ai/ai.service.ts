import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CoursewareSchema } from '@courseware/shared';
import { ArkClient } from './clients/ark.client';
import { OutlineAgent, ContentAgent, DesignAgent, AnimationAgent, ImageAgent } from './agents';
import type { ImageAgentResult } from './agents/image.agent';
import type { AgentContext, AgentResult } from './agents/base.agent';
import type { DesignResult } from './agents/design.agent';
import type { AnimationResult } from './agents/animation.agent';
import type { ContentResult } from './agents/content.agent';
import { assembleCourseware } from './assembler/courseware-assembler';
import { buildFallbackDesign } from './assembler/layout-engine';
import type { DocumentNode } from '@courseware/shared';
import type { OutlineResult } from './agents/outline.agent';

type OutlineSlide = OutlineResult['slides'][number];

function normalizeContentSlides(outline: OutlineResult, content: ContentResult): ContentResult {
  const contentByOrder = new Map(content.slides.map((s) => [s.order, s]));
  const normalized = outline.slides.map((outlineSlide) => {
    const existing = contentByOrder.get(outlineSlide.order);
    if (existing) return existing;
    const keyPoints = outlineSlide.keyPoints?.slice(0, 4) || [];
    const keyPointsText = keyPoints.join('\n') || '';

    // Generate a fallback quiz for quiz slides so they never render blank options.
    if (outlineSlide.layoutTemplateId === 'quiz') {
      const correctOption = keyPoints[0] || '正确选项';
      return {
        order: outlineSlide.order,
        title: outlineSlide.title,
        body: keyPointsText || '巩固检测',
        quiz: {
          question: `关于“${outlineSlide.title}”，下列说法正确的是？`,
          type: 'single-choice' as const,
          options: [
            { text: correctOption, isCorrect: true },
            { text: '与原文信息不符的选项', isCorrect: false },
            { text: '概念混淆的选项', isCorrect: false },
            { text: '过度推断的选项', isCorrect: false },
          ],
          answer: correctOption,
          explanation: '请结合本课内容，选择最符合原文信息的选项。',
        },
      };
    }

    return {
      order: outlineSlide.order,
      title: outlineSlide.title,
      body: keyPointsText || '（本页内容待补充）',
    };
  });
  return { slides: normalized };
}

function buildFallbackDesignForMissing(
  outline: OutlineResult,
  content: ContentResult,
  design: DesignResult,
  subject: string,
  description: string,
): DesignResult {
  const designByOrder = new Map(design.slides.map((s) => [s.order, s]));
  if (outline.slides.every((s) => designByOrder.has(s.order))) {
    return design;
  }
  const fallback = buildFallbackDesign(outline, content, subject, description);
  const fallbackByOrder = new Map(fallback.slides.map((s) => [s.order, s]));
  const mergedSlides = outline.slides.map((s) => designByOrder.get(s.order) ?? fallbackByOrder.get(s.order)!);
  return {
    designSystem: design.designSystem ?? fallback.designSystem,
    slides: mergedSlides,
  };
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export interface GenerateCoursewareInput {
  documentId: string;
  filename: string;
  description: string;
  structure: DocumentNode[];
  extractedText: string;
  options?: {
    pageCount?: number;
    style?: string;
    includeQuiz?: boolean;
  };
}

export interface GenerateCoursewareResult {
  courseware: unknown;
  valid: boolean;
  error: string | null;
}

function detectGradeLevel(text: string): 'primary' | 'middle' | 'high' | 'unknown' {
  const t = text.toLowerCase();
  if (/小学|一年级|二年级|三年级|四年级|五年级|六年级|低年级|高年级/.test(t)) return 'primary';
  if (/初中|七年级|八年级|九年级|初一|初二|初三|中考/.test(t)) return 'middle';
  if (/高中|高一|高二|高三|高考|高中一轮|二轮复习/.test(t)) return 'high';
  return 'unknown';
}
function detectSubject(text: string): string {
  const t = text.toLowerCase();
  if (/语文|古诗词|文言文|唐诗|宋词|诗歌|阅读/.test(t)) return 'chinese';
  if (/历史|政治|思政|道德|法治|文史/.test(t)) return 'history';
  if (/地理|地图|区域|自然地理|人文地理/.test(t)) return 'geography';
  if (/英语|外语|英语词汇|语法|对话/.test(t)) return 'english';
  if (/数学|代数|几何|函数|方程|推导/.test(t)) return 'math';
  if (/物理|化学|生物|科学|信息技术|编程|ai|人工智能|计算机|实验/.test(t)) return 'science';
  if (/美术|音乐|体育|艺术|书法/.test(t)) return 'arts';
  return 'general';
}

function detectRequestedPageCount(text: string): number | undefined {
  const matches = text.match(/(\d+)\s*(?:页|张|page|pages|p)/i);
  if (!matches) return undefined;
  const n = parseInt(matches[1], 10);
  if (n >= 2 && n <= 50) return n;
  return undefined;
}

function adjustOutlineToCount(outline: OutlineResult, target: number, includeQuiz = false): OutlineResult {
  const slides = outline.slides.map((s, i) => ({ ...s, order: s.order ?? i }));
  if (slides.length === target) return { ...outline, slides };
  if (slides.length > target) {
    return { ...outline, slides: slides.slice(0, target) };
  }
  // Pad with meaningful extra pages derived from the last slide to honor the user's request.
  const templateCycle: OutlineSlide['layoutTemplateId'][] = ['image', 'content', 'quote', 'quiz'];
  while (slides.length < target) {
    const idx = slides.length;
    const last = slides[slides.length - 1];
    const isLast = idx === target - 1;
    const tmpl = includeQuiz && isLast ? 'quiz' : templateCycle[idx % templateCycle.length];
    slides.push({
      order: idx,
      title: last ? `${last.title} · 延伸 ${idx + 1}` : `第 ${idx + 1} 页`,
      learningObjective: last?.learningObjective || '巩固与拓展',
      layoutTemplateId: tmpl,
      keyPoints: last?.keyPoints?.slice(0, 2) || ['要点回顾', '拓展思考'],
    });
  }
  return { ...outline, slides };
}

function ensureQuizSlide(outline: OutlineResult, includeQuiz?: boolean): OutlineResult {
  if (!includeQuiz) return outline;
  const hasQuiz = outline.slides.some((s) => s.layoutTemplateId === 'quiz');
  if (hasQuiz) return outline;
  if (outline.slides.length === 0) return outline;
  const slides = outline.slides.map((s) => ({ ...s }));
  const last = slides[slides.length - 1];
  last.layoutTemplateId = 'quiz';
  last.title = last.title.includes('检测') || last.title.includes('测验') ? last.title : `${last.title} · 课堂检测`;
  last.learningObjective = last.learningObjective || '巩固本课所学知识';
  return { ...outline, slides };
}

async function enforceOutlinePageCount(
  outlineAgent: OutlineAgent,
  agentContext: AgentContext,
  requestedPageCount: number | undefined,
  initialOutline: OutlineResult,
): Promise<OutlineResult> {
  const includeQuiz = agentContext.options?.includeQuiz ?? false;
  if (!requestedPageCount || initialOutline.slides.length === requestedPageCount) {
    return ensureQuizSlide(initialOutline, includeQuiz);
  }
  logger.warn(`Outline length ${initialOutline.slides.length} != requested ${requestedPageCount}; retrying once.`);
  const retryContext = {
    ...agentContext,
    description: `${agentContext.description}\n\n【强制约束】用户明确要求生成 ${requestedPageCount} 页课件。请严格输出 ${requestedPageCount} 页大纲，不要合并、不要省略。若内容不够，可加入“导入、整体感知、逐句品读、拓展、总结、测验”等页来补足。`,
  };
  try {
    const retried = await outlineAgent.execute(retryContext);
    if (retried.data.slides.length === requestedPageCount) {
      logger.log(`Retry succeeded: ${requestedPageCount} slides.`);
      return ensureQuizSlide(retried.data, includeQuiz);
    }
    logger.warn(`Retry still returned ${retried.data.slides.length} slides; adjusting deterministically.`);
    return ensureQuizSlide(adjustOutlineToCount(retried.data, requestedPageCount, includeQuiz), includeQuiz);
  } catch (err) {
    logger.warn(`Outline retry failed: ${err instanceof Error ? err.message : String(err)}`);
    return ensureQuizSlide(adjustOutlineToCount(initialOutline, requestedPageCount, includeQuiz), includeQuiz);
  }
}

function normalizeAnimationSlides(outline: OutlineResult, animation: AnimationResult): AnimationResult {
  const existingByOrder = new Map(animation.slides.map((s) => [s.order ?? -1, s]));
  const transitions = ['fade', 'slide', 'zoom', 'flip', 'wipe', 'parallax'];
  let padded = 0;
  const normalizedSlides = outline.slides.map((s, i) => {
    const order = s.order ?? i;
    const existing = existingByOrder.get(order);
    if (existing) return existing;
    padded += 1;
    return {
      order,
      transition: {
        type: transitions[i % transitions.length],
        duration: 0.5,
        easing: 'power2.out',
      } as AnimationResult['slides'][number]['transition'],
      elements: [],
    };
  });
  if (padded > 0) {
    logger.warn(`Animation missing ${padded} slides; padded with default transitions`);
  }
  return { slides: normalizedSlides };
}

function validateStageConsistency(
  outline: OutlineResult,
  content: ContentResult,
  design: DesignResult,
): void {
  for (const outlineSlide of outline.slides) {
    const order = outlineSlide.order ?? -1;
    const contentSlide = content.slides.find((s) => (s.order ?? -1) === order);
    const designSlide = design.slides.find((s) => (s.order ?? -1) === order);
    if (!designSlide) continue;

    const hasImageElement = designSlide.elements?.some((e) => e.type === 'image');
    if (outlineSlide.layoutTemplateId === 'image' && !hasImageElement) {
      logger.warn(`Slide ${order + 1} (${outlineSlide.title}) layout is "image" but design has no image element`);
    }
    if (outlineSlide.layoutTemplateId === 'quiz' && !contentSlide?.quiz) {
      logger.warn(`Slide ${order + 1} (${outlineSlide.title}) layout is "quiz" but content has no quiz data`);
    }
    if ((outlineSlide.layoutTemplateId === 'formula' || outlineSlide.layoutTemplateId === 'derivation') && !contentSlide?.body?.match(/[\d\w\+\-\*\/=∑∫π√²³]|公式|定理|推导/)) {
      logger.warn(`Slide ${order + 1} (${outlineSlide.title}) layout is "${outlineSlide.layoutTemplateId}" but body lacks formula markers`);
    }
  }
}

const logger = new Logger('AIService');

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private readonly endpointId: string;

  constructor(
    private readonly arkClient: ArkClient,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get('ARK_API_KEY');
    const endpoint = this.configService.get('ARK_ARTIFACT_ENDPOINT')
      || this.configService.get('ARK_DEEPSEEK_V4_PRO_ENDPOINT');

    if (!apiKey || apiKey === 'dummy-key') {
      throw new Error(
        'ARK_API_KEY is not configured. Set it in your .env file to enable real AI generation.',
      );
    }
    if (!endpoint) {
      throw new Error(
        'ARK_ARTIFACT_ENDPOINT is not configured. Set it in your .env file to enable real AI generation.',
      );
    }

    this.endpointId = endpoint;
    this.logger.log(`AI configured for real LLM: endpoint=${endpoint}, keySet=true`);
  }

  async generateOutline(input: GenerateCoursewareInput): Promise<OutlineResult> {
    const outlineAgent = new OutlineAgent(this.arkClient, this.endpointId);
    const subject = detectSubject(`${input.description} ${input.extractedText.slice(0, 500)}`);
    const gradeLevel = detectGradeLevel(`${input.description} ${input.extractedText.slice(0, 500)}`);
    const agentContext = {
      documentId: input.documentId,
      description: input.description,
      documentStructure: input.structure,
      extractedText: input.extractedText,
      options: { ...(input.options || {}), gradeLevel },
      subject,
    };
    const outline = await outlineAgent.execute(agentContext);
    this.logger.log('OutlineAgent generated outline', { title: outline.data.title, slides: outline.data.slides.length });
    return outline.data;
  }

  async generateCourseware(input: GenerateCoursewareInput): Promise<GenerateCoursewareResult> {
    const outlineAgent = new OutlineAgent(this.arkClient, this.endpointId);
    const contentAgent = new ContentAgent(this.arkClient, this.endpointId);
    const designAgent = new DesignAgent(this.arkClient, this.endpointId);
    const animationAgent = new AnimationAgent(this.arkClient, this.endpointId);

    const subject = detectSubject(`${input.description} ${input.extractedText.slice(0, 500)}`);
    const gradeLevel = detectGradeLevel(`${input.description} ${input.extractedText.slice(0, 500)}`);
    const requestedPageCount = input.options?.pageCount ?? detectRequestedPageCount(input.description);
    const agentContext = {
      documentId: input.documentId,
      description: input.description,
      documentStructure: input.structure,
      extractedText: input.extractedText,
      options: { ...(input.options || {}), gradeLevel, pageCount: requestedPageCount },
      subject,
    };

    const rawOutline = await outlineAgent.execute(agentContext);
    this.logger.log('OutlineAgent rawResponse length', rawOutline.rawResponse?.length);

    const outline = {
      data: await enforceOutlinePageCount(
        outlineAgent,
        agentContext,
        requestedPageCount,
        rawOutline.data,
      ),
    };
    this.logger.log('OutlineAgent final outline', { title: outline.data.title, slides: outline.data.slides.length });

    // Safety cap: if the user did not request a specific page count, keep generation fast.
    if (!requestedPageCount && outline.data.slides.length > 8) {
      this.logger.warn(`Outline generated ${outline.data.slides.length} slides; capping to 8 to keep generation responsive.`);
      outline.data.slides = outline.data.slides.slice(0, 8);
    }

    const contentRaw = await contentAgent.execute({
      ...agentContext,
      previousResults: { outline: outline.data },
    });
    this.logger.log('ContentAgent rawResponse length', contentRaw.rawResponse?.length);
    const content = { data: normalizeContentSlides(outline.data, contentRaw.data) };
    if (contentRaw.data.slides.length !== outline.data.slides.length) {
      this.logger.warn(
        `ContentAgent returned ${contentRaw.data.slides.length} slides but outline has ${outline.data.slides.length}; normalized with fallback content.`,
      );
    }

    let design: AgentResult<DesignResult>;
    try {
      const totalSlides = outline.data.slides.length;
      const batchSize = totalSlides > 8 ? 4 : totalSlides;
      if (totalSlides > 8) {
        this.logger.log(`Designing ${totalSlides} slides in batches of ${batchSize} to avoid output truncation`);
        const batches = chunkArray(content.data.slides, batchSize);
        const batchResults = await Promise.all(
          batches.map(async (batch, idx) => {
            try {
              const result = await designAgent.execute({
                ...agentContext,
                previousResults: { outline: outline.data, content: { slides: batch } },
              });
              this.logger.log(`DesignAgent batch ${idx + 1}/${batches.length} returned ${result.data.slides.length} slides`);
              return result.data;
            } catch (err) {
              this.logger.warn(
                `DesignAgent batch ${idx + 1} failed: ${err instanceof Error ? err.message : String(err)}`,
              );
              return buildFallbackDesign(
                { title: outline.data.title, slides: batch.map((s) => outline.data.slides.find((o) => o.order === s.order)! ) },
                { slides: batch },
                subject,
                input.description,
              );
            }
          }),
        );
        const mergedSlides = batchResults.flatMap((b) => b.slides).sort((a, b) => a.order - b.order);
        design = { data: { designSystem: batchResults[0].designSystem, slides: mergedSlides } };
      } else {
        design = await designAgent.execute({
          ...agentContext,
          previousResults: { outline: outline.data, content: content.data },
        });
      }
      design.data = buildFallbackDesignForMissing(outline.data, content.data, design.data, subject, input.description);
      this.logger.log('DesignAgent rawResponse length', design.rawResponse?.length ?? 0);
    } catch (designErr) {
      this.logger.warn(
        'DesignAgent failed, falling back to deterministic layout engine',
        designErr instanceof Error ? designErr.message : String(designErr),
      );
      const fallbackDesign = buildFallbackDesign(outline.data, content.data, subject, input.description);
      design = { data: fallbackDesign };
    }

    // Use a dedicated image sub-agent to decide the best visual for each image element.
    const imageAgent = new ImageAgent(this.arkClient, this.endpointId);
    const imageRequests: Record<string, unknown>[] = [];
    const imageIndexByKey: { slideOrder: number; elIndex: number }[] = [];
    design.data.slides.forEach((designSlide) => {
      const order = designSlide.order ?? -1;
      const contentSlide = content.data.slides.find((s) => (s.order ?? -1) === order);
      const outlineSlide = outline.data.slides.find((s) => (s.order ?? -1) === order);
      designSlide.elements?.forEach((el, elIndex) => {
        if (el.type === 'image') {
          const alt = (el.content as Record<string, unknown>)?.alt as string || '';
          if (alt) {
            imageIndexByKey.push({ slideOrder: order, elIndex });
            imageRequests.push({
              alt,
              slideTitle: contentSlide?.title || outlineSlide?.title || '',
              bodyExcerpt: (contentSlide?.body || '').slice(0, 120),
              subject,
            });
          }
        }
      });
    });

    let imageDecisions: Map<string, import('./agents/image.agent').ImageAgentDecision> | undefined;
    if (imageRequests.length > 0) {
      try {
        const imageAgentResult: ImageAgentResult = (await imageAgent.execute({
          ...agentContext,
          previousResults: { imageRequests },
        })).data;
        this.logger.log('ImageAgent decisions', { count: imageAgentResult.images.length });
        imageDecisions = new Map(
          imageAgentResult.images.map((decision) => {
            const key = imageIndexByKey[decision.index];
            return [`${key?.slideOrder ?? decision.index}-${key?.elIndex ?? 0}`, decision];
          }),
        );
      } catch (err) {
        this.logger.warn(`ImageAgent failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // For larger decks, skip the AnimationAgent LLM call and use fast default animations.
    let animation: AgentResult<AnimationResult>;
    if (outline.data.slides.length > 6) {
      this.logger.log('Using default animations for larger deck to reduce generation time');
      const transitions = ['fade', 'slide', 'zoom', 'flip', 'wipe', 'parallax'];
      animation = {
        data: {
          slides: outline.data.slides.map((s, i) => ({
            order: s.order ?? i,
            transition: {
              type: transitions[i % transitions.length],
              duration: 0.5,
              easing: 'power2.out',
            },
            elements: [],
          })),
        },
      };
    } else {
      animation = await animationAgent.execute({
        ...agentContext,
        previousResults: { outline: outline.data, content: content.data, design: design.data },
      });
      this.logger.log('AnimationAgent rawResponse length', animation.rawResponse?.length);
    }

    this.logger.log('LLM pipeline completed', {
      outline: outline.data.title,
      slides: outline.data.slides.length,
    });

    animation.data = normalizeAnimationSlides(outline.data, animation.data);
    validateStageConsistency(outline.data, content.data, design.data);

    const courseware = await assembleCourseware({
      documentId: input.documentId,
      filename: input.filename,
      description: input.description,
      outline: outline.data,
      content: content.data,
      design: design.data,
      animation: animation.data,
      imageDecisions,
    });

    const result = CoursewareSchema.safeParse(courseware);
    return {
      courseware: result.success ? result.data : courseware,
      valid: result.success,
      error: result.success ? null : result.error.message,
    };
  }
}
