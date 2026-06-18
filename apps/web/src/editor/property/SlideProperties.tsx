import type { Slide } from '@courseware/shared';

interface SlidePropertiesProps {
  slide: Slide;
  onChange: (updates: Partial<Slide>) => void;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-slate-500">{label}</label>
      {children}
    </div>
  );
}

export function SlideProperties({ slide, onChange }: SlidePropertiesProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-lg bg-slate-50 p-3">
        <Field label="页面标题">
          <input
            type="text"
            value={slide.title || ''}
            onChange={(e) => onChange({ title: e.target.value })}
            className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-slate-500 focus:outline-none"
          />
        </Field>

        <Field label="教学目标">
          <textarea
            value={slide.learningObjective || ''}
            onChange={(e) => onChange({ learningObjective: e.target.value })}
            placeholder="描述本页教学目标"
            className="min-h-[80px] w-full rounded border border-slate-300 p-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </Field>
      </div>

      <div className="space-y-3 rounded-lg bg-slate-50 p-3">
        <Field label="背景颜色">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={slide.background.color || '#ffffff'}
              onChange={(e) => onChange({ background: { ...slide.background, color: e.target.value } })}
              className="h-8 w-8 cursor-pointer rounded border border-slate-300"
            />
            <input
              type="text"
              value={slide.background.color || '#ffffff'}
              onChange={(e) => onChange({ background: { ...slide.background, color: e.target.value } })}
              className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
        </Field>
      </div>

      <div className="space-y-3 rounded-lg bg-slate-50 p-3">
        <Field label="转场类型">
          <select
            value={slide.transition.type}
            onChange={(e) => onChange({ transition: { ...slide.transition, type: e.target.value as Slide['transition']['type'] } })}
            className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-slate-500 focus:outline-none"
          >
            <option value="fade">淡入</option>
            <option value="slide">滑动</option>
            <option value="zoom">缩放</option>
            <option value="flip">翻转</option>
            <option value="wipe">擦除</option>
            <option value="parallax">视差</option>
          </select>
        </Field>

        <Field label="转场时长（秒）">
          <input
            type="number"
            step={0.1}
            min={0}
            max={10}
            value={slide.transition.duration}
            onChange={(e) => onChange({ transition: { ...slide.transition, duration: Number(e.target.value) } })}
            className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-slate-500 focus:outline-none"
          />
        </Field>
      </div>
    </div>
  );
}
