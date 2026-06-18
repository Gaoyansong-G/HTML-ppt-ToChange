import { useState, useEffect } from 'react';
import { useEditorStore } from '../stores/editor.store';
import { useHistoryStore } from '../stores/history.store';
import { Plus, Trash2, ChevronUp, ChevronDown, Layers, Copy, ArrowUp, ArrowDown } from 'lucide-react';
import { SlideTemplatePicker, buildSlideFromTemplate, type TemplateId } from './SlideTemplatePicker';
import { SlideThumbnail } from './SlideThumbnail';

interface ContextMenuState {
  slideId: string;
  x: number;
  y: number;
}

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

  const currentIndex = courseware.slides.findIndex((s) => s.id === currentSlideId);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
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
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Layers size={16} className="text-slate-600" />
          <span className="bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">页面</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
            {courseware.slides.length}
          </span>
        </div>
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
      </div>

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
                  onClick={() => setCurrentSlide(slide.id)}
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
                      title="删除页面"
                      className="rounded p-1 text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
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

      {contextMenu && (
        <div
          className="fixed z-50 w-40 overflow-hidden rounded-xl border border-white/70 bg-white/95 py-1 shadow-xl backdrop-blur-sm"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              handleDuplicateSlide(contextMenu.slideId);
              closeContextMenu();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
          >
            <Copy size={14} /> 复制页面
          </button>
          <button
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
            onClick={() => {
              handleDeleteSlide(contextMenu.slideId);
              closeContextMenu();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
          >
            <Trash2 size={14} /> 删除页面
          </button>
        </div>
      )}

      <SlideTemplatePicker
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={handleSelectTemplate}
      />
    </div>
  );
}
