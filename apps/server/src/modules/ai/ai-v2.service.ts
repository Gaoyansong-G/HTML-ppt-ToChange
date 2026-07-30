import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CoursewareSchema,
  TeachingScriptSchema,
  type TeachingScript,
  type PageBlueprint,
  type ScriptPage,
  type TeachingPhase,
  type DocumentNode,
} from '@courseware/shared';
import { ArkClient } from './clients/ark.client';
import { SeedreamClient } from './clients/seedream.client';
import { AssetsService } from '../assets/assets.service';
import { ScriptAgent } from './agents/script.agent';
import { BlueprintAgent } from './agents/blueprint.agent';
import { assembleBlockCourseware } from './assembler/block-assembler';
import { lintCourseware } from './assembler/qc-lint';
import { buildMockScript, buildMockBlueprintForPage } from './mock/mock-generator-v2';
import type { GenerateCoursewareInput } from './ai.service';
import type { GradeLevel } from '@courseware/shared';

export interface GenerateScriptInput extends GenerateCoursewareInput {
  subject?: string;
  gradeLevel?: GradeLevel;
}

export type ProgressEvent =
  | { type: 'stage'; stage: string; message?: string }
  | { type: 'page:start'; index: number; total: number; pageId: string }
  | { type: 'page:done'; index: number; total: number; page: PageBlueprint }
  | { type: 'assets'; message: string }
  | { type: 'qc'; issues: { slideIndex: number; level: 'error' | 'warn'; message: string }[] }
  | { type: 'done'; courseware: unknown; coursewareId?: string }
  | { type: 'error'; message: string };

/**
 * v2 生成服务：两阶段管线（教学脚本 → 逐页蓝图 → Block 装配）。
 * 与 v1 管线并存，通过 /ai/v2/* 端点暴露。
 */
@Injectable()
export class AIV2Service {
  private readonly logger = new Logger(AIV2Service.name);
  private readonly endpointId: string;
  private readonly mock: boolean;

  constructor(
    private readonly arkClient: ArkClient,
    private readonly seedreamClient: SeedreamClient,
    private readonly assetsService: AssetsService,
    private readonly configService: ConfigService,
  ) {
    this.mock = (this.configService.get('ARK_MOCK') || '').toLowerCase() === 'true';
    this.endpointId =
      this.configService.get('ARK_ARTIFACT_ENDPOINT') || 'doubao-seed-2-1-pro-260628';
    if (this.mock) {
      this.logger.warn('ARK_MOCK=true：v2 管线使用本地模拟生成（不调用大模型）');
    } else {
      this.logger.log(`v2 管线主模型：${this.endpointId}`);
    }
  }

  isMock(): boolean {
    return this.mock;
  }

  /** 第一阶段：生成教学分镜脚本 */
  async generateScript(input: GenerateScriptInput): Promise<TeachingScript> {
    if (this.mock) {
      const script = buildMockScript(input.description, input.options?.pageCount);
      return TeachingScriptSchema.parse(script);
    }
    const agent = new ScriptAgent(this.arkClient, this.endpointId);
    const gradeLevel = input.gradeLevel && input.gradeLevel !== 'unknown'
      ? input.gradeLevel
      : detectGradeLevelV2(`${input.description} ${input.extractedText.slice(0, 500)}`);
    const result = await agent.execute({
      documentId: input.documentId,
      description: input.description,
      documentStructure: input.structure,
      extractedText: input.extractedText,
      subject: input.subject || detectSubjectV2(`${input.description} ${input.extractedText.slice(0, 500)}`),
      options: { ...(input.options || {}), gradeLevel },
    });
    this.logger.log(
      `教学脚本生成完成：${result.data.phases.length} 个环节，共 ${result.data.phases.reduce((n, p) => n + p.pages.length, 0)} 页`,
    );
    // 学段以系统检测为准（LLM 可能回填 unknown）
    if (result.data.courseInfo.gradeLevel === 'unknown' && gradeLevel !== 'unknown') {
      result.data.courseInfo.gradeLevel = gradeLevel;
    }
    return result.data;
  }

  /**
   * 第二阶段：按（可能被用户编辑过的）脚本逐页生成蓝图并装配课件。
   * onProgress 回调用于 SSE 推送。
   */
  async generateFromScript(
    input: GenerateScriptInput & { script: TeachingScript },
    onProgress: (event: ProgressEvent) => void = () => {},
  ): Promise<{ courseware: unknown; valid: boolean; error: string | null }> {
    const script = input.script;
    const flatPages: { page: ScriptPage; phase: TeachingPhase }[] = [];
    for (const phase of script.phases) {
      for (const page of phase.pages) {
        flatPages.push({ page, phase: phase.phase });
      }
    }
    const total = flatPages.length;
    onProgress({ type: 'stage', stage: 'blueprint', message: `开始生成 ${total} 页课件` });

    const blueprints: PageBlueprint[] = [];
    const blueprintAgent = this.mock ? null : new BlueprintAgent(this.arkClient, this.endpointId);

    // 每批 3 页并行上限 2 批，平衡速度与上下文稳定前缀复用
    const BATCH = 3;
    for (let i = 0; i < flatPages.length; i += BATCH) {
      const batch = flatPages.slice(i, i + BATCH);
      batch.forEach(({ page }, j) =>
        onProgress({ type: 'page:start', index: i + j + 1, total, pageId: page.id }),
      );
      try {
        if (this.mock) {
          for (let j = 0; j < batch.length; j++) {
            const { page, phase } = batch[j];
            const bp = buildMockBlueprintForPage(page, phase, i + j === 0);
            blueprints.push(bp);
            onProgress({ type: 'page:done', index: i + j + 1, total, page: bp });
            await sleep(80); // 模拟逐页节奏，便于前端演示进度
          }
        } else {
          const result = await blueprintAgent!.executeBatch({
            script,
            pages: batch,
            extractedText: input.extractedText,
            subject: script.courseInfo.subject,
          });
          // 对齐：模型可能漏页，用 mock 规则兜底缺失页
          for (let j = 0; j < batch.length; j++) {
            const { page, phase } = batch[j];
            const found = result.data.pages.find((p) => p.id === page.id);
            const bp = found
              ? sanitizeBlueprint(found, page)
              : buildMockBlueprintForPage(page, phase, i + j === 0);
            if (!found) {
              this.logger.warn(`页面 ${page.id} 蓝图缺失，已用确定性兜底`);
            }
            blueprints.push(bp);
            onProgress({ type: 'page:done', index: i + j + 1, total, page: bp });
          }
        }
      } catch (err) {
        this.logger.warn(
          `批次 ${i / BATCH + 1} 生成失败，整批兜底：${err instanceof Error ? err.message : String(err)}`,
        );
        for (let j = 0; j < batch.length; j++) {
          const { page, phase } = batch[j];
          const bp = buildMockBlueprintForPage(page, phase, i + j === 0);
          blueprints.push(bp);
          onProgress({ type: 'page:done', index: i + j + 1, total, page: bp });
        }
      }
    }

    onProgress({ type: 'assets', message: '装配课件与配图' });
    const courseware = await assembleBlockCourseware({
      script,
      blueprints,
      documentId: input.documentId,
      filename: input.filename,
      description: input.description,
      subject: script.courseInfo.subject,
      imageProvider: input.options?.imageProvider,
    });

    // 配图阶段：seedream 为带描述的图片槽位生成统一风格插图并本地化
    const imageProvider = (process.env.IMAGE_PROVIDER || 'seedream').toLowerCase();
    if (!this.mock && imageProvider === 'seedream') {
      onProgress({ type: 'assets', message: 'AI 配图中…' });
      try {
        await this.hydrateImages(courseware as CoursewareLike, script.courseInfo.subject);
      } catch (err) {
        this.logger.warn(`AI 配图失败（保留占位图）：${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 预置问答（离线兜底）：flash 生成 5 个常见学生问答，失败不影响主流程
    if (!this.mock) {
      try {
        (courseware as { presetQA?: { question: string; answer: string }[] }).presetQA =
          await this.generatePresetQA(script, blueprints);
      } catch (err) {
        this.logger.warn(`预置问答生成失败（忽略）：${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 出厂质检 lint：确定性结构检查，问题随 done 事件透出
    const qcIssues = lintCourseware(courseware as never);
    if (qcIssues.length) {
      this.logger.warn(`质检发现 ${qcIssues.length} 个问题：${qcIssues.slice(0, 5).map((i) => `[p${i.slideIndex}] ${i.message}`).join('；')}`);
    }
    onProgress({ type: 'qc', issues: qcIssues });

    const parsed = CoursewareSchema.safeParse(courseware);
    if (!parsed.success) {
      this.logger.warn(`课件 Schema 校验未过：${parsed.error.message.slice(0, 500)}`);
    }
    return {
      courseware: parsed.success ? parsed.data : courseware,
      valid: parsed.success,
      error: parsed.success ? null : parsed.error.message,
    };
  }

  /** 预置问答：基于教学脚本与页面内容，用 flash 低成本生成 5 组问答 */
  private async generatePresetQA(
    script: TeachingScript,
    blueprints: PageBlueprint[],
  ): Promise<{ question: string; answer: string }[]> {
    const flashEndpoint =
      this.configService.get('ARK_FLASH_ENDPOINT') || 'deepseek-v4-flash-260425';
    const outline = script.phases
      .flatMap((p) => p.pages.map((pg) => `${pg.intent}：${pg.keyPoints.join('、')}`))
      .join('\n')
      .slice(0, 3000);
    const response = await this.arkClient.chat(
      flashEndpoint,
      [
        {
          role: 'system',
          content:
            '你是教学内容设计师。基于课件大纲，预想学生课堂上最可能问的 5 个问题，并给出准确、简洁、适合学生的回答。只输出 JSON。',
        },
        {
          role: 'user',
          content: `课件大纲：\n${outline}\n\n输出格式：{"qa":[{"question":"...","answer":"..."}]}，answer 80 字以内。`,
        },
      ],
      {
        temperature: 0.5,
        response_format: { type: 'json_object' },
        stream: false,
        max_tokens: 2000,
        extra_body: { thinking: { type: 'disabled' } },
      } as Parameters<ArkClient['chat']>[2],
    );
    const content = (response.choices[0]?.message?.content as string) || '{}';
    const parsed = JSON.parse(content) as { qa?: { question: string; answer: string }[] };
    return (parsed.qa || [])
      .filter((q) => q && q.question && q.answer)
      .slice(0, 5);
  }

  /** 配图水合：扫描 block 图片槽位，seedream 生成统一风格插图并本地化保存 */
  private async hydrateImages(courseware: CoursewareLike, subject: string): Promise<void> {
    const stylePrefix = IMAGE_STYLE_PREFIX[subject] || IMAGE_STYLE_PREFIX.general;
    // 递归扫描 slots 树：任意层级中"像图片槽位"且 {description, 无 assetId} 的对象都配图
    // （image 槽位可能在嵌套结构里：cover.image / text-image.image / 自定义嵌套）
    interface ImageTask {
      target: Record<string, unknown>; // 直接持有引用，生成后写 assetId
      description: string;
      slideIndex: number;
      elementIndex: number;
    }
    const tasks: ImageTask[] = [];
    const walk = (node: unknown, path: string, slideIndex: number, elementIndex: number) => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) {
        node.forEach((item, i) => walk(item, `${path}[${i}]`, slideIndex, elementIndex));
        return;
      }
      const obj = node as Record<string, unknown>;
      if (typeof obj.description === 'string' && obj.description && !obj.assetId) {
        const imageish =
          /image|img|photo|picture|illustration|图/i.test(path) ||
          typeof obj.alt === 'string' ||
          typeof obj.url === 'string';
        if (imageish) {
          tasks.push({ target: obj, description: obj.description, slideIndex, elementIndex });
          return;
        }
      }
      for (const [k, v] of Object.entries(obj)) {
        walk(v, path ? `${path}.${k}` : k, slideIndex, elementIndex);
      }
    };
    courseware.slides.forEach((slide, slideIndex) => {
      slide.elements.forEach((el, elementIndex) => {
        if (el.type !== 'block') return;
        const slots = (el.content as { slots?: Record<string, unknown> }).slots || {};
        walk(slots, '', slideIndex, elementIndex);
      });
    });

    if (!tasks.length) return;
    this.logger.log(`配图任务：${tasks.length} 张`);

    const CONCURRENCY = 3;
    for (let i = 0; i < tasks.length; i += CONCURRENCY) {
      await Promise.all(
        tasks.slice(i, i + CONCURRENCY).map(async (task) => {
          try {
            const prompt = `${IMAGE_STYLE_PREFIX[subject] || IMAGE_STYLE_PREFIX.general}，${task.description}`;
            const buffer = await this.seedreamClient.generateImage(prompt);
            const asset = this.assetsService.saveGenerated(buffer, '.png', {
              description: task.description,
            });
            courseware.assets.push(asset);
            // 直接写引用：无论槽位嵌套多深都生效
            task.target.assetId = asset.id;
            this.logger.log(`配图完成：${task.description.slice(0, 40)}`);
          } catch (err) {
            this.logger.warn(
              `单张配图失败（保留占位）：${task.description.slice(0, 40)} ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }),
      );
    }
    void stylePrefix;
  }
}

type CoursewareLike = {
  slides: {
    elements: { type: string; content: unknown }[];
  }[];
  assets: import('@courseware/shared').Asset[];
};

const IMAGE_STYLE_PREFIX: Record<string, string> = {
  chinese: '中国传统水墨画风格教学插图，诗意淡雅，柔和色调，无文字',
  math: '简洁几何风格教学示意图，清晰线条，浅色背景，无文字',
  english: '扁平插画风格英语教学插图，明亮色彩，日常场景，无文字',
  science: '科学教育示意图风格，干净现代，柔和色彩，无文字',
  history: '历史插画风格，暖色调，质感细腻，无文字',
  geography: '地理自然风格插图，清新色彩，无文字',
  general: '教育教学插画，干净矢量风格，柔和色彩，无文字',
};


/** 蓝图净化：LLM 蓝图可能有"合法但空"的槽位（如 quiz 空题干）。用脚本页数据确定性补齐 */
function sanitizeBlueprint(bp: PageBlueprint, page: ScriptPage): PageBlueprint {
  const blocks = bp.blocks.map((block) => {
    if (block.blockType === 'quiz') {
      const quiz = (block.slots.quiz || {}) as { question?: string; options?: unknown[] };
      const hasOptions = Array.isArray(quiz.options) && quiz.options.length >= 2;
      if (!quiz.question || !hasOptions) {
        const kp = page.keyPoints.length ? page.keyPoints : [page.intent];
        block.slots = {
          ...block.slots,
          title: (block.slots.title as string) || '课堂检测',
          quiz: {
            question: `关于"${kp[0]}"，下列说法正确的是？`,
            type: 'single-choice',
            options: [
              { text: kp[0], isCorrect: true },
              { text: '与本课内容无关的说法', isCorrect: false },
              { text: '概念混淆的说法', isCorrect: false },
              { text: '过度推断的说法', isCorrect: false },
            ],
            explanation: `依据本课内容：${kp.join('；')}`,
          },
        };
      }
    }
    if (Array.isArray(block.slots.points) && !(block.slots.points as unknown[]).length) {
      block.slots = { ...block.slots, points: page.keyPoints };
    }
    return block;
  });
  return { ...bp, blocks };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function detectGradeLevelV2(text: string): GradeLevel {
  const t = text.toLowerCase();
  if (/小学|一年级|二年级|三年级|四年级|五年级|六年级|低年级|高年级/.test(t)) return 'primary';
  if (/初中|七年级|八年级|九年级|初一|初二|初三|中考/.test(t)) return 'middle';
  if (/高中|高一|高二|高三|高考/.test(t)) return 'high';
  return 'unknown';
}

function detectSubjectV2(text: string): string {
  const t = text.toLowerCase();
  if (/语文|古诗词|文言文|唐诗|宋词|诗歌|阅读/.test(t)) return 'chinese';
  if (/历史|政治|思政|道德|法治|文史/.test(t)) return 'history';
  if (/地理|地图|区域/.test(t)) return 'geography';
  if (/英语|外语|词汇|语法|对话/.test(t)) return 'english';
  if (/数学|代数|几何|函数|方程/.test(t)) return 'math';
  if (/物理|化学|生物|科学|实验/.test(t)) return 'science';
  return 'general';
}
