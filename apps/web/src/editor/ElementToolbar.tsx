import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Type,
  Square,
  Circle,
  Triangle,
  Image as ImageIcon,
  ListChecks,
  CheckSquare,
  TextCursorInput,
  Star,
  MessageSquare,
  ArrowRight,
  Minus,
  FileAudio,
  FileVideo,
  Library,
  MousePointerClick,
  Sigma,
  UploadCloud,
  Workflow,
} from 'lucide-react';
import type { Asset, Element } from '@courseware/shared';
import { useEditorStore } from '../stores/editor.store';
import { useHistoryStore } from '../stores/history.store';
import {
  createTextElement,
  createShapeElement,
  createImageElement,
  createQuizElement,
  createButtonElement,
  createDiagramElement,
  createFormulaElement,
} from '../stores/element-factories';
import { AssetLibrary } from './assets/AssetLibrary';
import {
  AssetBatchUploadError,
  uploadAssetFiles,
  type AssetUploadProgress,
} from './assets/asset-utils';
import { useCoursewareAssets } from './assets/useCoursewareAssets';

interface ToolbarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  create?: () => Element;
  action?: () => void;
}

interface ToolbarGroup {
  label: string;
  labelColor?: string;
  items: ToolbarItem[];
}

type PickerFilter = 'all' | 'image' | 'audio' | 'video';

const SLIDE_WIDTH = 1280;
const SLIDE_HEIGHT = 720;
const PLACEMENT_GAP = 24;

function filenameWithoutExtension(filename: string): string {
  return filename.replace(/\.[^.]+$/, '') || filename;
}

function clampPlacement(element: Element, x: number, y: number) {
  return {
    x: Math.max(0, Math.min(SLIDE_WIDTH - element.geometry.width, Math.round(x))),
    y: Math.max(0, Math.min(SLIDE_HEIGHT - element.geometry.height, Math.round(y))),
  };
}

function overlapArea(element: Element, x: number, y: number, other: Element) {
  const width = Math.max(
    0,
    Math.min(x + element.geometry.width, other.geometry.x + other.geometry.width) -
      Math.max(x, other.geometry.x),
  );
  const height = Math.max(
    0,
    Math.min(y + element.geometry.height, other.geometry.y + other.geometry.height) -
      Math.max(y, other.geometry.y),
  );
  return width * height;
}

/**
 * Keep repeated insertions usable: place the next element beside the most
 * recently added one, then fall back to a slide-wide grid with the least
 * overlap. This avoids the old behaviour where every new control stacked in
 * the exact centre and appeared to be missing.
 */
function placeElementInAvailableSpace(element: Element, existing: Element[]) {
  if (existing.length === 0) return element;

  const recent = existing[existing.length - 1];
  const centeredX =
    recent.geometry.x + (recent.geometry.width - element.geometry.width) / 2;
  const centeredY =
    recent.geometry.y + (recent.geometry.height - element.geometry.height) / 2;
  const rawCandidates = [
    { x: centeredX, y: recent.geometry.y + recent.geometry.height + PLACEMENT_GAP },
    { x: centeredX, y: recent.geometry.y - element.geometry.height - PLACEMENT_GAP },
    { x: recent.geometry.x + recent.geometry.width + PLACEMENT_GAP, y: centeredY },
    { x: recent.geometry.x - element.geometry.width - PLACEMENT_GAP, y: centeredY },
    { x: element.geometry.x, y: element.geometry.y },
  ];

  for (let y = 32; y <= SLIDE_HEIGHT - element.geometry.height; y += 48) {
    for (let x = 32; x <= SLIDE_WIDTH - element.geometry.width; x += 48) {
      rawCandidates.push({ x, y });
    }
  }

  const seen = new Set<string>();
  const candidates = rawCandidates
    .map((candidate) => clampPlacement(element, candidate.x, candidate.y))
    .filter((candidate) => {
      const key = `${candidate.x}:${candidate.y}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  let best = candidates[0];
  let bestOverlap = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const totalOverlap = existing.reduce(
      (total, other) => total + overlapArea(element, candidate.x, candidate.y, other),
      0,
    );
    if (totalOverlap === 0) {
      best = candidate;
      break;
    }
    if (totalOverlap < bestOverlap) {
      best = candidate;
      bestOverlap = totalOverlap;
    }
  }

  if (best) {
    element.geometry.x = best.x;
    element.geometry.y = best.y;
  }
  element.geometry.zIndex =
    existing.reduce((maximum, item) => Math.max(maximum, item.geometry.zIndex), 0) + 1;
  return element;
}

function createAssetElement(asset: Asset): Element {
  if (asset.type === 'image') {
    const maxWidth = 440;
    const maxHeight = 320;
    const ratio = asset.width && asset.height ? asset.width / asset.height : 4 / 3;
    const width = ratio >= maxWidth / maxHeight ? maxWidth : Math.round(maxHeight * ratio);
    const height = ratio >= maxWidth / maxHeight ? Math.round(maxWidth / ratio) : maxHeight;
    const element = createImageElement(asset.id, { width, height });
    element.name = filenameWithoutExtension(asset.filename);
    element.content.alt = asset.description || filenameWithoutExtension(asset.filename);
    return element;
  }

  const now = Date.now();
  const common: Pick<Element, 'id' | 'geometry' | 'style' | 'animation' | 'interactions'> = {
    id: `el-${now}-${Math.random().toString(36).slice(2, 7)}`,
    geometry: {
      x: 400,
      y: asset.type === 'video' ? 225 : 310,
      width: 480,
      height: asset.type === 'video' ? 270 : 100,
      zIndex: 1,
    },
    style: {
      borderRadius: 12,
      shadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
    },
    animation: {
      entrance: [
        {
          id: `anim-${now}-${Math.random().toString(36).slice(2, 7)}`,
          type: 'fade',
          duration: 0.5,
          delay: 0,
          easing: 'power2.out',
          trigger: 'auto',
        },
      ],
      exit: [],
    },
    interactions: [],
  };

  if (asset.type === 'audio') {
    return {
      ...common,
      type: 'audio',
      semanticRole: 'example',
      name: filenameWithoutExtension(asset.filename),
      content: { assetId: asset.id, autoPlay: false, loop: false },
    };
  }

  return {
    ...common,
    type: 'video',
    semanticRole: 'example',
    name: filenameWithoutExtension(asset.filename),
    content: { assetId: asset.id, autoPlay: false, loop: false, controls: true },
  };
}

export function ElementToolbar() {
  const { courseware, currentSlideId, addElement } = useEditorStore();
  const { record } = useHistoryStore();
  const { assets, addAssets, removeAsset, getUsages } = useCoursewareAssets();
  const [picker, setPicker] = useState<{ open: boolean; filter: PickerFilter; insert: boolean }>({
    open: false,
    filter: 'all',
    insert: false,
  });
  const [isFileDragging, setIsFileDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<AssetUploadProgress | null>(null);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );
  const messageTimerRef = useRef<number | null>(null);

  const currentSlide = currentSlideId ? courseware.slides.find((s) => s.id === currentSlideId) : null;

  const handleAdd = (create: () => Element) => {
    if (!currentSlide) return;
    record(courseware);
    const element = placeElementInAvailableSpace(create(), currentSlide.elements);
    addElement(currentSlide.id, element);
  };

  const openPicker = (filter: PickerFilter, insert: boolean) => {
    setPicker({ open: true, filter, insert });
  };

  const insertAsset = useCallback(
    (asset: Asset, shouldRecord = true) => {
      if (asset.type !== 'image' && asset.type !== 'audio' && asset.type !== 'video') return;
      const state = useEditorStore.getState();
      const slideId = state.currentSlideId;
      const slide = state.courseware.slides.find((item) => item.id === slideId);
      if (!slideId || !slide) return;
      if (shouldRecord) record(state.courseware);
      const element = placeElementInAvailableSpace(createAssetElement(asset), slide.elements);
      state.addElement(slideId, element);
    },
    [record],
  );

  const clearMessageLater = useCallback(() => {
    if (messageTimerRef.current) window.clearTimeout(messageTimerRef.current);
    messageTimerRef.current = window.setTimeout(() => setUploadMessage(null), 4500);
  }, []);

  const uploadAndInsert = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setUploadMessage(null);
      try {
        const uploaded = await uploadAssetFiles(files, setUploadProgress);
        addAssets(uploaded);
        uploaded.forEach((asset) => insertAsset(asset, false));
        setUploadMessage({
          type: 'success',
          text: `已上传并添加 ${uploaded.length} 个素材`,
        });
      } catch (error) {
        if (error instanceof AssetBatchUploadError && error.uploadedAssets.length > 0) {
          addAssets(error.uploadedAssets);
          error.uploadedAssets.forEach((asset) => insertAsset(asset, false));
        }
        setUploadMessage({
          type: 'error',
          text:
            error instanceof AssetBatchUploadError && error.uploadedAssets.length > 0
              ? `已添加前 ${error.uploadedAssets.length} 个成功素材；${error.message}`
              : error instanceof Error
                ? error.message
                : '上传失败，请重试',
        });
      } finally {
        setUploadProgress(null);
        clearMessageLater();
      }
    },
    [addAssets, clearMessageLater, insertAsset],
  );

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files || []);
      if (files.length === 0) return;
      event.preventDefault();
      void uploadAndInsert(files);
    };
    const handleDragOver = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes('Files')) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      setIsFileDragging(true);
    };
    const handleDragLeave = (event: DragEvent) => {
      if (event.relatedTarget === null) setIsFileDragging(false);
    };
    const handleDrop = (event: DragEvent) => {
      if (!event.dataTransfer?.files.length) return;
      event.preventDefault();
      setIsFileDragging(false);
      void uploadAndInsert(Array.from(event.dataTransfer.files));
    };

    window.addEventListener('paste', handlePaste);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
      if (messageTimerRef.current) window.clearTimeout(messageTimerRef.current);
    };
  }, [uploadAndInsert]);

  const groups: ToolbarGroup[] = [
    {
      label: '基础',
      labelColor: 'text-slate-500',
      items: [
        {
          id: 'text',
          label: '文本',
          icon: <Type size={16} className="text-slate-600" />,
          create: () => createTextElement('双击编辑文本'),
        },
        {
          id: 'image',
          label: '图片',
          icon: <ImageIcon size={16} className="text-slate-600" />,
          action: () => openPicker('image', true),
        },
        {
          id: 'audio',
          label: '音频',
          icon: <FileAudio size={16} className="text-slate-600" />,
          action: () => openPicker('audio', true),
        },
        {
          id: 'video',
          label: '视频',
          icon: <FileVideo size={16} className="text-slate-600" />,
          action: () => openPicker('video', true),
        },
      ],
    },
    {
      label: '形状',
      labelColor: 'text-slate-500',
      items: [
        { id: 'rect', label: '矩形', icon: <Square size={16} className="text-slate-600" />, create: () => createShapeElement('rectangle') },
        { id: 'circle', label: '圆形', icon: <Circle size={16} className="text-slate-600" />, create: () => createShapeElement('circle') },
        { id: 'triangle', label: '三角形', icon: <Triangle size={16} className="text-slate-600" />, create: () => createShapeElement('triangle') },
        { id: 'arrow', label: '箭头', icon: <ArrowRight size={16} className="text-slate-600" />, create: () => createShapeElement('arrow') },
        { id: 'line', label: '线条', icon: <Minus size={16} className="text-slate-600" />, create: () => createShapeElement('line') },
        { id: 'star', label: '星形', icon: <Star size={16} className="text-slate-600" />, create: () => createShapeElement('star') },
        { id: 'callout', label: '对话框', icon: <MessageSquare size={16} className="text-slate-600" />, create: () => createShapeElement('callout') },
      ],
    },
    {
      label: '交互',
      labelColor: 'text-slate-500',
      items: [
        {
          id: 'quiz-single',
          label: '单选题',
          icon: <ListChecks size={16} className="text-slate-600" />,
          create: () => createQuizElement('single-choice'),
        },
        {
          id: 'quiz-multi',
          label: '多选题',
          icon: <CheckSquare size={16} className="text-slate-600" />,
          create: () => createQuizElement('multiple-choice'),
        },
        {
          id: 'quiz-fill',
          label: '填空题',
          icon: <TextCursorInput size={16} className="text-slate-600" />,
          create: () => createQuizElement('fill-blank'),
        },
      ],
    },
    {
      label: 'HTML 控件',
      labelColor: 'text-blue-600',
      items: [
        {
          id: 'button',
          label: '交互按钮',
          icon: <MousePointerClick size={16} className="text-blue-600" />,
          create: () => createButtonElement(),
        },
        {
          id: 'formula',
          label: '公式',
          icon: <Sigma size={16} className="text-violet-600" />,
          create: () => createFormulaElement(),
        },
        {
          id: 'diagram',
          label: '流程图',
          icon: <Workflow size={16} className="text-emerald-600" />,
          create: () => createDiagramElement(),
        },
      ],
    },
  ];

  return (
    <>
      <div
        className="flex items-center gap-2 overflow-x-auto px-3 py-2 [scrollbar-width:thin]"
        aria-label="添加元素"
      >
        {groups.map((group) => (
          <div
            key={group.label}
            className="flex shrink-0 items-center gap-0.5 rounded-xl border border-white/60 bg-white/90 p-1 shadow-sm backdrop-blur-sm"
          >
            <span
              className={`hidden select-none px-2 text-[10px] font-bold uppercase tracking-wider lg:inline ${group.labelColor}`}
            >
              {group.label}
            </span>
            {group.items.map((btn) => (
              <button
                key={btn.id}
                onClick={() => {
                  if (btn.action) btn.action();
                  else if (btn.create) handleAdd(btn.create);
                }}
                disabled={!currentSlide}
                title={btn.label}
                className="flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border border-transparent px-2.5 py-1.5 text-sm font-medium text-slate-600 transition hover:border-slate-200 hover:bg-slate-50/80 hover:text-slate-900 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 disabled:opacity-40"
              >
                {btn.icon}
                <span className="hidden xl:inline">{btn.label}</span>
              </button>
            ))}
          </div>
        ))}
        <button
          type="button"
          onClick={() => openPicker('all', false)}
          title="管理当前课件的全部素材"
          className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl border border-white/60 bg-white/90 px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm backdrop-blur-sm transition hover:border-slate-200 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
        >
          <Library size={16} />
          <span className="hidden lg:inline">素材库</span>
          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
            {assets.length}
          </span>
        </button>
      </div>

      {isFileDragging && !picker.open && createPortal(
        <div className="pointer-events-none fixed inset-4 z-[110] flex items-center justify-center rounded-3xl border-2 border-dashed border-blue-500 bg-blue-50/90 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 text-blue-700">
            <UploadCloud size={42} />
            <span className="text-base font-bold">松开即可上传并添加到当前页面</span>
          </div>
        </div>,
        document.body,
      )}

      {(uploadProgress || uploadMessage) && createPortal(
        <div
          className={`fixed bottom-5 left-1/2 z-[115] min-w-[300px] -translate-x-1/2 rounded-xl border px-4 py-3 text-sm shadow-xl ${
            uploadMessage?.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-slate-200 bg-white text-slate-700'
          }`}
          role="status"
        >
          {uploadProgress ? (
            <div className="space-y-2">
              <div className="flex justify-between gap-4">
                <span className="max-w-[360px] truncate">正在上传：{uploadProgress.fileName}</span>
                <span>{uploadProgress.percent}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-600 transition-[width]"
                  style={{ width: `${uploadProgress.percent}%` }}
                />
              </div>
            </div>
          ) : (
            uploadMessage?.text
          )}
        </div>,
        document.body,
      )}

      <AssetLibrary
        open={picker.open}
        assets={assets}
        filter={picker.filter}
        title={
          picker.insert
            ? `选择${picker.filter === 'image' ? '图片' : picker.filter === 'audio' ? '音频' : '视频'}`
            : '素材库'
        }
        selectionMode={picker.insert}
        onClose={() => setPicker((state) => ({ ...state, open: false }))}
        onAssetsAdded={addAssets}
        onSelect={
          picker.insert
            ? (asset) => {
                insertAsset(asset);
                setPicker((state) => ({ ...state, open: false }));
              }
            : undefined
        }
        onDelete={removeAsset}
        getUsageCount={(assetId) => getUsages(assetId).length}
      />
    </>
  );
}
