import {
  LabeledField,
  StringListEditor,
  asRecord,
  valueAsString,
} from "./shared";

const MAX_LINES = 8;

export function PoemSlotEditor({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const poem = asRecord(value);
  const commit = (updates: Record<string, unknown>) => {
    onChange({ ...poem, ...updates });
  };

  const title = valueAsString(poem.title);
  const author = valueAsString(poem.author);

  return (
    <div className="space-y-3">
      <LabeledField
        label="诗词标题"
        required
        value={title}
        onChange={(nextValue) => commit({ title: nextValue })}
        placeholder="例如：静夜思"
        error={title.trim() ? undefined : "诗词标题不能为空"}
      />
      <div className="grid grid-cols-2 gap-2">
        <LabeledField
          label="作者"
          required
          value={author}
          onChange={(nextValue) => commit({ author: nextValue })}
          placeholder="例如：李白"
          error={author.trim() ? undefined : "作者不能为空"}
        />
        <LabeledField
          label="朝代"
          value={valueAsString(poem.dynasty)}
          onChange={(nextValue) => commit({ dynasty: nextValue })}
          placeholder="例如：唐"
        />
      </div>

      <section className="space-y-2 border-t border-slate-200 pt-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-slate-700">诗句</h4>
          <span className="text-[10px] text-slate-400">
            {Array.isArray(poem.lines) ? poem.lines.length : 0}/{MAX_LINES} 行
          </span>
        </div>
        <StringListEditor
          value={poem.lines}
          onChange={(lines) => commit({ lines })}
          itemLabel="诗句"
          addLabel="添加诗句"
          maxItems={MAX_LINES}
          placeholder="一行填写一句，不需要输入斜杠分隔"
        />
      </section>

      <LabeledField
        label="译文"
        multiline
        rows={4}
        value={valueAsString(poem.translation)}
        onChange={(nextValue) => commit({ translation: nextValue })}
        placeholder="用现代汉语解释诗句（可选）"
      />
      <LabeledField
        label="赏析"
        multiline
        rows={4}
        value={valueAsString(poem.appreciation)}
        onChange={(nextValue) => commit({ appreciation: nextValue })}
        placeholder="写作手法、情感或课堂讲解重点（可选）"
      />
    </div>
  );
}
