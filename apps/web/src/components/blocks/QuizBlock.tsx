import { useState } from 'react';
import { BlockShell, useBlockData, str, useTheme, type BlockComponentProps } from './BlockShell';
import { FitText } from './FitText';
import type { QuizSlot } from '@courseware/shared';

/** 课堂测验页：题干 + 选项 + 判定反馈 + 解析（主题化自绘，player 模式可交互） */
export function QuizBlock({ element, mode = 'player' }: BlockComponentProps) {
  const { tokens } = useTheme();
  const { slots } = useBlockData(element);
  const title = str(slots, 'title', '课堂练习');
  const quiz = (slots.quiz || {}) as Partial<QuizSlot> & { answer?: unknown };
  // 防御：LLM/旧数据可能输出字符串选项 + 字母答案
  const rawOptions = Array.isArray(quiz.options) ? quiz.options : [];
  const answerRef = quiz.correctAnswer ?? quiz.answer;
  const answerLetters = new Set(
    (Array.isArray(answerRef) ? answerRef : typeof answerRef === 'string' ? answerRef.split(/[,，、\s]+/) : [])
      .map((a) => String(a).trim().toUpperCase())
      .filter((a) => /^[A-Z]$/.test(a)),
  );
  const options = (rawOptions as unknown[]).slice(0, 6).map((opt, i) => {
    const letter = String.fromCharCode(65 + i);
    if (typeof opt === 'string') {
      return { text: (opt as string).replace(/^[A-Za-z][.、．\s]+/, ''), isCorrect: answerLetters.has(letter) };
    }
    return { text: String((opt as { text?: unknown })?.text ?? ''), isCorrect: !!(opt as { isCorrect?: boolean })?.isCorrect };
  });
  const interactive = mode === 'player';

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [judged, setJudged] = useState(false);
  const isMultiple = quiz.type === 'multiple-choice';
  const isReveal = quiz.type === 'reveal' || !options.length;

  const correctSet = new Set<number>();
  options.forEach((o, i) => {
    if (o.isCorrect) correctSet.add(i);
  });

  const toggle = (i: number) => {
    if (!interactive || judged) return;
    const next = new Set(selected);
    if (isMultiple) {
      if (next.has(i)) next.delete(i);
      else next.add(i);
    } else {
      next.clear();
      next.add(i);
    }
    setSelected(next);
    if (!isMultiple) setJudged(true);
  };

  const allCorrect =
    correctSet.size > 0 &&
    selected.size === correctSet.size &&
    [...selected].every((i) => correctSet.has(i));

  return (
    <BlockShell
      element={element}
      padding={48}
      style={{ background: tokens.colors.background, display: 'flex', flexDirection: 'column' }}
    >
      {/* 题目标题 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexShrink: 0 }}>
        <div
          style={{
            padding: '6px 16px',
            borderRadius: tokens.borderRadius.full,
            background: tokens.colors.accent,
            color: '#fff',
            fontSize: tokens.fontSizes.base,
            fontWeight: 700,
            fontFamily: tokens.fonts.heading,
            flexShrink: 0,
          }}
        >
          {isReveal ? '思考题' : isMultiple ? '多选题' : '单选题'}
        </div>
        <div style={{ height: 36, flex: 1 }}>
          <FitText
            fontSize={tokens.fontSizes.xl}
            minFontSize={16}
            fontFamily={tokens.fonts.heading}
            fontWeight={700}
            color={tokens.colors.textMuted}
            lineHeight={1.2}
          >
            {title}
          </FitText>
        </div>
      </div>

      {/* 题干 */}
      <div
        style={{
          padding: '16px 24px',
          borderRadius: tokens.borderRadius.lg,
          background: tokens.colors.surface,
          border: `1px solid ${tokens.colors.border}`,
          marginBottom: 20,
          maxHeight: '30%',
          flexShrink: 0,
        }}
      >
        <FitText
          fontSize={tokens.fontSizes.xl}
          minFontSize={16}
          fontFamily={tokens.fonts.body}
          color={tokens.colors.text}
          lineHeight={1.5}
        >
          {quiz.question || ''}
        </FitText>
      </div>

      {/* 选项 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
        {options.map((opt, i) => {
          const isSel = selected.has(i);
          const showResult = judged && interactive;
          const isRight = correctSet.has(i);
          let borderColor = tokens.colors.border;
          let bg = '#fff';
          if (showResult && isRight) {
            borderColor = tokens.colors.success;
            bg = `${tokens.colors.success}18`;
          } else if (showResult && isSel && !isRight) {
            borderColor = tokens.colors.danger;
            bg = `${tokens.colors.danger}14`;
          } else if (isSel) {
            borderColor = tokens.colors.primary;
            bg = `${tokens.colors.primary}10`;
          }
          return (
            <button
              key={i}
              onClick={() => toggle(i)}
              disabled={!interactive || judged}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '12px 20px',
                borderRadius: tokens.borderRadius.lg,
                border: `2px solid ${borderColor}`,
                background: bg,
                cursor: interactive && !judged ? 'pointer' : 'default',
                textAlign: 'left',
                flex: options.length <= 4 ? 1 : undefined,
                minHeight: 0,
                transition: 'all 0.2s',
              }}
            >
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: isSel ? tokens.colors.primary : tokens.colors.surface,
                  border: `2px solid ${isSel ? tokens.colors.primary : tokens.colors.border}`,
                  color: isSel ? '#fff' : tokens.colors.textMuted,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: tokens.fontSizes.base,
                  flexShrink: 0,
                  fontFamily: tokens.fonts.heading,
                }}
              >
                {String.fromCharCode(65 + i)}
              </span>
              <span style={{ flex: 1, minHeight: 0 }}>
                <FitText
                  fontSize={tokens.fontSizes.lg}
                  minFontSize={13}
                  fontFamily={tokens.fonts.body}
                  color={tokens.colors.text}
                  lineHeight={1.35}
                >
                  {opt.text}
                </FitText>
              </span>
              {showResult && isRight && <span style={{ color: tokens.colors.success, fontSize: 26 }}>✓</span>}
              {showResult && isSel && !isRight && <span style={{ color: tokens.colors.danger, fontSize: 26 }}>✗</span>}
            </button>
          );
        })}

        {/* reveal 类型：点击显示答案 */}
        {isReveal && (
          <button
            onClick={() => interactive && setJudged(!judged)}
            style={{
              padding: '14px 24px',
              borderRadius: tokens.borderRadius.lg,
              border: `2px dashed ${tokens.colors.primary}`,
              background: judged ? tokens.colors.surface : 'transparent',
              color: tokens.colors.primary,
              fontSize: tokens.fontSizes.lg,
              fontWeight: 700,
              cursor: interactive ? 'pointer' : 'default',
              fontFamily: tokens.fonts.heading,
              flex: 1,
            }}
          >
            {judged ? (quiz.correctAnswer as string) || '（无参考答案）' : '👆 点击揭示答案'}
          </button>
        )}
      </div>

      {/* 多选提交 + 反馈 */}
      <div style={{ display: 'flex', gap: 16, marginTop: 16, flexShrink: 0, alignItems: 'stretch' }}>
        {isMultiple && !judged && interactive && (
          <button
            onClick={() => setJudged(true)}
            disabled={selected.size === 0}
            style={{
              padding: '12px 32px',
              borderRadius: tokens.borderRadius.lg,
              border: 'none',
              background: selected.size ? tokens.colors.primary : tokens.colors.border,
              color: '#fff',
              fontSize: tokens.fontSizes.lg,
              fontWeight: 700,
              cursor: selected.size ? 'pointer' : 'default',
              fontFamily: tokens.fonts.heading,
            }}
          >
            提交答案
          </button>
        )}
        {judged && quiz.explanation && (
          <div
            style={{
              flex: 1,
              padding: '12px 20px',
              borderRadius: tokens.borderRadius.lg,
              background: `${tokens.colors.accent}14`,
              border: `1px solid ${tokens.colors.accent}`,
              maxHeight: 120,
            }}
          >
            <FitText
              fontSize={tokens.fontSizes.base}
              minFontSize={12}
              fontFamily={tokens.fonts.body}
              color={tokens.colors.text}
            >
              {interactive && !isReveal && (allCorrect ? '🎉 回答正确！' : '💡 再想想。')}
              {quiz.explanation}
            </FitText>
          </div>
        )}
        {judged && interactive && !isReveal && (
          <button
            onClick={() => {
              setSelected(new Set());
              setJudged(false);
            }}
            style={{
              padding: '12px 24px',
              borderRadius: tokens.borderRadius.lg,
              border: `1px solid ${tokens.colors.border}`,
              background: '#fff',
              color: tokens.colors.textMuted,
              fontSize: tokens.fontSizes.base,
              cursor: 'pointer',
              fontFamily: tokens.fonts.body,
            }}
          >
            重试
          </button>
        )}
      </div>
    </BlockShell>
  );
}
