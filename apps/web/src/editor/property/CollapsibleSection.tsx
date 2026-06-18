import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function CollapsibleSection({ title, children, defaultOpen = true }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 shadow-sm">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left transition hover:bg-slate-50/80"
      >
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</span>
        {isOpen ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
      </button>
      {isOpen && <div className="border-t border-slate-100 px-3 pb-3 pt-2">{children}</div>}
    </div>
  );
}
