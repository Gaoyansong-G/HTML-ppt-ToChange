import { useEffect, useCallback, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
  AlertTriangle,
  CheckCircle2,
  CloudOff,
  Copy,
  FileQuestion,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useEditorStore } from '../stores/editor.store';
import { useHistoryStore } from '../stores/history.store';
import { SlideSidebar } from './SlideSidebar';
import { Canvas } from './Canvas';
import { PropertyPanel } from './PropertyPanel';
import { AnimationTimeline } from './AnimationTimeline';
import { ElementToolbar } from './ElementToolbar';
import { ThemePicker } from './ThemePicker';
import { Player } from '../player/Player';
import { AuroraBackground } from '../components/ui/AuroraBackground';
import { ThemeProvider } from '../lib/theme-context';
import { AIEditSidebar } from './AIEditSidebar';
import {
  exportCoursewarePackage,
  importCoursewarePackage,
  persistImportedCoursewareAssets,
  downloadBlob,
  exportHtml,
} from '../lib/export';
import {
  useCoursewareDocument,
  type CoursewareDocumentLifecycle,
} from '../courseware/useCoursewareDocument';



const DEFAULT_LEFT_WIDTH = 260;
const DEFAULT_RIGHT_WIDTH = 320;
const MIN_LEFT_WIDTH = 200;
const MAX_LEFT_WIDTH = 400;
const MIN_RIGHT_WIDTH = 240;
const MAX_RIGHT_WIDTH = 480;
const COMPACT_WORKSPACE_QUERY = '(max-width: 1119px)';
const MOBILE_WORKSPACE_QUERY = '(max-width: 767px)';
const TIMELINE_HEIGHT = 208;

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

function isNarrowWorkspaceViewport() {
  return typeof window !== 'undefined' && window.matchMedia(MOBILE_WORKSPACE_QUERY).matches;
}

function isCompactWorkspaceViewport() {
  return typeof window !== 'undefined' && window.matchMedia(COMPACT_WORKSPACE_QUERY).matches;
}

function EditorRouteMessage({
  status,
  error,
  onRetry,
}: {
  status: 'loading' | 'not-found' | 'error';
  error?: string | null;
  onRetry?: () => void;
}) {
  return (
    <AuroraBackground className="flex h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      {status === 'loading' ? (
        <>
          <Loader2 className="animate-spin text-slate-500" size={34} />
          <p className="text-sm font-medium text-slate-600">正在打开课件…</p>
        </>
      ) : (
        <>
          <FileQuestion className="text-slate-400" size={44} />
          <h1 className="text-xl font-bold text-slate-900">
            {status === 'not-found' ? '找不到这个课件' : '课件暂时无法打开'}
          </h1>
          <p className="max-w-md text-sm leading-6 text-slate-500">
            {status === 'not-found' ? '课件可能已被删除，或当前链接不完整。' : error}
          </p>
          <div className="flex gap-3">
            {status === 'error' && onRetry && (
              <button
                onClick={onRetry}
                className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                <RefreshCw size={15} /> 重试
              </button>
            )}
            <Link
              to="/courseware-list"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              返回课件列表
            </Link>
          </div>
        </>
      )}
    </AuroraBackground>
  );
}

export function Editor() {
  const { id = '' } = useParams<{ id: string }>();
  const lifecycle = useCoursewareDocument(id);

  if (lifecycle.loadStatus === 'loading') {
    return <EditorRouteMessage status="loading" />;
  }
  if (lifecycle.loadStatus === 'not-found') {
    return <EditorRouteMessage status="not-found" />;
  }
  if (lifecycle.loadStatus === 'error') {
    return (
      <EditorRouteMessage
        status="error"
        error={lifecycle.loadError}
        onRetry={lifecycle.retryLoad}
      />
    );
  }
  return <EditorWorkspace documentId={id} lifecycle={lifecycle} />;
}

function EditorWorkspace({
  documentId,
  lifecycle,
}: {
  documentId: string;
  lifecycle: CoursewareDocumentLifecycle;
}) {
  const navigate = useNavigate();
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

  const handleUndo = useCallback(() => {
    const snapshot = undo(courseware);
    if (snapshot) {
      setCourseware({
        ...snapshot.courseware,
        id: courseware.id,
        revision: courseware.revision,
        createdAt: courseware.createdAt,
        updatedAt: courseware.updatedAt,
      });
      if (snapshot.currentSlideId) {
        setCurrentSlide(snapshot.currentSlideId);
      }
    }
  }, [courseware, undo, setCourseware, setCurrentSlide]);

  const handleRedo = useCallback(() => {
    const snapshot = redo();
    if (snapshot) {
      setCourseware({
        ...snapshot.courseware,
        id: courseware.id,
        revision: courseware.revision,
        createdAt: courseware.createdAt,
        updatedAt: courseware.updatedAt,
      });
      if (snapshot.currentSlideId) {
        setCurrentSlide(snapshot.currentSlideId);
      }
    }
  }, [courseware, redo, setCourseware, setCurrentSlide]);

  const [notice, setNotice] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = useCallback(async () => {
    const saved = await lifecycle.saveNow();
    if (saved) {
      setNotice('课件已保存');
      setTimeout(() => setNotice(''), 1800);
    }
  }, [lifecycle]);

  const handleExportPackage = useCallback(async () => {
    try {
      const blob = await exportCoursewarePackage(courseware);
      const filename = `${courseware.title || courseware.id}.courseware.zip`;
      downloadBlob(blob, filename);
    } catch (err) {
      setNotice(`导出失败：${err instanceof Error ? err.message : String(err)}`);
    }
  }, [courseware]);

  const handleExportHtml = useCallback(async () => {
    try {
      const blob = await exportHtml(courseware);
      const filename = `${courseware.title || courseware.id}.html`;
      downloadBlob(blob, filename);
    } catch (err) {
      setNotice(`导出 HTML 失败：${err instanceof Error ? err.message : String(err)}`);
    }
  }, [courseware]);

  const handleImportPackage = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const imported = await importCoursewarePackage(file);
        if (
          !window.confirm(
            `要用“${imported.title}”替换当前课件内容吗？替换后会自动保存，并且可以撤销。`,
          )
        ) {
          return;
        }
        setNotice('正在导入并保存素材…');
        const durableImport = await persistImportedCoursewareAssets(imported);
        record(courseware);
        const replacement = {
          ...durableImport,
          id: documentId,
          revision: courseware.revision,
          createdAt: courseware.createdAt,
          updatedAt: courseware.updatedAt,
        };
        setCourseware(replacement);
        if (replacement.slides[0]?.id) {
          setCurrentSlide(replacement.slides[0].id);
        }
        setNotice('课件已导入，正在自动保存');
      } catch (err) {
        setNotice(`导入失败：${err instanceof Error ? err.message : String(err)}`);
      } finally {
        e.target.value = '';
      }
    },
    [courseware, documentId, setCourseware, setCurrentSlide, record],
  );

  const handleSaveAsCopy = useCallback(async () => {
    const copy = await lifecycle.saveAsCopy();
    if (copy) {
      navigate(`/courseware/${encodeURIComponent(copy.id)}/edit`, { replace: true });
    }
  }, [lifecycle, navigate]);

  const saveStatusText =
    lifecycle.saveStatus === 'saving'
      ? '正在保存…'
      : lifecycle.saveStatus === 'dirty'
        ? '等待自动保存'
        : lifecycle.saveStatus === 'error'
          ? '保存失败'
          : lifecycle.saveStatus === 'conflict'
            ? '发现版本冲突'
            : lifecycle.saveStatus === 'deleted'
              ? '原课件已删除'
              : '已保存';

  // Panel sizes
  const [leftWidth, setLeftWidth] = useState(() => readStoredNumber('cw.editor.leftWidth', DEFAULT_LEFT_WIDTH));
  const [rightWidth, setRightWidth] = useState(() => readStoredNumber('cw.editor.rightWidth', DEFAULT_RIGHT_WIDTH));
  const [leftCollapsed, setLeftCollapsed] = useState(() =>
    isCompactWorkspaceViewport() ? true : readStoredBoolean('cw.editor.leftCollapsed', false),
  );
  const [rightCollapsed, setRightCollapsed] = useState(() =>
    isNarrowWorkspaceViewport() ? true : readStoredBoolean('cw.editor.rightCollapsed', false),
  );
  const [timelineVisible, setTimelineVisible] = useState(() =>
    isCompactWorkspaceViewport() ? false : readStoredBoolean('cw.editor.timelineVisible', true),
  );
  const [isNarrowWorkspace, setIsNarrowWorkspace] = useState(isNarrowWorkspaceViewport);

  useEffect(() => {
    try {
      const responsiveDefaultsVersion = 'cw.editor.responsiveDefaults.v2';
      if (localStorage.getItem(responsiveDefaultsVersion) === 'applied') return;
      if (window.innerWidth < 1120) {
        setLeftCollapsed(true);
        setTimelineVisible(false);
      }
      if (window.innerWidth < 720) {
        setRightCollapsed(true);
      }
      localStorage.setItem(responsiveDefaultsVersion, 'applied');
    } catch {
      // Layout controls remain usable when browser storage is unavailable.
    }
  }, []);

  useEffect(() => localStorage.setItem('cw.editor.leftWidth', String(leftWidth)), [leftWidth]);
  useEffect(() => localStorage.setItem('cw.editor.rightWidth', String(rightWidth)), [rightWidth]);
  useEffect(() => localStorage.setItem('cw.editor.leftCollapsed', String(leftCollapsed)), [leftCollapsed]);
  useEffect(() => localStorage.setItem('cw.editor.rightCollapsed', String(rightCollapsed)), [rightCollapsed]);
  useEffect(() => localStorage.setItem('cw.editor.timelineVisible', String(timelineVisible)), [timelineVisible]);

  useEffect(() => {
    const compactMediaQuery = window.matchMedia(COMPACT_WORKSPACE_QUERY);
    const mobileMediaQuery = window.matchMedia(MOBILE_WORKSPACE_QUERY);

    const handleCompactWorkspaceChange = (event: MediaQueryListEvent) => {
      setResizing(null);
      if (event.matches) {
        setLeftCollapsed(true);
        setTimelineVisible(false);
      }
    };

    const handleWorkspaceModeChange = (event: MediaQueryListEvent) => {
      setIsNarrowWorkspace(event.matches);
      setResizing(null);
      if (event.matches) {
        // Overlay drawers must never remain open when the workspace becomes narrow.
        setLeftCollapsed(true);
        setRightCollapsed(true);
        setTimelineVisible(false);
      }
    };

    compactMediaQuery.addEventListener('change', handleCompactWorkspaceChange);
    mobileMediaQuery.addEventListener('change', handleWorkspaceModeChange);
    return () => {
      compactMediaQuery.removeEventListener('change', handleCompactWorkspaceChange);
      mobileMediaQuery.removeEventListener('change', handleWorkspaceModeChange);
    };
  }, []);

  const toggleLeftPanel = useCallback(() => {
    if (isNarrowWorkspace) {
      if (leftCollapsed) {
        setRightCollapsed(true);
        setLeftCollapsed(false);
      } else {
        setLeftCollapsed(true);
      }
      return;
    }
    setLeftCollapsed((value) => !value);
  }, [isNarrowWorkspace, leftCollapsed]);

  const toggleRightPanel = useCallback(() => {
    if (isNarrowWorkspace) {
      if (rightCollapsed) {
        setLeftCollapsed(true);
        setRightCollapsed(false);
      } else {
        setRightCollapsed(true);
      }
      return;
    }
    setRightCollapsed((value) => !value);
  }, [isNarrowWorkspace, rightCollapsed]);

  const closeMobilePanels = useCallback(() => {
    setLeftCollapsed(true);
    setRightCollapsed(true);
  }, []);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const openPreview = useCallback(() => setIsPreviewOpen(true), []);
  const closePreview = useCallback(() => {
    setIsPreviewOpen(false);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handlePreviewRequest = () => openPreview();
    window.addEventListener('courseware:open-preview', handlePreviewRequest);
    return () => window.removeEventListener('courseware:open-preview', handlePreviewRequest);
  }, [openPreview]);

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
            // 先快照再移动（连发按住时只在首次记录）
            if (!e.repeat) {
              record(courseware);
            }
            if (hasMultiSelection) {
              nudgeSelectedElements(slideId, dx, dy);
            } else if (elementId) {
              nudgeElement(slideId, elementId, dx, dy);
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
    <ThemeProvider themeId={courseware.designSystem?.id} gradeLevel={courseware.gradeLevel || 'unknown'} tokensOverride={courseware.designSystem?.tokens}>
    <AuroraBackground className="h-screen">
      {/* Top toolbar */}
      <div className="relative z-30 flex shrink-0 items-center justify-between gap-3 overflow-x-auto border-b border-white/60 bg-white/90 px-3 py-2 shadow-sm backdrop-blur-md [scrollbar-width:thin]">
        <div className="relative flex shrink-0 items-center gap-3">
          <Link
            to="/courseware-list"
            onClick={() => void lifecycle.saveNow()}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
          >
            <Home size={18} />
            首页
          </Link>

          <div className="h-5 w-px bg-slate-200" />

          <div className="min-w-0">
            <input
              aria-label="课件标题"
              value={courseware.title}
              onChange={(event) => {
                record(courseware, `courseware-title:${courseware.id}`);
                setCourseware({ ...courseware, title: event.target.value });
              }}
              className="block max-w-xs truncate rounded-md bg-transparent px-1 text-sm font-bold text-slate-800 outline-none transition hover:bg-white focus:bg-white focus:ring-2 focus:ring-blue-200 md:max-w-md lg:text-base"
              title="点击修改课件标题"
            />
            <div
              className={`mt-0.5 flex items-center gap-1 text-[11px] ${
                lifecycle.saveStatus === 'error' ||
                lifecycle.saveStatus === 'conflict' ||
                lifecycle.saveStatus === 'deleted'
                  ? 'text-red-600'
                  : lifecycle.saveStatus === 'dirty'
                    ? 'text-amber-600'
                    : 'text-slate-400'
              }`}
              title={
                lifecycle.lastSavedAt
                  ? `上次保存：${new Date(lifecycle.lastSavedAt).toLocaleString()}`
                  : undefined
              }
            >
              {lifecycle.saveStatus === 'saving' ? (
                <Loader2 size={11} className="animate-spin" />
              ) : lifecycle.saveStatus === 'error' ||
                lifecycle.saveStatus === 'conflict' ||
                lifecycle.saveStatus === 'deleted' ? (
                <CloudOff size={11} />
              ) : lifecycle.saveStatus === 'saved' ? (
                <CheckCircle2 size={11} />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              )}
              {saveStatusText}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {/* Edit group */}
          <div className="flex items-center gap-0.5 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button onClick={handleUndo} disabled={!canUndo()} title="撤销 (Ctrl+Z)" className={toolbarButtonClass}>
              <Undo2 size={16} />
              <span className="hidden xl:inline">撤销</span>
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo()}
              title="重做 (Ctrl+Shift+Z)"
              className={toolbarButtonClass}
            >
              <Redo2 size={16} />
              <span className="hidden xl:inline">重做</span>
            </button>
          </div>

          <div className="h-5 w-px bg-slate-200" />

          {/* File group */}
          <div className="flex items-center gap-0.5 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              onClick={handleSave}
              disabled={
                lifecycle.saveStatus === 'saving' ||
                lifecycle.saveStatus === 'conflict' ||
                lifecycle.saveStatus === 'deleted'
              }
              title="立即保存（平时会自动保存）"
              className={toolbarButtonClass}
            >
              <Save size={16} />
              <span className="hidden xl:inline">
                {lifecycle.saveStatus === 'saving' ? '保存中' : '保存'}
              </span>
            </button>
            <button onClick={handleExportPackage} title="导出 .courseware 项目包" className={toolbarButtonClass}>
              <Download size={16} />
              <span className="hidden xl:inline">导出</span>
            </button>
            <button onClick={() => fileInputRef.current?.click()} title="导入 .courseware 项目包" className={toolbarButtonClass}>
              <Upload size={16} />
              <span className="hidden xl:inline">导入</span>
            </button>
            <button onClick={handleExportHtml} title="导出独立 HTML 播放包" className={toolbarButtonClass}>
              <FileCode size={16} />
              <span className="hidden xl:inline">HTML</span>
            </button>
          </div>

          <input ref={fileInputRef} type="file" accept=".zip,.courseware,.courseware.zip" onChange={handleImportPackage} className="hidden" />

          <div className="h-5 w-px bg-slate-200" />

          {/* Theme group */}
          <div className="flex items-center gap-0.5 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <ThemePicker />
          </div>

          <div className="h-5 w-px bg-slate-200" />

          {/* View group */}
          <div className="flex items-center gap-0.5 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              onClick={toggleLeftPanel}
              title="切换左侧面板"
              className={`${toolbarButtonClass} ${leftCollapsed ? 'bg-slate-200 text-slate-900' : ''}`}
            >
              <PanelLeft size={16} />
            </button>
            <button
              onClick={toggleRightPanel}
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
      <div className="relative z-20 shrink-0 border-b border-white/60 bg-white/70 backdrop-blur-sm">
        <ElementToolbar />
      </div>

      {/* Main workspace */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {isNarrowWorkspace && (!leftCollapsed || !rightCollapsed) && (
          <button
            type="button"
            aria-label="关闭工作台侧栏"
            onClick={closeMobilePanels}
            className="absolute inset-0 z-40 bg-slate-950/25 backdrop-blur-[1px]"
          />
        )}

        {/* Left sidebar */}
        <div
          aria-hidden={leftCollapsed}
          className={`relative z-10 flex flex-col border-r border-white/60 bg-white/95 shadow-[2px_0_16px_rgba(0,0,0,0.08)] backdrop-blur-sm transition-[width] max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-50 ${
            leftCollapsed ? 'pointer-events-none' : ''
          }`}
          style={{
            width: leftCollapsed
              ? 0
              : isNarrowWorkspace
                ? `min(${leftWidth}px, calc(100vw - 3.5rem))`
                : leftWidth,
            minWidth: leftCollapsed || isNarrowWorkspace ? 0 : leftWidth,
            overflow: 'hidden',
          }}
        >
          {!leftCollapsed && <SlideSidebar />}
        </div>

        {/* Left resize handle */}
        {!leftCollapsed && (
          <div
            onMouseDown={(e) => startResize('left', e)}
            className="absolute bottom-0 top-0 z-20 w-1 cursor-col-resize transition hover:bg-slate-400 hover:shadow-[2px_0_6px_rgba(0,0,0,0.1)] max-md:hidden"
            style={{ left: leftWidth }}
          />
        )}

        {/* Center canvas */}
        <div className="relative z-0 flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-6">
            <Canvas />
          </div>

          {/* Bottom timeline */}
          {timelineVisible && (
            <div
              className="shrink-0 border-t border-white/60 bg-white/90 backdrop-blur-sm shadow-[0_-4px_20px_rgba(0,0,0,0.03)]"
              style={{ height: TIMELINE_HEIGHT }}
            >
              <AnimationTimeline />
            </div>
          )}
        </div>

        {/* Right resize handle */}
        {!rightCollapsed && (
          <div
            onMouseDown={(e) => startResize('right', e)}
            className="absolute bottom-0 top-0 z-20 w-1 cursor-col-resize transition hover:bg-slate-400 hover:shadow-[-2px_0_6px_rgba(0,0,0,0.1)] max-md:hidden"
            style={{ right: rightWidth }}
          />
        )}

        {/* Right property panel */}
        <div
          aria-hidden={rightCollapsed}
          className={`relative z-10 flex flex-col border-l border-white/60 bg-white/95 shadow-[-2px_0_16px_rgba(0,0,0,0.08)] backdrop-blur-sm transition-[width] max-md:absolute max-md:inset-y-0 max-md:right-0 max-md:z-50 ${
            rightCollapsed ? 'pointer-events-none' : ''
          }`}
          style={{
            width: rightCollapsed
              ? 0
              : isNarrowWorkspace
                ? `min(${rightWidth}px, calc(100vw - 3.5rem))`
                : rightWidth,
            minWidth: rightCollapsed || isNarrowWorkspace ? 0 : rightWidth,
            overflow: 'hidden',
          }}
        >
          {!rightCollapsed && <PropertyPanel />}
        </div>
      </div>

      {/* Fullscreen presentation preview */}
      {isPreviewOpen && (
        <div
          id="presentation-mode-root"
          className="fixed inset-0 z-[100] flex min-h-0 flex-col bg-slate-950"
        >
          <div className="relative z-10 flex shrink-0 items-center justify-between gap-3 bg-slate-900/90 px-4 py-2 text-white backdrop-blur-sm">
            <div className="min-w-0 truncate text-sm font-semibold" title={`预览：${courseware.title}`}>
              预览：{courseware.title}
            </div>
            <button
              onClick={closePreview}
              className="shrink-0 rounded-lg bg-slate-700 px-3 py-1.5 text-sm hover:bg-slate-600"
            >
              <X size={16} className="inline align-text-bottom" /> 退出预览 (Esc)
            </button>
          </div>
          <div className="min-h-0 flex-1">
            <Player courseware={courseware} controls={false} />
          </div>
        </div>
      )}

      {lifecycle.recovery && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/35 p-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-white/80 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <RefreshCw size={21} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">发现未完成的本地草稿</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  浏览器在
                  {new Date(lifecycle.recovery.savedAt).toLocaleString()}
                  保存过一个与服务器不同的版本。恢复后会继续自动保存。
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={lifecycle.discardDraft}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                使用服务器版本
              </button>
              <button
                onClick={lifecycle.recoverDraft}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                恢复本地草稿
              </button>
            </div>
          </div>
        </div>
      )}

      {(lifecycle.saveStatus === 'error' ||
        lifecycle.saveStatus === 'conflict' ||
        lifecycle.saveStatus === 'deleted') && (
        <div className="fixed bottom-5 left-1/2 z-[120] flex w-[min(92vw,680px)] -translate-x-1/2 items-center gap-3 rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm shadow-2xl">
          <AlertTriangle className="shrink-0 text-red-600" size={20} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900">
              {lifecycle.saveStatus === 'conflict'
                ? '这个课件已在另一个窗口更新'
                : lifecycle.saveStatus === 'deleted'
                  ? '原课件已被删除'
                  : '自动保存失败'}
            </p>
            <p className="truncate text-xs text-slate-500">
              {lifecycle.saveError || '你的修改仍保存在当前浏览器中。'}
            </p>
          </div>
          {lifecycle.saveStatus === 'conflict' ? (
            <>
              <button
                onClick={() => {
                  if (window.confirm('重新载入会放弃当前窗口中尚未保存的修改，确定继续吗？')) {
                    lifecycle.reloadFromServer();
                  }
                }}
                className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                载入最新版本
              </button>
              <button
                onClick={handleSaveAsCopy}
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
              >
                <Copy size={13} /> 另存为副本
              </button>
            </>
          ) : lifecycle.saveStatus === 'deleted' ? (
            <button
              onClick={handleSaveAsCopy}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
            >
              <Copy size={13} /> 另存为副本
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="shrink-0 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
            >
              重试保存
            </button>
          )}
        </div>
      )}

      {notice && (
        <div
          key={notice}
          className={`pointer-events-none fixed bottom-4 left-1/2 z-[140] -translate-x-1/2 animate-scale-in rounded-full px-4 py-2 text-sm shadow-lg ${
            notice.includes('失败') ? 'bg-red-600 text-white' : 'bg-slate-700 text-white'
          }`}
        >
          {notice}
        </div>
      )}
      <AIEditSidebar
        mobile={isNarrowWorkspace}
        rightOffset={rightCollapsed ? 24 : rightWidth + 24}
        bottomOffset={timelineVisible ? TIMELINE_HEIGHT + 24 : 24}
      />
    </AuroraBackground>
    </ThemeProvider>
  );
}
