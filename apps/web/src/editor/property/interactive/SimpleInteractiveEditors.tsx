import {
  LabeledField,
  StringListEditor,
  valueAsString,
} from "../structured/shared";
import {
  ColorField,
  EditorSection,
  IdentifiedListEditor,
  NumberField,
  ToggleField,
  identifiedRecords,
  type ConfigEditorProps,
} from "./shared";

const TEAM_COLORS = [
  "#2563eb",
  "#e11d48",
  "#059669",
  "#d97706",
  "#7c3aed",
  "#0891b2",
];

function withConfig(
  config: Record<string, unknown>,
  onChange: (config: Record<string, unknown>) => void,
) {
  return (updates: Record<string, unknown>) =>
    onChange({ ...config, ...updates });
}

export function MatchingConfigEditor({ config, onChange }: ConfigEditorProps) {
  const commit = withConfig(config, onChange);
  const pairs = Array.isArray(config.pairs) ? config.pairs : [];
  return (
    <div className="space-y-3">
      <LabeledField
        label="活动标题"
        value={valueAsString(config.title)}
        onChange={(title) => commit({ title })}
        placeholder="例如：把词语与解释连起来"
      />
      <EditorSection title="配对内容" meta={`${pairs.length}/8 组`}>
        <IdentifiedListEditor
          value={pairs}
          onChange={(nextPairs) => commit({ pairs: nextPairs })}
          prefix="pair"
          singular="配对"
          addLabel="添加一组配对"
          maxItems={8}
          newItem={() => ({ left: "", right: "" })}
          itemTitle={(item, index) =>
            valueAsString(item.left).trim() || `配对 ${index + 1}`
          }
          renderItem={(item, _index, update) => (
            <>
              <LabeledField
                label="左侧内容"
                required
                value={valueAsString(item.left)}
                onChange={(left) => update({ left })}
                error={
                  valueAsString(item.left).trim()
                    ? undefined
                    : "左侧内容不能为空"
                }
              />
              <LabeledField
                label="右侧内容"
                required
                value={valueAsString(item.right)}
                onChange={(right) => update({ right })}
                error={
                  valueAsString(item.right).trim()
                    ? undefined
                    : "右侧内容不能为空"
                }
              />
            </>
          )}
        />
      </EditorSection>
    </div>
  );
}

export function OrderingConfigEditor({ config, onChange }: ConfigEditorProps) {
  const commit = withConfig(config, onChange);
  const rawItems = Array.isArray(config.items) ? config.items : [];
  const items = identifiedRecords(rawItems, "order");
  const byId = new Map(items.map((item) => [valueAsString(item.id), item]));
  const requestedOrder = Array.isArray(config.correctOrder)
    ? config.correctOrder.map(valueAsString)
    : [];
  const used = new Set<string>();
  const orderedItems = requestedOrder.flatMap((id) => {
    const item = byId.get(id);
    if (!item || used.has(id)) return [];
    used.add(id);
    return [item];
  });
  items.forEach((item) => {
    const id = valueAsString(item.id);
    if (!used.has(id)) orderedItems.push(item);
  });

  return (
    <div className="space-y-3">
      <LabeledField
        label="活动标题"
        value={valueAsString(config.title)}
        onChange={(title) => commit({ title })}
        placeholder="例如：把实验步骤排成正确顺序"
      />
      <EditorSection title="正确顺序" meta={`${items.length}/10 项`}>
        <p className="rounded-lg bg-blue-50 px-2.5 py-2 text-[11px] leading-relaxed text-blue-700">
          编辑器中的排列就是标准答案。学生端会自动打乱，调整顺序不会暴露答案。
        </p>
        <IdentifiedListEditor
          value={orderedItems}
          onChange={(nextItems) =>
            commit({
              items: nextItems,
              correctOrder: nextItems.map((item) => valueAsString(item.id)),
            })
          }
          prefix="step"
          singular="排序项"
          addLabel="添加排序项"
          maxItems={10}
          newItem={() => ({ text: "" })}
          itemTitle={(item, index) =>
            valueAsString(item.text).trim() || `排序项 ${index + 1}`
          }
          renderItem={(item, _index, update) => (
            <LabeledField
              label="内容"
              required
              multiline
              rows={2}
              value={valueAsString(item.text)}
              onChange={(text) => update({ text })}
              error={
                valueAsString(item.text).trim() ? undefined : "排序内容不能为空"
              }
            />
          )}
        />
      </EditorSection>
    </div>
  );
}

export function TimerConfigEditor({ config, onChange }: ConfigEditorProps) {
  const commit = withConfig(config, onChange);
  const rawSeconds =
    typeof config.seconds === "number"
      ? config.seconds
      : Number(config.seconds);
  const total = Number.isFinite(rawSeconds) ? Math.round(rawSeconds) : 0;
  const minutes = Math.max(0, Math.floor(total / 60));
  const seconds = Math.max(0, total % 60);
  const durationError =
    total <= 0
      ? "倒计时必须大于 0 秒"
      : total > 3599
        ? "倒计时不能超过 59 分 59 秒"
        : undefined;

  const setDuration = (nextMinutes: number, nextSeconds: number) => {
    const safeMinutes = Math.min(59, Math.max(0, Math.round(nextMinutes || 0)));
    const safeSeconds = Math.min(59, Math.max(0, Math.round(nextSeconds || 0)));
    commit({ seconds: safeMinutes * 60 + safeSeconds });
  };

  return (
    <div className="space-y-3">
      <LabeledField
        label="计时任务名称"
        value={valueAsString(config.label)}
        onChange={(label) => commit({ label })}
        placeholder="例如：小组讨论"
      />
      <EditorSection
        title="倒计时时长"
        meta={total > 0 ? `${minutes} 分 ${seconds} 秒` : "未设置"}
      >
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="分钟"
            value={minutes}
            min={0}
            max={59}
            suffix="分"
            onChange={(nextMinutes) => setDuration(nextMinutes, seconds)}
            error={durationError}
          />
          <NumberField
            label="秒"
            value={seconds}
            min={0}
            max={59}
            suffix="秒"
            onChange={(nextSeconds) => setDuration(minutes, nextSeconds)}
          />
        </div>
      </EditorSection>
      <ToggleField
        label="进入播放页后自动开始"
        description="关闭时由教师点击“开始”按钮。自动播放可能受课堂节奏影响。"
        checked={
          typeof config.autoStart === "boolean" ? config.autoStart : false
        }
        onChange={(autoStart) => commit({ autoStart })}
      />
    </div>
  );
}

export function ScoreboardConfigEditor({
  config,
  onChange,
}: ConfigEditorProps) {
  const commit = withConfig(config, onChange);
  const teams = Array.isArray(config.teams) ? config.teams : [];
  return (
    <div className="space-y-3">
      <LabeledField
        label="计分板标题"
        value={valueAsString(config.title)}
        onChange={(title) => commit({ title })}
        placeholder="例如：课堂积分榜"
      />
      <EditorSection title="参赛小组" meta={`${teams.length}/8 组`}>
        <IdentifiedListEditor
          value={teams}
          onChange={(nextTeams) => commit({ teams: nextTeams })}
          prefix="team"
          singular="小组"
          addLabel="添加小组"
          maxItems={8}
          newItem={() => ({ name: "" })}
          itemTitle={(item, index) =>
            valueAsString(item.name).trim() || `小组 ${index + 1}`
          }
          renderItem={(item, index, update) => (
            <>
              <LabeledField
                label="小组名称"
                required
                value={valueAsString(item.name)}
                onChange={(name) => update({ name })}
                error={
                  valueAsString(item.name).trim()
                    ? undefined
                    : "小组名称不能为空"
                }
              />
              <ColorField
                label="小组颜色"
                value={item.color}
                fallback={TEAM_COLORS[index % TEAM_COLORS.length]}
                onChange={(color) => update({ color })}
              />
            </>
          )}
        />
      </EditorSection>
    </div>
  );
}

export function PickerConfigEditor({ config, onChange }: ConfigEditorProps) {
  const commit = withConfig(config, onChange);
  const names = Array.isArray(config.names) ? config.names : [];
  return (
    <div className="space-y-3">
      <LabeledField
        label="点名器标题"
        value={valueAsString(config.title)}
        onChange={(title) => commit({ title })}
        placeholder="例如：幸运点名"
      />
      <EditorSection title="候选名单" meta={`${names.length}/60 人`}>
        <StringListEditor
          value={names}
          onChange={(nextNames) => commit({ names: nextNames })}
          itemLabel="姓名"
          addLabel="添加姓名"
          maxItems={60}
          placeholder="输入学生姓名"
        />
      </EditorSection>
    </div>
  );
}

export function CardFlipConfigEditor({ config, onChange }: ConfigEditorProps) {
  const commit = withConfig(config, onChange);
  const cards = Array.isArray(config.cards) ? config.cards : [];
  return (
    <div className="space-y-3">
      <LabeledField
        label="卡片组标题"
        value={valueAsString(config.title)}
        onChange={(title) => commit({ title })}
        placeholder="例如：知识点翻翻卡"
      />
      <EditorSection title="卡片" meta={`${cards.length}/12 张`}>
        <IdentifiedListEditor
          value={cards}
          onChange={(nextCards) => commit({ cards: nextCards })}
          prefix="card"
          singular="卡片"
          addLabel="添加卡片"
          maxItems={12}
          newItem={() => ({ front: "", back: "" })}
          itemTitle={(item, index) =>
            valueAsString(item.front).trim() || `卡片 ${index + 1}`
          }
          renderItem={(item, _index, update) => (
            <>
              <LabeledField
                label="正面"
                required
                multiline
                rows={2}
                value={valueAsString(item.front)}
                onChange={(front) => update({ front })}
                placeholder="问题、术语或提示"
                error={
                  valueAsString(item.front).trim()
                    ? undefined
                    : "卡片正面不能为空"
                }
              />
              <LabeledField
                label="背面"
                required
                multiline
                rows={3}
                value={valueAsString(item.back)}
                onChange={(back) => update({ back })}
                placeholder="答案、解释或补充信息"
                error={
                  valueAsString(item.back).trim()
                    ? undefined
                    : "卡片背面不能为空"
                }
              />
            </>
          )}
        />
      </EditorSection>
    </div>
  );
}
