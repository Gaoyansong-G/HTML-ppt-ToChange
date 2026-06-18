import { Bold, Italic, Underline } from 'lucide-react';
import type { Element } from '@courseware/shared';

interface TextStyleControlsProps {
  style: Element['style'];
  onChange: (updates: Partial<Element['style']>) => void;
}

const FONT_OPTIONS = [
  { value: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif', label: '无衬线' },
  { value: '"SimSun", "Songti SC", serif', label: '宋体' },
  { value: '"KaiTi", "Kaiti SC", serif', label: '楷体' },
  { value: '"Microsoft YaHei", "PingFang SC", sans-serif', label: '黑体' },
  { value: '"JetBrains Mono", "Fira Code", monospace', label: '等宽' },
];

const FONT_SIZE_PRESETS = [12, 14, 16, 18, 20, 24, 32, 40, 48, 56, 64];

export function TextStyleControls({ style, onChange }: TextStyleControlsProps) {
  const isBold = style.fontWeight === 700 || style.fontWeight === '700' || style.fontWeight === 'bold';
  const isItalic = style.fontStyle === 'italic';
  const isUnderline = style.textDecoration === 'underline';

  const toggleBold = () => {
    onChange({ fontWeight: isBold ? 400 : 700 });
  };

  const toggleItalic = () => {
    onChange({ fontStyle: isItalic ? undefined : 'italic' });
  };

  const toggleUnderline = () => {
    onChange({ textDecoration: isUnderline ? undefined : 'underline' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={toggleBold}
          className={`flex h-8 w-8 items-center justify-center rounded border ${
            isBold
              ? 'border-slate-500 bg-slate-100 text-slate-900'
              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
          }`}
          title="加粗"
        >
          <Bold size={14} />
        </button>
        <button
          onClick={toggleItalic}
          className={`flex h-8 w-8 items-center justify-center rounded border ${
            isItalic
              ? 'border-slate-500 bg-slate-100 text-slate-900'
              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
          }`}
          title="斜体"
        >
          <Italic size={14} />
        </button>
        <button
          onClick={toggleUnderline}
          className={`flex h-8 w-8 items-center justify-center rounded border ${
            isUnderline
              ? 'border-slate-500 bg-slate-100 text-slate-900'
              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
          }`}
          title="下划线"
        >
          <Underline size={14} />
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-500">字体</label>
        <select
          value={style.fontFamily || FONT_OPTIONS[0].value}
          onChange={(e) => onChange({ fontFamily: e.target.value })}
          className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-slate-500 focus:outline-none"
        >
          {FONT_OPTIONS.map((font) => (
            <option key={font.value} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-slate-500">字号预设</label>
        <div className="flex flex-wrap gap-1">
          {FONT_SIZE_PRESETS.map((size) => (
            <button
              key={size}
              onClick={() => onChange({ fontSize: size })}
              className={`rounded border px-2 py-0.5 text-xs ${
                style.fontSize === size
                  ? 'border-slate-500 bg-slate-100 text-slate-900'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-500">行高 {style.lineHeight ?? 1.5}</label>
        <input
          type="range"
          min={0.8}
          max={3}
          step={0.1}
          value={style.lineHeight ?? 1.5}
          onChange={(e) => onChange({ lineHeight: Number(e.target.value) })}
          className="w-full"
        />
      </div>
    </div>
  );
}
