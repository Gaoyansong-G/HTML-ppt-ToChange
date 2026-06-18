import { Copy, Trash2, ArrowUpToLine, ArrowDownToLine } from 'lucide-react';
import type { Element } from '@courseware/shared';

interface FloatingToolbarProps {
  element: Element;
  onDuplicate: () => void;
  onDelete: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
}

export function FloatingToolbar({
  element,
  onDuplicate,
  onDelete,
  onBringToFront,
  onSendToBack,
}: FloatingToolbarProps) {
  const { x, y, width, height } = element.geometry;
  const placeBelow = y < 56;

  return (
    <div
      className="pointer-events-auto absolute flex -translate-x-1/2 items-center gap-1 rounded-xl border border-white/60 bg-white/90 px-1.5 py-1 shadow-lg shadow-slate-900/10 backdrop-blur-md"
      style={{
        left: x + width / 2,
        top: placeBelow ? y + height + 12 : y - 12,
        transform: `translate(-50%, ${placeBelow ? '0' : '-100%'})`,
        zIndex: 9999,
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        onClick={onDuplicate}
        title="复制"
        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 transition hover:bg-blue-50 hover:text-blue-600"
      >
        <Copy size={14} />
      </button>
      <button
        onClick={onDelete}
        title="删除"
        className="flex h-7 w-7 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50"
      >
        <Trash2 size={14} />
      </button>
      <div className="mx-1 h-4 w-px bg-slate-200" />
      <button
        onClick={onBringToFront}
        title="置顶"
        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 transition hover:bg-blue-50 hover:text-blue-600"
      >
        <ArrowUpToLine size={14} />
      </button>
      <button
        onClick={onSendToBack}
        title="置底"
        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 transition hover:bg-blue-50 hover:text-blue-600"
      >
        <ArrowDownToLine size={14} />
      </button>
    </div>
  );
}
