import { useEffect, useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Undo2,
  Redo2,
  Play,
  Home,
  Download,
  Upload,
  FileCode,
  Save,
  PanelLeft,
  PanelRight,
  LayoutTemplate,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { useEditorStore } from '../stores/editor.store';
import { useHistoryStore } from '../stores/history.store';
import { SlideSidebar } from './SlideSidebar';
import { Canvas } from './Canvas';
import { PropertyPanel } from './PropertyPanel';
import { AnimationTimeline } from './AnimationTimeline';
import { ElementToolbar } from './ElementToolbar';
import { Player } from '../player/Player';
import { AuroraBackground } from '../components/ui/AuroraBackground';
import { exportCoursewarePackage, importCoursewarePackage, downloadBlob, exportHtml } from '../lib/export';

const API_BASE = 'http://localhost:3001/api';

const DEFAULT_LEFT_WIDTH = 260;
const DEFAULT_RIGHT_WIDTH = 320;
const MIN_LEFT_WIDTH = 200;
const MAX_LEFT_WIDTH = 400;
const MIN_RIGHT_WIDTH = 240;
const MAX_RIGHT_WIDTH = 480;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function readStoredNumber(key: string, fallback: number) {
  try {
    const value = localStorage.getItem(key);
    return value ? Number(value) : fallback;
  } catch {
    return fallback;
  }
}

function readStoredBoolean(key: string, fallback: boolean) {
  try {
    const value = localStorage.getItem(key);
    return value ? value !== 'false' : fallback;
  } catch {
    return fallback;
  }
}

export function Editor() {
  const {
    courseware,
    currentSlideId,
    selectedElementId,
    selectedElementIds,
    editingElementId,
    setCourseware,
    setCurrentSlide,
    clearElementSelection,
    setEditingElement,
    deleteElement,
    deleteSelectedElements,
    duplicateElement,
    duplicateSelectedElements,
    groupSelectedElements,
    ungroupSelectedElement,
    bringToFront,
    sendToBack,
    nudgeElement,
    nudgeSelectedElements,
  } = useEditorStore();

  const { canUndo, canRedo, undo, redo, record } = useHistoryStore();

  // Record initial state
  useEffect(() => {
    record(courseware);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUndo = useCallback(() => {
    const snapshot = undo(courseware);
    if (snapshot) {
      setCourseware(snapshot.courseware);
      if (snapshot.currentSlideId) {
        setCurrentSlide(snapshot.currentSlideId);
      }
    }
  }, [courseware, undo, setCourseware, setCurrentSlide]);

  const handleRedo = useCallback(() => {
    const snapshot = redo();
    if (snapshot) {
      setCourseware(snapshot.courseware);
      if (snapshot.currentSlideId) {
        setCurrentSlide(snapshot.currentSlideId);
      }
    }
  }, [redo, setCourseware, setCurrentSlide]);

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveMessage('');
    try {
      const response = await fetch(`${API_BASE}/courseware`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(courseware),
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      const saved = await response.json();
      setCourseware(saved);
      setSaveMessage('保存成功');
      setTimeout(() => setSaveMessage(''), 2000);
    } catch (err) {
      setSaveMessage(`保存失败：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSaving(false);
    }
  }, [courseware, setCourseware]);

  const handleExportPackage = useCallback(async () => {
    const blob = await exportCoursewarePackage(courseware);
    const filename = `${courseware.title || courseware.id}.courseware.zip`;
    downloadBlob(blob, filename);
  }, [courseware]);

  const handleExportHtml = useCallback(async () => {
    try {
      const blob = await exportHtml(courseware);
      const filename = `${courseware.title || courseware.id}.html`;
      downloadBlob(blob, filename);
    } catch (err) {
      alert(`导出 HTML 失败：${err instanceof Error ? err.message : String(err)}`);
    }
  }, [courseware]);

  const handleImportPackage = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const imported = await importCoursewarePackage(file);
        setCourseware(imported);
        if (imported.slides[0]?.id) {
          setCurrentSlide(imported.slides[0].id);
        }
        record(imported);
      } catch (err) {
        alert(`导入失败：${err instanceof Error ? err.message : String(err)}`);
      } finally {
        e.target.value = '';
      }
    },
    [setCourseware, setCurrentSlide, record],
  );

  // Panel sizes
  const [leftWidth, setLeftWidth] = useState(() => readStoredNumber('cw.editor.leftWidth', DEFAULT_LEFT_WIDTH));
  const [rightWidth, setRightWidth] = useState(() => readStoredNumber('cw.editor.rightWidth', DEFAULT_RIGHT_WIDTH));
  const [leftCollapsed, setLeftCollapsed] = useState(() => readStoredBoolean('cw.editor.leftCollapsed', false));
  const [rightCollapsed, setRightCollapsed] = useState(() => readStoredBoolean('cw.editor.rightCollapsed', false));
  const [timelineVisible, setTimelineVisible] = useState(() =>
    readStoredBoolean('cw.editor.timelineVisible', true),
  );

  useEffect(() => localStorage.setItem('cw.editor.leftWidth', String(leftWidth)), [leftWidth]);
  useEffect(() => localStorage.setItem('cw.editor.rightWidth', String(rightWidth)), [rightWidth]);
  useEffect(() => localStorage.setItem('cw.editor.leftCollapsed', String(leftCollapsed)), [leftCollapsed]);
  useEffect(() => localStorage.setItem('cw.editor.rightCollapsed', String(rightCollapsed)), [rightCollapsed]);
  useEffect(() => localStorage.setItem('cw.editor.timelineVisible', String(timelineVisible)), [timelineVisible]);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const openPreview = useCallback(() => setIsPreviewOpen(true), []);
  const closePreview = useCallback(() => {
    setIsPreviewOpen(false);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!isPreviewOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePreview();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isPreviewOpen, closePreview]);

  useEffect(() => {
    if (!isPreviewOpen) return;
    const el = document.getElementById('presentation-mode-root');
    if (el && !document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    }
  }, [isPreviewOpen]);

  const [resizing, setResizing] = useState<'left' | 'right' | null>(null);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);

  const startResize = useCallback(
    (side: 'left' | 'right', e: React.MouseEvent) => {
      e.preventDefault();
      setResizing(side);
      resizeStartX.current = e.clientX;
      resizeStartWidth.current = side === 'left' ? leftWidth : rightWidth;
    },
    [leftWidth, rightWidth],
  );

  useEffect(() => {
    if (!resizing) {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      return;
    }
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMove = (e: MouseEvent) => {
      const delta = e.clientX - resizeStartX.current;
      if (resizing === 'left') {
        const next = clamp(resizeStartWidth.current + delta, MIN_LEFT_WIDTH, MAX_LEFT_WIDTH);
        setLeftWidth(next);
        if (leftCollapsed && next > MIN_LEFT_WIDTH) setLeftCollapsed(false);
      } else {
        const next = clamp(resizeStartWidth.current - delta, MIN_RIGHT_WIDTH, MAX_RIGHT_WIDTH);
        setRightWidth(next);
        if (rightCollapsed && next > MIN_RIGHT_WIDTH) setRightCollapsed(false);
      }
    };
    const handleUp = () => setResizing(null);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [resizing, leftCollapsed, rightCollapsed]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPreviewOpen) {
        return;
      }

      const target = e.target as HTMLElement | null;
      const isTyping =
        target != null &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);
      if (isTyping) {
        // Let inputs/textarea handle their own keys (Backspace, Delete, arrows, etc.)
        return;
      }

      // Undo / Redo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      // Inline text editing: let InlineTextEditor handle Escape and Ctrl+Enter
      if (editingElementId) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setEditingElement(null);
        }
        return;
      }

      const slideId = currentSlideId;
      if (!slideId) {
        if (e.key === 'Escape') {
          e.preventDefault();
          clearElementSelection();
        }
        return;
      }

      const hasMultiSelection = selectedElementIds.length > 1;
      const elementId = selectedElementId;

      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          if (selectedElementIds.length === 0) return;
          e.preventDefault();
          record(courseware);
          if (hasMultiSelection) {
            deleteSelectedElements(slideId);
          } else if (elementId) {
            deleteElement(slideId, elementId);
          }
          break;
        case 'd':
        case 'D':
          if ((e.ctrlKey || e.metaKey) && selectedElementIds.length > 0) {
            e.preventDefault();
            record(courseware);
            if (hasMultiSelection) {
              duplicateSelectedElements(slideId);
            } else if (elementId) {
              duplicateElement(slideId, elementId);
            }
          }
          break;
        case 'ArrowUp':
        case 'ArrowDown':
        case 'ArrowLeft':
        case 'ArrowRight':
          if (selectedElementIds.length === 0) return;
          e.preventDefault();
          {
            const step = e.shiftKey ? 10 : 1;
            let dx = 0;
            let dy = 0;
            if (e.key === 'ArrowUp') dy = -step;
            if (e.key === 'ArrowDown') dy = step;
            if (e.key === 'ArrowLeft') dx = -step;
            if (e.key === 'ArrowRight') dx = step;
            if (hasMultiSelection) {
              nudgeSelectedElements(slideId, dx, dy);
            } else if (elementId) {
              nudgeElement(slideId, elementId, dx, dy);
            }
            if (!e.repeat) {
              record(courseware);
            }
          }
          break;
        case '[':
          if ((e.ctrlKey || e.metaKey) && elementId) {
            e.preventDefault();
            record(courseware);
            sendToBack(slideId, elementId);
          }
          break;
        case ']':
          if ((e.ctrlKey || e.metaKey) && elementId) {
            e.preventDefault();
            record(courseware);
            bringToFront(slideId, elementId);
          }
          break;
        case 'Escape':
          e.preventDefault();
          clearElementSelection();
          break;
        case 'F5':
          e.preventDefault();
          openPreview();
          break;
        case 'g':
        case 'G':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.shiftKey) {
              if (elementId) {
                record(courseware);
                ungroupSelectedElement(slideId, elementId);
              }
            } else if (hasMultiSelection) {
              record(courseware);
              groupSelectedElements(slideId);
            }
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleUndo,
    handleRedo,
    courseware,
    currentSlideId,
    selectedElementId,
    selectedElementIds,
    editingElementId,
    isPreviewOpen,
    openPreview,
    record,
    deleteElement,
    deleteSelectedElements,
    duplicateElement,
    duplicateSelectedElements,
    groupSelectedElements,
    ungroupSelectedElement,
    nudgeElement,
    nudgeSelectedElements,
    bringToFront,
    sendToBack,
    clearElementSelection,
    setEditingElement,
  ]);

  const toolbarButtonClass =
    'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-white/80 hover:text-slate-900 disabled:opacity-40';

  return (
    <AuroraBackground className="h-screen">
      {/* Top toolbar */}
      <div className="relative flex items-center justify-between border-b border-white/60 bg-white/90 px-3 py-2 shadow-sm backdrop-blur-md">
        <div className="relative flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
          >
            <Home size={18} />
            首页
          </Link>

          <div className="h-5 w-px bg-slate-200" />

          <h1 className="max-w-xs truncate text-sm font-bold text-slate-800 md:max-w-md lg:text-base">
            {courseware.title}
          </h1>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Edit group */}
          <div className="flex items-center gap-0.5 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button onClick={handleUndo} disabled={!canUndo()} title="撤销 (Ctrl+Z)" className={toolbarButtonClass}>
              <Undo2 size={16} />
              <span className="hidden lg:inline">撤销</span>
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo()}
              title="重做 (Ctrl+Shift+Z)"
              className={toolbarButtonClass}
            >
              <Redo2 size={16} />
              <span className="hidden lg:inline">重做</span>
            </button>
          </div>

          <div className="h-5 w-px bg-slate-200" />

          {/* File group */}
          <div className="flex items-center gap-0.5 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button onClick={handleSave} disabled={isSaving} title="保存到后端" className={toolbarButtonClass}>
              <Save size={16} />
              <span className="hidden lg:inline">{isSaving ? '保存中' : '保存'}</span>
            </button>
            <button onClick={handleExportPackage} title="导出 .courseware 项目包" className={toolbarButtonClass}>
              <Download size={16} />
              <span className="hidden lg:inline">导出</span>
            </button>
            <button onClick={() => fileInputRef.current?.click()} title="导入 .courseware 项目包" className={toolbarButtonClass}>
              <Upload size={16} />
              <span className="hidden lg:inline">导入</span>
            </button>
            <button onClick={handleExportHtml} title="导出独立 HTML 播放包" className={toolbarButtonClass}>
              <FileCode size={16} />
              <span className="hidden lg:inline">HTML</span>
            </button>
          </div>

          <input ref={fileInputRef} type="file" accept=".zip,.courseware,.courseware.zip" onChange={handleImportPackage} className="hidden" />

          <div className="h-5 w-px bg-slate-200" />

          {/* View group */}
          <div className="flex items-center gap-0.5 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => setLeftCollapsed((v) => !v)}
              title="切换左侧面板"
              className={`${toolbarButtonClass} ${leftCollapsed ? 'bg-slate-200 text-slate-900' : ''}`}
            >
              <PanelLeft size={16} />
            </button>
            <button
              onClick={() => setRightCollapsed((v) => !v)}
              title="切换右侧面板"
              className={`${toolbarButtonClass} ${rightCollapsed ? 'bg-slate-200 text-slate-900' : ''}`}
            >
              <PanelRight size={16} />
            </button>
            <button
              onClick={() => setTimelineVisible((v) => !v)}
              title="切换动画时间轴"
              className={toolbarButtonClass}
            >
              <LayoutTemplate size={16} />
              {timelineVisible ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
          </div>

          <div className="h-5 w-px bg-slate-200" />

          <button
            onClick={openPreview}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Play size={16} />
            预览
          </button>
        </div>
      </div>

      {/* Element creation toolbar */}
      <div className="border-b border-white/60 bg-white/70 backdrop-blur-sm">
        <ElementToolbar />
      </div>

      {/* Main workspace */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <div
          className="flex flex-col border-r border-white/60 bg-white/70 shadow-[2px_0_16px_rgba(0,0,0,0.02)] backdrop-blur-sm transition-all"
          style={{ width: leftCollapsed ? 0 : leftWidth, minWidth: leftCollapsed ? 0 : undefined, overflow: 'hidden' }}
        >
          <SlideSidebar />
        </div>

        {/* Left resize handle */}
        {!leftCollapsed && (
          <div
            onMouseDown={(e) => startResize('left', e)}
            className="absolute bottom-0 top-0 z-20 w-1 cursor-col-resize transition hover:bg-slate-400 hover:shadow-[2px_0_6px_rgba(0,0,0,0.1)]"
            style={{ left: leftWidth }}
          />
        )}

        {/* Center canvas */}
        <div className="relative flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-1 items-center justify-center overflow-auto p-6">
            <Canvas />
          </div>

          {/* Bottom timeline */}
          {timelineVisible && (
            <div className="h-44 border-t border-white/60 bg-white/90 backdrop-blur-sm shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
              <AnimationTimeline />
            </div>
          )}
        </div>

        {/* Right resize handle */}
        {!rightCollapsed && (
          <div
            onMouseDown={(e) => startResize('right', e)}
            className="absolute bottom-0 top-0 z-20 w-1 cursor-col-resize transition hover:bg-slate-400 hover:shadow-[-2px_0_6px_rgba(0,0,0,0.1)]"
            style={{ right: rightWidth }}
          />
        )}

        {/* Right property panel */}
        <div
          className="flex flex-col border-l border-white/60 bg-white/70 shadow-[-2px_0_16px_rgba(0,0,0,0.02)] backdrop-blur-sm transition-all"
          style={{ width: rightCollapsed ? 0 : rightWidth, minWidth: rightCollapsed ? 0 : undefined, overflow: 'hidden' }}
        >
          <PropertyPanel />
        </div>
      </div>

      {/* Fullscreen presentation preview */}
      {isPreviewOpen && (
        <div
          id="presentation-mode-root"
          className="fixed inset-0 z-[100] bg-slate-950"
        >
          <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between bg-slate-900/80 px-4 py-2 text-white backdrop-blur-sm">
            <div className="text-sm font-semibold">预览：{courseware.title}</div>
            <button
              onClick={closePreview}
              className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm hover:bg-slate-600"
            >
              <X size={16} className="inline align-text-bottom" /> 退出预览 (Esc)
            </button>
          </div>
          <Player courseware={courseware} controls={false} />
        </div>
      )}

      {saveMessage && (
        <div
          key={saveMessage}
          className={`pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2 animate-scale-in rounded-full px-4 py-2 text-sm shadow-lg ${
            saveMessage.startsWith('保存失败') ? 'bg-red-600 text-white' : 'bg-slate-700 text-white'
          }`}
        >
          {saveMessage}
        </div>
      )}
    </AuroraBackground>
  );
}
