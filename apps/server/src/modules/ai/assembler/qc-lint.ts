import type { Courseware } from '@courseware/shared';
import { getBlockDef } from '@courseware/shared';

export interface QcIssue {
  slideIndex: number;
  level: 'error' | 'warn';
  message: string;
}

/**
 * 课件出厂质检（确定性 lint）：
 * 不依赖浏览器截图的服务端检查——结构完整性、必填槽位、空内容、
 * quiz 合法性、图文槽位状态。视觉截图质检（多模态）为后续增强。
 */
export function lintCourseware(courseware: Courseware): QcIssue[] {
  const issues: QcIssue[] = [];

  courseware.slides.forEach((slide, slideIndex) => {
    const pageNo = slideIndex + 1;
    if (!slide.elements.length) {
      issues.push({ slideIndex: pageNo, level: 'error', message: '页面没有任何元素' });
      return;
    }

    slide.elements.forEach((el) => {
      if (el.type !== 'block') return;
      const content = el.content as {
        blockType?: string;
        slots?: Record<string, unknown>;
      };
      const blockType = content.blockType || '';
      const slots = content.slots || {};
      const def = getBlockDef(blockType);

      if (!def) {
        issues.push({ slideIndex: pageNo, level: 'warn', message: `未知版式 ${blockType}，走兜底渲染` });
        return;
      }

      // 必填槽位检查
      for (const slotDef of def.slots) {
        if (!slotDef.required) continue;
        const value = slots[slotDef.key];
        const empty =
          value === undefined ||
          value === null ||
          value === '' ||
          (Array.isArray(value) && value.length === 0) ||
          (typeof value === 'object' && !Array.isArray(value) && Object.keys(value as object).length === 0);
        if (empty) {
          issues.push({
            slideIndex: pageNo,
            level: 'error',
            message: `「${def.name}」必填槽位 ${slotDef.key}（${slotDef.label}）为空`,
          });
        }
      }

      // quiz 合法性
      if (blockType === 'quiz') {
        const quiz = slots.quiz as { question?: string; options?: { text: string; isCorrect: boolean }[]; type?: string } | undefined;
        if (!quiz?.question) {
          issues.push({ slideIndex: pageNo, level: 'error', message: '测验页缺少题干' });
        } else if (quiz.type !== 'reveal' && quiz.type !== 'fill-blank') {
          const correctCount = (quiz.options || []).filter((o) => o.isCorrect).length;
          if (!(quiz.options || []).length) {
            issues.push({ slideIndex: pageNo, level: 'error', message: '测验题没有选项' });
          } else if (correctCount === 0) {
            issues.push({ slideIndex: pageNo, level: 'error', message: '测验题没有正确选项' });
          }
        }
      }

      // 表格结构检查（headers 为空 = 静默丢内容风险）
      for (const slotDef of def.slots) {
        if (slotDef.type !== 'table') continue;
        const table = slots[slotDef.key] as { headers?: unknown[] } | undefined;
        if (table && (!Array.isArray(table.headers) || table.headers.length === 0)) {
          issues.push({ slideIndex: pageNo, level: 'error', message: `「${def.name}」表格 headers 为空，表格将无法渲染` });
        }
      }

      // "图N：描述"出现在文本里但版式没有 image 槽位 = 配图丢失风险
      const pageText = JSON.stringify(slots);
      if (/图\s*\d\s*[:：]/.test(pageText) && !def.slots.some((sd) => sd.type === 'image')) {
        issues.push({
          slideIndex: pageNo,
          level: 'warn',
          message: `「${def.name}」文本中提到"图N"但该版式没有图片槽位，图片不会生成`,
        });
      }

      // 文本溢出风险（启发式：单槽位文本超长）
      for (const [key, value] of Object.entries(slots)) {
        if (typeof value === 'string' && value.length > 600) {
          issues.push({
            slideIndex: pageNo,
            level: 'warn',
            message: `槽位 ${key} 文本 ${value.length} 字，有溢出风险（FitText 会缩字号兜底）`,
          });
        }
      }
    });
  });

  // 全局检查
  if (!courseware.slides.some((s) => s.elements.some((e) => (e.content as { blockType?: string }).blockType === 'quiz'))) {
    issues.push({ slideIndex: 0, level: 'warn', message: '整份课件没有测验页，建议保留至少一页课堂检测' });
  }

  return issues;
}
