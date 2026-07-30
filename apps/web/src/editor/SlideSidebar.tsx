import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEditorStore } from '../stores/editor.store';
import { useHistoryStore } from '../stores/history.store';
import { TEACHING_PHASE_LABELS } from '@courseware/shared';
import { Plus, Trash2, ChevronUp, ChevronDown, Layers, ListTree, Copy, ArrowUp, ArrowDown, Clock, Blocks } from 'lucide-react';
import { SlideTemplatePicker, buildSlideFromTemplate, type TemplateId } from './SlideTemplatePicker';
import { SlideThumbnail } from './SlideThumbnail';
import { ComponentsPanel } from './ComponentsPanel';

interface ContextMenuState {
  slideId: string;
  x: number;
  y: number;
}

const CONTEXT_MENU_MARGIN = 8;

export function SlideSidebar() {
  const {
    courseware,
    currentSlideId,
    addSlide,
    addSlideWithElements,
    duplicateSlide,
    deleteSlide,
    setCurrentSlide,
    moveSlide,
  } = useEditorStore();
  const { record } = useHistoryStore();
  const [showPicker, setShowPicker] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'slides' | 'outline' | 'components'>('slides');

  const currentIndex = courseware.slides.findIndex((s) => s.id === currentSlideId);
  const canDeleteSlide = courseware.slides.length > 1;

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  useEffect(() => {
    if (!contextMenu) return;

    const handlePointerDown = (event: MouseEvent) => {
      const menu = contextMenuRef.current;
      const path = event.composedPath();
      if (menu && (path.includes(menu) || menu.contains(event.target as Node))) return;
      setContextMenu(null);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setContextMenu(null);
    };
    const handleViewportChange = () => setContextMenu(null);

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [contextMenu]);

  useLayoutEffect(() => {
    if (!contextMenu || !contextMenuRef.current) return;

    const menu = contextMenuRef.current;
    const rect = menu.getBoundingClientRect();
    const maxX = Math.max(CONTEXT_MENU_MARGIN, window.innerWidth - rect.width - CONTEXT_MENU_MARGIN);
    const maxY = Math.max(CONTEXT_MENU_MARGIN, window.innerHeight - rect.height - CONTEXT_MENU_MARGIN);
    const x = Math.min(Math.max(CONTEXT_MENU_MARGIN, contextMenu.x), maxX);
    const y = Math.min(Math.max(CONTEXT_MENU_MARGIN, contextMenu.y), maxY);

    if (x !== contextMenu.x || y !== contextMenu.y) {
      setContextMenu((current) => (current ? { ...current, x, y } : current));
      return;
    }

    menu.focus({ preventScroll: true });
  }, [contextMenu]);

  const handleDragStart = (e: React.DragEvent, slideId: string) => {
    setDraggingId(slideId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', slideId);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (targetId === draggingId) {
      setDropTargetId(null);
      return;
    }
    setDropTargetId(targetId);
  };

  const handleDragLeave = () => {
    setDropTargetId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggingId;
    setDraggingId(null);
    setDropTargetId(null);
    if (!sourceId || sourceId === targetId) return;

    const fromIndex = courseware.slides.findIndex((s) => s.id === sourceId);
    const toIndex = courseware.slides.findIndex((s) => s.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    record(courseware);
    moveSlide(fromIndex, toIndex);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDropTargetId(null);
  };

  const handleAddSlide = () => {
    setShowPicker(true);
  };

  const handleSelectTemplate = (templateId: TemplateId) => {
    setShowPicker(false);
    record(courseware);
    const partial = buildSlideFromTemplate(templateId);
    if (templateId === 'blank') {
      addSlide(currentIndex);
    } else {
      addSlideWithElements({
        id: '',
        order: 0,
        title: partial.title || '新页面',
        layout: partial.layout || { templateId: 'blank', variant: 'default', constraints: [] },
        background: { color: '#ffffff' },
        elements: partial.elements || [],
        transition: { type: 'fade', duration: 0.8, easing: 'power2.inOut' },
        timeline: { autoPlay: true },
      });
    }
  };

  const handleDeleteSlide = (id: string) => {
    if (!canDeleteSlide) return;
    const slide = courseware.slides.find((item) => item.id === id);
    if (
      slide &&
      !window.confirm(
        slide.elements.length > 0
          ? `确定删除“${slide.title || '未命名页面'}”及其中 ${slide.elements.length} 个元素吗？`
          : `确定删除“${slide.title || '未命名页面'}”吗？`,
      )
    ) {
      return;
    }
    record(courseware);
    deleteSlide(id);
  };

  const handleDuplicateSlide = (id: string) => {
    record(courseware);
    duplicateSlide(id);
  };

  const handleContextMenu = (e: React.MouseEvent, slideId: string) => {
    e.preventDefault();
    setContextMenu({ slideId, x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => setContextMenu(null);

  const handleMoveUp = () => {
    if (currentIndex <= 0) return;
    record(courseware);
    moveSlide(currentIndex, currentIndex - 1);
  };

  const handleMoveDown = () => {
    if (currentIndex < 0 || currentIndex >= courseware.slides.length - 1) return;
    record(courseware);
    moveSlide(currentIndex, currentIndex + 1);
  };

  return (
    <div className="flex h-full flex-col bg-white/30">
      <div className="flex items-center justify-between border-b border-white/60 bg-white/80 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-1 rounded-xl bg-slate-100/80 p-1">
          <button
            onClick={() => setActiveTab('slides')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
              activeTab === 'slides'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers size={13} />
            页面
            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
              {courseware.slides.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('outline')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
              activeTab === 'outline'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ListTree size={13} />
            大纲
          </button>
          <button
            onClick={() => setActiveTab('components')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
              activeTab === 'components'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Blocks size={13} />
            组件
          </button>
        </div>
        {activeTab === 'slides' && (
          <div className="flex gap-1">
            <button
              onClick={handleMoveUp}
              disabled={currentIndex <= 0}
              title="上移"
              className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30"
            >
              <ChevronUp size={16} />
            </button>
            <button
              onClick={handleMoveDown}
              disabled={currentIndex < 0 || currentIndex >= courseware.slides.length - 1}
              title="下移"
              className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30"
            >
              <ChevronDown size={16} />
            </button>
            <button
              onClick={handleAddSlide}
              title="新增页面"
              className="rounded-lg bg-slate-900 p-1.5 text-white shadow-sm transition hover:bg-slate-800"
            >
              <Plus size={16} />
            </button>
          </div>
        )}
      </div>

      {activeTab === 'components' ? (
        <div className="flex-1 overflow-y-auto p-3">
          <ComponentsPanel />
        </div>
      ) : activeTab === 'outline' ? (
        <div className="flex-1 overflow-y-auto p-3">
          <OutlineView />
        </div>
      ) : (
      <div className="flex-1 overflow-y-auto p-3">
        {courseware.slides.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 shadow-inner">
              <svg width="40" height="40" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="8" y="8" width="48" height="30" rx="4" stroke="#94a3b8" strokeWidth="2" />
                <rect x="16" y="16" width="20" height="4" rx="2" fill="#cbd5e1" />
                <rect x="16" y="24" width="32" height="3" rx="1.5" fill="#e2e8f0" />
                <circle cx="32" cy="50" r="8" fill="#3b82f6" />
                <path d="M32 46v8M28 50h8" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-sm text-slate-500">暂无页面<br />点击右上角 + 新建</p>
          </div>
        ) : (
          <div className="space-y-3">
            {courseware.slides.map((slide, index) => (
              <div key={`wrapper-${slide.id}`}>
                {dropTargetId === slide.id && draggingId !== slide.id && (
                  <div className="mb-2 h-1 w-full rounded-full bg-slate-400" />
                )}
                <div
                  key={slide.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, slide.id)}
                  onDragOver={(e) => handleDragOver(e, slide.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, slide.id)}
                  onDragEnd={handleDragEnd}
                  data-testid="slide-thumbnail"
                  role="button"
                  tabIndex={0}
                  aria-current={slide.id === currentSlideId ? 'page' : undefined}
                  aria-label={`第 ${index + 1} 页：${slide.title || '未命名页面'}`}
                  onClick={() => setCurrentSlide(slide.id)}
                  onKeyDown={(event) => {
                    if (
                      event.target === event.currentTarget &&
                      (event.key === 'Enter' || event.key === ' ')
                    ) {
                      event.preventDefault();
                      setCurrentSlide(slide.id);
                    }
                  }}
                  onContextMenu={(e) => handleContextMenu(e, slide.id)}
                  className={`group relative cursor-pointer rounded-xl border p-2 transition-all hover:-translate-y-0.5 ${
                    slide.id === currentSlideId
                      ? 'border-slate-900 bg-white shadow-md ring-1 ring-slate-900/20'
                      : 'border-slate-200 bg-white hover:border-slate-400 hover:shadow-md'
                  } ${draggingId === slide.id ? 'opacity-40' : ''}`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="rounded-md bg-gradient-to-br from-slate-100 to-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                      {index + 1}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSlide(slide.id);
                      }}
                      disabled={!canDeleteSlide}
                      title={canDeleteSlide ? '删除页面' : '课件至少保留一页'}
                      className="rounded p-1 text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus:opacity-100 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <SlideThumbnail slide={slide} assets={courseware.assets} />
                  <div className="truncate px-1 text-xs font-medium text-slate-700">
                    {slide.title || '未命名页面'}
                  </div>
                </div>
              </div>
            ))}
          </div>
      )}
      </div>
      )}

      {contextMenu &&
        createPortal(
        <div
          ref={contextMenuRef}
          role="menu"
          aria-label="页面操作"
          tabIndex={-1}
          className="fixed z-[60] w-40 overflow-hidden rounded-xl border border-white/70 bg-white/95 py-1 shadow-xl backdrop-blur-sm outline-none"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              handleDuplicateSlide(contextMenu.slideId);
              closeContextMenu();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
          >
            <Copy size={14} /> 复制页面
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              const idx = courseware.slides.findIndex((s) => s.id === contextMenu.slideId);
              if (idx > 0) {
                record(courseware);
                moveSlide(idx, idx - 1);
              }
              closeContextMenu();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowUp size={14} /> 上移
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              const idx = courseware.slides.findIndex((s) => s.id === contextMenu.slideId);
              if (idx >= 0 && idx < courseware.slides.length - 1) {
                record(courseware);
                moveSlide(idx, idx + 1);
              }
              closeContextMenu();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowDown size={14} /> 下移
          </button>
          <div className="my-1 h-px bg-slate-100" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              handleDeleteSlide(contextMenu.slideId);
              closeContextMenu();
            }}
            disabled={!canDeleteSlide}
            title={canDeleteSlide ? '删除页面' : '课件至少保留一页'}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
          >
            <Trash2 size={14} /> 删除页面
          </button>
        </div>,
        document.body,
      )}

      <SlideTemplatePicker
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={handleSelectTemplate}
      />
    </div>
  );
}

/**
 * 大纲视图：按教学环节（phase）分组展示 teachingScript 的页面列表。
 * script page 与 slide 的对应关系：优先按 id 匹配（装配器中 slide.id === page.id），
 * 匹配不到则回退按全局序号（第 N 个 script page ↔ slides[N-1]）。
 */
function OutlineView() {
  const { courseware, currentSlideId, setCurrentSlide } = useEditorStore();
  const script = courseware.teachingScript;

  if (!script) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <ListTree size={32} className="text-slate-300" />
        <p className="text-sm text-slate-500">本课件无教学设计信息（旧版课件）</p>
      </div>
    );
  }

  let pageIndex = 0;

  return (
    <div className="space-y-3">
      {script.phases.map((phase, phaseIndex) => (
        <div
          key={phaseIndex}
          className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-3 py-2">
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-700">
                {TEACHING_PHASE_LABELS[phase.phase] || phase.phase}
              </span>
              {phase.title && (
                <span className="ml-1.5 truncate text-xs text-slate-500">{phase.title}</span>
              )}
            </div>
            <span className="flex shrink-0 items-center gap-0.5 text-[10px] font-medium text-slate-400">
              <Clock size={10} />
              {phase.durationMin} 分钟
            </span>
          </div>
          <div className="divide-y divide-slate-50">
            {phase.pages.map((page) => {
              const globalIndex = pageIndex++;
              const slide =
                courseware.slides.find((s) => s.id === page.id) ??
                courseware.slides[globalIndex];
              const active = slide != null && slide.id === currentSlideId;
              return (
                <button
                  key={page.id}
                  onClick={() => slide && setCurrentSlide(slide.id)}
                  disabled={!slide}
                  title={page.intent}
                  className={`flex w-full items-start gap-2 px-3 py-2 text-left transition ${
                    active
                      ? 'bg-slate-900/5'
                      : slide
                        ? 'hover:bg-slate-50'
                        : 'cursor-default opacity-50'
                  }`}
                >
                  <span
                    className={`mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                      active
                        ? 'bg-slate-900 text-white'
                        : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500'
                    }`}
                  >
                    {globalIndex + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-slate-700">
                      {page.intent || slide?.title || '未命名页面'}
                    </span>
                    <span className="block truncate text-[10px] text-slate-400">
                      建议版式：{page.suggestedBlock}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
