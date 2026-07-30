import { useEffect, useId, useState, type ReactNode } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Braces,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";

export const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm shadow-sm transition placeholder:text-slate-300 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20";

export interface ValidationIssue {
  severity: "error" | "warning";
  message: string;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

export function valueAsString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === undefined || value === null) return "";
  return String(value);
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length || from === to) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function LabeledField({
  label,
  value,
  onChange,
  required = false,
  multiline = false,
  rows = 2,
  placeholder,
  hint,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  hint?: string;
  error?: string;
}) {
  const id = useId();
  const fieldClass = `${inputClass} ${
    error
      ? "border-red-300 bg-red-50/40 focus:border-red-500 focus:ring-red-500/20"
      : ""
  }`;

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-[11px] font-medium text-slate-600">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {multiline ? (
        <textarea
          id={id}
          rows={rows}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`${fieldClass} resize-y`}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={fieldClass}
        />
      )}
      {error ? (
        <span className="text-[11px] leading-relaxed text-red-600">
          {error}
        </span>
      ) : hint ? (
        <span className="text-[11px] leading-relaxed text-slate-400">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-[11px] font-medium text-slate-600">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && (
        <span className="text-[11px] leading-relaxed text-slate-400">
          {hint}
        </span>
      )}
    </div>
  );
}

export function ItemCard({
  title,
  index,
  count,
  onMove,
  onRemove,
  children,
}: {
  title: string;
  index: number;
  count: number;
  onMove: (to: number) => void;
  onRemove: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-slate-200 px-1 text-[10px] font-bold text-slate-600">
          {index + 1}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">
          {title}
        </span>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => onMove(index - 1)}
            disabled={index === 0}
            aria-label={`上移${title}`}
            title="上移"
            className="rounded-md p-1 text-slate-400 transition hover:bg-white hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-25"
          >
            <ArrowUp size={13} />
          </button>
          <button
            type="button"
            onClick={() => onMove(index + 1)}
            disabled={index === count - 1}
            aria-label={`下移${title}`}
            title="下移"
            className="rounded-md p-1 text-slate-400 transition hover:bg-white hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-25"
          >
            <ArrowDown size={13} />
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`删除${title}`}
            title="删除"
            className="rounded-md p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export function AddButton({
  label,
  onClick,
  disabled = false,
  hint,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-white/70 px-2 py-2 text-xs font-medium text-slate-600 transition hover:border-slate-400 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus size={13} />
        {label}
      </button>
      {hint && <p className="text-center text-[10px] text-slate-400">{hint}</p>}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-3 py-4 text-center text-xs leading-relaxed text-slate-400">
      {children}
    </div>
  );
}

export function ValidationSummary({ issues }: { issues: ValidationIssue[] }) {
  if (!issues.length) return null;
  const hasError = issues.some((issue) => issue.severity === "error");
  return (
    <div
      className={`rounded-lg border px-2.5 py-2 ${
        hasError
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-amber-200 bg-amber-50 text-amber-700"
      }`}
    >
      <div className="flex items-start gap-1.5">
        <AlertCircle size={14} className="mt-0.5 shrink-0" />
        <div className="space-y-0.5 text-[11px] leading-relaxed">
          {issues.map((issue, index) => (
            <p key={`${issue.message}-${index}`}>{issue.message}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

export function StringListEditor({
  value,
  onChange,
  itemLabel,
  addLabel,
  maxItems,
  multiline = false,
  placeholder,
}: {
  value: unknown;
  onChange: (value: unknown[]) => void;
  itemLabel: string;
  addLabel: string;
  maxItems?: number;
  multiline?: boolean;
  placeholder?: string;
}) {
  const items = Array.isArray(value) ? value : [];
  const canAdd = maxItems === undefined || items.length < maxItems;

  const updateAt = (index: number, nextValue: string) => {
    const next = [...items];
    next[index] = nextValue;
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <EmptyState>还没有{itemLabel}，点击下方按钮添加。</EmptyState>
      )}
      {items.map((item, index) => (
        <ItemCard
          key={index}
          title={`${itemLabel} ${index + 1}`}
          index={index}
          count={items.length}
          onMove={(to) => onChange(moveItem(items, index, to))}
          onRemove={() =>
            onChange(items.filter((_, itemIndex) => itemIndex !== index))
          }
        >
          <LabeledField
            label={itemLabel}
            required
            multiline={multiline}
            value={valueAsString(item)}
            onChange={(nextValue) => updateAt(index, nextValue)}
            placeholder={placeholder}
            error={
              valueAsString(item).trim() ? undefined : `${itemLabel}不能为空`
            }
          />
        </ItemCard>
      ))}
      <AddButton
        label={addLabel}
        onClick={() => canAdd && onChange([...items, ""])}
        disabled={!canAdd}
        hint={
          maxItems === undefined
            ? undefined
            : `最多 ${maxItems} 条，当前 ${items.length} 条`
        }
      />
    </div>
  );
}

function serializeJson(value: unknown): string {
  const serialized = JSON.stringify(value ?? null, null, 2);
  return serialized ?? "null";
}

export function AdvancedJsonEditor({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const [text, setText] = useState(() => serializeJson(value));
  const [error, setError] = useState("");

  useEffect(() => {
    setText(serializeJson(value));
    setError("");
  }, [value]);

  const apply = () => {
    try {
      const parsed: unknown = JSON.parse(text);
      setError("");
      onChange(parsed);
    } catch (parseError) {
      setError(
        `格式错误：${parseError instanceof Error ? parseError.message : String(parseError)}。当前课件数据未改变。`,
      );
    }
  };

  return (
    <details className="group rounded-lg border border-slate-200 bg-white/70">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 px-2.5 py-2 text-[11px] font-medium text-slate-500 transition hover:text-slate-800">
        <Braces size={13} />
        高级：原始数据（调试）
        <span className="ml-auto text-[10px] text-slate-400 group-open:hidden">
          展开
        </span>
        <span className="ml-auto hidden text-[10px] text-slate-400 group-open:inline">
          收起
        </span>
      </summary>
      <div className="space-y-2 border-t border-slate-100 p-2.5">
        <p className="text-[10px] leading-relaxed text-amber-700">
          仅在修复旧数据或调试时使用。格式错误不会覆盖当前内容。
        </p>
        <textarea
          rows={10}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setError("");
          }}
          spellCheck={false}
          aria-label="复杂槽位原始 JSON"
          className={`${inputClass} resize-y font-mono text-xs`}
        />
        {error && (
          <p className="text-[11px] leading-relaxed text-red-600">{error}</p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setText(serializeJson(value));
              setError("");
            }}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300"
          >
            <RotateCcw size={12} />
            恢复
          </button>
          <button
            type="button"
            onClick={apply}
            className="flex-1 rounded-lg bg-slate-900 px-2 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            应用原始数据
          </button>
        </div>
      </div>
    </details>
  );
}
