import { Copy, Trash2, ArrowUpToLine, ArrowDownToLine } from 'lucide-react';
import type { Element } from '@courseware/shared';

interface FloatingToolbarProps {
  element: Element;
  layer: number;
  onDuplicate: () => void;
  onDelete: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
}

const SLIDE_WIDTH = 1280;
const SLIDE_HEIGHT = 720;
const TOOLBAR_HALF_WIDTH = 88;
const TOOLBAR_HEIGHT = 38;
const TOOLBAR_GAP = 12;

export function FloatingToolbar({
  element,
  layer,
  onDuplicate,
  onDelete,
  onBringToFront,
  onSendToBack,
}: FloatingToolbarProps) {
  const { x, y, width, height } = element.geometry;
  const centerX = Math.max(
    TOOLBAR_HALF_WIDTH,
    Math.min(SLIDE_WIDTH - TOOLBAR_HALF_WIDTH, x + width / 2),
  );
  const canPlaceAbove = y >= TOOLBAR_HEIGHT + TOOLBAR_GAP;
  const canPlaceBelow = y + height + TOOLBAR_GAP + TOOLBAR_HEIGHT <= SLIDE_HEIGHT;
  const top = canPlaceAbove
    ? y - TOOLBAR_GAP
    : canPlaceBelow
      ? y + height + TOOLBAR_GAP
      : Math.max(8, Math.min(SLIDE_HEIGHT - TOOLBAR_HEIGHT - 8, y + 8));
  const translateY = canPlaceAbove ? '-100%' : '0';

  return (
    <div
      className="pointer-events-auto absolute flex -translate-x-1/2 items-center gap-1 rounded-xl border border-white/60 bg-white/90 px-1.5 py-1 shadow-lg shadow-slate-900/10 backdrop-blur-md"
      style={{
        left: centerX,
        top,
        transform: `translate(-50%, ${translateY})`,
        zIndex: layer,
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
