import {
  TeachingScriptSchema,
  blockCatalogPrompt,
  type TeachingScript,
  type GradeLevel,
} from '@courseware/shared';
import { BaseAgent, type AgentContext, type AgentResult } from './base.agent';
import { SCRIPT_SYSTEM_PROMPT, SCRIPT_USER_PROMPT } from '../prompts/script.prompt';
import {
  gradePedagogyPrompt,
  phaseModelPrompt,
  subjectPedagogyPrompt,
  GRADE_PEDAGOGY,
} from '../pedagogy';

/**
 * 教学设计师 Agent：v2 管线第一阶段。
 * 输出教学分镜脚本（TeachingScript），用户确认后才进入逐页生成。
 */
export class ScriptAgent extends BaseAgent<TeachingScript> {
  async execute(context: AgentContext): Promise<AgentResult<TeachingScript>> {
    const gradeLevel = (context.options?.gradeLevel || 'unknown') as GradeLevel;
    const pageCount = context.options?.pageCount;

    const userPrompt = this.fillPrompt(SCRIPT_USER_PROMPT, {
      documentText: truncate(context.extractedText, 12000),
      description: context.description,
      subject: context.subject || 'general',
      gradeLevel,
      gradeLevelLabel: (GRADE_PEDAGOGY[gradeLevel] || GRADE_PEDAGOGY.unknown).label,
      pageCountHint: pageCount ? `教师要求课件共 ${pageCount} 页。` : '页数由你根据内容量与课时长度合理设计（8-16 页）。',
      gradePedagogy: gradePedagogyPrompt(gradeLevel),
      phaseModel: phaseModelPrompt(),
      subjectPedagogy: subjectPedagogyPrompt(context.subject),
      blockCatalog: blockCatalogPrompt(),
      pageCountRule: pageCount
        ? `严格生成 ${pageCount} 页（所有 phase 的 pages 合计必须精确等于 ${pageCount}）。`
        : '8-16 页为宜，根据内容量调整。',
    });

    return this.callLLMWithRepair(
      SCRIPT_SYSTEM_PROMPT,
      userPrompt,
      (raw) => {
        const parsed = TeachingScriptSchema.safeParse(this.safeJsonParse(raw));
        return parsed.success
          ? { success: true as const, data: parsed.data }
          : { success: false as const, error: parsed.error.message };
      },
      // thinking 默认关闭（seed-2-1-pro 默认开启，长任务会超 10 分钟）；
      // 需更高设计质量时设环境变量 ARK_THINKING=true 开启
      { thinking: process.env.ARK_THINKING === 'true', maxTokens: 16000, temperature: 0.7 },
    );
  }
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '\n……（后文略）';
}
