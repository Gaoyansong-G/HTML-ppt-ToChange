import { CheckCircle2, Puzzle } from "lucide-react";
import type { Element } from "@courseware/shared";
import { useEditorStore } from "../../stores/editor.store";
import { useHistoryStore } from "../../stores/history.store";
import { CategorizeConfigEditor } from "./interactive/CategorizeConfigEditor";
import {
  CardFlipConfigEditor,
  MatchingConfigEditor,
  OrderingConfigEditor,
  PickerConfigEditor,
  ScoreboardConfigEditor,
  TimerConfigEditor,
} from "./interactive/SimpleInteractiveEditors";
import type { ConfigEditorProps } from "./interactive/shared";
import {
  ValidationSummary,
  asRecord,
  isRecord,
  valueAsString,
  type ValidationIssue,
} from "./structured/shared";

type InteractiveType =
  | "matching"
  | "categorize"
  | "ordering"
  | "timer"
  | "scoreboard"
  | "picker"
  | "card-flip";

const INTERACTIVE_INFO: Record<
  InteractiveType,
  { name: string; description: string }
> = {
  matching: {
    name: "连线题",
    description: "学生依次点击左右两侧内容完成配对。",
  },
  categorize: {
    name: "拖拽分类",
    description: "学生把卡片拖入对应的分类篮。",
  },
  ordering: {
    name: "排序挑战",
    description: "学生调整卡片顺序并检查答案。",
  },
  timer: {
    name: "课堂计时器",
    description: "用于讨论、练习或展示环节的倒计时。",
  },
  scoreboard: {
    name: "小组计分板",
    description: "课堂播放时为各小组实时加减分。",
  },
  picker: {
    name: "随机点名",
    description: "从候选名单中随机抽取且不重复点名。",
  },
  "card-flip": {
    name: "翻翻卡",
    description: "点击卡片翻面查看答案或补充说明。",
  },
};

function isInteractiveType(value: string): value is InteractiveType {
  return Object.prototype.hasOwnProperty.call(INTERACTIVE_INFO, value);
}

function nonEmpty(value: unknown): boolean {
  return valueAsString(value).trim().length > 0;
}

function formatIndices(indices: number[]): string {
  const shown = indices.slice(0, 5).join("、");
  return indices.length > 5 ? `${shown} 等 ${indices.length} 项` : shown;
}

function validateIdentifiedList({
  value,
  label,
  min,
  max,
  requiredFields,
  requiredDescription,
}: {
  value: unknown;
  label: string;
  min: number;
  max: number;
  requiredFields: string[];
  requiredDescription: string;
}): ValidationIssue[] {
  if (!Array.isArray(value)) {
    return [
      {
        severity: "error",
        message: `${label}数据格式异常，请添加一条内容完成修复。`,
      },
    ];
  }
  const issues: ValidationIssue[] = [];
  if (value.length < min) {
    issues.push({ severity: "error", message: `${label}至少需要 ${min} 条。` });
  }
  if (value.length > max) {
    issues.push({
      severity: "warning",
      message: `${label}当前有 ${value.length} 条，建议不超过 ${max} 条以保证投影可读。`,
    });
  }
  const malformed = value.flatMap((item, index) =>
    isRecord(item) ? [] : [index + 1],
  );
  if (malformed.length) {
    issues.push({
      severity: "error",
      message: `${label}第 ${formatIndices(malformed)} 条是旧版或异常格式，编辑后会自动转换。`,
    });
  }
  const missing = value.flatMap((item, index) => {
    const record = asRecord(item);
    return requiredFields.every((field) => nonEmpty(record[field]))
      ? []
      : [index + 1];
  });
  if (missing.length) {
    issues.push({
      severity: "error",
      message: `${label}第 ${formatIndices(missing)} 条缺少${requiredDescription}。`,
    });
  }
  const ids = value.map((item) => valueAsString(asRecord(item).id).trim());
  const missingIds = ids.flatMap((id, index) => (id ? [] : [index + 1]));
  if (missingIds.length) {
    issues.push({
      severity: "error",
      message: `${label}第 ${formatIndices(missingIds)} 条来自旧版数据；编辑或排序任一条即可自动修复。`,
    });
  }
  const seen = new Set<string>();
  const duplicateIds = ids.flatMap((id, index) => {
    if (!id || !seen.has(id)) {
      if (id) seen.add(id);
      return [];
    }
    return [index + 1];
  });
  if (duplicateIds.length) {
    issues.push({
      severity: "error",
      message: `${label}第 ${formatIndices(duplicateIds)} 条存在旧版数据冲突；编辑或排序即可自动修复。`,
    });
  }
  return issues;
}

function validateMatching(config: Record<string, unknown>): ValidationIssue[] {
  return validateIdentifiedList({
    value: config.pairs,
    label: "配对",
    min: 2,
    max: 8,
    requiredFields: ["left", "right"],
    requiredDescription: "左侧或右侧内容",
  });
}

function validateCategorize(
  config: Record<string, unknown>,
): ValidationIssue[] {
  const categories = Array.isArray(config.categories) ? config.categories : [];
  const items = Array.isArray(config.items) ? config.items : [];
  const issues = [
    ...validateIdentifiedList({
      value: config.categories,
      label: "分类",
      min: 2,
      max: 6,
      requiredFields: ["name"],
      requiredDescription: "分类名称",
    }),
    ...validateIdentifiedList({
      value: config.items,
      label: "待分类卡片",
      min: 2,
      max: 24,
      requiredFields: ["text", "categoryId"],
      requiredDescription: "卡片内容或正确分类",
    }),
  ];
  const categoryIds = new Set(
    categories
      .map((category) => valueAsString(asRecord(category).id))
      .filter(Boolean),
  );
  const invalidReferences = items.flatMap((item, index) =>
    categoryIds.has(valueAsString(asRecord(item).categoryId))
      ? []
      : [index + 1],
  );
  if (invalidReferences.length) {
    issues.push({
      severity: "error",
      message: `卡片第 ${formatIndices(invalidReferences)} 条尚未选择有效分类。`,
    });
  }
  return issues;
}

function validateOrdering(config: Record<string, unknown>): ValidationIssue[] {
  const items = Array.isArray(config.items) ? config.items : [];
  const issues = validateIdentifiedList({
    value: config.items,
    label: "排序项",
    min: 2,
    max: 10,
    requiredFields: ["text"],
    requiredDescription: "排序内容",
  });
  const ids = items
    .map((item) => valueAsString(asRecord(item).id))
    .filter(Boolean);
  const order = Array.isArray(config.correctOrder)
    ? config.correctOrder.map(valueAsString)
    : [];
  const expected = new Set(ids);
  const actual = new Set(order);
  if (
    order.length !== ids.length ||
    actual.size !== order.length ||
    ids.some((id) => !actual.has(id)) ||
    order.some((id) => !expected.has(id))
  ) {
    issues.push({
      severity: "warning",
      message: "标准答案顺序尚未完整保存；编辑或移动任一排序项即可自动同步。",
    });
  }
  return issues;
}

function validateTimer(config: Record<string, unknown>): ValidationIssue[] {
  const seconds =
    typeof config.seconds === "number"
      ? config.seconds
      : Number(config.seconds);
  const issues: ValidationIssue[] = [];
  if (!Number.isFinite(seconds) || seconds <= 0) {
    issues.push({ severity: "error", message: "倒计时时长必须大于 0 秒。" });
  } else if (seconds > 3599) {
    issues.push({
      severity: "error",
      message: "倒计时时长不能超过 59 分 59 秒。",
    });
  }
  if (config.autoStart !== undefined && typeof config.autoStart !== "boolean") {
    issues.push({
      severity: "warning",
      message: "自动开始设置格式异常，重新勾选即可修复。",
    });
  }
  return issues;
}

function validateScoreboard(
  config: Record<string, unknown>,
): ValidationIssue[] {
  return validateIdentifiedList({
    value: config.teams,
    label: "小组",
    min: 2,
    max: 8,
    requiredFields: ["name"],
    requiredDescription: "小组名称",
  });
}

function validatePicker(config: Record<string, unknown>): ValidationIssue[] {
  if (!Array.isArray(config.names)) {
    return [
      { severity: "error", message: "候选名单格式异常，请添加姓名完成修复。" },
    ];
  }
  const issues: ValidationIssue[] = [];
  if (config.names.length < 2) {
    issues.push({ severity: "error", message: "随机点名至少需要 2 个姓名。" });
  }
  if (config.names.length > 60) {
    issues.push({ severity: "warning", message: "候选名单建议不超过 60 人。" });
  }
  const names = config.names.map((name) => valueAsString(name).trim());
  const blanks = names.flatMap((name, index) => (name ? [] : [index + 1]));
  if (blanks.length) {
    issues.push({
      severity: "error",
      message: `名单第 ${formatIndices(blanks)} 项为空。`,
    });
  }
  const seen = new Set<string>();
  const duplicates = names.flatMap((name, index) => {
    if (!name || !seen.has(name)) {
      if (name) seen.add(name);
      return [];
    }
    return [index + 1];
  });
  if (duplicates.length) {
    issues.push({
      severity: "error",
      message: `名单第 ${formatIndices(duplicates)} 项姓名重复，会影响不重复点名。`,
    });
  }
  return issues;
}

function validateCardFlip(config: Record<string, unknown>): ValidationIssue[] {
  return validateIdentifiedList({
    value: config.cards,
    label: "卡片",
    min: 1,
    max: 12,
    requiredFields: ["front", "back"],
    requiredDescription: "正面或背面内容",
  });
}

function validateConfig(
  type: InteractiveType,
  config: Record<string, unknown>,
): ValidationIssue[] {
  switch (type) {
    case "matching":
      return validateMatching(config);
    case "categorize":
      return validateCategorize(config);
    case "ordering":
      return validateOrdering(config);
    case "timer":
      return validateTimer(config);
    case "scoreboard":
      return validateScoreboard(config);
    case "picker":
      return validatePicker(config);
    case "card-flip":
      return validateCardFlip(config);
  }
}

function ConfigEditor({
  type,
  ...props
}: ConfigEditorProps & { type: InteractiveType }) {
  switch (type) {
    case "matching":
      return <MatchingConfigEditor {...props} />;
    case "categorize":
      return <CategorizeConfigEditor {...props} />;
    case "ordering":
      return <OrderingConfigEditor {...props} />;
    case "timer":
      return <TimerConfigEditor {...props} />;
    case "scoreboard":
      return <ScoreboardConfigEditor {...props} />;
    case "picker":
      return <PickerConfigEditor {...props} />;
    case "card-flip":
      return <CardFlipConfigEditor {...props} />;
  }
}

export function InteractivePropertyPanel({
  element,
  slideId,
}: {
  element: Element;
  slideId: string;
}) {
  const { courseware, updateElement } = useEditorStore();
  const { record } = useHistoryStore();
  const content = asRecord(element.content);
  const type = valueAsString(content.interactiveType);
  const config = asRecord(content.config);

  const updateConfig = (nextConfig: Record<string, unknown>) => {
    record(courseware);
    updateElement(slideId, element.id, (draftElement) => {
      const draftContent = draftElement.content as Record<string, unknown>;
      draftContent.config = nextConfig;
    });
  };

  if (!isInteractiveType(type)) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-relaxed text-amber-700">
        暂不支持编辑该互动类型：
        <code className="ml-1 font-mono">{type || "未设置"}</code>
      </div>
    );
  }

  const info = INTERACTIVE_INFO[type];
  const issues = validateConfig(type, config);

  return (
    <div className="space-y-3" data-testid={`interactive-property-${type}`}>
      <div className="rounded-xl border border-white/60 bg-white/80 p-3 shadow-sm backdrop-blur-sm">
        <div className="flex items-start gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
            <Puzzle size={16} />
          </div>
          <div className="min-w-0">
            <span className="text-sm font-semibold text-slate-800">
              {info.name}
            </span>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              {info.description}
            </p>
          </div>
        </div>
      </div>

      {issues.length ? (
        <ValidationSummary issues={issues} />
      ) : (
        <div className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[11px] font-medium text-emerald-700">
          <CheckCircle2 size={14} />
          配置完整，可在预览中测试互动效果
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm">
        <ConfigEditor type={type} config={config} onChange={updateConfig} />
      </div>

      <p className="px-1 text-center text-[10px] leading-relaxed text-slate-400">
        内容修改会进入撤销历史；播放状态不会写回课件
      </p>
    </div>
  );
}
