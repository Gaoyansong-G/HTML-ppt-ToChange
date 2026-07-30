import {
  AddButton,
  EmptyState,
  ItemCard,
  LabeledField,
  asRecord,
  moveItem,
  valueAsString,
} from "./shared";

export type RecordListSlotType =
  | "steps"
  | "pairs"
  | "events"
  | "words"
  | "dialogue";

interface FieldConfig {
  key: string;
  label: string;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
}

interface EditorConfig {
  singular: string;
  addLabel: string;
  titleKey: string;
  fields: FieldConfig[];
  template: Record<string, unknown>;
}

const CONFIGS: Record<RecordListSlotType, EditorConfig> = {
  steps: {
    singular: "步骤",
    addLabel: "添加步骤",
    titleKey: "title",
    fields: [
      {
        key: "title",
        label: "步骤标题",
        required: true,
        placeholder: "例如：观察现象",
      },
      {
        key: "detail",
        label: "详细说明",
        multiline: true,
        rows: 2,
        placeholder: "说明这一环节要做什么、注意什么",
      },
    ],
    template: { title: "", detail: "" },
  },
  pairs: {
    singular: "对比项",
    addLabel: "添加对比项",
    titleKey: "left",
    fields: [
      { key: "left", label: "左侧内容", required: true },
      { key: "right", label: "右侧内容", required: true },
    ],
    template: { left: "", right: "" },
  },
  events: {
    singular: "事件",
    addLabel: "添加事件",
    titleKey: "event",
    fields: [
      {
        key: "time",
        label: "时间",
        required: true,
        placeholder: "例如：1949 年",
      },
      { key: "event", label: "事件名称", required: true },
      { key: "detail", label: "事件说明", multiline: true, rows: 2 },
    ],
    template: { time: "", event: "", detail: "" },
  },
  words: {
    singular: "词汇",
    addLabel: "添加词汇",
    titleKey: "word",
    fields: [
      {
        key: "word",
        label: "单词或短语",
        required: true,
        placeholder: "例如：explore",
      },
      { key: "phonetic", label: "音标", placeholder: "例如：/ɪkˈsplɔːr/" },
      { key: "meaning", label: "中文释义", required: true },
      { key: "example", label: "例句", multiline: true, rows: 2 },
    ],
    template: { word: "", phonetic: "", meaning: "", example: "" },
  },
  dialogue: {
    singular: "对话",
    addLabel: "添加一句对话",
    titleKey: "speaker",
    fields: [
      {
        key: "speaker",
        label: "说话人",
        required: true,
        placeholder: "例如：A / Teacher",
      },
      {
        key: "text",
        label: "对话内容",
        required: true,
        multiline: true,
        rows: 2,
      },
      { key: "translation", label: "中文翻译", multiline: true, rows: 2 },
    ],
    template: { speaker: "", text: "", translation: "" },
  },
};

export function RecordListSlotEditor({
  type,
  slotKey,
  value,
  onChange,
  maxItems,
}: {
  type: RecordListSlotType;
  slotKey: string;
  value: unknown;
  onChange: (value: unknown) => void;
  maxItems?: number;
}) {
  const baseConfig = CONFIGS[type];
  const config =
    type === "pairs" && slotKey === "branches"
      ? {
          ...baseConfig,
          singular: "分支",
          addLabel: "添加分支",
          fields: [
            { key: "left", label: "分支名称", required: true },
            { key: "right", label: "分支说明", required: true },
          ],
        }
      : baseConfig;
  const items = Array.isArray(value) ? value : [];
  const canAdd = maxItems === undefined || items.length < maxItems;

  const updateField = (index: number, key: string, nextValue: string) => {
    const next = [...items];
    next[index] = { ...asRecord(items[index]), [key]: nextValue };
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <EmptyState>还没有{config.singular}，点击下方按钮开始添加。</EmptyState>
      )}
      {items.map((item, index) => {
        const record = asRecord(item);
        const itemName = valueAsString(record[config.titleKey]).trim();
        return (
          <ItemCard
            key={index}
            title={itemName || `${config.singular} ${index + 1}`}
            index={index}
            count={items.length}
            onMove={(to) => onChange(moveItem(items, index, to))}
            onRemove={() =>
              onChange(items.filter((_, itemIndex) => itemIndex !== index))
            }
          >
            {config.fields.map((field) => {
              const fieldValue = valueAsString(record[field.key]);
              return (
                <LabeledField
                  key={field.key}
                  label={field.label}
                  required={field.required}
                  multiline={field.multiline}
                  rows={field.rows}
                  value={fieldValue}
                  onChange={(nextValue) =>
                    updateField(index, field.key, nextValue)
                  }
                  placeholder={field.placeholder}
                  error={
                    field.required && !fieldValue.trim()
                      ? `${field.label}不能为空`
                      : undefined
                  }
                />
              );
            })}
            {!Object.keys(record).length && item !== undefined && (
              <p className="text-[10px] leading-relaxed text-amber-600">
                这是旧版或异常条目；填写后会转换为当前结构。
              </p>
            )}
          </ItemCard>
        );
      })}
      <AddButton
        label={config.addLabel}
        onClick={() => canAdd && onChange([...items, { ...config.template }])}
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
