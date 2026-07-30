import { z } from 'zod';
import {
  PageBlueprintSchema,
  blockCatalogPrompt,
  GRADE_TYPOGRAPHY,
  type PageBlueprint,
  type TeachingScript,
  type ScriptPage,
  type TeachingPhase,
} from '@courseware/shared';
import { BaseAgent, type AgentResult } from './base.agent';
import { BLUEPRINT_SYSTEM_PROMPT, BLUEPRINT_USER_PROMPT } from '../prompts/blueprint.prompt';
import { GRADE_PEDAGOGY } from '../pedagogy';

const PagesResultSchema = z.object({ pages: z.array(PageBlueprintSchema) });

export interface BlueprintBatchInput {
  script: TeachingScript;
  pages: { page: ScriptPage; phase: TeachingPhase }[];
  extractedText: string;
  subject: string;
}

/**
 * 页面蓝图 Agent：v2 管线第二阶段。
 * 按批次（默认 3 页/批）把教学脚本翻译成 PageBlueprint。
 * 注意 prompt 结构：稳定内容（学科/学段/版式目录/密度规则）在前，
 * 变动内容（本批页面/源文摘录）在后——最大化隐式上下文缓存命中。
 */
export class BlueprintAgent extends BaseAgent<{ pages: PageBlueprint[] }> {
  async executeBatch(input: BlueprintBatchInput): Promise<AgentResult<{ pages: PageBlueprint[] }>> {
    const gradeLevel = input.script.courseInfo.gradeLevel;
    const pagesDesc = input.pages
      .map(({ page, phase }) => {
        return [
          `--- 页面 ${page.id}（phase: ${phase}，环节意图见下） ---`,
          `教学意图：${page.intent}`,
          `必讲知识点：${page.keyPoints.join('；')}`,
          page.interaction ? `互动设计：${page.interaction}` : '',
          `建议版式：${page.suggestedBlock}`,
          `讲稿：${page.speakerNotes}`,
          `依据原文：${page.sourceRefs.join(' / ') || '（未标注）'}`,
        ]
          .filter(Boolean)
          .join('\n');
      })
      .join('\n\n');

    // 从源文档中抽取与本批页面相关的摘录（按 sourceRefs 匹配 + 头部截断兜底）
    const sourceExcerpts = buildSourceExcerpts(input.pages.map((p) => p.page), input.extractedText);

    const grade = GRADE_PEDAGOGY[gradeLevel] || GRADE_PEDAGOGY.unknown;
    const typography = GRADE_TYPOGRAPHY[gradeLevel] || GRADE_TYPOGRAPHY.unknown;

    const userPrompt = this.fillPrompt(BLUEPRINT_USER_PROMPT, {
      subject: input.subject || 'general',
      gradeLevelLabel: grade.label,
      objectives: input.script.courseInfo.objectives.join('；'),
      scriptPages: pagesDesc,
      sourceExcerpts: sourceExcerpts || '（无额外摘录，以脚本 keyPoints 与原文为准）',
      gradeDensity: `【${grade.label}信息密度】${grade.pageDensity}（正文字号不低于 ${typography.minBody}px 的观感控制篇幅）`,
      blockCatalog: blockCatalogPrompt(),
    });

    return this.callLLMWithRepair(
      BLUEPRINT_SYSTEM_PROMPT,
      userPrompt,
      (raw): { success: true; data: { pages: PageBlueprint[] } } | { success: false; error: string } => {
        const parsed = PagesResultSchema.safeParse(this.safeJsonParse(raw));
        return parsed.success
          ? { success: true, data: { pages: parsed.data.pages as PageBlueprint[] } }
          : { success: false, error: parsed.error.message };
      },
      // 续写模式：预填 JSON 起手，消除寒暄/ markdown 包裹；thinking 显式关闭保速度
      { prefill: '{"pages":[', maxTokens: 16000, temperature: 0.6, thinking: process.env.ARK_THINKING === 'true' },
    );
  }

  async execute(): Promise<AgentResult<{ pages: PageBlueprint[] }>> {
    throw new Error('BlueprintAgent 请使用 executeBatch()');
  }
}

/** 从全文中捞出与本批页面 sourceRefs 相关的上下文片段 */
function buildSourceExcerpts(pages: ScriptPage[], fullText: string): string {
  const excerpts: string[] = [];
  const seen = new Set<string>();
  for (const page of pages) {
    for (const ref of page.sourceRefs) {
      const key = ref.slice(0, 20);
      if (seen.has(key)) continue;
      seen.add(key);
      const idx = fullText.indexOf(ref.slice(0, 30));
      if (idx >= 0) {
        const start = Math.max(0, idx - 150);
        const end = Math.min(fullText.length, idx + ref.length + 350);
        excerpts.push(fullText.slice(start, end));
      } else if (ref) {
        excerpts.push(ref);
      }
    }
  }
  const joined = excerpts.join('\n---\n');
  return joined.length > 6000 ? joined.slice(0, 6000) + '\n……' : joined;
}
