import { useState } from 'react';
import type { Element } from '@courseware/shared';

interface FillBlankElementProps {
  element: Element;
  onInteraction?: (elementId: string, event: string) => void;
}

export function FillBlankElement({ element, onInteraction }: FillBlankElementProps) {
  const content = element.content as {
    question?: string;
    correctAnswer?: string | string[];
    explanation?: string;
    hint?: string;
    allowRetry?: boolean;
    placeholder?: string;
  };
  const { geometry, style } = element;

  const [input, setInput] = useState('');
  const [judged, setJudged] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const correctAnswers = Array.isArray(content.correctAnswer)
    ? content.correctAnswer
    : content.correctAnswer
      ? [content.correctAnswer]
      : [];

  const isCorrect = () => {
    if (!input.trim()) return false;
    return correctAnswers.some(
      (answer) => answer.toLowerCase().trim() === input.toLowerCase().trim(),
    );
  };

  const handleJudge = () => {
    const correct = isCorrect();
    setJudged(true);
    onInteraction?.(element.id, 'JUDGE');
    onInteraction?.(element.id, correct ? 'CORRECT' : 'INCORRECT');
  };

  const handleReveal = () => {
    setRevealed(true);
    setJudged(true);
    onInteraction?.(element.id, 'REVEAL');
  };

  const handleRetry = () => {
    setInput('');
    setJudged(false);
    setRevealed(false);
    onInteraction?.(element.id, 'RETRY');
  };

  const basePadding = style.padding || 16;

  return (
    <div
      id={element.id}
      className="absolute overflow-hidden"
      style={{
        left: geometry.x,
        top: geometry.y,
        width: geometry.width,
        height: geometry.height,
        zIndex: geometry.zIndex,
        color: style.color,
        fontSize: style.fontSize ? `${style.fontSize}px` : undefined,
        fontFamily: style.fontFamily,
        opacity: style.opacity ?? 1,
        backgroundColor: style.backgroundColor,
        borderRadius: style.borderRadius ? `${style.borderRadius}px` : undefined,
        borderWidth: style.borderWidth ? `${style.borderWidth}px` : undefined,
        borderColor: style.borderColor,
        borderStyle: style.borderStyle,
        boxShadow: style.shadow,
        padding: typeof basePadding === 'number' ? `${basePadding}px` : basePadding,
      }}
    >
      {content.question && (
        <div className="mb-4 font-semibold leading-snug">{content.question}</div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (judged) setJudged(false);
          }}
          placeholder={content.placeholder || '请输入答案'}
          disabled={judged && !content.allowRetry && !revealed}
          className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
        />
        {!judged ? (
          <button
            onClick={handleJudge}
            disabled={!input.trim()}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            提交
          </button>
        ) : (
          <button
            onClick={handleRetry}
            className="rounded-xl bg-slate-600 px-5 py-2.5 text-white shadow-sm transition-colors hover:bg-slate-700"
          >
            重试
          </button>
        )}
      </div>

      {!judged && (
        <button
          onClick={handleReveal}
          className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          查看答案
        </button>
      )}

      {judged && (
        <div className="mt-4 space-y-2">
          <div
            className={`rounded-xl p-3 transition-all ${
              isCorrect() ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
          >
            {isCorrect() ? '✅ 回答正确' : '❌ 回答错误'}
          </div>
          {(revealed || content.explanation) && (
            <div className="rounded-xl bg-slate-50 p-3 text-slate-700">
              <div className="font-medium">正确答案：{correctAnswers.join(' / ') || '未设置'}</div>
              {content.explanation && <div className="mt-1">{content.explanation}</div>}
            </div>
          )}
        </div>
      )}

      {content.hint && !judged && (
        <div className="mt-3 text-sm text-slate-500">💡 {content.hint}</div>
      )}
    </div>
  );
}
