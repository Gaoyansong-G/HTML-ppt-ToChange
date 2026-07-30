import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { Element } from '@courseware/shared';
import { useEditorStore } from '../stores/editor.store';
import { useHistoryStore } from '../stores/history.store';
import { ElementRenderer } from '../player/elements';
import { InlineTextEditor } from './InlineTextEditor';
import { FloatingToolbar } from './FloatingToolbar';
import {
  Grid3X3,
  ZoomIn,
  ZoomOut,
  Maximize,
  Shrink,
  Ruler,
  Type,
  Square,
  Circle,
  Image as ImageIcon,
  ListChecks,
} from 'lucide-react';
import {
  clampElementZIndex,
  createTextElement,
  createShapeElement,
  createImageElement,
  createQuizElement,
  USER_ELEMENT_Z_INDEX_MAX,
} from '../stores/element-factories';

const SLIDE_WIDTH = 1280;
const SLIDE_HEIGHT = 720;

const MIN_SIZE = 20;
const GRID_SIZE = 10;
const GUIDE_THRESHOLD = 6;
const STAGE_MARGIN = 56;
const GUIDE_LAYER = USER_ELEMENT_Z_INDEX_MAX + 1;
const SELECTION_LAYER = GUIDE_LAYER + 1;
const HANDLE_LAYER = SELECTION_LAYER + 1;
const INLINE_EDITOR_LAYER = HANDLE_LAYER + 1;
const FLOATING_TOOLBAR_LAYER = INLINE_EDITOR_LAYER + 1;
const HUD_LAYER = 30;
const CONTEXT_MENU_WIDTH = 176;
const CONTEXT_MENU_HEIGHT = 244;
const VIEWPORT_EDGE_GAP = 8;

interface ElementEdges {
  left: number;
  hCenter: number;
  right: number;
  top: number;
  vCenter: number;
  bottom: number;
}

function getElementEdges(g: Element['geometry']): ElementEdges {
  return {
    left: g.x,
    hCenter: g.x + g.width / 2,
    right: g.x + g.width,
    top: g.y,
    vCenter: g.y + g.height / 2,
    bottom: g.y + g.height,
  };
}

function snapEdge(value: number, targets: number[], threshold: number): number | null {
  let best: number | null = null;
  let bestDiff = threshold;
  for (const t of targets) {
    const diff = Math.abs(value - t);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = t;
    }
  }
  return best;
}

type HandleType =
  | 'nw'
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w'
  | 'rotate';

interface DragState {
  type: 'move' | 'resize' | 'rotate';
  elementId: string;
  startX: number;
  startY: number;
  initialGeometry: {
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex: number;
    rotation: number;
  };
  initialGeometries?: Record<string, Element['geometry']>;
  handle?: HandleType;
  hasChanged: boolean;
}

function snap(value: number, grid = GRID_SIZE) {
  return Math.round(value / grid) * grid;
}

const ELEMENT_TYPE_LABELS: Record<Element['type'], string> = {
  text: '文本',
  image: '图片',
  audio: '音频',
  video: '视频',
  shape: '形状',
  quiz: '题目',
  group: '组合',
  'ai-chat': 'AI 助手',
  pointer: '指针',
  formula: '公式',
  diagram: '图表',
  block: '内容组件',
  interactive: '课堂互动',
};

function getElementAccessibleName(element: Element) {
  const content = element.content as Record<string, unknown>;
  const detail = [content.text, content.alt, content.title, content.question].find(
    (value): value is string => typeof value === 'string' && value.trim().length > 0,
  );
  const typeLabel = ELEMENT_TYPE_LABELS[element.type] || '课件';
  return detail ? `${typeLabel}：${detail.trim().slice(0, 48)}` : `${typeLabel}元素`;
}

export function Canvas() {
  const {
    courseware,
    currentSlideId,
    selectedElementId,
    selectedElementIds,
    editingElementId,
    isPlaying,
    canvasZoom,
    selectElement,
    toggleElementSelection,
    clearElementSelection,
    setEditingElement,
    updateElement,
    batchUpdateElement,
    duplicateElement,
    deleteElement,
    addElement,
    bringToFront,
    sendToBack,
    resizeGroup,
    setCanvasZoom,
  } = useEditorStore();

  const { record } = useHistoryStore();
  const currentSlide = courseware.slides.find((s) => s.id === currentSlideId);
  const containerRef = useRef<HTMLDivElement>(null);
  const slideRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [viewportBounds, setViewportBounds] = useState({
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  });
  const zoomModeRef = useRef<'fit' | 'actual' | 'manual'>('fit');
  const scale = fitScale * canvasZoom;
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [smartGuidesEnabled, setSmartGuidesEnabled] = useState(true);
  const [guides, setGuides] = useState<{ v: number[]; h: number[] }>({ v: [], h: [] });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; slideX: number; slideY: number } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateScale = () => {
      const host = containerRef.current?.parentElement;
      if (!host) return;
      const rect = host.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(host);
      const paddingLeft = Number.parseFloat(computedStyle.paddingLeft) || 0;
      const paddingRight = Number.parseFloat(computedStyle.paddingRight) || 0;
      const paddingTop = Number.parseFloat(computedStyle.paddingTop) || 0;
      const paddingBottom = Number.parseFloat(computedStyle.paddingBottom) || 0;
      const width = Math.max(0, host.clientWidth - paddingLeft - paddingRight);
      const height = Math.max(0, host.clientHeight - paddingTop - paddingBottom);
      if (width <= 0 || height <= 0) return;
      const scaleX = Math.max(1, width - STAGE_MARGIN * 2) / SLIDE_WIDTH;
      const scaleY = Math.max(1, height - STAGE_MARGIN * 2) / SLIDE_HEIGHT;
      const nextFitScale =
        Math.round(Math.min(scaleX, scaleY) * 10_000) / 10_000;
      setFitScale(nextFitScale);
      if (zoomModeRef.current === 'actual') {
        setCanvasZoom(1 / nextFitScale);
      }
      setViewportSize({ width, height });
      setViewportBounds({
        left: rect.left + paddingLeft,
        top: rect.top + paddingTop,
        right: rect.right - paddingRight,
        bottom: rect.bottom - paddingBottom,
      });
    };

    updateScale();
    const resizeObserver = new ResizeObserver(updateScale);
    const host = containerRef.current?.parentElement;
    if (host) {
      resizeObserver.observe(host);
    }
    window.addEventListener('resize', updateScale);
    window.addEventListener('scroll', updateScale);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateScale);
      window.removeEventListener('scroll', updateScale);
    };
  }, []);

  const getCanvasCoordinates = useCallback(
    (clientX: number, clientY: number) => {
      const rect = slideRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };

      return {
        x: (clientX - rect.left) / scale,
        y: (clientY - rect.top) / scale,
      };
    },
    [scale],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, element: Element) => {
      if (isPlaying || editingElementId) return;
      e.stopPropagation();

      const isCtrl = e.ctrlKey || e.metaKey;
      if (isCtrl) {
        toggleElementSelection(element.id);
        return;
      }

      if (!selectedElementIds.includes(element.id)) {
        selectElement(element.id);
      }

      const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
      const initialGeometries: Record<string, Element['geometry']> = {};
      if (selectedElementIds.length > 1) {
        currentSlide?.elements.forEach((el) => {
          if (selectedElementIds.includes(el.id)) {
            initialGeometries[el.id] = { ...el.geometry };
          }
        });
      }

      setDragState({
        type: 'move',
        elementId: element.id,
        startX: x,
        startY: y,
        initialGeometry: {
          x: element.geometry.x,
          y: element.geometry.y,
          width: element.geometry.width,
          height: element.geometry.height,
          zIndex: element.geometry.zIndex,
          rotation: element.geometry.rotation || 0,
        },
        initialGeometries,
        hasChanged: false,
      });
    },
    [isPlaying, editingElementId, toggleElementSelection, selectElement, selectedElementIds, getCanvasCoordinates, currentSlide],
  );

  const handleDuplicate = useCallback(
    (elementId: string) => {
      if (!currentSlideId) return;
      record(courseware);
      duplicateElement(currentSlideId, elementId);
    },
    [currentSlideId, courseware, record, duplicateElement],
  );

  const handleDelete = useCallback(
    (elementId: string) => {
      if (!currentSlideId) return;
      record(courseware);
      deleteElement(currentSlideId, elementId);
    },
    [currentSlideId, courseware, record, deleteElement],
  );

  const handleBringToFront = useCallback(
    (elementId: string) => {
      if (!currentSlideId) return;
      record(courseware);
      bringToFront(currentSlideId, elementId);
    },
    [currentSlideId, courseware, record, bringToFront],
  );

  const handleSendToBack = useCallback(
    (elementId: string) => {
      if (!currentSlideId) return;
      record(courseware);
      sendToBack(currentSlideId, elementId);
    },
    [currentSlideId, courseware, record, sendToBack],
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent, element: Element) => {
      if (isPlaying || selectedElementIds.length > 1) return;
      e.stopPropagation();
      if (element.type === 'text') {
        setEditingElement(element.id);
      }
    },
    [isPlaying, selectedElementIds, setEditingElement],
  );

  const handleElementKeyDown = useCallback(
    (e: React.KeyboardEvent, element: Element) => {
      if (isPlaying || editingElementId || !currentSlideId) return;

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        selectElement(element.id);
        if (e.key === 'Enter' && element.type === 'text') {
          setEditingElement(element.id);
        }
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        record(courseware);
        deleteElement(currentSlideId, element.id);
        return;
      }

      const directions: Record<string, { x: number; y: number }> = {
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
      };
      const direction = directions[e.key];
      if (!direction) return;

      e.preventDefault();
      const distance = e.shiftKey ? GRID_SIZE : 1;
      const targetIds = selectedElementIds.includes(element.id) ? selectedElementIds : [element.id];
      record(courseware, `keyboard-move:${currentSlideId}:${targetIds.slice().sort().join(',')}`);
      targetIds.forEach((id) => {
        const target = currentSlide?.elements.find((item) => item.id === id);
        if (!target) return;
        batchUpdateElement(currentSlideId, id, {
          geometry: {
            ...target.geometry,
            x: Math.max(0, Math.min(SLIDE_WIDTH - target.geometry.width, target.geometry.x + direction.x * distance)),
            y: Math.max(0, Math.min(SLIDE_HEIGHT - target.geometry.height, target.geometry.y + direction.y * distance)),
          },
        });
      });
      if (!selectedElementIds.includes(element.id)) {
        selectElement(element.id);
      }
    },
    [
      batchUpdateElement,
      courseware,
      currentSlide,
      currentSlideId,
      deleteElement,
      editingElementId,
      isPlaying,
      record,
      selectElement,
      selectedElementIds,
      setEditingElement,
    ],
  );

  const handleHandleMouseDown = useCallback(
    (e: React.MouseEvent, element: Element, handle: HandleType) => {
      if (isPlaying || editingElementId) return;
      e.stopPropagation();
      selectElement(element.id);

      const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
      setDragState({
        type: handle === 'rotate' ? 'rotate' : 'resize',
        elementId: element.id,
        startX: x,
        startY: y,
        handle,
        initialGeometry: {
          x: element.geometry.x,
          y: element.geometry.y,
          width: element.geometry.width,
          height: element.geometry.height,
          zIndex: element.geometry.zIndex,
          rotation: element.geometry.rotation || 0,
        },
        hasChanged: false,
      });
    },
    [isPlaying, editingElementId, selectElement, getCanvasCoordinates],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragState || !currentSlideId) return;

      const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
      const deltaX = x - dragState.startX;
      const deltaY = y - dragState.startY;
      const { initialGeometry } = dragState;

      if (!dragState.hasChanged && (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1)) {
        record(courseware);
        setDragState({ ...dragState, hasChanged: true });
      }

      if (dragState.type === 'move') {
        const width = initialGeometry.width;
        const height = initialGeometry.height;

        const isGroupMove = selectedElementIds.length > 1 && dragState.initialGeometries && currentSlideId;
        if (isGroupMove) {
          let rawX = Math.max(0, Math.min(SLIDE_WIDTH - width, initialGeometry.x + deltaX));
          let rawY = Math.max(0, Math.min(SLIDE_HEIGHT - height, initialGeometry.y + deltaY));
          const appliedDx = rawX - initialGeometry.x;
          const appliedDy = rawY - initialGeometry.y;

          selectedElementIds.forEach((id) => {
            const init = dragState.initialGeometries![id];
            if (!init) return;
            updateElement(currentSlideId, id, (el) => {
              el.geometry.x = Math.max(0, Math.min(SLIDE_WIDTH - el.geometry.width, init.x + appliedDx));
              el.geometry.y = Math.max(0, Math.min(SLIDE_HEIGHT - el.geometry.height, init.y + appliedDy));
            });
          });
          setGuides({ v: [], h: [] });
        } else {
          let rawX = Math.max(0, Math.min(SLIDE_WIDTH - width, initialGeometry.x + deltaX));
          let rawY = Math.max(0, Math.min(SLIDE_HEIGHT - height, initialGeometry.y + deltaY));

          if (smartGuidesEnabled && currentSlide) {
            const edges = getElementEdges({ x: rawX, y: rawY, width, height } as Element['geometry']);
            const others = currentSlide.elements
              .filter((e) => e.id !== dragState.elementId)
              .map((e) => getElementEdges(e.geometry));
            const vTargets = [0, SLIDE_WIDTH / 2, SLIDE_WIDTH, ...others.flatMap((e) => [e.left, e.hCenter, e.right])];
            const hTargets = [0, SLIDE_HEIGHT / 2, SLIDE_HEIGHT, ...others.flatMap((e) => [e.top, e.vCenter, e.bottom])];

            const vGuides: number[] = [];
            const hGuides: number[] = [];

            const snapLeft = snapEdge(edges.left, vTargets, GUIDE_THRESHOLD);
            if (snapLeft !== null) {
              rawX = snapLeft;
              vGuides.push(snapLeft);
            } else {
              const snapHCenter = snapEdge(edges.hCenter, vTargets, GUIDE_THRESHOLD);
              if (snapHCenter !== null) {
                rawX = snapHCenter - width / 2;
                vGuides.push(snapHCenter);
              } else {
                const snapRight = snapEdge(edges.right, vTargets, GUIDE_THRESHOLD);
                if (snapRight !== null) {
                  rawX = snapRight - width;
                  vGuides.push(snapRight);
                }
              }
            }

            const snapTop = snapEdge(edges.top, hTargets, GUIDE_THRESHOLD);
            if (snapTop !== null) {
              rawY = snapTop;
              hGuides.push(snapTop);
            } else {
              const snapVCenter = snapEdge(edges.vCenter, hTargets, GUIDE_THRESHOLD);
              if (snapVCenter !== null) {
                rawY = snapVCenter - height / 2;
                hGuides.push(snapVCenter);
              } else {
                const snapBottom = snapEdge(edges.bottom, hTargets, GUIDE_THRESHOLD);
                if (snapBottom !== null) {
                  rawY = snapBottom - height;
                  hGuides.push(snapBottom);
                }
              }
            }

            setGuides({ v: vGuides, h: hGuides });
          }

          updateElement(currentSlideId, dragState.elementId, (el) => {
            el.geometry.x = snap(rawX);
            el.geometry.y = snap(rawY);
          });
        }
      } else if (dragState.type === 'resize' && dragState.handle) {
        const handle = dragState.handle;
        let newX = initialGeometry.x;
        let newY = initialGeometry.y;
        let newW = Math.max(MIN_SIZE, initialGeometry.width + deltaX);
        let newH = Math.max(MIN_SIZE, initialGeometry.height + deltaY);

        if (handle.includes('w')) {
          newW = Math.max(MIN_SIZE, initialGeometry.width - deltaX);
          newX = initialGeometry.x + initialGeometry.width - newW;
        }
        if (handle.includes('n')) {
          newH = Math.max(MIN_SIZE, initialGeometry.height - deltaY);
          newY = initialGeometry.y + initialGeometry.height - newH;
        }
        if (handle === 'n' || handle === 's') {
          newW = initialGeometry.width;
          newX = initialGeometry.x;
        }
        if (handle === 'e' || handle === 'w') {
          newH = initialGeometry.height;
          newY = initialGeometry.y;
        }

        newX = Math.max(0, Math.min(SLIDE_WIDTH - newW, newX));
        newY = Math.max(0, Math.min(SLIDE_HEIGHT - newH, newY));

        const newGeometry = {
          ...initialGeometry,
          x: snap(newX),
          y: snap(newY),
          width: snap(Math.max(MIN_SIZE, newW)),
          height: snap(Math.max(MIN_SIZE, newH)),
        };

        const element = currentSlide?.elements.find((e) => e.id === dragState.elementId);
        if (element?.type === 'group') {
          resizeGroup(currentSlideId, dragState.elementId, newGeometry);
        } else {
          batchUpdateElement(currentSlideId, dragState.elementId, { geometry: newGeometry });
        }
      } else if (dragState.type === 'rotate') {
        const centerX = initialGeometry.x + initialGeometry.width / 2;
        const centerY = initialGeometry.y + initialGeometry.height / 2;
        const angle = Math.atan2(y - centerY, x - centerX);
        let deg = (angle * 180) / Math.PI + 90;
        deg = Math.round(deg / 5) * 5;
        batchUpdateElement(currentSlideId, dragState.elementId, {
          geometry: {
            ...initialGeometry,
            rotation: deg,
          },
        });
      }
    },
    [
      dragState,
      currentSlideId,
      currentSlide,
      selectedElementIds,
      getCanvasCoordinates,
      updateElement,
      batchUpdateElement,
      resizeGroup,
    ],
  );

  const handleMouseUp = useCallback(() => {
    if (!dragState) {
      setGuides({ v: [], h: [] });
      return;
    }
    // We already recorded the pre-drag snapshot on first meaningful movement.
    // Do not record the post-drag state, otherwise undo would just revert to it.
    setDragState(null);
    setGuides({ v: [], h: [] });
  }, [dragState]);

  const handleCanvasClick = useCallback(() => {
    if (!dragState) {
      clearElementSelection();
      setGuides({ v: [], h: [] });
    }
  }, [dragState, clearElementSelection]);

  const handlePositions = useMemo(() => {
    if (!currentSlide || !selectedElementId || selectedElementIds.length > 1 || isPlaying || editingElementId) return null;
    const element = currentSlide.elements.find((e) => e.id === selectedElementId);
    if (!element) return null;

    const { x, y, width, height } = element.geometry;
    return {
      element,
      handles: [
        { type: 'nw' as HandleType, left: x - 4, top: y - 4 },
        { type: 'n' as HandleType, left: x + width / 2 - 4, top: y - 4 },
        { type: 'ne' as HandleType, left: x + width - 4, top: y - 4 },
        { type: 'e' as HandleType, left: x + width - 4, top: y + height / 2 - 4 },
        { type: 'se' as HandleType, left: x + width - 4, top: y + height - 4 },
        { type: 's' as HandleType, left: x + width / 2 - 4, top: y + height - 4 },
        { type: 'sw' as HandleType, left: x - 4, top: y + height - 4 },
        { type: 'w' as HandleType, left: x - 4, top: y + height / 2 - 4 },
      ],
      rotate: { left: x + width / 2 - 6, top: y - 40 },
    };
  }, [currentSlide, selectedElementId, selectedElementIds.length, isPlaying, editingElementId]);

  const handleCanvasContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (isPlaying || editingElementId) return;
      e.preventDefault();
      const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
      const menuX = Math.max(
        VIEWPORT_EDGE_GAP,
        Math.min(e.clientX, window.innerWidth - CONTEXT_MENU_WIDTH - VIEWPORT_EDGE_GAP),
      );
      const menuY = Math.max(
        VIEWPORT_EDGE_GAP,
        Math.min(e.clientY, window.innerHeight - CONTEXT_MENU_HEIGHT - VIEWPORT_EDGE_GAP),
      );
      setContextMenu({ x: menuX, y: menuY, slideX: x, slideY: y });
    },
    [isPlaying, editingElementId, getCanvasCoordinates],
  );

  const handleInsertAtContextMenu = useCallback(
    (factory: (overrides: { x: number; y: number }) => Element) => {
      if (!currentSlideId || !contextMenu) return;
      record(courseware);
      const element = factory({ x: contextMenu.slideX, y: contextMenu.slideY });
      addElement(currentSlideId, element);
      setContextMenu(null);
    },
    [currentSlideId, contextMenu, courseware, record, addElement],
  );

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    const focusTimer = window.requestAnimationFrame(() => {
      contextMenuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    });
    window.addEventListener('click', close);
    window.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      window.cancelAnimationFrame(focusTimer);
      window.removeEventListener('click', close);
      window.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [contextMenu]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        zoomModeRef.current = 'manual';
        setCanvasZoom(canvasZoom + delta);
      }
    },
    [canvasZoom, setCanvasZoom],
  );

  const handleZoomIn = useCallback(() => {
    zoomModeRef.current = 'manual';
    setCanvasZoom(canvasZoom + 0.1);
  }, [canvasZoom, setCanvasZoom]);
  const handleZoomOut = useCallback(() => {
    zoomModeRef.current = 'manual';
    setCanvasZoom(canvasZoom - 0.1);
  }, [canvasZoom, setCanvasZoom]);
  const handleFit = useCallback(() => {
    zoomModeRef.current = 'fit';
    setCanvasZoom(1);
  }, [setCanvasZoom]);
  const handleActualSize = useCallback(() => {
    zoomModeRef.current = 'actual';
    setCanvasZoom(1 / fitScale);
  }, [fitScale, setCanvasZoom]);
  const scaledSlideWidth = SLIDE_WIDTH * scale;
  const scaledSlideHeight = SLIDE_HEIGHT * scale;
  const stageLeft = Math.max(STAGE_MARGIN, (viewportSize.width - scaledSlideWidth) / 2);
  const stageTop = Math.max(STAGE_MARGIN, (viewportSize.height - scaledSlideHeight) / 2);
  const hudVisible = viewportBounds.right > viewportBounds.left && viewportBounds.bottom > viewportBounds.top;

  if (!currentSlide) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-5 p-8 text-center">
        <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-slate-100 shadow-inner">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="6" y="10" width="52" height="38" rx="4" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 3" />
            <rect x="14" y="20" width="20" height="6" rx="2" fill="#cbd5e1" />
            <rect x="14" y="30" width="36" height="4" rx="2" fill="#e2e8f0" />
            <rect x="14" y="38" width="28" height="4" rx="2" fill="#e2e8f0" />
            <circle cx="48" cy="46" r="10" fill="#3b82f6" />
            <path d="M48 41v10M43 46h10" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <div className="max-w-xs">
          <h3 className="text-lg font-semibold text-slate-700">还没有页面</h3>
          <p className="mt-1 text-sm text-slate-500">点击左侧“新增页面”按钮，或从左侧缩略图选择已有页面开始编辑。</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      aria-label={`课件画布：${currentSlide.title}`}
      className="relative h-full w-full shrink-0 overflow-visible"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleCanvasClick}
      onWheel={handleWheel}
    >
      <div
        className="absolute shrink-0"
        style={{
          left: stageLeft,
          top: stageTop,
          width: scaledSlideWidth + STAGE_MARGIN,
          height: scaledSlideHeight + STAGE_MARGIN,
        }}
      >
          <div
            ref={slideRef}
            className="relative rounded-xl bg-white shadow-2xl ring-1 ring-slate-900/5"
            onContextMenu={handleCanvasContextMenu}
            style={{
              width: SLIDE_WIDTH,
              height: SLIDE_HEIGHT,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              backgroundColor: currentSlide.background.color || '#ffffff',
              backgroundImage: currentSlide.background.gradient,
            }}
          >
        {/* Grid overlay */}
        {showGrid && !isPlaying && (
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              zIndex: 0,
              backgroundImage:
                'radial-gradient(circle, #94a3b8 1px, transparent 1px)',
              backgroundSize: `${GRID_SIZE * 2}px ${GRID_SIZE * 2}px`,
            }}
          />
        )}

        {/* Smart guides */}
        {smartGuidesEnabled && !isPlaying && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{ zIndex: GUIDE_LAYER }}
          >
            {guides.v.map((x, i) => (
              <div
                key={`v-${i}`}
                className="absolute border-l border-dashed border-blue-400/80"
                style={{
                  left: x,
                  top: 0,
                  height: SLIDE_HEIGHT,
                  transform: 'translateX(-50%)',
                }}
              />
            ))}
            {guides.h.map((y, i) => (
              <div
                key={`h-${i}`}
                className="absolute border-t border-dashed border-blue-400/80"
                style={{
                  top: y,
                  left: 0,
                  width: SLIDE_WIDTH,
                  transform: 'translateY(-50%)',
                }}
              />
            ))}
          </div>
        )}

        {currentSlide.elements.map((element) => {
          const safeZIndex = clampElementZIndex(element.geometry.zIndex);
          const renderElement = safeZIndex === element.geometry.zIndex
            ? element
            : {
                ...element,
                geometry: { ...element.geometry, zIndex: safeZIndex },
              };
          const editorElement = editingElementId === element.id
            ? {
                ...renderElement,
                geometry: {
                  ...renderElement.geometry,
                  zIndex: INLINE_EDITOR_LAYER,
                },
              }
            : renderElement;

          return (
            <div key={element.id} data-element-id={element.id}>
              {/* Render the element exactly as in the player, positioned by the slide coordinate system */}
              <ElementRenderer element={renderElement} assets={courseware.assets} />

              {/* Pointer/keyboard hit area follows the user's element stacking order. */}
              <div
                data-testid="element-overlay"
                role="button"
                tabIndex={isPlaying || editingElementId ? -1 : 0}
                aria-label={getElementAccessibleName(element)}
                aria-pressed={selectedElementIds.includes(element.id)}
                onMouseDown={(e) => handleMouseDown(e, element)}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => handleDoubleClick(e, element)}
                onKeyDown={(e) => handleElementKeyDown(e, element)}
                className={`absolute ${
                  selectedElementIds.includes(element.id) && !isPlaying && !editingElementId
                    ? 'cursor-move'
                    : isPlaying || editingElementId === element.id
                      ? 'pointer-events-none'
                      : 'cursor-pointer'
                } focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/60 focus-visible:ring-offset-2`}
                style={{
                  left: element.geometry.x,
                  top: element.geometry.y,
                  width: element.geometry.width,
                  height: element.geometry.height,
                  zIndex: safeZIndex,
                  transform: element.geometry.rotation
                    ? `rotate(${element.geometry.rotation}deg)`
                    : undefined,
                  transformOrigin: 'center center',
                }}
              />

              {editingElementId === element.id && element.type === 'text' && selectedElementIds.length <= 1 && (
                <InlineTextEditor element={editorElement} slideId={currentSlide.id} />
              )}
            </div>
          );
        })}

        {/* Selection outlines live above every user element, independent of user z-index. */}
        {!isPlaying && !editingElementId && selectedElementIds.length > 0 && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{ zIndex: SELECTION_LAYER }}
          >
            {currentSlide.elements
              .filter((element) => selectedElementIds.includes(element.id))
              .map((element) => (
                <div
                  key={element.id}
                  className="absolute ring-2 ring-blue-500/90 ring-offset-1 shadow-sm"
                  style={{
                    left: element.geometry.x,
                    top: element.geometry.y,
                    width: element.geometry.width,
                    height: element.geometry.height,
                    transform: element.geometry.rotation
                      ? `rotate(${element.geometry.rotation}deg)`
                      : undefined,
                    transformOrigin: 'center center',
                  }}
                />
              ))}
          </div>
        )}

        {handlePositions && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{ zIndex: HANDLE_LAYER }}
          >
            {handlePositions.handles.map((h) => (
              <div
                key={h.type}
                onMouseDown={(e) => handleHandleMouseDown(e, handlePositions.element, h.type)}
                className="pointer-events-auto absolute h-2 w-2 rounded-full border-2 border-white bg-slate-500 shadow-sm hover:bg-slate-600"
                style={{
                  left: h.left,
                  top: h.top,
                  cursor: `${h.type}-resize`,
                }}
              />
            ))}
            <div
              onMouseDown={(e) => handleHandleMouseDown(e, handlePositions.element, 'rotate')}
              className="pointer-events-auto absolute flex h-3 w-3 items-center justify-center rounded-full border-2 border-white bg-slate-500 shadow-sm hover:bg-slate-600"
              style={{
                left: handlePositions.rotate.left,
                top: handlePositions.rotate.top,
                cursor: 'grab',
              }}
            />
            <div
              className="pointer-events-none absolute border-l border-dashed border-blue-400/70"
              style={{
                left: handlePositions.rotate.left + 6,
                top: handlePositions.rotate.top + 6,
                height: 34,
                transform: 'translateX(-50%)',
              }}
            />
          </div>
        )}

            {selectedElementId && selectedElementIds.length === 1 && !isPlaying && !editingElementId && currentSlide && (
              <FloatingToolbar
                element={currentSlide.elements.find((e) => e.id === selectedElementId)!}
                layer={FLOATING_TOOLBAR_LAYER}
                onDuplicate={() => handleDuplicate(selectedElementId)}
                onDelete={() => handleDelete(selectedElementId)}
                onBringToFront={() => handleBringToFront(selectedElementId)}
                onSendToBack={() => handleSendToBack(selectedElementId)}
              />
            )}
          </div>
      </div>

      {/* Canvas context menu */}
      {contextMenu && createPortal(
        <div
          ref={contextMenuRef}
          role="menu"
          aria-label="插入元素"
          className="fixed z-[60] w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 text-xs font-semibold text-slate-400">插入元素</div>
          <button
            role="menuitem"
            onClick={() => handleInsertAtContextMenu(({ x, y }) => createTextElement('双击编辑文本', { x, y }))}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
          >
            <Type size={14} /> 文本
          </button>
          <button
            role="menuitem"
            onClick={() => handleInsertAtContextMenu(({ x, y }) => createShapeElement('rectangle', { x, y }))}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
          >
            <Square size={14} /> 矩形
          </button>
          <button
            role="menuitem"
            onClick={() => handleInsertAtContextMenu(({ x, y }) => createShapeElement('circle', { x, y }))}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
          >
            <Circle size={14} /> 圆形
          </button>
          <button
            role="menuitem"
            onClick={() => handleInsertAtContextMenu(({ x, y }) => createImageElement('', { x, y }))}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
          >
            <ImageIcon size={14} /> 图片
          </button>
          <button
            role="menuitem"
            onClick={() => handleInsertAtContextMenu(({ x, y }) => createQuizElement('single-choice', { x, y }))}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
          >
            <ListChecks size={14} /> 单选题
          </button>
        </div>,
        document.body,
      )}

      {/* Zoom controls */}
      <div
        className="fixed flex items-center gap-1 rounded-xl border border-slate-200/80 bg-white/90 p-1 shadow-sm backdrop-blur-sm"
        style={{
          left: viewportBounds.left + 12,
          top: viewportBounds.bottom - 44,
          zIndex: HUD_LAYER,
          visibility: hudVisible ? 'visible' : 'hidden',
        }}
      >
        <button
          onClick={handleZoomOut}
          title="缩小 (Ctrl+滚轮向下)"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"
        >
          <ZoomOut size={14} />
        </button>
        <span className="min-w-[3rem] select-none px-1 text-center text-xs font-semibold text-slate-600">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          title="放大 (Ctrl+滚轮向上)"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"
        >
          <ZoomIn size={14} />
        </button>
        <div className="mx-0.5 h-4 w-px bg-slate-200" />
        <button
          onClick={handleFit}
          title="适应屏幕"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"
        >
          <Maximize size={14} />
        </button>
        <button
          onClick={handleActualSize}
          title="实际大小 (100%)"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"
        >
          <Shrink size={14} />
        </button>
      </div>

      {/* Smart guides toggle */}
      <button
        onClick={() => setSmartGuidesEnabled((v) => !v)}
        title={smartGuidesEnabled ? '隐藏智能参考线' : '显示智能参考线'}
        aria-label={smartGuidesEnabled ? '隐藏智能参考线' : '显示智能参考线'}
        aria-pressed={smartGuidesEnabled}
        className={`fixed flex h-8 w-8 items-center justify-center rounded-full border shadow-sm transition hover:scale-105 ${
          smartGuidesEnabled
            ? 'border-blue-300 bg-blue-50 text-blue-600'
            : 'border-slate-200 bg-white text-slate-500'
        }`}
        style={{
          left: viewportBounds.right - 84,
          top: viewportBounds.top + 12,
          zIndex: HUD_LAYER,
          visibility: hudVisible ? 'visible' : 'hidden',
        }}
      >
        <Ruler size={16} />
      </button>

      {/* Grid toggle */}
      <button
        onClick={() => setShowGrid((v) => !v)}
        title={showGrid ? '隐藏网格' : '显示网格'}
        aria-label={showGrid ? '隐藏网格' : '显示网格'}
        aria-pressed={showGrid}
        className={`fixed flex h-8 w-8 items-center justify-center rounded-full border shadow-sm transition hover:scale-105 ${
          showGrid ? 'border-blue-300 bg-blue-50 text-blue-600' : 'border-slate-200 bg-white text-slate-500'
        }`}
        style={{
          left: viewportBounds.right - 44,
          top: viewportBounds.top + 12,
          zIndex: HUD_LAYER,
          visibility: hudVisible ? 'visible' : 'hidden',
        }}
      >
        <Grid3X3 size={16} />
      </button>
    </div>
  );
}
