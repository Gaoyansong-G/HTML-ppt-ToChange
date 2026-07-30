import { useId, type ReactNode } from "react";
import {
  AddButton,
  EmptyState,
  ItemCard,
  asRecord,
  inputClass,
  moveItem,
  valueAsString,
} from "../structured/shared";

export interface ConfigEditorProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export function createInteractiveId(prefix: string): string {
  const uuid =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${uuid}`;
}

export function identifiedRecords(
  value: unknown,
  prefix: string,
): Record<string, unknown>[] {
  const items = Array.isArray(value) ? value : [];
  const seen = new Set<string>();
  return items.map((item) => {
    const record = asRecord(item);
    let id = valueAsString(record.id).trim();
    if (!id || seen.has(id)) id = createInteractiveId(prefix);
    seen.add(id);
    return { ...record, id };
  });
}

export function IdentifiedListEditor({
  value,
  onChange,
  prefix,
  singular,
  addLabel,
  maxItems,
  newItem,
  itemTitle,
  renderItem,
}: {
  value: unknown;
  onChange: (items: Record<string, unknown>[]) => void;
  prefix: string;
  singular: string;
  addLabel: string;
  maxItems?: number;
  newItem: () => Record<string, unknown>;
  itemTitle: (item: Record<string, unknown>, index: number) => string;
  renderItem: (
    item: Record<string, unknown>,
    index: number,
    update: (updates: Record<string, unknown>) => void,
  ) => ReactNode;
}) {
  const rawItems = Array.isArray(value) ? value : [];
  const items = identifiedRecords(rawItems, prefix);
  const canAdd = maxItems === undefined || items.length < maxItems;

  const commit = (next: unknown[]) => {
    onChange(identifiedRecords(next, prefix));
  };

  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <EmptyState>还没有{singular}，点击下方按钮添加。</EmptyState>
      )}
      {items.map((item, index) => (
        <ItemCard
          key={index}
          title={itemTitle(item, index) || `${singular} ${index + 1}`}
          index={index}
          count={items.length}
          onMove={(to) => commit(moveItem(items, index, to))}
          onRemove={() =>
            commit(items.filter((_, itemIndex) => itemIndex !== index))
          }
        >
          {renderItem(item, index, (updates) => {
            const next = [...items];
            next[index] = { ...item, ...updates };
            commit(next);
          })}
        </ItemCard>
      ))}
      <AddButton
        label={addLabel}
        onClick={() =>
          canAdd &&
          commit([...items, { ...newItem(), id: createInteractiveId(prefix) }])
        }
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

export function ColorField({
  label,
  value,
  onChange,
  fallback = "#64748b",
}: {
  label: string;
  value: unknown;
  onChange: (value: string) => void;
  fallback?: string;
}) {
  const id = useId();
  const color = /^#[0-9a-f]{6}$/i.test(valueAsString(value))
    ? valueAsString(value)
    : fallback;
  return (
    <div className="flex items-center justify-between gap-2">
      <label htmlFor={id} className="text-[11px] font-medium text-slate-600">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] text-slate-400">
          {color.toUpperCase()}
        </span>
        <input
          id={id}
          type="color"
          value={color}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 w-10 cursor-pointer rounded-md border border-slate-200 bg-white p-1"
        />
      </div>
    </div>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  suffix,
  error,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
  error?: string;
}) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-[11px] font-medium text-slate-600">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          value={Number.isFinite(value) ? value : 0}
          onChange={(event) => onChange(Number(event.target.value))}
          className={`${inputClass} ${
            error
              ? "border-red-300 bg-red-50/40 focus:border-red-500 focus:ring-red-500/20"
              : ""
          }`}
        />
        {suffix && (
          <span className="shrink-0 text-xs text-slate-500">{suffix}</span>
        )}
      </div>
      {error && (
        <span className="text-[11px] leading-relaxed text-red-600">
          {error}
        </span>
      )}
    </div>
  );
}

export function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-3.5 w-3.5 accent-slate-700"
      />
      <span className="min-w-0">
        <span className="block text-xs font-medium text-slate-700">
          {label}
        </span>
        {description && (
          <span className="mt-0.5 block text-[10px] leading-relaxed text-slate-400">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}

export function EditorSection({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2 border-t border-slate-200 pt-3 first:border-0 first:pt-0">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold text-slate-700">{title}</h4>
        {meta && <span className="text-[10px] text-slate-400">{meta}</span>}
      </div>
      {children}
    </section>
  );
}
