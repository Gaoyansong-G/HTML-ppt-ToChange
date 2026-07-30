import { Plus, Trash2, ImageIcon } from "lucide-react";
import type { Element } from "@courseware/shared";
import { getBlockDef, type SlotDef } from "@courseware/shared";
import { useEditorStore } from "../../stores/editor.store";
import { useHistoryStore } from "../../stores/history.store";
import { CollapsibleSection } from "./CollapsibleSection";
import {
  StructuredSlotEditor,
  isComplexSlotType,
} from "./structured/StructuredSlotEditor";

/** Block 元素 content 的运行时结构（见 shared BlockContentSchema） */
interface BlockContent {
  blockType: string;
  variant: string;
  slots: Record<string, unknown>;
  emphasis: string[];
}

interface ImageSlotValue {
  assetId?: string;
  alt?: string;
  description?: string;
}

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20";

export function BlockPropertyPanel({
  element,
  slideId,
}: {
  element: Element;
  slideId: string;
}) {
  const { courseware, updateElement } = useEditorStore();
  const { record } = useHistoryStore();

  const content = element.content as unknown as BlockContent;
  const blockDef = getBlockDef(content.blockType);

  /** 与 PropertyPanel 现有模式一致：先 record 快照，再走 updateElement（immer） */
  const mutateContent = (mutator: (draft: BlockContent) => void) => {
    record(courseware);
    updateElement(slideId, element.id, (el) => {
      const draft = el.content as unknown as BlockContent;
      if (!draft.slots || typeof draft.slots !== "object") {
        draft.slots = {};
      }
      mutator(draft);
    });
  };

  const setSlot = (key: string, value: unknown) => {
    mutateContent((draft) => {
      draft.slots[key] = value;
    });
  };

  if (!blockDef) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
        未知版式类型：<code className="font-mono">{content.blockType}</code>
        ，未在 BLOCK_CATALOG 中注册。
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 版式信息 */}
      <div className="rounded-xl border border-white/60 bg-white/80 p-3 shadow-sm backdrop-blur-sm">
        <div className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">
          版式
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-slate-800">
            {blockDef.name}
          </span>
          <span className="font-mono text-[11px] text-slate-400">
            {blockDef.blockType}
          </span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          {blockDef.description}
        </p>
      </div>

      {/* 变体切换器 */}
      {blockDef.variants.length > 0 && (
        <div className="rounded-xl border border-white/60 bg-white/80 p-3 shadow-sm backdrop-blur-sm">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            版式变体
          </div>
          <div className="flex flex-wrap gap-1.5">
            {blockDef.variants.map((variant) => {
              const active = content.variant === variant.id;
              return (
                <button
                  key={variant.id}
                  onClick={() =>
                    mutateContent((draft) => {
                      draft.variant = variant.id;
                    })
                  }
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "bg-slate-900 text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900"
                  }`}
                >
                  {variant.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 槽位表单 */}
      <CollapsibleSection title="内容槽位" defaultOpen>
        <div className="space-y-3">
          {blockDef.slots.map((slot) => (
            <SlotField
              key={slot.key}
              slot={slot}
              value={content.slots?.[slot.key]}
              onChange={(value) => setSlot(slot.key, value)}
            />
          ))}
        </div>
      </CollapsibleSection>

      <p className="px-1 text-center text-[11px] leading-relaxed text-slate-400">
        在画布中双击可进入自由编辑
      </p>
    </div>
  );
}

function SlotField({
  slot,
  value,
  onChange,
}: {
  slot: SlotDef;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const label = (
    <label className="text-xs text-slate-500">
      {slot.label}
      {slot.required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );

  switch (slot.type) {
    case "text":
      return (
        <div className="flex flex-col gap-1">
          {label}
          <input
            type="text"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            className={inputClass}
          />
        </div>
      );

    case "richtext":
      return (
        <div className="flex flex-col gap-1">
          {label}
          <textarea
            rows={3}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            className={`${inputClass} resize-y`}
          />
        </div>
      );

    case "list":
      return (
        <ListSlotEditor
          slot={slot}
          value={value}
          onChange={onChange}
          label={label}
        />
      );

    case "image":
      return (
        <ImageSlotEditor value={value} onChange={onChange} label={label} />
      );

    default:
      if (isComplexSlotType(slot.type)) {
        return (
          <StructuredSlotEditor
            slot={slot}
            value={value}
            onChange={onChange}
            label={label}
          />
        );
      }
      return (
        <div className="flex flex-col gap-1">
          {label}
          <p className="text-xs text-slate-400">
            暂不支持编辑该槽位类型：{slot.type}
          </p>
        </div>
      );
  }
}

function ListSlotEditor({
  slot,
  value,
  onChange,
  label,
}: {
  slot: SlotDef;
  value: unknown;
  onChange: (value: unknown) => void;
  label: React.ReactNode;
}) {
  const items: string[] = Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
  const maxItems = slot.maxItems;
  const canAdd = maxItems === undefined || items.length < maxItems;

  const updateItem = (index: number, text: string) => {
    const next = [...items];
    next[index] = text;
    onChange(next);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const addItem = () => {
    if (!canAdd) return;
    onChange([...items, ""]);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        {label}
        {maxItems !== undefined && (
          <span className="text-[10px] text-slate-400">
            {items.length}/{maxItems}
          </span>
        )}
      </div>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <input
            type="text"
            value={item}
            onChange={(e) => updateItem(index, e.target.value)}
            className={`${inputClass} min-w-0 flex-1`}
          />
          <button
            onClick={() => removeItem(index)}
            title="删除条目"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button
        onClick={addItem}
        disabled={!canAdd}
        className="flex items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 px-2 py-1.5 text-xs text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus size={12} /> 添加条目
      </button>
    </div>
  );
}

function ImageSlotEditor({
  value,
  onChange,
  label,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
  label: React.ReactNode;
}) {
  const image: ImageSlotValue =
    value && typeof value === "object" ? (value as ImageSlotValue) : {};
  const marked = !!image.description;

  const update = (updates: Partial<ImageSlotValue>) => {
    const next: ImageSlotValue = { ...image, ...updates };
    if (!next.description) {
      delete next.description;
    }
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label}
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
        <ImageIcon size={16} className="shrink-0 text-slate-400" />
        <span className="min-w-0 flex-1 truncate text-xs text-slate-600">
          {image.description || image.alt || image.assetId || "暂无配图"}
        </span>
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-600">
        <input
          type="checkbox"
          checked={marked}
          onChange={(e) =>
            update({
              description: e.target.checked
                ? image.description || image.alt || "待补充配图"
                : undefined,
            })
          }
          className="h-3.5 w-3.5 accent-slate-600"
        />
        标记需配图
      </label>
      {marked && (
        <input
          type="text"
          value={image.description || ""}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="配图需求描述"
          className={inputClass}
        />
      )}
    </div>
  );
}
