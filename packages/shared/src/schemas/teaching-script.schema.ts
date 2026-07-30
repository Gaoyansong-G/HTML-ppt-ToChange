import { z } from 'zod';

/**
 * 教学分镜脚本（TeachingScript）
 * 两阶段生成的第一阶段产物：教学设计师 Agent 输出的完整课堂教学设计。
 * 用户确认/编辑后，第二阶段按脚本逐页生成 PageBlueprint。
 */

export const TeachingPhase = z.enum([
  'lead-in',    // 导入
  'objectives', // 目标呈现
  'teaching',   // 新授
  'practice',   // 巩固练习
  'summary',    // 总结
  'homework',   // 作业/拓展
]);

export const GradeLevel = z.enum(['primary', 'middle', 'high', 'unknown']);

export const ScriptPageSchema = z.object({
  id: z.string(),
  intent: z.string(),                       // 本页教学意图
  keyPoints: z.array(z.string()),           // 必须讲清的知识点
  interaction: z.string().optional(),       // 设计的师生互动（映射互动组件）
  sourceRefs: z.array(z.string()).default([]), // 引用的原文段落（防幻觉溯源）
  suggestedBlock: z.string(),               // 建议主版式 blockType
  speakerNotes: z.string().default(''),     // 教师讲稿备注
});

export const ScriptPhaseSchema = z.object({
  phase: TeachingPhase,
  title: z.string(),
  durationMin: z.number().positive(),
  teacherActivity: z.string().default(''),
  studentActivity: z.string().default(''),
  pages: z.array(ScriptPageSchema),
});

export const TeachingScriptSchema = z.object({
  courseInfo: z.object({
    subject: z.string(),
    gradeLevel: GradeLevel,
    duration: z.number().positive(),        // 课时长度（分钟）
    objectives: z.array(z.string()),
  }),
  phases: z.array(ScriptPhaseSchema),
  rhythm: z.object({
    interactionPoints: z.array(z.number()).default([]), // 互动点页码（全局序号）
    climaxPage: z.number().optional(),
  }).default({ interactionPoints: [] }),
});

export type TeachingPhase = z.infer<typeof TeachingPhase>;
export type GradeLevel = z.infer<typeof GradeLevel>;
export type ScriptPage = z.infer<typeof ScriptPageSchema>;
export type ScriptPhase = z.infer<typeof ScriptPhaseSchema>;
export type TeachingScript = z.infer<typeof TeachingScriptSchema>;

export const TEACHING_PHASE_LABELS: Record<TeachingPhase, string> = {
  'lead-in': '导入',
  objectives: '目标呈现',
  teaching: '新授',
  practice: '巩固练习',
  summary: '总结',
  homework: '作业拓展',
};
