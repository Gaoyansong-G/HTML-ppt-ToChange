import type { Element } from '@courseware/shared';

interface StyleSectionProps {
  style: Element['style'];
  onChange: (updates: Partial<Element['style']>) => void;
  showTextControls: boolean;
  children?: React.ReactNode;
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-xs text-slate-500">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-7 cursor-pointer rounded-lg border border-slate-200 shadow-sm"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
        />
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-xs text-slate-500">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-xs text-slate-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-32 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

const SHADOW_PRESETS = [
  { value: 'none', label: '无' },
  { value: '0 1px 2px rgba(0,0,0,0.1)', label: '微弱' },
  { value: '0 4px 6px -1px rgba(0,0,0,0.1)', label: '轻' },
  { value: '0 10px 15px -3px rgba(0,0,0,0.1)', label: '中' },
  { value: '0 20px 25px -5px rgba(0,0,0,0.1)', label: '重' },
];

export function StyleSection({ style, onChange, showTextControls, children }: StyleSectionProps) {
  const currentShadow = style.shadow || 'none';

  return (
    <div className="space-y-4">
      {showTextControls && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-slate-700">文字</p>
          <ColorField
            label="文字颜色"
            value={style.color || '#000000'}
            onChange={(v) => onChange({ color: v })}
          />
          <NumberField
            label="字体大小"
            value={style.fontSize || 16}
            onChange={(v) => onChange({ fontSize: v })}
          />
          <SelectField
            label="对齐"
            value={style.textAlign || 'left'}
            options={[
              { value: 'left', label: '左对齐' },
              { value: 'center', label: '居中' },
              { value: 'right', label: '右对齐' },
              { value: 'justify', label: '两端对齐' },
            ]}
            onChange={(v) => onChange({ textAlign: v as Element['style']['textAlign'] })}
          />
        </div>
      )}

      <div className="space-y-3">
        <p className="text-xs font-medium text-slate-700">填充与边框</p>
        <ColorField
          label="背景颜色"
          value={style.backgroundColor || '#ffffff'}
          onChange={(v) => onChange({ backgroundColor: v })}
        />

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="圆角"
            value={style.borderRadius || 0}
            onChange={(v) => onChange({ borderRadius: v })}
          />
          <NumberField
            label="边框宽度"
            value={style.borderWidth || 0}
            onChange={(v) => onChange({ borderWidth: v })}
          />
        </div>

        <ColorField
          label="边框颜色"
          value={style.borderColor || '#000000'}
          onChange={(v) => onChange({ borderColor: v })}
        />

        <SelectField
          label="边框样式"
          value={style.borderStyle || 'none'}
          options={[
            { value: 'none', label: '无' },
            { value: 'solid', label: '实线' },
            { value: 'dashed', label: '虚线' },
            { value: 'dotted', label: '点线' },
          ]}
          onChange={(v) => onChange({ borderStyle: v as Element['style']['borderStyle'] })}
        />
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium text-slate-700">效果</p>
        <NumberField
          label="透明度"
          value={Math.round((style.opacity ?? 1) * 100)}
          min={0}
          max={100}
          onChange={(v) => onChange({ opacity: v / 100 })}
        />

        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">阴影</label>
          <select
            value={currentShadow}
            onChange={(e) => {
              const value = e.target.value;
              onChange({ shadow: value === 'none' ? undefined : value });
            }}
            className="w-32 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
          >
            {SHADOW_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium text-slate-700">间距</p>
        <NumberField
          label="内边距"
          value={style.padding || 0}
          onChange={(v) => onChange({ padding: v })}
        />
      </div>

      {children}
    </div>
  );
}
