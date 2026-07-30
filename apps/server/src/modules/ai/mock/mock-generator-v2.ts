import type {
  TeachingScript,
  PageBlueprint,
  ScriptPage,
  TeachingPhase,
} from '@courseware/shared';

/**
 * Mock 生成器：ARK_MOCK=true 时启用。
 * 用确定性规则从描述生成脚本与蓝图，供无 API Key / 欠费 / 离线环境下调试全链路。
 * 同时作为 LLM 失败时的降级兜底。
 */

export function buildMockScript(description: string, pageCount = 8): TeachingScript {
  const topic = description.replace(/\d+\s*(页|张|page)/gi, '').trim().slice(0, 30) || '课程主题';
  let pageId = 0;
  const nextId = () => `p${++pageId}`;

  const mk = (
    intent: string,
    keyPoints: string[],
    suggestedBlock: string,
    interaction?: string,
  ): ScriptPage => ({
    id: nextId(),
    intent,
    keyPoints,
    interaction,
    sourceRefs: [`（示例来源）${intent}`],
    suggestedBlock,
    speakerNotes: `本页${intent}。注意与学生互动，观察理解情况。`,
  });

  const pages: { phase: TeachingPhase; title: string; durationMin: number; pages: ScriptPage[] }[] = [
    {
      phase: 'lead-in', title: '情境导入', durationMin: 5,
      pages: [mk(`封面：${topic}`, [topic], 'cover'), mk('创设情境，激发兴趣', ['生活情境引入', '提出核心问题'], 'title-content', '自由发言：你见过类似的现象吗？')],
    },
    {
      phase: 'objectives', title: '目标呈现', durationMin: 2,
      pages: [mk('明确学习目标', ['知识与技能目标', '过程与方法目标', '情感态度目标'], 'objectives')],
    },
    {
      phase: 'teaching', title: '新授探究', durationMin: 18,
      pages: [
        mk('新知讲解（一）：核心概念', ['概念定义', '实例说明'], 'concept'),
        mk('新知讲解（二）：深入分析', ['要点剖析', '对比辨析'], 'compare'),
        mk('例题示范', ['例题呈现', '分步解析'], 'worked-example'),
      ],
    },
    {
      phase: 'practice', title: '巩固练习', durationMin: 8,
      pages: [mk('课堂检测', ['基础题', '提升题'], 'quiz', '独立作答，同桌互评')],
    },
    {
      phase: 'summary', title: '总结回顾', durationMin: 4,
      pages: [mk('知识结构梳理', ['要点回顾', '方法提炼'], 'summary')],
    },
    {
      phase: 'homework', title: '作业拓展', durationMin: 3,
      pages: [mk('分层作业布置', ['基础作业', '拓展挑战'], 'homework')],
    },
  ];

  // 按 pageCount 裁剪/扩展 teaching 页
  const script: TeachingScript = {
    courseInfo: {
      subject: 'general',
      gradeLevel: 'unknown',
      duration: 40,
      objectives: [`理解${topic}的核心概念`, `掌握${topic}的基本方法`, `能运用所学解决实际问题`],
    },
    phases: pages.map((p) => ({
      phase: p.phase,
      title: p.title,
      durationMin: p.durationMin,
      teacherActivity: '讲解、提问、巡视指导',
      studentActivity: '倾听、思考、练习、讨论',
      pages: p.pages,
    })),
    rhythm: { interactionPoints: [2, 7], climaxPage: 5 },
  };

  if (pageCount && pageCount !== pageId) {
    // 简单裁剪：从 teaching 中删/补
    while (countPages(script) > pageCount) {
      const teaching = script.phases.find((p) => p.phase === 'teaching')!;
      if (teaching.pages.length > 1) teaching.pages.pop();
      else break;
    }
  }
  return script;
}

function countPages(s: TeachingScript): number {
  return s.phases.reduce((n, p) => n + p.pages.length, 0);
}

export function buildMockBlueprintForPage(
  page: ScriptPage,
  phase: TeachingPhase,
  isFirst: boolean,
): PageBlueprint {
  const base = {
    id: page.id,
    title: page.intent.slice(0, 20),
    phase,
    speakerNotes: page.speakerNotes,
    sourceRefs: page.sourceRefs,
  };
  const kp = page.keyPoints;

  switch (page.suggestedBlock) {
    case 'cover':
      return {
        ...base,
        title: kp[0] || '课程封面',
        blocks: [{
          blockType: 'cover', variant: 'center',
          slots: { title: kp[0] || '课程标题', subtitle: page.intent, info: 'AI 生成示例课件' },
          emphasis: [],
        }],
      };
    case 'objectives':
      return {
        ...base,
        blocks: [{
          blockType: 'objectives', variant: 'cards',
          slots: { title: '学习目标', items: kp },
          emphasis: [],
        }],
      };
    case 'concept':
      return {
        ...base,
        blocks: [{
          blockType: 'concept', variant: 'card',
          slots: { term: kp[0] || '核心概念', definition: `${kp[0] || '本概念'}的示例定义（Mock 内容）。`, example: kp[1] || '示例', tip: '注意区分易混淆点' },
          emphasis: ['term'],
        }],
      };
    case 'compare':
      return {
        ...base,
        blocks: [{
          blockType: 'compare', variant: 'columns',
          slots: {
            title: page.intent, leftTitle: kp[0] || '概念 A', rightTitle: kp[1] || '概念 B',
            pairs: [
              { left: '特征一', right: '特征一' },
              { left: '特征二', right: '特征二' },
              { left: '特征三', right: '特征三' },
            ],
          },
          emphasis: [],
        }],
      };
    case 'worked-example':
      return {
        ...base,
        blocks: [{
          blockType: 'worked-example', variant: 'split',
          slots: {
            problem: `【例题】${kp[0] || '示例题目'}（Mock 内容）`,
            steps: [
              { title: '审题', detail: '找出已知条件与所求' },
              { title: '分析', detail: kp[1] || '确定解题思路' },
              { title: '解答', detail: '分步求解' },
            ],
            answer: '答案略',
          },
          emphasis: [],
        }],
      };
    case 'quiz':
      return {
        ...base,
        blocks: [{
          blockType: 'quiz', variant: 'card',
          slots: {
            title: '课堂检测',
            quiz: {
              question: `关于"${kp[0] || '本课内容'}"，下列说法正确的是？`,
              type: 'single-choice',
              options: [
                { text: `${kp[0] || '正确说法'}（正确）`, isCorrect: true },
                { text: '与原文不符的说法', isCorrect: false },
                { text: '概念混淆的说法', isCorrect: false },
                { text: '过度推断的说法', isCorrect: false },
              ],
              explanation: '依据本课所学内容可判断。',
            },
          },
          emphasis: [],
        }],
      };
    case 'summary':
      return {
        ...base,
        blocks: [{
          blockType: 'summary', variant: 'cards',
          slots: { title: '课堂总结', points: kp, takeaway: '学有所思，学有所用。' },
          emphasis: [],
        }],
      };
    case 'homework':
      return {
        ...base,
        blocks: [{
          blockType: 'homework', variant: 'list',
          slots: { title: '课后作业', items: kp, extension: '选做：查阅资料，了解更多相关内容。' },
          emphasis: [],
        }],
      };
    default:
      return {
        ...base,
        blocks: [{
          blockType: 'title-content', variant: 'default',
          slots: { title: page.intent, points: kp, note: isFirst ? '' : '' },
          emphasis: [],
        }],
      };
  }
}
