import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Palette } from 'lucide-react';
import { ALL_THEMES, resolveTheme } from '@courseware/shared';
import { useEditorStore } from '../stores/editor.store';
import { useHistoryStore } from '../stores/history.store';

/**
 * 一键换主题：展示 ALL_THEMES 全部主题的色板预览，
 * 点击后整体替换 courseware.designSystem（走 record + setCourseware，可撤销）。
 */
export function ThemePicker() {
  const { courseware, setCourseware } = useEditorStore();
  const { record } = useHistoryStore();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentThemeId = courseware.designSystem?.id;
  const currentThemeName = courseware.designSystem?.name || '默认教学风格';
  const [pos, setPos] = useState({ top: 0, right: 0 });

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const path = event.composedPath();
      const target = event.target instanceof Node ? event.target : null;
      const isInside = [rootRef.current, menuRef.current].some(
        (node) => node && (path.includes(node) || (target != null && node.contains(target))),
      );
      if (!isInside) setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleSelect = (themeId: string) => {
    if (themeId === currentThemeId) {
      setOpen(false);
      return;
    }
    record(courseware);
    setCourseware({
      ...courseware,
      designSystem: resolveTheme(themeId, courseware.gradeLevel || 'unknown'),
    });
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={(e) => {
          if (!open) {
            // fixed 定位锚定按钮，避免祖先 transform/overflow 造成错位
            const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
            setPos({ top: rect.bottom + 8, right: Math.max(8, window.innerWidth - rect.right) });
          }
          setOpen((v) => !v);
        }}
        title="更换主题"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-white/80 hover:text-slate-900"
      >
        <Palette size={16} />
        <span className="hidden max-w-28 truncate md:inline">{currentThemeName}</span>
      </button>

      {open &&
        createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label="选择课件主题"
          className="fixed z-[60] w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-2xl"
          style={{ top: pos.top, right: pos.right }}
        >
          <div className="px-2 pb-2 pt-1 text-xs font-bold uppercase tracking-wider text-slate-400">
            选择主题（{Object.keys(ALL_THEMES).length} 套）
          </div>
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {Object.values(ALL_THEMES).map((theme) => {
              const active = theme.id === currentThemeId;
              const colors = theme.tokens.colors;
              return (
                <button
                  key={theme.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => handleSelect(theme.id)}
                  className={`flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition ${
                    active
                      ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900/20'
                      : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {/* 色板预览：primary / background / accent */}
                  <span className="flex shrink-0 overflow-hidden rounded-md border border-slate-200 shadow-sm">
                    {[colors.primary, colors.background, colors.accent].map((color, i) => (
                      <span
                        key={i}
                        className="h-6 w-4"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
                    {theme.name}
                  </span>
                  {active && <Check size={14} className="shrink-0 text-slate-900" />}
                </button>
              );
            })}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
