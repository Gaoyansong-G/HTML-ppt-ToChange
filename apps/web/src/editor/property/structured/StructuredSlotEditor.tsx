import type { ReactNode } from "react";
import type { SlotDef, SlotType } from "@courseware/shared";
import { ExperimentSlotEditor } from "./ExperimentSlotEditor";
import {
  RecordListSlotEditor,
  type RecordListSlotType,
} from "./RecordListSlotEditor";
import { PoemSlotEditor } from "./PoemSlotEditor";
import { QuizSlotEditor } from "./QuizSlotEditor";
import { TableSlotEditor } from "./TableSlotEditor";
import {
  AdvancedJsonEditor,
  ValidationSummary,
  asRecord,
  isRecord,
  valueAsString,
  type ValidationIssue,
} from "./shared";

export type ComplexSlotType = Extract<
  SlotType,
  | "table"
  | "steps"
  | "pairs"
  | "events"
  | "words"
  | "dialogue"
  | "quiz"
  | "poem"
  | "experiment"
>;

const COMPLEX_SLOT_TYPES: ComplexSlotType[] = [
  "table",
  "steps",
  "pairs",
  "events",
  "words",
  "dialogue",
  "quiz",
  "poem",
  "experiment",
];

const TYPE_LABELS: Record<ComplexSlotType, string> = {
  table: "表格",
  steps: "步骤",
  pairs: "成对内容",
  events: "时间事件",
  words: "词汇",
  dialogue: "对话",
  quiz: "测验",
  poem: "诗词",
  experiment: "实验",
};

export function isComplexSlotType(type: SlotType): type is ComplexSlotType {
  return COMPLEX_SLOT_TYPES.includes(type as ComplexSlotType);
}

function nonEmpty(value: unknown): boolean {
  return valueAsString(value).trim().length > 0;
}

function invalidRecordIndices(items: unknown[]): number[] {
  return items.flatMap((item, index) => (isRecord(item) ? [] : [index + 1]));
}

function missingFieldIndices(items: unknown[], fields: string[]): number[] {
  return items.flatMap((item, index) => {
    const record = asRecord(item);
    return fields.every((field) => nonEmpty(record[field])) ? [] : [index + 1];
  });
}

function formatIndices(indices: number[]): string {
  const shown = indices.slice(0, 5).join("、");
  return indices.length > 5 ? `${shown} 等 ${indices.length} 项` : shown;
}

function validateRecordList(
  slot: SlotDef,
  value: unknown,
  requiredFields: string[],
  fieldDescription: string,
): ValidationIssue[] {
  if (!Array.isArray(value)) {
    return [
      {
        severity: "error",
        message: "当前数据不是条目列表，请添加条目或在高级区修复。",
      },
    ];
  }
  const issues: ValidationIssue[] = [];
  if (slot.required && value.length === 0) {
    issues.push({ severity: "error", message: `至少需要 1 条${slot.label}。` });
  }
  if (slot.maxItems !== undefined && value.length > slot.maxItems) {
    issues.push({
      severity: "warning",
      message: `当前有 ${value.length} 条，版式最多完整展示 ${slot.maxItems} 条。`,
    });
  }
  const malformed = invalidRecordIndices(value);
  if (malformed.length) {
    issues.push({
      severity: "error",
      message: `第 ${formatIndices(malformed)} 条是旧版或异常格式，请填写字段完成转换。`,
    });
  }
  const missing = missingFieldIndices(value, requiredFields);
  if (missing.length) {
    issues.push({
      severity: "error",
      message: `第 ${formatIndices(missing)} 条缺少${fieldDescription}。`,
    });
  }
  return issues;
}

function validateTable(slot: SlotDef, value: unknown): ValidationIssue[] {
  if (!isRecord(value)) {
    return [
      {
        severity: "error",
        message: "表格数据格式异常，请添加列或在高级区修复。",
      },
    ];
  }
  const issues: ValidationIssue[] = [];
  const headers = Array.isArray(value.headers) ? value.headers : [];
  const rows = Array.isArray(value.rows) ? value.rows : [];
  if (!Array.isArray(value.headers)) {
    issues.push({ severity: "error", message: "缺少表头列表。" });
  }
  if (!Array.isArray(value.rows)) {
    issues.push({ severity: "error", message: "缺少数据行列表。" });
  }
  if (slot.required && headers.length === 0) {
    issues.push({ severity: "error", message: "表格至少需要 1 列。" });
  }
  const blankHeaders = headers.flatMap((header, index) =>
    nonEmpty(header) ? [] : [index + 1],
  );
  if (blankHeaders.length) {
    issues.push({
      severity: "error",
      message: `第 ${formatIndices(blankHeaders)} 列的表头为空。`,
    });
  }
  if (rows.length === 0) {
    issues.push({ severity: "warning", message: "表格还没有数据行。" });
  }
  if (rows.length > 12) {
    issues.push({
      severity: "warning",
      message: "播放器最多展示前 12 行数据。",
    });
  }
  const mismatchedRows = rows.flatMap((row, index) =>
    Array.isArray(row) && row.length === headers.length ? [] : [index + 1],
  );
  if (mismatchedRows.length) {
    issues.push({
      severity: "warning",
      message: `第 ${formatIndices(mismatchedRows)} 行与表头列数不一致，可使用“按当前表头修整”。`,
    });
  }
  return issues;
}

function validateQuiz(value: unknown): ValidationIssue[] {
  if (!isRecord(value)) {
    return [
      { severity: "error", message: "测验数据格式异常，请填写题型和题干。" },
    ];
  }
  const issues: ValidationIssue[] = [];
  const type = valueAsString(value.type);
  const validTypes = [
    "single-choice",
    "multiple-choice",
    "fill-blank",
    "reveal",
  ];
  if (!validTypes.includes(type)) {
    issues.push({ severity: "error", message: "请选择一个有效题型。" });
  }
  if (!nonEmpty(value.question)) {
    issues.push({ severity: "error", message: "题干不能为空。" });
  }
  if (type === "single-choice" || type === "multiple-choice") {
    const options = Array.isArray(value.options) ? value.options : [];
    if (options.length < 2) {
      issues.push({ severity: "error", message: "选择题至少需要 2 个选项。" });
    }
    if (options.length > 6) {
      issues.push({
        severity: "warning",
        message: "播放器最多展示前 6 个选项。",
      });
    }
    const blankOptions = options.flatMap((option, index) => {
      const text = isRecord(option) ? option.text : option;
      return nonEmpty(text) ? [] : [index + 1];
    });
    if (blankOptions.length) {
      issues.push({
        severity: "error",
        message: `选项 ${formatIndices(blankOptions)} 的内容为空。`,
      });
    }
    const refs = new Set(
      (Array.isArray(value.correctAnswer)
        ? value.correctAnswer
        : typeof value.correctAnswer === "string"
          ? value.correctAnswer.split(/[,，、\s]+/)
          : []
      ).map((item) => String(item).trim().toUpperCase()),
    );
    const correctCount = options.filter((option, index) => {
      if (isRecord(option) && typeof option.isCorrect === "boolean") {
        return option.isCorrect;
      }
      return refs.has(String.fromCharCode(65 + index));
    }).length;
    if (correctCount === 0) {
      issues.push({ severity: "error", message: "请至少设置 1 个正确答案。" });
    } else if (type === "single-choice" && correctCount !== 1) {
      issues.push({
        severity: "error",
        message: "单选题只能设置 1 个正确答案。",
      });
    }
  } else if (
    (type === "fill-blank" || type === "reveal") &&
    !nonEmpty(value.correctAnswer)
  ) {
    issues.push({ severity: "error", message: "参考答案不能为空。" });
  }
  return issues;
}

function validatePoem(value: unknown): ValidationIssue[] {
  if (!isRecord(value)) {
    return [
      { severity: "error", message: "诗词数据格式异常，请填写基本信息。" },
    ];
  }
  const issues: ValidationIssue[] = [];
  if (!nonEmpty(value.title))
    issues.push({ severity: "error", message: "诗词标题不能为空。" });
  if (!nonEmpty(value.author))
    issues.push({ severity: "error", message: "作者不能为空。" });
  const lines = Array.isArray(value.lines) ? value.lines : [];
  if (!Array.isArray(value.lines) || lines.length === 0) {
    issues.push({ severity: "error", message: "至少需要 1 句诗词正文。" });
  }
  const blankLines = lines.flatMap((line, index) =>
    nonEmpty(line) ? [] : [index + 1],
  );
  if (blankLines.length) {
    issues.push({
      severity: "error",
      message: `第 ${formatIndices(blankLines)} 句为空。`,
    });
  }
  if (lines.length > 8) {
    issues.push({ severity: "warning", message: "播放器最多展示前 8 句。" });
  }
  return issues;
}

function validateExperiment(value: unknown): ValidationIssue[] {
  if (!isRecord(value)) {
    return [
      { severity: "error", message: "实验数据格式异常，请填写实验信息。" },
    ];
  }
  const issues: ValidationIssue[] = [];
  if (!nonEmpty(value.name))
    issues.push({ severity: "error", message: "实验名称不能为空。" });
  const materials = Array.isArray(value.materials) ? value.materials : [];
  if (!Array.isArray(value.materials) || materials.length === 0) {
    issues.push({ severity: "error", message: "至少需要 1 项实验器材。" });
  }
  const blankMaterials = materials.flatMap((item, index) =>
    nonEmpty(item) ? [] : [index + 1],
  );
  if (blankMaterials.length) {
    issues.push({
      severity: "error",
      message: `第 ${formatIndices(blankMaterials)} 项器材为空。`,
    });
  }
  if (materials.length > 6) {
    issues.push({
      severity: "warning",
      message: "版式最多完整展示 6 项实验器材。",
    });
  }
  const steps = Array.isArray(value.steps) ? value.steps : [];
  if (!Array.isArray(value.steps) || steps.length === 0) {
    issues.push({ severity: "error", message: "至少需要 1 个实验步骤。" });
  }
  const missingSteps = missingFieldIndices(steps, ["title"]);
  if (missingSteps.length) {
    issues.push({
      severity: "error",
      message: `第 ${formatIndices(missingSteps)} 个实验步骤缺少标题。`,
    });
  }
  if (steps.length > 6) {
    issues.push({
      severity: "warning",
      message: "版式最多完整展示 6 个实验步骤。",
    });
  }
  if (!nonEmpty(value.observation)) {
    issues.push({
      severity: "warning",
      message: "建议补充观察记录，便于课堂讲解。",
    });
  }
  if (!nonEmpty(value.conclusion)) {
    issues.push({ severity: "warning", message: "建议补充实验结论。" });
  }
  return issues;
}

function validateSlot(slot: SlotDef, value: unknown): ValidationIssue[] {
  switch (slot.type) {
    case "table":
      return validateTable(slot, value);
    case "steps":
      return validateRecordList(slot, value, ["title"], "步骤标题");
    case "pairs":
      return validateRecordList(slot, value, ["left", "right"], "左右内容");
    case "events":
      return validateRecordList(
        slot,
        value,
        ["time", "event"],
        "时间或事件名称",
      );
    case "words":
      return validateRecordList(slot, value, ["word", "meaning"], "单词或释义");
    case "dialogue":
      return validateRecordList(
        slot,
        value,
        ["speaker", "text"],
        "说话人或对话内容",
      );
    case "quiz":
      return validateQuiz(value);
    case "poem":
      return validatePoem(value);
    case "experiment":
      return validateExperiment(value);
    default:
      return [];
  }
}

function valueSummary(type: ComplexSlotType, value: unknown): string {
  if (type === "table") {
    const record = asRecord(value);
    const columns = Array.isArray(record.headers) ? record.headers.length : 0;
    const rows = Array.isArray(record.rows) ? record.rows.length : 0;
    return `${columns} 列 × ${rows} 行`;
  }
  if (type === "quiz") {
    const record = asRecord(value);
    const options = Array.isArray(record.options) ? record.options.length : 0;
    return options ? `${options} 个选项` : "主观题";
  }
  if (type === "poem") {
    const lines = asRecord(value).lines;
    return `${Array.isArray(lines) ? lines.length : 0} 句`;
  }
  if (type === "experiment") {
    const record = asRecord(value);
    const materials = Array.isArray(record.materials)
      ? record.materials.length
      : 0;
    const steps = Array.isArray(record.steps) ? record.steps.length : 0;
    return `${materials} 项器材 · ${steps} 个步骤`;
  }
  return `${Array.isArray(value) ? value.length : 0} 条`;
}

function VisualEditor({
  slot,
  value,
  onChange,
}: {
  slot: SlotDef;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  switch (slot.type) {
    case "table":
      return <TableSlotEditor value={value} onChange={onChange} />;
    case "steps":
    case "pairs":
    case "events":
    case "words":
    case "dialogue":
      return (
        <RecordListSlotEditor
          type={slot.type as RecordListSlotType}
          slotKey={slot.key}
          value={value}
          onChange={onChange}
          maxItems={slot.maxItems}
        />
      );
    case "quiz":
      return <QuizSlotEditor value={value} onChange={onChange} />;
    case "poem":
      return <PoemSlotEditor value={value} onChange={onChange} />;
    case "experiment":
      return <ExperimentSlotEditor value={value} onChange={onChange} />;
    default:
      return null;
  }
}

export function StructuredSlotEditor({
  slot,
  value,
  onChange,
  label,
}: {
  slot: SlotDef;
  value: unknown;
  onChange: (value: unknown) => void;
  label: ReactNode;
}) {
  if (!isComplexSlotType(slot.type)) return null;
  const issues = validateSlot(slot, value);
  const errors = issues.filter((issue) => issue.severity === "error").length;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">{label}</div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500">
          {TYPE_LABELS[slot.type]} · {valueSummary(slot.type, value)}
        </span>
      </div>
      <ValidationSummary issues={issues} />
      <div
        className={`rounded-xl border bg-white/80 p-2.5 shadow-sm ${
          errors ? "border-red-200" : "border-slate-200"
        }`}
      >
        <VisualEditor slot={slot} value={value} onChange={onChange} />
      </div>
      <AdvancedJsonEditor value={value} onChange={onChange} />
    </div>
  );
}
