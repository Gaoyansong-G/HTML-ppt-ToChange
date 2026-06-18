import type { Element } from '@courseware/shared';
import { DEFAULT_SLIDE_SIZE } from '@courseware/shared';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  Lock,
  Unlock,
} from 'lucide-react';
import { useState } from 'react';

interface GeometrySectionProps {
  geometry: Element['geometry'];
  onChange: (updates: Partial<Element['geometry']>) => void;
  onDistribute?: (axis: 'horizontal' | 'vertical') => void;
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-slate-500">{label}</label>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
      />
    </div>
  );
}

export function GeometrySection({ geometry, onChange, onDistribute }: GeometrySectionProps) {
  const [locked, setLocked] = useState(false);

  const handleWidthChange = (w: number) => {
    if (locked) {
      const ratio = geometry.height / geometry.width;
      onChange({ width: w, height: Math.round(w * ratio) });
    } else {
      onChange({ width: w });
    }
  };

  const handleHeightChange = (h: number) => {
    if (locked) {
      const ratio = geometry.width / geometry.height;
      onChange({ height: h, width: Math.round(h * ratio) });
    } else {
      onChange({ height: h });
    }
  };

  const align = (position: string) => {
    const { width, height } = geometry;
    let x = geometry.x;
    let y = geometry.y;
    if (position === 'left') x = 0;
    if (position === 'center-h') x = (DEFAULT_SLIDE_SIZE.width - width) / 2;
    if (position === 'right') x = DEFAULT_SLIDE_SIZE.width - width;
    if (position === 'top') y = 0;
    if (position === 'middle') y = (DEFAULT_SLIDE_SIZE.height - height) / 2;
    if (position === 'bottom') y = DEFAULT_SLIDE_SIZE.height - height;
    onChange({ x, y });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="X" value={geometry.x} onChange={(v) => onChange({ x: v })} />
        <NumberField label="Y" value={geometry.y} onChange={(v) => onChange({ y: v })} />
        <div className="relative">
          <NumberField label="宽度" value={geometry.width} onChange={handleWidthChange} />
          <button
            onClick={() => setLocked((v) => !v)}
            title={locked ? '解锁宽高比' : '锁定宽高比'}
            className={`absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded ${
              locked ? 'text-slate-600' : 'text-slate-400'
            }`}
          >
            {locked ? <Lock size={12} /> : <Unlock size={12} />}
          </button>
        </div>
        <NumberField label="高度" value={geometry.height} onChange={handleHeightChange} />
        <NumberField
          label="旋转"
          value={geometry.rotation || 0}
          onChange={(v) => onChange({ rotation: v })}
          step={5}
        />
        <NumberField label="层级" value={geometry.zIndex} onChange={(v) => onChange({ zIndex: v })} />
      </div>

      <div className="space-y-1">
        <span className="text-xs text-slate-500">对齐画布</span>
        <div className="flex flex-wrap gap-1">
          {[
            { icon: <AlignLeft size={14} />, key: 'left', title: '左对齐' },
            { icon: <AlignCenter size={14} />, key: 'center-h', title: '水平居中' },
            { icon: <AlignRight size={14} />, key: 'right', title: '右对齐' },
            { icon: <AlignVerticalJustifyStart size={14} />, key: 'top', title: '顶部对齐' },
            { icon: <AlignVerticalJustifyCenter size={14} />, key: 'middle', title: '垂直居中' },
            { icon: <AlignVerticalJustifyEnd size={14} />, key: 'bottom', title: '底部对齐' },
          ].map((btn) => (
            <button
              key={btn.key}
              onClick={() => align(btn.key)}
              title={btn.title}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
            >
              {btn.icon}
            </button>
          ))}
        </div>
      </div>

      {onDistribute && (
        <div className="space-y-1">
          <span className="text-xs text-slate-500">整页分布（≥3 个元素）</span>
          <div className="flex gap-1">
            <button
              onClick={() => onDistribute('horizontal')}
              title="水平等距分布"
              className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
            >
              <AlignLeft size={12} /> 水平分布
            </button>
            <button
              onClick={() => onDistribute('vertical')}
              title="垂直等距分布"
              className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
            >
              <AlignVerticalJustifyStart size={12} /> 垂直分布
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
