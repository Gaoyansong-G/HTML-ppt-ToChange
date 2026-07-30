import { useId } from "react";
import {
  AddButton,
  EmptyState,
  ItemCard,
  LabeledField,
  SelectField,
  asRecord,
  isRecord,
  moveItem,
  valueAsString,
} from "./shared";

const QUIZ_TYPES = [
  { value: "single-choice", label: "单选题" },
  { value: "multiple-choice", label: "多选题" },
  { value: "fill-blank", label: "填空题" },
  { value: "reveal", label: "答案揭示" },
] as const;

const MAX_OPTIONS = 6;

function isChoiceType(type: string): boolean {
  return type === "single-choice" || type === "multiple-choice";
}

function answerLetters(value: unknown): Set<string> {
  const parts = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[,，、\s]+/)
      : [];
  return new Set(
    parts
      .map((part) => String(part).trim().toUpperCase())
      .filter((part) => /^[A-Z]$/.test(part)),
  );
}

export function QuizSlotEditor({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const radioName = useId();
  const quiz = asRecord(value);
  const rawType = valueAsString(quiz.type);
  const type = QUIZ_TYPES.some((option) => option.value === rawType)
    ? rawType
    : "";
  const options = Array.isArray(quiz.options) ? quiz.options : [];
  const legacyCorrect = answerLetters(quiz.correctAnswer ?? quiz.answer);

  const commit = (updates: Record<string, unknown>) => {
    onChange({ ...quiz, ...updates });
  };

  const optionIsCorrect = (option: unknown, index: number): boolean => {
    if (isRecord(option) && typeof option.isCorrect === "boolean") {
      return option.isCorrect;
    }
    return legacyCorrect.has(String.fromCharCode(65 + index));
  };

  const normalizedOptions = () =>
    options.map((option, index) => ({
      ...asRecord(option),
      text: isRecord(option)
        ? valueAsString(option.text)
        : valueAsString(option),
      isCorrect: optionIsCorrect(option, index),
    }));

  const saveOptions = (nextOptions: Record<string, unknown>[]) => {
    const correct = nextOptions
      .map((option, index) =>
        option.isCorrect ? String.fromCharCode(65 + index) : "",
      )
      .filter(Boolean);
    commit({
      options: nextOptions,
      correctAnswer: type === "multiple-choice" ? correct : (correct[0] ?? ""),
    });
  };

  const changeType = (nextType: string) => {
    const next: Record<string, unknown> = { ...quiz, type: nextType };
    if (isChoiceType(nextType)) {
      let current = normalizedOptions();
      if (current.length < 2) {
        current = [
          { text: "", isCorrect: true },
          { text: "", isCorrect: false },
        ];
      }
      if (nextType === "single-choice") {
        const correctIndex = Math.max(
          0,
          current.findIndex((option) => !!option.isCorrect),
        );
        current = current.map((option, index) => ({
          ...option,
          isCorrect: index === correctIndex,
        }));
        next.correctAnswer = String.fromCharCode(65 + correctIndex);
      } else {
        if (!current.some((option) => !!option.isCorrect)) {
          current[0] = { ...current[0], isCorrect: true };
        }
        next.correctAnswer = current.flatMap((option, index) =>
          option.isCorrect ? [String.fromCharCode(65 + index)] : [],
        );
      }
      next.options = current;
    } else {
      delete next.options;
      if (Array.isArray(next.correctAnswer)) {
        next.correctAnswer = next.correctAnswer.join("、");
      }
    }
    onChange(next);
  };

  const question = valueAsString(quiz.question);
  const explanation = valueAsString(quiz.explanation);
  const directAnswer = Array.isArray(quiz.correctAnswer)
    ? quiz.correctAnswer.map(String).join("、")
    : valueAsString(quiz.correctAnswer);

  return (
    <div className="space-y-3">
      <SelectField
        label="题型"
        value={type}
        onChange={changeType}
        options={[
          ...(!type ? [{ value: "", label: "请选择题型" }] : []),
          ...QUIZ_TYPES,
        ]}
        hint="切换题型可撤销；切换为填空或揭示题时，选项将被移除。"
      />
      <LabeledField
        label="题干"
        required
        multiline
        rows={3}
        value={question}
        onChange={(nextValue) => commit({ question: nextValue })}
        placeholder="输入要让学生回答的问题"
        error={question.trim() ? undefined : "题干不能为空"}
      />

      {isChoiceType(type) ? (
        <section className="space-y-2 border-t border-slate-200 pt-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-700">
              选项与正确答案
            </h4>
            <span className="text-[10px] text-slate-400">
              {options.length}/{MAX_OPTIONS} 项
            </span>
          </div>
          {options.length === 0 && (
            <EmptyState>请添加至少两个选项。</EmptyState>
          )}
          {options.map((option, index) => {
            const record = asRecord(option);
            const optionText = isRecord(option)
              ? valueAsString(record.text)
              : valueAsString(option);
            const checked = optionIsCorrect(option, index);
            return (
              <ItemCard
                key={index}
                title={`选项 ${String.fromCharCode(65 + index)}`}
                index={index}
                count={options.length}
                onMove={(to) =>
                  saveOptions(moveItem(normalizedOptions(), index, to))
                }
                onRemove={() =>
                  saveOptions(
                    normalizedOptions().filter(
                      (_, optionIndex) => optionIndex !== index,
                    ),
                  )
                }
              >
                <LabeledField
                  label="选项内容"
                  required
                  value={optionText}
                  onChange={(nextValue) => {
                    const next = normalizedOptions();
                    next[index] = { ...next[index], text: nextValue };
                    saveOptions(next);
                  }}
                  error={optionText.trim() ? undefined : "选项内容不能为空"}
                />
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-600">
                  <input
                    type={type === "multiple-choice" ? "checkbox" : "radio"}
                    name={type === "single-choice" ? radioName : undefined}
                    checked={checked}
                    onChange={() => {
                      const next = normalizedOptions().map(
                        (item, optionIndex) => ({
                          ...item,
                          isCorrect:
                            type === "single-choice"
                              ? optionIndex === index
                              : optionIndex === index
                                ? !checked
                                : !!item.isCorrect,
                        }),
                      );
                      saveOptions(next);
                    }}
                    className="h-3.5 w-3.5 accent-slate-700"
                  />
                  设为正确答案
                </label>
              </ItemCard>
            );
          })}
          <AddButton
            label="添加选项"
            onClick={() => {
              if (options.length >= MAX_OPTIONS) return;
              const next = normalizedOptions();
              next.push({ text: "", isCorrect: next.length === 0 });
              saveOptions(next);
            }}
            disabled={options.length >= MAX_OPTIONS}
            hint={`播放器最多展示 ${MAX_OPTIONS} 个选项`}
          />
        </section>
      ) : (
        <LabeledField
          label={type === "reveal" ? "揭示内容" : "参考答案"}
          required
          multiline
          rows={2}
          value={directAnswer}
          onChange={(nextValue) => commit({ correctAnswer: nextValue })}
          placeholder={
            type === "reveal" ? "点击后要展示的答案或结论" : "填写参考答案"
          }
          error={directAnswer.trim() ? undefined : "参考答案不能为空"}
        />
      )}

      <LabeledField
        label="答案解析"
        multiline
        rows={3}
        value={explanation}
        onChange={(nextValue) => commit({ explanation: nextValue })}
        placeholder="说明为什么选择这个答案（可选）"
      />
    </div>
  );
}
