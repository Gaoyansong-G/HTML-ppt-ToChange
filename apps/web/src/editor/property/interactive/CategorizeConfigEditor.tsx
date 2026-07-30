import { LabeledField, SelectField, valueAsString } from "../structured/shared";
import {
  ColorField,
  EditorSection,
  IdentifiedListEditor,
  identifiedRecords,
  type ConfigEditorProps,
} from "./shared";

const CATEGORY_COLORS = [
  "#2563eb",
  "#e11d48",
  "#059669",
  "#d97706",
  "#7c3aed",
  "#0891b2",
];

export function CategorizeConfigEditor({
  config,
  onChange,
}: ConfigEditorProps) {
  const rawCategories = Array.isArray(config.categories)
    ? config.categories
    : [];
  const rawItems = Array.isArray(config.items) ? config.items : [];
  const categories = identifiedRecords(rawCategories, "cat");
  const items = identifiedRecords(rawItems, "item");

  const commit = (updates: Record<string, unknown>) => {
    onChange({ ...config, ...updates });
  };

  const updateCategories = (nextCategories: Record<string, unknown>[]) => {
    const validIds = new Set(
      nextCategories.map((category) => valueAsString(category.id)),
    );
    const nextItems = items.map((item) => ({
      ...item,
      categoryId: validIds.has(valueAsString(item.categoryId))
        ? valueAsString(item.categoryId)
        : "",
    }));
    commit({ categories: nextCategories, items: nextItems });
  };

  const categoryOptions = [
    { value: "", label: categories.length ? "请选择正确分类" : "请先添加分类" },
    ...categories.map((category, index) => ({
      value: valueAsString(category.id),
      label: valueAsString(category.name).trim() || `分类 ${index + 1}`,
    })),
  ];
  const categoryIds = new Set(
    categories.map((category) => valueAsString(category.id)),
  );

  return (
    <div className="space-y-3">
      <LabeledField
        label="活动标题"
        value={valueAsString(config.title)}
        onChange={(title) => commit({ title })}
        placeholder="例如：把卡片拖到正确分类"
      />

      <EditorSection title="分类篮" meta={`${categories.length}/6 个`}>
        <IdentifiedListEditor
          value={categories}
          onChange={updateCategories}
          prefix="cat"
          singular="分类"
          addLabel="添加分类"
          maxItems={6}
          newItem={() => ({ name: "" })}
          itemTitle={(category, index) =>
            valueAsString(category.name).trim() || `分类 ${index + 1}`
          }
          renderItem={(category, index, update) => (
            <>
              <LabeledField
                label="分类名称"
                required
                value={valueAsString(category.name)}
                onChange={(name) => update({ name })}
                error={
                  valueAsString(category.name).trim()
                    ? undefined
                    : "分类名称不能为空"
                }
              />
              <ColorField
                label="分类颜色"
                value={category.color}
                fallback={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                onChange={(color) => update({ color })}
              />
            </>
          )}
        />
      </EditorSection>

      <EditorSection title="待分类卡片" meta={`${items.length}/24 张`}>
        <IdentifiedListEditor
          value={items}
          onChange={(nextItems) => commit({ categories, items: nextItems })}
          prefix="item"
          singular="卡片"
          addLabel="添加待分类卡片"
          maxItems={24}
          newItem={() => ({
            text: "",
            categoryId: categories.length
              ? valueAsString(categories[0].id)
              : "",
          })}
          itemTitle={(item, index) =>
            valueAsString(item.text).trim() || `卡片 ${index + 1}`
          }
          renderItem={(item, _index, update) => (
            <>
              <LabeledField
                label="卡片内容"
                required
                value={valueAsString(item.text)}
                onChange={(text) => update({ text })}
                error={
                  valueAsString(item.text).trim()
                    ? undefined
                    : "卡片内容不能为空"
                }
              />
              <SelectField
                label="正确分类"
                value={
                  categoryIds.has(valueAsString(item.categoryId))
                    ? valueAsString(item.categoryId)
                    : ""
                }
                onChange={(categoryId) => update({ categoryId })}
                options={categoryOptions}
                hint={
                  categoryIds.has(valueAsString(item.categoryId))
                    ? undefined
                    : "必须为卡片选择一个正确分类"
                }
              />
            </>
          )}
        />
      </EditorSection>
    </div>
  );
}
