import { RecordListSlotEditor } from "./RecordListSlotEditor";
import {
  LabeledField,
  StringListEditor,
  asRecord,
  valueAsString,
} from "./shared";

const MAX_MATERIALS = 6;
const MAX_STEPS = 6;

export function ExperimentSlotEditor({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const experiment = asRecord(value);
  const commit = (updates: Record<string, unknown>) => {
    onChange({ ...experiment, ...updates });
  };
  const name = valueAsString(experiment.name);

  return (
    <div className="space-y-3">
      <LabeledField
        label="实验名称"
        required
        value={name}
        onChange={(nextValue) => commit({ name: nextValue })}
        placeholder="例如：观察水的沸腾"
        error={name.trim() ? undefined : "实验名称不能为空"}
      />

      <section className="space-y-2 border-t border-slate-200 pt-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-slate-700">实验器材</h4>
          <span className="text-[10px] text-slate-400">
            {Array.isArray(experiment.materials)
              ? experiment.materials.length
              : 0}
            /{MAX_MATERIALS} 项
          </span>
        </div>
        <StringListEditor
          value={experiment.materials}
          onChange={(materials) => commit({ materials })}
          itemLabel="器材"
          addLabel="添加器材"
          maxItems={MAX_MATERIALS}
          placeholder="例如：烧杯"
        />
      </section>

      <section className="space-y-2 border-t border-slate-200 pt-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-slate-700">实验步骤</h4>
          <span className="text-[10px] text-slate-400">
            {Array.isArray(experiment.steps) ? experiment.steps.length : 0}/
            {MAX_STEPS} 步
          </span>
        </div>
        <RecordListSlotEditor
          type="steps"
          slotKey="steps"
          value={experiment.steps}
          onChange={(steps) => commit({ steps })}
          maxItems={MAX_STEPS}
        />
      </section>

      <LabeledField
        label="观察记录"
        multiline
        rows={4}
        value={valueAsString(experiment.observation)}
        onChange={(nextValue) => commit({ observation: nextValue })}
        placeholder="描述实验中观察到的现象"
      />
      <LabeledField
        label="实验结论"
        multiline
        rows={4}
        value={valueAsString(experiment.conclusion)}
        onChange={(nextValue) => commit({ conclusion: nextValue })}
        placeholder="概括实验得出的结论"
      />
    </div>
  );
}
