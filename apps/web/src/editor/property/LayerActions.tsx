import { Copy, Trash2, ArrowUpToLine, ArrowDownToLine } from 'lucide-react';

interface LayerActionsProps {
  onDuplicate: () => void;
  onDelete: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
}

export function LayerActions({
  onDuplicate,
  onDelete,
  onBringToFront,
  onSendToBack,
}: LayerActionsProps) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-slate-200/80 bg-white/90 p-0.5 shadow-sm backdrop-blur-sm">
      <button
        onClick={onDuplicate}
        title="复制 (Ctrl+D)"
        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
      >
        <Copy size={14} />
      </button>
      <button
        onClick={onDelete}
        title="删除 (Delete)"
        className="flex h-7 w-7 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50"
      >
        <Trash2 size={14} />
      </button>
      <div className="mx-0.5 h-4 w-px bg-slate-200" />
      <button
        onClick={onBringToFront}
        title="置顶 (Ctrl+])"
        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
      >
        <ArrowUpToLine size={14} />
      </button>
      <button
        onClick={onSendToBack}
        title="置底 (Ctrl+[)"
        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
      >
        <ArrowDownToLine size={14} />
      </button>
    </div>
  );
}
