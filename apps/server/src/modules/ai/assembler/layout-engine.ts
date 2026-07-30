import { DESIGN_THEMES, type DesignSystem } from '@courseware/shared';
import type { Element } from '@courseware/shared';
import type { OutlineResult } from '../agents/outline.agent';
import type { ContentResult } from '../agents/content.agent';
import type { DesignResult } from '../agents/design.agent';
import { fitAllTextElements } from './text-layout';

const SLIDE_WIDTH = 1280;
const SLIDE_HEIGHT = 720;

const SAFE_LEFT = 60;
const SAFE_RIGHT = 1220;
const SAFE_TOP = 50;
const SAFE_BOTTOM = 670;
const CENTER_X = SLIDE_WIDTH / 2;

function chooseTheme(subject?: string, description = ''): keyof typeof DESIGN_THEMES {
  const text = `${subject || ''} ${description}`.toLowerCase();
  if (/语文|古诗词|文言文|唐诗|宋词|诗歌|阅读/.test(text)) return 'chinese';
  if (/历史|政治|思政|道德|法治|文史/.test(text)) return 'history';
  if (/地理|地图|区域|自然地理|人文地理/.test(text)) return 'geography';
  if (/英语|外语|英语词汇|语法|对话/.test(text)) return 'english';
  if (/数学|代数|几何|函数|方程|推导/.test(text)) return 'math';
  if (/物理|化学|生物|科学|信息技术|编程|ai|人工智能|计算机|实验/.test(text)) return 'science';
  if (/美术|音乐|体育|艺术|书法/.test(text)) return 'language';
  if (/文科|语文|历史|政治|思政|地理|道德|法治|人文|文学/.test(text)) return 'humanities';
  if (/理科|数学|物理|化学|生物|科学|信息技术|编程/.test(text)) return 'academic';
  return 'academic';
}

function textEl(
  role: string,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    type: 'text',
    semanticRole: role,
    geometry: { x, y, width, height, zIndex: typeof overrides.zIndex === 'number' ? overrides.zIndex : 2 },
    style: {
      color: overrides.color ?? '#1e293b',
      fontSize: overrides.fontSize ?? 24,
      fontWeight: overrides.fontWeight ?? 400,
      textAlign: overrides.textAlign ?? 'left',
      lineHeight: overrides.lineHeight ?? 1.6,
      ...(overrides.shadow ? { shadow: overrides.shadow } : {}),
    },
    content: { text },
  };
}

function shapeEl(
  role: string,
  x: number,
  y: number,
  width: number,
  height: number,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    type: 'shape',
    semanticRole: role,
    geometry: { x, y, width, height, zIndex: typeof overrides.zIndex === 'number' ? overrides.zIndex : 0 },
    style: {
      opacity: overrides.opacity ?? 0.08,
      borderRadius: overrides.borderRadius ?? 0,
      ...(overrides.shadow ? { shadow: overrides.shadow } : {}),
    },
    content: {
      shapeType: overrides.shapeType || 'rectangle',
      fill: overrides.fill ?? '#2563eb',
      stroke: overrides.stroke,
      strokeWidth: overrides.strokeWidth,
    },
  };
}

function circle(x: number, y: number, size: number, fill: string, opacity = 0.12): Record<string, unknown> {
  return shapeEl('decoration', x, y, size, size, {
    shapeType: 'circle',
    fill,
    opacity,
    zIndex: 0,
  });
}

function gradientRect(x: number, y: number, width: number, height: number, colors: [string, string], opacity = 0.1): Record<string, unknown> {
  return shapeEl('decoration', x, y, width, height, {
    fill: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
    opacity,
    borderRadius: 16,
    zIndex: 0,
  });
}

function cardBg(x: number, y: number, width: number, height: number, fill: string, shadow?: string): Record<string, unknown> {
  return shapeEl('option-bg', x, y, width, height, {
    fill,
    opacity: 1,
    borderRadius: 12,
    shadow,
    zIndex: 1,
  });
}

function dot(x: number, y: number, size: number, fill: string): Record<string, unknown> {
  return shapeEl('decoration', x, y, size, size, {
    shapeType: 'circle',
    fill,
    opacity: 1,
    zIndex: 1,
  });
}

function divider(x: number, y: number, width: number, colors: [string, string]): Record<string, unknown> {
  return shapeEl('decoration', x, y, width, 4, {
    fill: `linear-gradient(90deg, ${colors[0]}, ${colors[1]})`,
    opacity: 0.6,
    borderRadius: 2,
    zIndex: 0,
  });
}

function backgroundGradient(color1: string, color2: string): { gradient: string } {
  return { gradient: `linear-gradient(135deg, ${color1}, ${color2})` };
}

export function buildFallbackDesign(outline: OutlineResult, content: ContentResult, subject?: string, description = ''): DesignResult {
  const themeKey = chooseTheme(subject, description);
  const theme = DESIGN_THEMES[themeKey];
  const t = theme.tokens;
  const c = t.colors;

  const designSystem: DesignSystem = {
    id: theme.id,
    name: theme.name,
    tokens: {
      colors: { ...c },
      fonts: { ...t.fonts },
      fontSizes: { ...t.fontSizes },
      spacing: { ...t.spacing },
      borderRadius: { ...t.borderRadius },
      shadows: t.shadows ? { ...t.shadows } : {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      },
    },
  };

  const shadowMd = designSystem.tokens.shadows?.md || '0 4px 6px -1px rgb(0 0 0 / 0.1)';

  const slides = outline.slides.map((outlineSlide, index) => {
    const order = outlineSlide.order ?? index;
    const contentSlide = content.slides.find((s) => (s.order ?? -1) === order) || content.slides[index];
    const layoutId = outlineSlide.layoutTemplateId || 'content';
    const title = outlineSlide.title;
    const body = contentSlide?.body || '';
    const elements: Record<string, unknown>[] = [];

    switch (layoutId) {
      case 'title': {
        elements.push(gradientRect(SAFE_LEFT, 180, SAFE_RIGHT - SAFE_LEFT, 360, [c.primary, c.accent], 0.08));
        elements.push(circle(SAFE_RIGHT - 120, SAFE_TOP + 20, 100, c.secondary, 0.12));
        elements.push(circle(SAFE_LEFT - 30, SAFE_BOTTOM - 60, 120, c.accent, 0.08));
        elements.push(textEl('title', title, SAFE_LEFT, 220, SAFE_RIGHT - SAFE_LEFT, 90, {
          fontSize: 56,
          fontWeight: 700,
          textAlign: 'center',
          color: c.text,
        }));
        if (body) {
          elements.push(textEl('subtitle', body, SAFE_LEFT, 330, SAFE_RIGHT - SAFE_LEFT, 70, {
            fontSize: 28,
            color: c.textMuted,
            textAlign: 'center',
          }));
        }
        elements.push(divider(CENTER_X - 120, 440, 240, [c.primary, c.accent]));
        break;
      }

      case 'quiz': {
        elements.push(gradientRect(SAFE_RIGHT - 360, SAFE_TOP, 300, 620, [c.primary, c.secondary], 0.06));
        elements.push(circle(SAFE_LEFT + 40, SAFE_BOTTOM - 80, 100, c.accent, 0.08));
        elements.push(textEl('title', title, SAFE_LEFT, SAFE_TOP, 800, 60, { fontSize: 40, fontWeight: 700, color: c.text }));
        const quiz = contentSlide?.quiz;
        if (quiz?.question) {
          const quizOptions = (quiz.type === 'single-choice' && quiz.options)
            ? quiz.options.map((opt, i) => ({
                id: String.fromCharCode(65 + i),
                text: opt.text,
                isCorrect: opt.isCorrect ?? false,
              }))
            : [];
          const correctAnswer = quiz.type === 'single-choice'
            ? (quizOptions.find((o) => o.isCorrect)?.text || quiz.answer || '')
            : (quiz.answer || '');
          elements.push({
            type: 'quiz',
            semanticRole: 'quiz',
            geometry: { x: SAFE_LEFT, y: SAFE_TOP + 70, width: 820, height: 520, zIndex: 2 },
            content: {
              question: quiz.question,
              type: quiz.type || 'single-choice',
              options: quizOptions,
              correctAnswer,
              explanation: quiz.explanation || '',
              allowRetry: true,
            },
          });
        } else if (body && !quiz?.question) {
          elements.push(textEl('body', body, SAFE_LEFT, SAFE_TOP + 80, 820, 360, { fontSize: 24, color: c.textMuted }));
        }
        break;
      }

      case 'image': {
        elements.push(gradientRect(720, SAFE_TOP, 480, 540, [c.accent, c.primary], 0.06));
        elements.push(circle(SAFE_LEFT + 40, SAFE_BOTTOM - 80, 100, c.accent, 0.08));
        elements.push(textEl('title', title, SAFE_LEFT, SAFE_TOP, SAFE_RIGHT - SAFE_LEFT, 60, { fontSize: 40, fontWeight: 700, textAlign: 'center', color: c.text }));
        const lines = body.split('\n').filter(Boolean);
        const caption = lines.find((l) => l.trim().startsWith('配图说明'))?.replace(/^配图说明[：:]\s*/, '') || (lines[0] || '配图说明');
        const analysis = lines.filter((l) => l.trim().startsWith('知识点赏析')).map((l) => l.replace(/^知识点赏析[：:]\s*/, '')).join('\n')
          || lines.slice(1).join('\n')
          || '请结合课文内容，补充与图片相关的赏析或知识点。';
        const textW = 600;
        const imageW = 480;
        const cardH = 440;
        const startY = SAFE_TOP + 110;
        elements.push(cardBg(SAFE_LEFT, startY, textW, cardH, c.background, shadowMd));
        elements.push(textEl('caption', caption, SAFE_LEFT + 28, startY + 28, textW - 56, 40, { fontSize: 18, color: c.textMuted }));
        elements.push(textEl('body', analysis, SAFE_LEFT + 28, startY + 80, textW - 56, cardH - 110, { fontSize: 22, color: c.textMuted, lineHeight: 1.7 }));
        elements.push({
          type: 'image',
          semanticRole: 'image',
          geometry: { x: SAFE_LEFT + textW + 40, y: startY, width: imageW, height: cardH, zIndex: 1 },
          style: { borderRadius: 16, shadow: shadowMd },
          content: { assetId: '', alt: outlineSlide.keyPoints?.[0] || title },
        });
        break;
      }

      case 'comparison': {
        elements.push(divider(SAFE_LEFT, SAFE_TOP + 70, SAFE_RIGHT - SAFE_LEFT, [c.primary, c.accent]));
        elements.push(circle(SAFE_LEFT - 20, SAFE_BOTTOM - 60, 80, c.accent, 0.08));
        elements.push(textEl('title', title, SAFE_LEFT, SAFE_TOP, SAFE_RIGHT - SAFE_LEFT, 60, { fontSize: 40, fontWeight: 700, textAlign: 'center', color: c.text }));
        const leftMatch = body.match(/左侧[：:]\s*(.+)/);
        const rightMatch = body.match(/右侧[：:]\s*(.+)/);
        const parts = body.split('\n').filter(Boolean);
        const leftBody = leftMatch?.[1] || parts[0] || '左侧内容';
        const rightBody = rightMatch?.[1] || parts[1] || '右侧内容';
        const colWidth = 500;
        const leftX = SAFE_LEFT + 20;
        const rightX = SAFE_RIGHT - colWidth - 20;
        const colY = SAFE_TOP + 110;
        const colH = 470;
        elements.push(cardBg(leftX, colY, colWidth, colH, c.background, shadowMd));
        elements.push(shapeEl('decoration', leftX + 24, colY + 24, 48, 48, {
          shapeType: 'circle',
          fill: `linear-gradient(135deg, ${c.primary}, ${c.accent})`,
          opacity: 1,
        }));
        elements.push(textEl('subtitle', 'A', leftX + 84, colY + 28, 80, 40, { fontSize: 28, fontWeight: 700, color: c.primary }));
        elements.push(textEl('body', leftBody, leftX + 28, colY + 94, colWidth - 56, colH - 130, { fontSize: 22, color: c.textMuted, lineHeight: 1.7 }));

        elements.push(cardBg(rightX, colY, colWidth, colH, c.background, shadowMd));
        elements.push(shapeEl('decoration', rightX + 24, colY + 24, 48, 48, {
          shapeType: 'circle',
          fill: `linear-gradient(135deg, ${c.secondary}, ${c.accent})`,
          opacity: 1,
        }));
        elements.push(textEl('subtitle', 'B', rightX + 84, colY + 28, 80, 40, { fontSize: 28, fontWeight: 700, color: c.secondary }));
        elements.push(textEl('body', rightBody, rightX + 28, colY + 94, colWidth - 56, colH - 130, { fontSize: 22, color: c.textMuted, lineHeight: 1.7 }));

        elements.push(shapeEl('decoration', CENTER_X - 30, colY + colH / 2 - 30, 60, 60, {
          shapeType: 'circle',
          fill: c.surface,
          stroke: c.border,
          strokeWidth: 2,
          opacity: 1,
        }));
        elements.push(textEl('annotation', 'VS', CENTER_X - 40, colY + colH / 2 - 16, 80, 40, { fontSize: 20, fontWeight: 700, color: c.textMuted, textAlign: 'center' }));
        break;
      }

      case 'timeline': {
        elements.push(divider(SAFE_LEFT, SAFE_TOP + 70, SAFE_RIGHT - SAFE_LEFT, [c.primary, c.accent]));
        elements.push(circle(SAFE_RIGHT - 60, SAFE_BOTTOM - 60, 80, c.accent, 0.08));
        elements.push(textEl('title', title, SAFE_LEFT, SAFE_TOP, SAFE_RIGHT - SAFE_LEFT, 60, { fontSize: 40, fontWeight: 700, color: c.text }));
        const events = body.split('\n').filter(Boolean).length >= 3
          ? body.split('\n').filter(Boolean).slice(0, 5)
          : ['事件一', '事件二', '事件三'];
        const totalW = SAFE_RIGHT - SAFE_LEFT;
        const gap = totalW / (events.length + 1);
        const lineY = SAFE_TOP + 280;
        elements.push(shapeEl('decoration', SAFE_LEFT, lineY, totalW, 6, {
          fill: `linear-gradient(90deg, ${c.primary}, ${c.accent})`,
          opacity: 0.5,
          borderRadius: 3,
        }));
        events.forEach((evt, i) => {
          const x = SAFE_LEFT + gap * (i + 1);
          const isTop = i % 2 === 0;
          const cardY = isTop ? lineY - 170 : lineY + 40;
          const cardH = 130;
          elements.push(cardBg(x - 130, cardY, 260, cardH, c.background, shadowMd));
          elements.push(dot(x - 12, lineY - 12, 24, i % 2 === 0 ? c.primary : c.accent));
          elements.push(textEl('body', evt.replace(/^[-•*]\s*/, ''), x - 110, cardY + 16, 220, cardH - 32, {
            fontSize: 18,
            color: c.textMuted,
            lineHeight: 1.5,
            textAlign: 'center',
          }));
        });
        break;
      }

      case 'cards': {
        elements.push(divider(SAFE_LEFT, SAFE_TOP + 70, SAFE_RIGHT - SAFE_LEFT, [c.primary, c.accent]));
        elements.push(circle(SAFE_RIGHT - 60, SAFE_BOTTOM - 60, 80, c.accent, 0.08));
        elements.push(textEl('title', title, SAFE_LEFT, SAFE_TOP, SAFE_RIGHT - SAFE_LEFT, 60, { fontSize: 40, fontWeight: 700, color: c.text }));
        const cardLines = body.split('\n').filter(Boolean).length >= 4
          ? body.split('\n').filter(Boolean).slice(0, 4)
          : ['要点一', '要点二', '要点三', '要点四'];
        const cardW = 520;
        const cardH = 220;
        const gapX = 40;
        const gapY = 32;
        const startX = SAFE_LEFT + 20;
        const startY = SAFE_TOP + 100;
        cardLines.forEach((line, i) => {
          const col = i % 2;
          const row = Math.floor(i / 2);
          const x = startX + col * (cardW + gapX);
          const y = startY + row * (cardH + gapY);
          elements.push(cardBg(x, y, cardW, cardH, c.background, shadowMd));
          elements.push(shapeEl('decoration', x + 20, y + 20, 32, 32, {
            shapeType: 'circle',
            fill: `linear-gradient(135deg, ${c.primary}, ${c.accent})`,
            opacity: 1,
          }));
          elements.push(textEl('body', line.replace(/^[-•*]\s*/, ''), x + 64, y + 20, cardW - 90, cardH - 50, {
            fontSize: 22,
            color: c.textMuted,
            lineHeight: 1.6,
          }));
        });
        break;
      }

      case 'section': {
        elements.push(gradientRect(SAFE_LEFT, 180, SAFE_RIGHT - SAFE_LEFT, 280, [c.primary, c.accent], 0.08));
        elements.push(circle(SAFE_RIGHT - 120, SAFE_TOP + 20, 120, c.secondary, 0.12));
        elements.push(circle(SAFE_LEFT - 40, SAFE_BOTTOM - 80, 100, c.accent, 0.08));
        elements.push(textEl('title', title, SAFE_LEFT, 260, SAFE_RIGHT - SAFE_LEFT, 100, {
          fontSize: 60,
          fontWeight: 700,
          textAlign: 'center',
          color: c.text,
        }));
        if (body) {
          elements.push(textEl('subtitle', body, SAFE_LEFT, 380, SAFE_RIGHT - SAFE_LEFT, 70, {
            fontSize: 28,
            color: c.textMuted,
            textAlign: 'center',
          }));
        }
        elements.push(divider(CENTER_X - 120, 480, 240, [c.primary, c.accent]));
        break;
      }

      case 'toc': {
        elements.push(divider(SAFE_LEFT, SAFE_TOP + 70, SAFE_RIGHT - SAFE_LEFT, [c.primary, c.accent]));
        elements.push(circle(SAFE_RIGHT - 60, SAFE_BOTTOM - 60, 80, c.accent, 0.08));
        elements.push(textEl('title', title, SAFE_LEFT, SAFE_TOP, SAFE_RIGHT - SAFE_LEFT, 60, { fontSize: 40, fontWeight: 700, color: c.text }));
        const tocItems = body.split('\n').filter(Boolean).length > 0
          ? body.split('\n').filter(Boolean).slice(0, 5)
          : (outlineSlide.keyPoints?.slice(0, 5) || ['学习目标一', '学习目标二', '学习目标三']);
        tocItems.forEach((item, i) => {
          const y = SAFE_TOP + 130 + i * 88;
          elements.push(cardBg(SAFE_LEFT + 20, y, SAFE_RIGHT - SAFE_LEFT - 40, 72, c.background, shadowMd));
          elements.push(shapeEl('decoration', SAFE_LEFT + 44, y + 20, 32, 32, {
            shapeType: 'circle',
            fill: `linear-gradient(135deg, ${c.primary}, ${c.accent})`,
            opacity: 1,
          }));
          elements.push(textEl('annotation', String(i + 1), SAFE_LEFT + 44, y + 24, 32, 28, {
            fontSize: 16,
            fontWeight: 700,
            color: '#ffffff',
            textAlign: 'center',
          }));
          elements.push(textEl('body', item.replace(/^[-•*]\s*/, ''), SAFE_LEFT + 92, y + 18, SAFE_RIGHT - SAFE_LEFT - 120, 40, {
            fontSize: 22,
            color: c.textMuted,
          }));
        });
        break;
      }

      case 'steps': {
        elements.push(divider(SAFE_LEFT, SAFE_TOP + 70, SAFE_RIGHT - SAFE_LEFT, [c.primary, c.accent]));
        elements.push(circle(SAFE_RIGHT - 60, SAFE_BOTTOM - 60, 80, c.accent, 0.08));
        elements.push(textEl('title', title, SAFE_LEFT, SAFE_TOP, SAFE_RIGHT - SAFE_LEFT, 60, { fontSize: 40, fontWeight: 700, color: c.text }));
        const stepLines = body.split('\n').filter(Boolean).length >= 3
          ? body.split('\n').filter(Boolean).slice(0, 4)
          : ['步骤一', '步骤二', '步骤三'];
        const stepCount = stepLines.length;
        const stepW = Math.min(260, (SAFE_RIGHT - SAFE_LEFT - 60 - (stepCount - 1) * 32) / stepCount);
        const totalRowW = stepW * stepCount + 32 * (stepCount - 1);
        const startX = SAFE_LEFT + 30 + (SAFE_RIGHT - SAFE_LEFT - 60 - totalRowW) / 2;
        const stepY = SAFE_TOP + 130;
        const stepH = 420;
        stepLines.forEach((line, i) => {
          const x = startX + i * (stepW + 32);
          elements.push(cardBg(x, stepY, stepW, stepH, c.background, shadowMd));
          elements.push(shapeEl('decoration', x + stepW / 2 - 24, stepY + 24, 48, 48, {
            shapeType: 'circle',
            fill: `linear-gradient(135deg, ${c.primary}, ${c.accent})`,
            opacity: 1,
          }));
          elements.push(textEl('annotation', String(i + 1), x + stepW / 2 - 24, stepY + 32, 48, 32, {
            fontSize: 20,
            fontWeight: 700,
            color: '#ffffff',
            textAlign: 'center',
          }));
          elements.push(textEl('body', line.replace(/^[-•*]\s*/, ''), x + 16, stepY + 100, stepW - 32, stepH - 130, {
            fontSize: 20,
            color: c.textMuted,
            lineHeight: 1.6,
            textAlign: 'center',
          }));
        });
        break;
      }

      case 'quote': {
        elements.push(gradientRect(SAFE_LEFT, 160, SAFE_RIGHT - SAFE_LEFT, 320, [c.primary, c.accent], 0.08));
        elements.push(circle(SAFE_LEFT + 60, SAFE_TOP + 20, 60, c.accent, 0.12));
        elements.push(circle(SAFE_RIGHT - 80, SAFE_BOTTOM - 80, 100, c.secondary, 0.08));
        const quoteText = body || '核心观点/名言';
        elements.push(textEl('title', `“${quoteText}”`, SAFE_LEFT + 80, 240, SAFE_RIGHT - SAFE_LEFT - 160, 140, {
          fontSize: 40,
          fontWeight: 600,
          color: c.text,
          textAlign: 'center',
          lineHeight: 1.5,
        }));
        if (title && title !== '引用页') {
          elements.push(textEl('subtitle', `—— ${title}`, SAFE_LEFT, 420, SAFE_RIGHT - SAFE_LEFT, 50, {
            fontSize: 24,
            color: c.textMuted,
            textAlign: 'center',
          }));
        }
        elements.push(divider(CENTER_X - 120, 520, 240, [c.primary, c.accent]));
        break;
      }

      case 'reading': {
        elements.push(divider(SAFE_LEFT, SAFE_TOP + 70, SAFE_RIGHT - SAFE_LEFT, [c.primary, c.accent]));
        elements.push(textEl('title', title, SAFE_LEFT, SAFE_TOP, SAFE_RIGHT - SAFE_LEFT, 60, { fontSize: 40, fontWeight: 700, textAlign: 'center', color: c.text }));
        const lines = body.split('\n').filter(Boolean);
        const excerptLine = lines.find((l) => l.trim().startsWith('原文摘录')) || lines[0] || '原文摘录';
        const questionLine = lines.find((l) => l.trim().startsWith('赏析问题') || l.trim().startsWith('解析')) || lines.slice(1).join('\n') || '这段文字表达了什么？';
        const excerpt = excerptLine.replace(/^原文摘录[：:]\s*/, '').replace(/^解析[：:]\s*/, '');
        const question = questionLine.replace(/^赏析问题[：:]\s*/, '').replace(/^解析[：:]\s*/, '');
        const leftW = 600;
        const rightW = 460;
        const cardH = 380;
        const cardY = SAFE_TOP + 100;
        elements.push(cardBg(SAFE_LEFT, cardY, leftW, cardH, c.background, shadowMd));
        elements.push(textEl('annotation', '“', SAFE_LEFT + 20, cardY + 16, 60, 80, {
          fontSize: 72,
          fontWeight: 700,
          color: c.accent,
          opacity: 0.25,
        }));
        elements.push(textEl('body', `“${excerpt}”`, SAFE_LEFT + 28, cardY + 36, leftW - 56, cardH - 60, {
          fontSize: 22,
          color: c.textMuted,
          lineHeight: 1.8,
          fontWeight: 500,
        }));
        elements.push({
          type: 'image',
          semanticRole: 'image',
          geometry: { x: SAFE_RIGHT - rightW, y: cardY, width: rightW, height: cardH, zIndex: 1 },
          style: { borderRadius: 16, shadow: shadowMd },
          content: { assetId: '', alt: `课文配图：${outlineSlide.title || title}` },
        });
        elements.push(cardBg(SAFE_LEFT, cardY + cardH + 24, SAFE_RIGHT - SAFE_LEFT, 120, c.surface, shadowMd));
        elements.push(textEl('subtitle', '赏析与思考', SAFE_LEFT + 24, cardY + cardH + 40, 200, 40, {
          fontSize: 24,
          fontWeight: 600,
          color: c.primary,
        }));
        elements.push(textEl('body', question, SAFE_LEFT + 24, cardY + cardH + 84, SAFE_RIGHT - SAFE_LEFT - 48, 44, {
          fontSize: 22,
          color: c.textMuted,
          lineHeight: 1.6,
        }));
        break;
      }

      case 'experiment': {
        elements.push(divider(SAFE_LEFT, SAFE_TOP + 70, SAFE_RIGHT - SAFE_LEFT, [c.primary, c.accent]));
        elements.push(circle(SAFE_RIGHT - 60, SAFE_BOTTOM - 60, 80, c.accent, 0.08));
        elements.push(textEl('title', title, SAFE_LEFT, SAFE_TOP, SAFE_RIGHT - SAFE_LEFT, 60, { fontSize: 40, fontWeight: 700, color: c.text }));
        const parts = body.split('\n').filter(Boolean).length >= 3
          ? body.split('\n').filter(Boolean).slice(0, 3)
          : ['实验器材', '操作步骤', '实验结论'];
        const colW = 360;
        const gap = 24;
        const startX = SAFE_LEFT + (SAFE_RIGHT - SAFE_LEFT - (colW * 3 + gap * 2)) / 2;
        const labels = ['器材', '步骤', '结论'];
        parts.forEach((part, i) => {
          const x = startX + i * (colW + gap);
          elements.push(cardBg(x, SAFE_TOP + 120, colW, 460, c.background, shadowMd));
          elements.push(shapeEl('decoration', x + 20, SAFE_TOP + 140, 40, 40, {
            shapeType: 'circle',
            fill: `linear-gradient(135deg, ${c.primary}, ${c.accent})`,
            opacity: 1,
          }));
          elements.push(textEl('annotation', String(i + 1), x + 20, SAFE_TOP + 148, 40, 28, {
            fontSize: 18,
            fontWeight: 700,
            color: '#ffffff',
            textAlign: 'center',
          }));
          elements.push(textEl('subtitle', labels[i], x + 72, SAFE_TOP + 144, colW - 92, 40, {
            fontSize: 24,
            fontWeight: 600,
            color: c.primary,
          }));
          elements.push(textEl('body', part.replace(/^[-•*]\s*/, ''), x + 20, SAFE_TOP + 210, colW - 40, 340, {
            fontSize: 20,
            color: c.textMuted,
            lineHeight: 1.7,
          }));
        });
        break;
      }

      case 'grammar': {
        elements.push(divider(SAFE_LEFT, SAFE_TOP + 70, SAFE_RIGHT - SAFE_LEFT, [c.primary, c.accent]));
        elements.push(circle(SAFE_RIGHT - 80, SAFE_BOTTOM - 80, 100, c.accent, 0.08));
        elements.push(textEl('title', title, SAFE_LEFT, SAFE_TOP, SAFE_RIGHT - SAFE_LEFT, 60, { fontSize: 40, fontWeight: 700, color: c.text }));
        const lines = body.split('\n').filter(Boolean);
        const example = lines[0] || '例句：请从原文中选取一个典型例句。';
        const rule = lines[1] || '规则说明';
        const practice = lines[2] || '即时练习';
        elements.push(cardBg(SAFE_LEFT, SAFE_TOP + 100, SAFE_RIGHT - SAFE_LEFT, 120, c.background, shadowMd));
        elements.push(textEl('annotation', '“', SAFE_LEFT + 20, SAFE_TOP + 100, 60, 80, {
          fontSize: 72,
          fontWeight: 700,
          color: c.accent,
          opacity: 0.25,
        }));
        elements.push(textEl('example', example, SAFE_LEFT + 24, SAFE_TOP + 120, SAFE_RIGHT - SAFE_LEFT - 48, 80, {
          fontSize: 24,
          color: c.text,
          lineHeight: 1.6,
        }));
        elements.push(cardBg(SAFE_LEFT, SAFE_TOP + 240, 580, 280, c.surface, shadowMd));
        elements.push(textEl('subtitle', '规则', SAFE_LEFT + 24, SAFE_TOP + 260, 540, 40, { fontSize: 26, fontWeight: 600, color: c.primary }));
        elements.push(textEl('body', rule, SAFE_LEFT + 24, SAFE_TOP + 310, 540, 190, { fontSize: 22, color: c.textMuted, lineHeight: 1.7 }));
        elements.push(cardBg(SAFE_RIGHT - 580, SAFE_TOP + 240, 580, 280, c.background, shadowMd));
        elements.push(textEl('subtitle', '练习', SAFE_RIGHT - 556, SAFE_TOP + 260, 540, 40, { fontSize: 26, fontWeight: 600, color: c.primary }));
        elements.push(textEl('body', practice, SAFE_RIGHT - 556, SAFE_TOP + 310, 540, 190, { fontSize: 22, color: c.textMuted, lineHeight: 1.7 }));
        break;
      }

      case 'formula': {
        elements.push(divider(SAFE_LEFT, SAFE_TOP + 70, SAFE_RIGHT - SAFE_LEFT, [c.primary, c.accent]));
        elements.push(circle(SAFE_LEFT + 60, SAFE_BOTTOM - 80, 100, c.accent, 0.08));
        elements.push(textEl('title', title, SAFE_LEFT, SAFE_TOP, SAFE_RIGHT - SAFE_LEFT, 60, { fontSize: 40, fontWeight: 700, textAlign: 'center', color: c.text }));
        const lines = body.split('\n').filter(Boolean);
        const formula = lines[0] || '公式 / 定理';
        const meaning = lines[1] || '适用条件与含义';
        const example = lines[2] || '典型例题';
        elements.push(cardBg(SAFE_LEFT + 140, SAFE_TOP + 100, SAFE_RIGHT - SAFE_LEFT - 280, 140, c.background, shadowMd));
        elements.push(textEl('title', formula, SAFE_LEFT + 160, SAFE_TOP + 120, SAFE_RIGHT - SAFE_LEFT - 320, 100, {
          fontSize: 44,
          fontWeight: 700,
          textAlign: 'center',
          color: c.primary,
        }));
        elements.push(cardBg(SAFE_LEFT, SAFE_TOP + 270, 580, 250, c.surface, shadowMd));
        elements.push(textEl('subtitle', '适用条件', SAFE_LEFT + 24, SAFE_TOP + 290, 540, 40, { fontSize: 24, fontWeight: 600, color: c.primary }));
        elements.push(textEl('body', meaning, SAFE_LEFT + 24, SAFE_TOP + 340, 540, 160, { fontSize: 22, color: c.textMuted, lineHeight: 1.7 }));
        elements.push(cardBg(SAFE_RIGHT - 580, SAFE_TOP + 270, 580, 250, c.background, shadowMd));
        elements.push(textEl('subtitle', '例题', SAFE_RIGHT - 556, SAFE_TOP + 290, 540, 40, { fontSize: 24, fontWeight: 600, color: c.primary }));
        elements.push(textEl('body', example, SAFE_RIGHT - 556, SAFE_TOP + 340, 540, 160, { fontSize: 22, color: c.textMuted, lineHeight: 1.7 }));
        break;
      }

      case 'dialogue': {
        elements.push(divider(SAFE_LEFT, SAFE_TOP + 70, SAFE_RIGHT - SAFE_LEFT, [c.primary, c.accent]));
        elements.push(circle(SAFE_RIGHT - 80, SAFE_BOTTOM - 80, 100, c.accent, 0.08));
        elements.push(textEl('title', title, SAFE_LEFT, SAFE_TOP, SAFE_RIGHT - SAFE_LEFT, 60, { fontSize: 40, fontWeight: 700, color: c.text }));
        const scene = body.split('\n')[0] || '场景说明';
        const lines = body.split('\n').filter(Boolean).slice(1).length >= 2
          ? body.split('\n').filter(Boolean).slice(1, 5)
          : ['A: 你好！', 'B: 你好，很高兴见到你。', 'A: 今天天气不错。', 'B: 是啊，适合外出。'];
        elements.push(cardBg(SAFE_LEFT + 20, SAFE_TOP + 80, SAFE_RIGHT - SAFE_LEFT - 40, 64, c.surface, shadowMd));
        elements.push(textEl('subtitle', scene, SAFE_LEFT + 44, SAFE_TOP + 92, SAFE_RIGHT - SAFE_LEFT - 88, 40, {
          fontSize: 22,
          color: c.primary,
          textAlign: 'center',
        }));
        let currentY = SAFE_TOP + 170;
        const bubbleW = 520;
        const bubbleH = 90;
        lines.forEach((line, i) => {
          const isA = line.trim().startsWith('A') || i % 2 === 0;
          const x = isA ? SAFE_LEFT + 20 : SAFE_RIGHT - bubbleW - 20;
          const fill = isA ? c.background : c.surface;
          elements.push(cardBg(x, currentY, bubbleW, bubbleH, fill, shadowMd));
          elements.push(textEl('body', line.replace(/^[AB]:\s*/, ''), x + 20, currentY + 16, bubbleW - 40, bubbleH - 32, {
            fontSize: 22,
            color: c.textMuted,
            lineHeight: 1.5,
          }));
          currentY += bubbleH + 24;
        });
        if (currentY + 80 <= SAFE_BOTTOM) {
          elements.push(cardBg(SAFE_LEFT + 20, currentY + 10, SAFE_RIGHT - SAFE_LEFT - 40, 64, c.background, shadowMd));
          elements.push(textEl('tip', '关键词 / 句型', SAFE_LEFT + 44, currentY + 22, SAFE_RIGHT - SAFE_LEFT - 88, 40, {
            fontSize: 20,
            color: c.textMuted,
            textAlign: 'center',
          }));
        }
        break;
      }

      case 'poetry': {
        elements.push(divider(SAFE_LEFT, SAFE_TOP + 70, SAFE_RIGHT - SAFE_LEFT, [c.primary, c.accent]));
        elements.push(circle(SAFE_LEFT + 60, SAFE_BOTTOM - 80, 100, c.accent, 0.06));
        elements.push(textEl('title', title, SAFE_LEFT, SAFE_TOP, SAFE_RIGHT - SAFE_LEFT, 60, { fontSize: 40, fontWeight: 700, textAlign: 'center', color: c.text }));
        const lines = body.split('\n').filter(Boolean);
        const originalMatch = lines.find((l) => l.trim().startsWith('原句'));
        const originalLine = originalMatch ? originalMatch.replace(/^原句[：:]\s*/, '') : (lines.find((l) => !l.includes('：') && !l.includes(':')) ?? '原句');
        const notePrefixes = ['翻译', '字词注释', '字词', '意象赏析', '意象', '意境', '情感主旨', '情感', '主旨', '赏析', '背景'];
        const noteLines = lines.filter((l) => notePrefixes.some((p) => l.trim().startsWith(p)));
        const notes = noteLines.length ? noteLines.join('\n') : '翻译与赏析：结合诗句，补充字词注释、意象分析与情感主旨。';
        const poemW = 520;
        const noteW = 360;
        const imageW = 240;
        const gap = 24;
        const cardH = 480;
        const cardY = SAFE_TOP + 100;
        elements.push(cardBg(SAFE_LEFT, cardY, poemW, cardH, c.background, shadowMd));
        elements.push(textEl('body', originalLine, SAFE_LEFT + 40, cardY + 60, poemW - 80, cardH - 120, {
          fontSize: 34,
          color: c.text,
          lineHeight: 2,
          textAlign: 'center',
          fontWeight: 500,
        }));
        elements.push(cardBg(SAFE_LEFT + poemW + gap, cardY, noteW, cardH, c.surface, shadowMd));
        elements.push(textEl('subtitle', '翻译与赏析', SAFE_LEFT + poemW + gap + 24, cardY + 28, noteW - 48, 40, {
          fontSize: 24,
          fontWeight: 600,
          color: c.primary,
        }));
        elements.push(textEl('body', notes, SAFE_LEFT + poemW + gap + 24, cardY + 84, noteW - 48, cardH - 120, {
          fontSize: 19,
          color: c.textMuted,
          lineHeight: 1.8,
        }));
        elements.push({
          type: 'image',
          semanticRole: 'image',
          geometry: { x: SAFE_LEFT + poemW + gap + noteW + gap, y: cardY, width: imageW, height: cardH, zIndex: 1 },
          style: { borderRadius: 16, shadow: shadowMd },
          content: { assetId: '', alt: `古诗词配图：${outlineSlide.title || title}` },
        });
        elements.push(textEl('caption', outlineSlide.title, CENTER_X - 200, SAFE_BOTTOM - 50, 400, 32, {
          fontSize: 18,
          color: c.textMuted,
          textAlign: 'center',
        }));
        break;
      }

      case 'data-chart': {
        elements.push(divider(SAFE_LEFT, SAFE_TOP + 70, SAFE_RIGHT - SAFE_LEFT, [c.primary, c.accent]));
        elements.push(circle(SAFE_RIGHT - 60, SAFE_BOTTOM - 60, 80, c.accent, 0.08));
        elements.push(textEl('title', title, SAFE_LEFT, SAFE_TOP, SAFE_RIGHT - SAFE_LEFT, 60, { fontSize: 40, fontWeight: 700, color: c.text }));
        const lines = body.split('\n').filter(Boolean);
        const conclusion = lines[0] || '结合图表得出结论，培养学生的数据意识。';
        const dataValues = lines.slice(1, 5).length >= 3 ? lines.slice(1, 5) : ['A', 'B', 'C', 'D'];
        const chartX = SAFE_LEFT + 40;
        const chartY = SAFE_TOP + 110;
        const chartW = SAFE_RIGHT - SAFE_LEFT - 80;
        const chartH = 360;
        elements.push(cardBg(chartX, chartY, chartW, chartH, c.background, shadowMd));
        const barGap = 32;
        const barW = (chartW - 80 - (dataValues.length - 1) * barGap) / dataValues.length;
        dataValues.forEach((val, i) => {
          const ratio = 0.35 + (i % 3) * 0.25;
          const barH = Math.max(40, (chartH - 80) * ratio);
          const x = chartX + 40 + i * (barW + barGap);
          const y = chartY + chartH - 40 - barH;
          elements.push(shapeEl('decoration', x, y, barW, barH, {
            fill: i % 2 === 0 ? c.primary : c.accent,
            opacity: 0.85,
            borderRadius: 8,
          }));
          elements.push(textEl('annotation', val, x + barW / 2 - 60, chartY + chartH - 36, 120, 28, {
            fontSize: 16,
            color: c.textMuted,
            textAlign: 'center',
          }));
        });
        elements.push(cardBg(SAFE_LEFT + 40, SAFE_BOTTOM - 130, SAFE_RIGHT - SAFE_LEFT - 80, 100, c.surface, shadowMd));
        elements.push(textEl('body', conclusion, SAFE_LEFT + 64, SAFE_BOTTOM - 114, SAFE_RIGHT - SAFE_LEFT - 128, 68, {
          fontSize: 22,
          color: c.textMuted,
          lineHeight: 1.6,
        }));
        break;
      }

      case 'map': {
        elements.push(divider(SAFE_LEFT, SAFE_TOP + 70, SAFE_RIGHT - SAFE_LEFT, [c.primary, c.accent]));
        elements.push(circle(SAFE_LEFT + 60, SAFE_BOTTOM - 60, 80, c.accent, 0.08));
        elements.push(textEl('title', title, SAFE_LEFT, SAFE_TOP, SAFE_RIGHT - SAFE_LEFT, 60, { fontSize: 40, fontWeight: 700, color: c.text }));
        const points = body.split('\n').filter(Boolean).length >= 3
          ? body.split('\n').filter(Boolean).slice(0, 4)
          : ['区域特征一', '区域特征二', '区域特征三'];
        const mapW = 720;
        const mapH = 500;
        elements.push(cardBg(SAFE_LEFT + 20, SAFE_TOP + 100, mapW, mapH, c.background, shadowMd));
        elements.push({
          type: 'image',
          semanticRole: 'image',
          geometry: { x: SAFE_LEFT + 60, y: SAFE_TOP + 130, width: mapW - 80, height: mapH - 100, zIndex: 2 },
          style: { borderRadius: 16, shadow: shadowMd },
          content: { assetId: '', alt: title },
        });
        elements.push(textEl('caption', '区域示意图', SAFE_LEFT + 60, SAFE_TOP + mapH + 8, mapW - 80, 32, {
          fontSize: 16,
          color: c.textMuted,
          textAlign: 'center',
        }));
        const pointW = 380;
        const pointH = 88;
        const pointGap = 16;
        const totalH = points.length * pointH + (points.length - 1) * pointGap;
        const startY = SAFE_TOP + 110 + (mapH - totalH) / 2;
        points.forEach((pt, i) => {
          const y = startY + i * (pointH + pointGap);
          elements.push(cardBg(SAFE_RIGHT - pointW - 20, y, pointW, pointH, c.surface, shadowMd));
          elements.push(shapeEl('decoration', SAFE_RIGHT - pointW + 12, y + 20, 24, 24, {
            shapeType: 'circle',
            fill: `linear-gradient(135deg, ${c.primary}, ${c.accent})`,
            opacity: 1,
          }));
          elements.push(textEl('body', pt.replace(/^[-•*]\s*/, ''), SAFE_RIGHT - pointW + 48, y + 18, pointW - 72, 52, {
            fontSize: 20,
            color: c.textMuted,
            lineHeight: 1.5,
          }));
        });
        break;
      }

      case 'source-material': {
        elements.push(divider(SAFE_LEFT, SAFE_TOP + 70, SAFE_RIGHT - SAFE_LEFT, [c.primary, c.accent]));
        elements.push(circle(SAFE_RIGHT - 60, SAFE_BOTTOM - 60, 80, c.accent, 0.08));
        elements.push(textEl('title', title, SAFE_LEFT, SAFE_TOP, SAFE_RIGHT - SAFE_LEFT, 60, { fontSize: 40, fontWeight: 700, color: c.text }));
        const lines = body.split('\n').filter(Boolean);
        const source = lines[0] || '史料摘录：请结合原始材料补充关键引文。';
        const analysis = lines.slice(1).join('\n') || '史料解读：结合时代背景，提炼史料观点与史证价值。';
        elements.push(cardBg(SAFE_LEFT + 20, SAFE_TOP + 90, SAFE_RIGHT - SAFE_LEFT - 40, 210, c.background, shadowMd));
        elements.push(textEl('annotation', '史料摘录', SAFE_LEFT + 44, SAFE_TOP + 110, 200, 36, { fontSize: 22, fontWeight: 600, color: c.primary }));
        elements.push(textEl('body', source, SAFE_LEFT + 44, SAFE_TOP + 150, SAFE_RIGHT - SAFE_LEFT - 88, 130, {
          fontSize: 20,
          color: c.textMuted,
          lineHeight: 1.7,
        }));
        elements.push(cardBg(SAFE_LEFT + 20, SAFE_TOP + 330, SAFE_RIGHT - SAFE_LEFT - 40, 280, c.surface, shadowMd));
        elements.push(textEl('annotation', '史料解读', SAFE_LEFT + 44, SAFE_TOP + 350, 200, 36, { fontSize: 22, fontWeight: 600, color: c.primary }));
        elements.push(textEl('body', analysis, SAFE_LEFT + 44, SAFE_TOP + 390, SAFE_RIGHT - SAFE_LEFT - 88, 200, {
          fontSize: 20,
          color: c.textMuted,
          lineHeight: 1.7,
        }));
        break;
      }

      case 'vocabulary': {
        elements.push(divider(SAFE_LEFT, SAFE_TOP + 70, SAFE_RIGHT - SAFE_LEFT, [c.primary, c.accent]));
        elements.push(circle(SAFE_LEFT + 60, SAFE_BOTTOM - 60, 80, c.accent, 0.08));
        elements.push(textEl('title', title, SAFE_LEFT, SAFE_TOP, SAFE_RIGHT - SAFE_LEFT, 60, { fontSize: 40, fontWeight: 700, color: c.text }));
        const lines = body.split('\n').filter(Boolean);
        const word = lines[0] || 'vocabulary';
        const phonetic = lines[1] || '/fəˈnɛtɪk/';
        const meaning = lines[2] || '释义';
        const example = lines[3] || '例句：用该词造一个真实语境中的句子。';
        const colW = 520;
        elements.push(cardBg(SAFE_LEFT + 40, SAFE_TOP + 100, colW, 460, c.background, shadowMd));
        elements.push(textEl('title', word, SAFE_LEFT + 40, SAFE_TOP + 150, colW, 80, {
          fontSize: 56,
          fontWeight: 700,
          textAlign: 'center',
          color: c.primary,
        }));
        elements.push(textEl('subtitle', phonetic, SAFE_LEFT + 40, SAFE_TOP + 250, colW, 40, {
          fontSize: 22,
          textAlign: 'center',
          color: c.textMuted,
        }));
        elements.push(cardBg(SAFE_RIGHT - colW - 40, SAFE_TOP + 100, colW, 460, c.surface, shadowMd));
        elements.push(textEl('subtitle', '释义', SAFE_RIGHT - colW - 16, SAFE_TOP + 130, colW - 48, 36, { fontSize: 24, fontWeight: 600, color: c.primary }));
        elements.push(textEl('body', meaning, SAFE_RIGHT - colW - 16, SAFE_TOP + 176, colW - 48, 90, { fontSize: 22, color: c.textMuted, lineHeight: 1.6 }));
        elements.push(textEl('subtitle', '例句', SAFE_RIGHT - colW - 16, SAFE_TOP + 280, colW - 48, 36, { fontSize: 24, fontWeight: 600, color: c.primary }));
        elements.push(textEl('example', example, SAFE_RIGHT - colW - 16, SAFE_TOP + 326, colW - 48, 200, { fontSize: 22, color: c.text, lineHeight: 1.7 }));
        break;
      }

      case 'derivation': {
        elements.push(divider(SAFE_LEFT, SAFE_TOP + 70, SAFE_RIGHT - SAFE_LEFT, [c.primary, c.accent]));
        elements.push(circle(SAFE_RIGHT - 60, SAFE_BOTTOM - 60, 80, c.accent, 0.08));
        elements.push(textEl('title', title, SAFE_LEFT, SAFE_TOP, SAFE_RIGHT - SAFE_LEFT, 60, { fontSize: 40, fontWeight: 700, color: c.text }));
        const lines = body.split('\n').filter(Boolean);
        const given = lines[0] || '已知条件：写出题目给出的条件。';
        const steps = lines.slice(1, 4).length >= 2 ? lines.slice(1, 4) : ['步骤一', '步骤二', '结论'];
        elements.push(cardBg(SAFE_LEFT + 20, SAFE_TOP + 90, SAFE_RIGHT - SAFE_LEFT - 40, 80, c.background, shadowMd));
        elements.push(textEl('body', given, SAFE_LEFT + 44, SAFE_TOP + 108, SAFE_RIGHT - SAFE_LEFT - 88, 44, { fontSize: 22, color: c.textMuted, lineHeight: 1.5 }));
        const stepLabels = ['推导', '变形', '结论'];
        const colW = 360;
        const gap = 24;
        const startX = SAFE_LEFT + (SAFE_RIGHT - SAFE_LEFT - (colW * steps.length + gap * (steps.length - 1))) / 2;
        steps.forEach((step, i) => {
          const x = startX + i * (colW + gap);
          elements.push(cardBg(x, SAFE_TOP + 210, colW, 380, c.surface, shadowMd));
          elements.push(shapeEl('decoration', x + 20, SAFE_TOP + 230, 40, 40, {
            shapeType: 'circle',
            fill: `linear-gradient(135deg, ${c.primary}, ${c.accent})`,
            opacity: 1,
          }));
          elements.push(textEl('annotation', String(i + 1), x + 20, SAFE_TOP + 238, 40, 28, {
            fontSize: 18,
            fontWeight: 700,
            color: '#ffffff',
            textAlign: 'center',
          }));
          elements.push(textEl('subtitle', stepLabels[i] ?? `步骤${i + 1}`, x + 72, SAFE_TOP + 236, colW - 92, 36, {
            fontSize: 22,
            fontWeight: 600,
            color: c.primary,
          }));
          elements.push(textEl('body', step.replace(/^[-•*]\s*/, ''), x + 20, SAFE_TOP + 290, colW - 40, 270, {
            fontSize: 20,
            color: c.textMuted,
            lineHeight: 1.7,
          }));
        });
        break;
      }

      case 'mindmap': {
        elements.push(divider(SAFE_LEFT, SAFE_TOP + 70, SAFE_RIGHT - SAFE_LEFT, [c.primary, c.accent]));
        elements.push(circle(SAFE_LEFT + 60, SAFE_BOTTOM - 60, 80, c.accent, 0.08));
        elements.push(textEl('title', title, SAFE_LEFT, SAFE_TOP, SAFE_RIGHT - SAFE_LEFT, 60, { fontSize: 40, fontWeight: 700, color: c.text }));
        const branches = body.split('\n').filter(Boolean).length >= 4
          ? body.split('\n').filter(Boolean).slice(0, 4)
          : ['分支一', '分支二', '分支三', '分支四'];
        elements.push(shapeEl('decoration', CENTER_X - 80, SAFE_TOP + 260, 160, 160, {
          shapeType: 'circle',
          fill: `linear-gradient(135deg, ${c.primary}, ${c.accent})`,
          opacity: 1,
        }));
        elements.push(textEl('subtitle', title, CENTER_X - 60, SAFE_TOP + 320, 120, 40, {
          fontSize: 20,
          fontWeight: 700,
          color: '#ffffff',
          textAlign: 'center',
        }));
        const positions = [
          { x: SAFE_LEFT + 60, y: SAFE_TOP + 170 },
          { x: SAFE_LEFT + 60, y: SAFE_BOTTOM - 140 },
          { x: SAFE_RIGHT - 300, y: SAFE_TOP + 170 },
          { x: SAFE_RIGHT - 300, y: SAFE_BOTTOM - 140 },
        ];
        branches.forEach((branch, i) => {
          const pos = positions[i];
          elements.push(cardBg(pos.x, pos.y, 240, 120, c.background, shadowMd));
          elements.push(textEl('body', branch.replace(/^[-•*]\s*/, ''), pos.x + 20, pos.y + 20, 200, 80, {
            fontSize: 18,
            color: c.textMuted,
            lineHeight: 1.5,
            textAlign: 'center',
          }));
        });
        break;
      }

      case 'table': {
        elements.push(divider(SAFE_LEFT, SAFE_TOP + 70, SAFE_RIGHT - SAFE_LEFT, [c.primary, c.accent]));
        elements.push(circle(SAFE_RIGHT - 60, SAFE_BOTTOM - 60, 80, c.accent, 0.08));
        elements.push(textEl('title', title, SAFE_LEFT, SAFE_TOP, SAFE_RIGHT - SAFE_LEFT, 60, { fontSize: 40, fontWeight: 700, color: c.text }));

        const tableLines = body.split('\n').filter(Boolean);
        const headerLine = tableLines.find((l) => l.trim().startsWith('表头')) || tableLines[0] || '列1|列2|列3';
        const headerCells = headerLine.replace(/^表头[：:]\s*/, '').split('|').map((s) => s.trim()).slice(0, 4);
        const dataLines = tableLines.filter((l) => !l.trim().startsWith('表头')).slice(0, 4);
        const rows = dataLines.length >= 2 ? dataLines : ['A|B|C', 'D|E|F', 'G|H|I'];

        const colCount = Math.max(3, headerCells.length);
        const rowCount = rows.length + 1;
        const tableW = 900;
        const tableH = 420;
        const tableX = SAFE_LEFT + 40;
        const tableY = SAFE_TOP + 110;
        const cellW = tableW / colCount;
        const cellH = tableH / rowCount;

        headerCells.forEach((cell, i) => {
          const x = tableX + i * cellW;
          elements.push(shapeEl('option-bg', x, tableY, cellW - 4, cellH - 4, {
            fill: c.primary,
            opacity: 0.85,
            borderRadius: 8,
          }));
          elements.push(textEl('subtitle', cell, x + 8, tableY + 10, cellW - 16, cellH - 20, {
            fontSize: 20,
            fontWeight: 600,
            color: '#ffffff',
            textAlign: 'center',
          }));
        });

        rows.forEach((row, rowIdx) => {
          const y = tableY + (rowIdx + 1) * cellH;
          const cells = row.replace(/^行\d*[：:]\s*/, '').split('|').map((s) => s.trim());
          for (let i = 0; i < colCount; i++) {
            const x = tableX + i * cellW;
            elements.push(cardBg(x, y, cellW - 4, cellH - 4, c.background, shadowMd));
            elements.push(textEl('body', cells[i] || '', x + 8, y + 10, cellW - 16, cellH - 20, {
              fontSize: 18,
              color: c.textMuted,
              textAlign: 'center',
            }));
          }
        });

        elements.push({
          type: 'image',
          semanticRole: 'image',
          geometry: { x: tableX + tableW + 40, y: tableY, width: 200, height: 360, zIndex: 1 },
          style: { borderRadius: 16, shadow: shadowMd },
          content: { assetId: '', alt: `${title} 对比配图` },
        });
        break;
      }

      case 'case-study': {
        elements.push(divider(SAFE_LEFT, SAFE_TOP + 70, SAFE_RIGHT - SAFE_LEFT, [c.primary, c.accent]));
        elements.push(circle(SAFE_LEFT + 60, SAFE_BOTTOM - 60, 80, c.accent, 0.08));
        elements.push(textEl('title', title, SAFE_LEFT, SAFE_TOP, SAFE_RIGHT - SAFE_LEFT, 60, { fontSize: 40, fontWeight: 700, color: c.text }));

        const caseLines = body.split('\n').filter(Boolean);
        const caseLine = caseLines.find((l) => l.trim().startsWith('案例')) || caseLines[0] || '真实情境案例';
        const questionLine = caseLines.find((l) => l.trim().startsWith('问题')) || caseLines[1] || '思考问题';
        const analysisLine = caseLines.find((l) => l.trim().startsWith('分析')) || caseLines.slice(2).join('\n') || '分析要点';
        const caseText = caseLine.replace(/^案例[：:]\s*/, '');
        const questionText = questionLine.replace(/^问题[：:]\s*/, '');
        const analysisText = analysisLine.replace(/^分析[：:]\s*/, '');

        const leftW = 640;
        const rightW = 440;
        const gap = 40;
        const startX = CENTER_X - (leftW + gap + rightW) / 2;
        const cardH = 130;
        const cardGap = 20;

        elements.push(cardBg(startX, SAFE_TOP + 100, leftW, cardH, c.background, shadowMd));
        elements.push(textEl('subtitle', '案例', startX + 24, SAFE_TOP + 116, 100, 32, { fontSize: 22, fontWeight: 600, color: c.primary }));
        elements.push(textEl('body', caseText, startX + 24, SAFE_TOP + 152, leftW - 48, cardH - 56, { fontSize: 20, color: c.textMuted, lineHeight: 1.6 }));

        elements.push(cardBg(startX, SAFE_TOP + 100 + cardH + cardGap, leftW, cardH, c.surface, shadowMd));
        elements.push(textEl('subtitle', '问题', startX + 24, SAFE_TOP + 116 + cardH + cardGap, 100, 32, { fontSize: 22, fontWeight: 600, color: c.primary }));
        elements.push(textEl('body', questionText, startX + 24, SAFE_TOP + 152 + cardH + cardGap, leftW - 48, cardH - 56, { fontSize: 20, color: c.textMuted, lineHeight: 1.6 }));

        elements.push(cardBg(startX, SAFE_TOP + 100 + (cardH + cardGap) * 2, leftW, cardH, c.background, shadowMd));
        elements.push(textEl('subtitle', '分析', startX + 24, SAFE_TOP + 116 + (cardH + cardGap) * 2, 100, 32, { fontSize: 22, fontWeight: 600, color: c.primary }));
        elements.push(textEl('body', analysisText, startX + 24, SAFE_TOP + 152 + (cardH + cardGap) * 2, leftW - 48, cardH - 56, { fontSize: 20, color: c.textMuted, lineHeight: 1.6 }));

        elements.push({
          type: 'image',
          semanticRole: 'image',
          geometry: { x: startX + leftW + gap, y: SAFE_TOP + 100, width: rightW, height: 430, zIndex: 1 },
          style: { borderRadius: 16, shadow: shadowMd },
          content: { assetId: '', alt: `${title} 情境配图` },
        });
        break;
      }

      case 'classification': {
        elements.push(divider(SAFE_LEFT, SAFE_TOP + 70, SAFE_RIGHT - SAFE_LEFT, [c.primary, c.accent]));
        elements.push(circle(SAFE_LEFT + 60, SAFE_BOTTOM - 60, 80, c.accent, 0.08));
        elements.push(textEl('title', title, SAFE_LEFT, SAFE_TOP, SAFE_RIGHT - SAFE_LEFT, 60, { fontSize: 40, fontWeight: 700, color: c.text }));

        const classLines = body.split('\n').filter(Boolean);
        const centerLine = classLines.find((l) => l.trim().startsWith('中心概念')) || title;
        const categoryLines = classLines.filter((l) => l.trim().startsWith('类别')).slice(0, 3);
        const categories = categoryLines.length >= 2 ? categoryLines : ['类别一：A|B', '类别二：C|D', '类别三：E|F'];
        const centerText = centerLine.replace(/^中心概念[：:]\s*/, '');

        const centerSize = 120;
        const centerY = SAFE_TOP + 110;
        elements.push(shapeEl('decoration', CENTER_X - centerSize / 2, centerY, centerSize, centerSize, {
          shapeType: 'circle',
          fill: `linear-gradient(135deg, ${c.primary}, ${c.accent})`,
          opacity: 1,
          zIndex: 1,
        }));
        elements.push(textEl('subtitle', centerText, CENTER_X - centerSize / 2 + 8, centerY + 44, centerSize - 16, 40, {
          fontSize: 18,
          fontWeight: 600,
          color: '#ffffff',
          textAlign: 'center',
        }));

        const catCount = categories.length;
        const catW = 280;
        const catH = 170;
        const catGap = 32;
        const totalW = catCount * catW + (catCount - 1) * catGap;
        const startX = CENTER_X - totalW / 2;
        const catY = SAFE_TOP + 320;

        categories.forEach((cat, i) => {
          const x = startX + i * (catW + catGap);
          const parts = cat.replace(/^类别\d*[：:]\s*/, '').split('|');
          const catName = parts[0] || `类别${i + 1}`;
          const items = parts.slice(1).join(' / ');
          elements.push(cardBg(x, catY, catW, catH, c.background, shadowMd));
          elements.push(textEl('subtitle', catName, x + 20, catY + 16, catW - 40, 32, { fontSize: 20, fontWeight: 600, color: c.primary }));
          elements.push(textEl('body', items, x + 20, catY + 56, catW - 40, catH - 72, { fontSize: 17, color: c.textMuted, lineHeight: 1.5 }));

          const lineStartX = CENTER_X;
          const lineStartY = centerY + centerSize;
          const lineEndX = x + catW / 2;
          const lineEndY = catY;
          const midY = lineStartY + (lineEndY - lineStartY) / 2;
          elements.push(shapeEl('decoration', lineStartX, lineStartY, 3, midY - lineStartY, { fill: c.accent, opacity: 0.45, borderRadius: 2 }));
          elements.push(shapeEl('decoration', Math.min(lineStartX, lineEndX), midY, Math.abs(lineEndX - lineStartX), 3, { fill: c.accent, opacity: 0.45, borderRadius: 2 }));
          elements.push(shapeEl('decoration', lineEndX, midY, 3, lineEndY - midY, { fill: c.accent, opacity: 0.45, borderRadius: 2 }));
        });

        elements.push({
          type: 'image',
          semanticRole: 'image',
          geometry: { x: SAFE_RIGHT - 180, y: SAFE_TOP + 100, width: 140, height: 140, zIndex: 1 },
          style: { borderRadius: 12, shadow: shadowMd },
          content: { assetId: '', alt: `${title} 分类配图` },
        });
        break;
      }

      case 'worksheet': {
        elements.push(divider(SAFE_LEFT, SAFE_TOP + 70, SAFE_RIGHT - SAFE_LEFT, [c.primary, c.accent]));
        elements.push(circle(SAFE_RIGHT - 60, SAFE_BOTTOM - 60, 80, c.accent, 0.08));
        elements.push(textEl('title', title, SAFE_LEFT, SAFE_TOP, SAFE_RIGHT - SAFE_LEFT, 60, { fontSize: 40, fontWeight: 700, color: c.text }));

        const sheetLines = body.split('\n').filter(Boolean);
        const instructionLine = sheetLines.find((l) => l.trim().startsWith('练习说明')) || '练习说明：请根据所学内容完成下列练习。';
        const questionLines = sheetLines.filter((l) => l.trim().startsWith('题')).slice(0, 4);
        const questions = questionLines.length >= 2 ? questionLines : ['题目一|答案：示例', '题目二|答案：示例', '题目三|答案：示例'];
        const instruction = instructionLine.replace(/^练习说明[：:]\s*/, '');

        elements.push(cardBg(SAFE_LEFT + 20, SAFE_TOP + 90, SAFE_RIGHT - SAFE_LEFT - 40, 56, c.surface, shadowMd));
        elements.push(textEl('body', instruction, SAFE_LEFT + 44, SAFE_TOP + 104, SAFE_RIGHT - SAFE_LEFT - 88, 28, { fontSize: 20, color: c.textMuted }));

        const questionH = 96;
        const questionGap = 16;
        const startY = SAFE_TOP + 166;
        questions.forEach((q, i) => {
          const y = startY + i * (questionH + questionGap);
          const parts = q.replace(/^题\d*[：:]\s*/, '').split('|');
          const questionText = parts[0] || '题目';
          const answer = parts[1] ? parts[1].replace(/^答案[：:]\s*/, '') : '';
          elements.push(cardBg(SAFE_LEFT + 20, y, SAFE_RIGHT - SAFE_LEFT - 40, questionH, c.background, shadowMd));
          elements.push(textEl('body', `${i + 1}. ${questionText}`, SAFE_LEFT + 44, y + 16, SAFE_RIGHT - SAFE_LEFT - 280, 28, { fontSize: 20, color: c.text }));
          elements.push(shapeEl('option-bg', SAFE_LEFT + 44, y + 56, SAFE_RIGHT - SAFE_LEFT - 280, 2, { fill: c.border, opacity: 1, borderRadius: 1 }));
          if (answer) {
            elements.push(textEl('answer', answer, SAFE_RIGHT - 220, y + 20, 180, 56, { fontSize: 16, color: c.textMuted, textAlign: 'right' }));
          }
        });

        elements.push({
          type: 'image',
          semanticRole: 'image',
          geometry: { x: SAFE_RIGHT - 180, y: SAFE_TOP + 90, width: 140, height: 100, zIndex: 1 },
          style: { borderRadius: 12, shadow: shadowMd },
          content: { assetId: '', alt: `${title} 练习配图` },
        });
        break;
      }

      case 'content':
      default: {
        elements.push(divider(SAFE_LEFT, SAFE_TOP + 70, SAFE_RIGHT - SAFE_LEFT, [c.primary, c.accent]));
        elements.push(textEl('title', title, SAFE_LEFT, SAFE_TOP, SAFE_RIGHT - SAFE_LEFT, 60, { fontSize: 40, fontWeight: 700, textAlign: 'center', color: c.text }));
        if (body) {
          const bodyLines = body.split('\n').filter(Boolean);
          const isShort = bodyLines.length <= 3 && body.length <= 120;
          if (isShort) {
            const cardW = 900;
            const cardH = 360;
            const cardX = CENTER_X - cardW / 2;
            const cardY = SAFE_TOP + 170;
            elements.push(cardBg(cardX, cardY, cardW, cardH, c.background, shadowMd));
            elements.push(textEl('body', body, cardX + 40, cardY + 40, cardW - 80, cardH - 80, {
              fontSize: 28,
              color: c.textMuted,
              lineHeight: 1.8,
              textAlign: 'center',
            }));
          } else if (bodyLines.length > 1) {
            const textW = 560;
            const imageW = 440;
            const gap = 40;
            const totalW = textW + gap + imageW;
            const startX = CENTER_X - totalW / 2;
            const lineHeight = 52;
            const cardH = Math.min(480, 120 + bodyLines.length * lineHeight);
            const cardY = SAFE_TOP + 120;
            elements.push(cardBg(startX, cardY, textW, cardH, c.background, shadowMd));
            bodyLines.forEach((line, i) => {
              const y = cardY + 28 + i * lineHeight;
              if (y + 40 > cardY + cardH) return;
              elements.push(textEl('body', `• ${line.replace(/^[-•*]\s*/, '')}`, startX + 28, y, textW - 56, 40, {
                fontSize: 22,
                color: c.textMuted,
              }));
            });
            elements.push({
              type: 'image',
              semanticRole: 'image',
              geometry: { x: startX + textW + gap, y: cardY, width: imageW, height: cardH, zIndex: 1 },
              style: { borderRadius: 16, shadow: shadowMd },
              content: { assetId: '', alt: outlineSlide.keyPoints?.[0] || title },
            });
          } else {
            const cardW = 900;
            const cardH = 280;
            const cardX = CENTER_X - cardW / 2;
            const cardY = SAFE_TOP + 140;
            elements.push(cardBg(cardX, cardY, cardW, cardH, c.background, shadowMd));
            elements.push(textEl('body', body, cardX + 40, cardY + 40, cardW - 80, cardH - 80, {
              fontSize: 24,
              color: c.textMuted,
              lineHeight: 1.7,
            }));
            elements.push({
              type: 'image',
              semanticRole: 'image',
              geometry: { x: CENTER_X - 300, y: cardY + cardH + 24, width: 600, height: 176, zIndex: 1 },
              style: { borderRadius: 16, shadow: shadowMd },
              content: { assetId: '', alt: outlineSlide.keyPoints?.[0] || title },
            });
          }
        }
        break;
      }
    }

    const sorted = elements.sort((a, b) => (a.geometry as { zIndex: number }).zIndex - (b.geometry as { zIndex: number }).zIndex);

    fitAllTextElements(sorted as Element[]);

    return {
      order,
      background: backgroundGradient(c.background, c.surface),
      elements: sorted,
    };
  });

  return {
    designSystem,
    slides,
  } as DesignResult;
}
