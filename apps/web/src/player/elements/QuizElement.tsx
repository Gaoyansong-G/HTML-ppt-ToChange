import { useState, useCallback } from 'react';
import type { Element } from '@courseware/shared';

interface QuizElementProps {
  element: Element;
  onInteraction?: (elementId: string, event: string) => void;
}

type QuizState = 'idle' | 'selected' | 'judged' | 'explained';

function RadioIcon({ checked }: { checked: boolean }) {
  return (
    <div
      className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
        checked ? 'border-blue-500 bg-blue-500' : 'border-slate-300 bg-white'
      }`}
    >
      {checked && <div className="h-2 w-2 rounded-full bg-white" />}
    </div>
  );
}

function CheckIcon({ checked }: { checked: boolean }) {
  return (
    <div
      className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${
        checked ? 'border-blue-500 bg-blue-500' : 'border-slate-300 bg-white'
      }`}
    >
      {checked && (
        <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={4}>
          <path d="M5 13l4 4L19 7" />
        </svg>
      )}
    </div>
  );
}

export function QuizElement({ element, onInteraction }: QuizElementProps) {
  const content = element.content as {
    question?: string;
    type?: string;
    options?: { id: string; text: string; isCorrect?: boolean; explanation?: string }[];
    correctAnswer?: string | string[];
    explanation?: string;
    hint?: string;
    allowRetry?: boolean;
  };
  const { geometry, style } = element;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [quizState, setQuizState] = useState<QuizState>('idle');

  const isMultiple = content.type === 'multiple-choice';
  const isReveal = content.type === 'reveal';
  const hasOptions = content.options && content.options.length > 0;

  const handleSelect = useCallback(
    (optionId: string) => {
      if (quizState === 'judged' && !content.allowRetry) return;

      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (isMultiple) {
          if (next.has(optionId)) {
            next.delete(optionId);
          } else {
            next.add(optionId);
          }
        } else {
          next.clear();
          next.add(optionId);
        }
        return next;
      });

      if (quizState === 'judged') {
        setQuizState('selected');
      } else if (quizState === 'idle') {
        setQuizState('selected');
      }
      onInteraction?.(element.id, 'SELECT');
    },
    [quizState, content.allowRetry, isMultiple, element.id, onInteraction],
  );

  const handleJudge = useCallback(() => {
    if (selectedIds.size === 0) return;
    setQuizState('judged');
    onInteraction?.(element.id, 'JUDGE');
  }, [selectedIds.size, element.id, onInteraction]);

  const handleShowExplanation = useCallback(() => {
    setQuizState('explained');
    onInteraction?.(element.id, 'EXPLAIN');
  }, [element.id, onInteraction]);

  const handleRetry = useCallback(() => {
    setSelectedIds(new Set());
    setQuizState('idle');
    onInteraction?.(element.id, 'RETRY');
  }, [element.id, onInteraction]);

  const isCorrect = () => {
    if (!content.options) return false;
    const correctIds = content.options.filter((o) => o.isCorrect).map((o) => o.id);
    if (correctIds.length === 0) return false;
    const selected = Array.from(selectedIds);
    return (
      selected.length === correctIds.length &&
      selected.every((id) => correctIds.includes(id))
    );
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

      {hasOptions && (
        <div className="space-y-2">
          {content.options!.map((option) => {
            const isSelected = selectedIds.has(option.id);
            let baseClasses =
              'w-full rounded-xl border-2 p-3 text-left transition-all duration-200 hover:shadow-sm';
            let stateClasses = 'border-slate-200 bg-white hover:border-blue-300';

            if (quizState === 'judged' || quizState === 'explained') {
              if (option.isCorrect) {
                stateClasses = 'border-green-500 bg-green-50';
              } else if (isSelected) {
                stateClasses = 'border-red-500 bg-red-50';
              } else {
                stateClasses = 'border-slate-200 bg-white opacity-70';
              }
            } else if (isSelected) {
              stateClasses = 'border-blue-500 bg-blue-50';
            }

            return (
              <button
                key={option.id}
                onClick={() => handleSelect(option.id)}
                className={`${baseClasses} ${stateClasses}`}
                disabled={quizState === 'judged' && !content.allowRetry}
              >
                <div className="flex items-center gap-3">
                  {isMultiple ? <CheckIcon checked={isSelected} /> : <RadioIcon checked={isSelected} />}
                  <span className="leading-snug">{option.text}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {isReveal && (
        <div className="mt-4">
          {quizState === 'idle' && (
            <button
              onClick={handleShowExplanation}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              点击查看答案
            </button>
          )}
          {(quizState === 'judged' || quizState === 'explained') && (
            <div className="rounded-xl bg-green-50 p-3 text-green-800">
              {content.explanation || content.correctAnswer}
            </div>
          )}
        </div>
      )}

      {!isReveal && hasOptions && quizState !== 'explained' && (
        <div className="mt-4 flex flex-wrap gap-2">
          {quizState !== 'judged' && (
            <button
              onClick={handleJudge}
              disabled={selectedIds.size === 0}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              提交答案
            </button>
          )}
          {quizState === 'judged' && (
            <>
              <button
                onClick={handleShowExplanation}
                className="rounded-xl bg-green-600 px-5 py-2.5 text-white shadow-sm transition-colors hover:bg-green-700"
              >
                查看解析
              </button>
              {content.allowRetry && (
                <button
                  onClick={handleRetry}
                  className="rounded-xl bg-slate-600 px-5 py-2.5 text-white shadow-sm transition-colors hover:bg-slate-700"
                >
                  重试
                </button>
              )}
            </>
          )}
        </div>
      )}

      {(quizState === 'judged' || quizState === 'explained') && (
        <div className="mt-4 space-y-2">
          <div
            className={`rounded-xl p-3 transition-all ${
              isCorrect() ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
          >
            <div className="flex items-center gap-2 font-medium">
              {isCorrect() ? '✅ 回答正确' : '❌ 回答错误'}
            </div>
          </div>
          {quizState === 'explained' && content.explanation && (
            <div className="rounded-xl bg-slate-50 p-3 text-slate-700">{content.explanation}</div>
          )}
        </div>
      )}

      {quizState === 'explained' && content.allowRetry && (
        <button
          onClick={handleRetry}
          className="mt-3 rounded-xl bg-slate-600 px-5 py-2.5 text-white shadow-sm transition-colors hover:bg-slate-700"
        >
          重新作答
        </button>
      )}

      {content.hint && quizState === 'idle' && (
        <div className="mt-3 text-sm text-slate-500">💡 {content.hint}</div>
      )}
    </div>
  );
}
