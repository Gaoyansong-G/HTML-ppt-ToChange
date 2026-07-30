import { useState } from 'react';
import type { Slide, Element } from '@courseware/shared';
import { useEditorStore } from '../stores/editor.store';
import { useHistoryStore } from '../stores/history.store';
import { Type, Square } from 'lucide-react';
import { TabPanel } from './property/TabPanel';
import { GeometrySection } from './property/GeometrySection';
import { StyleSection } from './property/StyleSection';
import { TextStyleControls } from './property/TextStyleControls';
import { LayerActions } from './property/LayerActions';
import { SlideProperties } from './property/SlideProperties';
import { CollapsibleSection } from './property/CollapsibleSection';
import { BlockPropertyPanel } from './property/BlockPropertyPanel';
import { InteractivePropertyPanel } from './property/InteractivePropertyPanel';
import { InteractionBehaviorEditor } from './property/InteractionBehaviorEditor';
import { AssetLibrary } from './assets/AssetLibrary';
import { assetTypeLabel, formatFileSize } from './assets/asset-utils';
import { useCoursewareAssets } from './assets/useCoursewareAssets';

function findNestedElement(element: Element, elementId: string): Element | undefined {
  if (element.id === elementId) return element;
  if (element.type !== 'group') return undefined;

  const children = (element.content as { children?: unknown }).children;
  if (!Array.isArray(children)) return undefined;
  for (const child of children as Element[]) {
    const match = findNestedElement(child, elementId);
    if (match) return match;
  }
  return undefined;
}

export function PropertyPanel() {
  const {
    courseware,
    currentSlideId,
    selectedElementId,
    selectedElementIds,
    updateSlide,
    updateElement,
    deleteElement,
    duplicateElement,
    deleteSelectedElements,
    duplicateSelectedElements,
    groupSelectedElements,
    ungroupSelectedElement,
    distributeElements,
    bringToFront,
    sendToBack,
  } = useEditorStore();
  const { record } = useHistoryStore();

  const currentSlide = courseware.slides.find((s) => s.id === currentSlideId);
  const selectedElement = currentSlide?.elements.find((e) => e.id === selectedElementId);

  const handleSlideChange = (updates: Partial<Slide>) => {
    if (!currentSlide) return;
    record(
      courseware,
      `slide:${currentSlide.id}:${Object.keys(updates).sort().join(',')}`,
    );
    updateSlide(currentSlide.id, (slide) => {
      Object.assign(slide, updates);
    });
  };

  const handleElementGeometryChange = (updates: Partial<Element['geometry']>) => {
    if (!currentSlide || !selectedElement) return;
    record(courseware, `geometry:${currentSlide.id}:${selectedElement.id}:${Object.keys(updates).sort().join(',')}`);
    updateElement(currentSlide.id, selectedElement.id, (el) => {
      Object.assign(el.geometry, updates);
    });
  };

  const handleElementStyleChange = (updates: Partial<Element['style']>) => {
    if (!currentSlide || !selectedElement) return;
    record(courseware, `style:${currentSlide.id}:${selectedElement.id}:${Object.keys(updates).sort().join(',')}`);
    updateElement(currentSlide.id, selectedElement.id, (el) => {
      Object.assign(el.style, updates);
    });
  };

  const handleElementContentChange = (field: string, value: unknown) => {
    if (!currentSlide || !selectedElement) return;
    record(courseware, `content:${currentSlide.id}:${selectedElement.id}:${field}`);
    updateElement(currentSlide.id, selectedElement.id, (el) => {
      (el.content as Record<string, unknown>)[field] = value;
    });
  };

  const handleQuizContentChange = (updates: Partial<{
    type?: string;
    question?: string;
    options?: { id: string; text: string; isCorrect?: boolean; explanation?: string }[];
    correctAnswer?: string | string[];
    explanation?: string;
    hint?: string;
    allowRetry?: boolean;
    placeholder?: string;
  }>) => {
    if (!currentSlide || !selectedElement) return;
    record(courseware, `quiz:${currentSlide.id}:${selectedElement.id}:${Object.keys(updates).sort().join(',')}`);
    updateElement(currentSlide.id, selectedElement.id, (el) => {
      el.content = { ...el.content, ...updates };
    });
  };

  const handleInteractionsChange = (
    interactions: Element['interactions'],
    coalesceKey?: string,
  ) => {
    if (!currentSlide || !selectedElement) return;
    record(
      courseware,
      coalesceKey
        ? `${currentSlide.id}:${selectedElement.id}:${coalesceKey}`
        : undefined,
    );
    updateElement(currentSlide.id, selectedElement.id, (el) => {
      el.interactions = interactions;
    });
  };

  const handleSetInitiallyHidden = (elementId: string, hidden: boolean) => {
    if (!currentSlide) return;
    const owner = currentSlide.elements.find((element) => findNestedElement(element, elementId));
    const target = owner ? findNestedElement(owner, elementId) : undefined;
    if (!owner || !target || target.initiallyHidden === hidden) return;
    record(courseware);
    updateElement(currentSlide.id, owner.id, (element) => {
      const nestedTarget = findNestedElement(element, elementId);
      if (nestedTarget) nestedTarget.initiallyHidden = hidden;
    });
  };

  const handleDelete = () => {
    if (!currentSlide || !selectedElement) return;
    record(courseware);
    deleteElement(currentSlide.id, selectedElement.id);
  };

  const handleDuplicate = () => {
    if (!currentSlide || !selectedElement) return;
    record(courseware);
    duplicateElement(currentSlide.id, selectedElement.id);
  };

  const handleDistribute = (axis: 'horizontal' | 'vertical') => {
    if (!currentSlide) return;
    record(courseware);
    distributeElements(currentSlide.id, axis);
  };

  const handleBringToFront = () => {
    if (!currentSlide || !selectedElement) return;
    record(courseware);
    bringToFront(currentSlide.id, selectedElement.id);
  };

  const handleSendToBack = () => {
    if (!currentSlide || !selectedElement) return;
    record(courseware);
    sendToBack(currentSlide.id, selectedElement.id);
  };

  const handleDeleteSelected = () => {
    if (!currentSlide) return;
    record(courseware);
    deleteSelectedElements(currentSlide.id);
  };

  const handleDuplicateSelected = () => {
    if (!currentSlide) return;
    record(courseware);
    duplicateSelectedElements(currentSlide.id);
  };

  const handleGroupSelected = () => {
    if (!currentSlide) return;
    record(courseware);
    groupSelectedElements(currentSlide.id);
  };

  const handleUngroup = () => {
    if (!currentSlide || !selectedElement) return;
    record(courseware);
    ungroupSelectedElement(currentSlide.id, selectedElement.id);
  };

  const handleBringToFrontSelected = () => {
    if (!currentSlide || !selectedElementId) return;
    record(courseware);
    bringToFront(currentSlide.id, selectedElementId);
  };

  const handleSendToBackSelected = () => {
    if (!currentSlide || !selectedElementId) return;
    record(courseware);
    sendToBack(currentSlide.id, selectedElementId);
  };

  if (!currentSlide) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="border-b border-white/60 bg-white/80 px-4 py-3 backdrop-blur-sm">
          <h2 className="font-semibold text-slate-800">属性面板</h2>
        </div>
        <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
          请选择一个页面
        </div>
      </div>
    );
  }

  if (!selectedElement) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="border-b border-white/60 bg-white/80 px-4 py-3 backdrop-blur-sm">
          <h2 className="font-semibold text-slate-800">页面属性</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <SlideProperties slide={currentSlide} onChange={handleSlideChange} />
        </div>
      </div>
    );
  }

  if (selectedElementIds.length > 1) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/60 bg-white/80 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Square size={16} className="text-slate-600" />
            <span className="font-semibold text-slate-800">已选择 {selectedElementIds.length} 个元素</span>
          </div>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          <div className="rounded-xl border border-white/60 bg-white/80 p-3 shadow-sm backdrop-blur-sm">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">批量操作</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleDuplicateSelected}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
              >
                批量复制
              </button>
              <button
                onClick={handleDeleteSelected}
                className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 shadow-sm transition hover:bg-red-50"
              >
                批量删除
              </button>
              <button
                onClick={handleBringToFrontSelected}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
              >
                置顶
              </button>
              <button
                onClick={handleSendToBackSelected}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
              >
                置底
              </button>
              <button
                onClick={handleGroupSelected}
                className="col-span-2 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-300 hover:bg-slate-200"
              >
                组合
              </button>
            </div>
          </div>
          <CollapsibleSection title="对齐与分布" defaultOpen>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleDistribute('horizontal')}
                className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-200"
              >
                水平分布
              </button>
              <button
                onClick={() => handleDistribute('vertical')}
                className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-200"
              >
                垂直分布
              </button>
            </div>
          </CollapsibleSection>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'appearance', label: '外观' },
    { id: 'content', label: '内容' },
    { id: 'interactions', label: '交互' },
  ];

  const isText = selectedElement.type === 'text';
  const isBlock = selectedElement.type === 'block';
  const isInteractive = selectedElement.type === 'interactive';

  // Block 元素：版式属性面板置于通用外观属性之上，替代 Tab 布局
  if (isBlock) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Square size={16} className="text-slate-600" />
            <span className="font-semibold text-slate-800">
              {selectedElement.name || '版式组件'}
            </span>
          </div>
          <LayerActions
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onBringToFront={handleBringToFront}
            onSendToBack={handleSendToBack}
          />
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/30 p-4">
          <BlockPropertyPanel element={selectedElement} slideId={currentSlide.id} />

          <CollapsibleSection title="元素行为" defaultOpen={false}>
            <InteractionBehaviorEditor
              element={selectedElement}
              slideElements={currentSlide.elements}
              slides={courseware.slides}
              onChange={handleInteractionsChange}
              onSetInitiallyHidden={handleSetInitiallyHidden}
            />
          </CollapsibleSection>

          <CollapsibleSection title="位置与尺寸" defaultOpen={false}>
            <GeometrySection
              geometry={selectedElement.geometry}
              onChange={handleElementGeometryChange}
              onDistribute={handleDistribute}
            />
          </CollapsibleSection>

          <CollapsibleSection title="样式" defaultOpen={false}>
            <StyleSection
              style={selectedElement.style}
              onChange={handleElementStyleChange}
              showTextControls={false}
            />
          </CollapsibleSection>
        </div>
      </div>
    );
  }

  if (isInteractive) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Square size={16} className="text-slate-600" />
            <span className="font-semibold text-slate-800">
              {selectedElement.name || '课堂互动'}
            </span>
          </div>
          <LayerActions
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onBringToFront={handleBringToFront}
            onSendToBack={handleSendToBack}
          />
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/30 p-4">
          <InteractivePropertyPanel element={selectedElement} slideId={currentSlide.id} />

          <CollapsibleSection title="完成后的联动" defaultOpen={false}>
            <InteractionBehaviorEditor
              element={selectedElement}
              slideElements={currentSlide.elements}
              slides={courseware.slides}
              onChange={handleInteractionsChange}
              onSetInitiallyHidden={handleSetInitiallyHidden}
            />
          </CollapsibleSection>

          <CollapsibleSection title="位置与尺寸" defaultOpen={false}>
            <GeometrySection
              geometry={selectedElement.geometry}
              onChange={handleElementGeometryChange}
              onDistribute={handleDistribute}
            />
          </CollapsibleSection>

          <CollapsibleSection title="样式" defaultOpen={false}>
            <StyleSection
              style={selectedElement.style}
              onChange={handleElementStyleChange}
              showTextControls={false}
            />
          </CollapsibleSection>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          {selectedElement.type === 'text' ? <Type size={16} className="text-slate-600" /> : <Square size={16} className="text-slate-600" />}
          <span className="font-semibold text-slate-800">
            {selectedElement.name || selectedElement.type}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {selectedElement.type === 'group' && (
            <button
              onClick={handleUngroup}
              className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-200"
            >
              取消组合
            </button>
          )}
          <LayerActions
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onBringToFront={handleBringToFront}
            onSendToBack={handleSendToBack}
          />
        </div>
      </div>

      <TabPanel tabs={tabs}>
        {(activeTab) => {
          if (activeTab === 'appearance') {
            return (
              <div className="space-y-3">
                <CollapsibleSection title="位置与尺寸" defaultOpen>
                  <GeometrySection
                    geometry={selectedElement.geometry}
                    onChange={handleElementGeometryChange}
                    onDistribute={handleDistribute}
                  />
                </CollapsibleSection>

                <CollapsibleSection title="样式" defaultOpen>
                  <StyleSection
                    style={selectedElement.style}
                    onChange={handleElementStyleChange}
                    showTextControls={isText}
                  >
                    {isText && (
                      <TextStyleControls
                        style={selectedElement.style}
                        onChange={handleElementStyleChange}
                      />
                    )}
                  </StyleSection>
                </CollapsibleSection>

                <CollapsibleSection title="播放初始状态" defaultOpen={false}>
                  <label className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={selectedElement.initiallyHidden === true}
                      onChange={(event) =>
                        handleSetInitiallyHidden(selectedElement.id, event.target.checked)
                      }
                      className="mt-0.5 h-4 w-4 accent-blue-600"
                    />
                    <span>
                      播放开始时隐藏
                      <span className="mt-1 block text-xs leading-relaxed text-slate-500">
                        适合答案、提示等内容；可再为其他元素设置“显示元素”行为。
                      </span>
                    </span>
                  </label>
                </CollapsibleSection>
              </div>
            );
          }

          if (activeTab === 'content') {
            return (
              <CollapsibleSection title="内容" defaultOpen>
                <div className="rounded-xl border border-white/60 bg-white/80 p-3 shadow-sm backdrop-blur-sm">
                  {isText ? (
                    <textarea
                      value={(selectedElement.content as { text?: string }).text || ''}
                      onChange={(e) => handleElementContentChange('text', e.target.value)}
                      placeholder="输入文本内容"
                      className="min-h-[120px] w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                    />
                  ) : selectedElement.type === 'shape' ? (
                    <ShapeContentEditor
                      content={selectedElement.content as { shapeType?: string; fill?: string; stroke?: string; strokeWidth?: number }}
                      onChange={handleElementContentChange}
                    />
                  ) : selectedElement.type === 'image' ? (
                    <ImageContentEditor
                      content={selectedElement.content as { assetId?: string; alt?: string; objectFit?: string }}
                      onChange={handleElementContentChange}
                    />
                  ) : selectedElement.type === 'audio' || selectedElement.type === 'video' ? (
                    <MediaContentEditor
                      mediaType={selectedElement.type}
                      content={selectedElement.content as {
                        assetId?: string;
                        autoPlay?: boolean;
                        loop?: boolean;
                        controls?: boolean;
                      }}
                      onChange={handleElementContentChange}
                    />
                  ) : selectedElement.type === 'quiz' ? (
                    <QuizContentEditor
                      content={selectedElement.content as {
                        type?: string;
                        question?: string;
                        options?: { id: string; text: string; isCorrect?: boolean; explanation?: string }[];
                        correctAnswer?: string | string[];
                        explanation?: string;
                        hint?: string;
                        allowRetry?: boolean;
                        placeholder?: string;
                      }}
                      onChange={handleQuizContentChange}
                    />
                  ) : selectedElement.type === 'formula' ? (
                    <FormulaContentEditor
                      content={selectedElement.content as { latex?: string; displayMode?: boolean }}
                      onChange={handleElementContentChange}
                    />
                  ) : selectedElement.type === 'diagram' ? (
                    <DiagramContentEditor
                      content={selectedElement.content as { type?: string; definition?: string }}
                      onChange={handleElementContentChange}
                    />
                  ) : (
                    <p className="text-sm text-slate-500">该元素类型暂无内容编辑</p>
                  )}
                </div>
              </CollapsibleSection>
            );
          }

          return (
            <CollapsibleSection title="交互" defaultOpen>
              <InteractionBehaviorEditor
                element={selectedElement}
                slideElements={currentSlide.elements}
                slides={courseware.slides}
                onChange={handleInteractionsChange}
                onSetInitiallyHidden={handleSetInitiallyHidden}
              />
            </CollapsibleSection>
          );
        }}
      </TabPanel>
    </div>
  );
}

function ShapeContentEditor({
  content,
  onChange,
}: {
  content: { shapeType?: string; fill?: string; stroke?: string; strokeWidth?: number };
  onChange: (field: string, value: unknown) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-500">形状</label>
        <select
          value={content.shapeType || 'rectangle'}
          onChange={(e) => onChange('shapeType', e.target.value)}
          className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
        >
          <option value="rectangle">矩形</option>
          <option value="circle">圆形</option>
          <option value="triangle">三角形</option>
          <option value="arrow">箭头</option>
          <option value="star">星形</option>
          <option value="callout">对话框</option>
        </select>
      </div>

      <div className="flex items-center justify-between">
        <label className="text-xs text-slate-500">填充色</label>
        <input
          type="color"
          value={content.fill || '#3b82f6'}
          onChange={(e) => onChange('fill', e.target.value)}
          className="h-7 w-7 rounded border border-slate-300"
        />
      </div>

      <div className="flex items-center justify-between">
        <label className="text-xs text-slate-500">描边色</label>
        <input
          type="color"
          value={content.stroke || '#1d4ed8'}
          onChange={(e) => onChange('stroke', e.target.value)}
          className="h-7 w-7 rounded border border-slate-300"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-500">描边宽度</label>
        <input
          type="number"
          min={0}
          value={content.strokeWidth ?? 2}
          onChange={(e) => onChange('strokeWidth', Number(e.target.value))}
          className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
        />
      </div>
    </div>
  );
}

function FormulaContentEditor({
  content,
  onChange,
}: {
  content: { latex?: string; displayMode?: boolean };
  onChange: (field: string, value: unknown) => void;
}) {
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500">LaTeX 公式</span>
        <textarea
          value={content.latex || ''}
          onChange={(event) => onChange('latex', event.target.value)}
          placeholder={'例如：\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}'}
          spellCheck={false}
          className="min-h-[120px] w-full rounded-lg border border-slate-200 bg-white p-2.5 font-mono text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={content.displayMode ?? true}
          onChange={(event) => onChange('displayMode', event.target.checked)}
          className="h-4 w-4 accent-blue-600"
        />
        使用独立公式布局
      </label>
      <p className="text-xs leading-relaxed text-slate-400">修改后画布会立即重新渲染，可在预览中确认最终字号与换行。</p>
    </div>
  );
}

function DiagramContentEditor({
  content,
  onChange,
}: {
  content: { type?: string; definition?: string };
  onChange: (field: string, value: unknown) => void;
}) {
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500">图表格式</span>
        <select
          value={content.type || 'mermaid'}
          onChange={(event) => onChange('type', event.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm"
        >
          <option value="mermaid">Mermaid</option>
          <option value="custom">自定义定义</option>
          <option value="excalidraw">Excalidraw 数据</option>
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500">图表定义</span>
        <textarea
          value={content.definition || ''}
          onChange={(event) => onChange('definition', event.target.value)}
          placeholder={'flowchart LR\n  A[开始] --> B[讲解]\n  B --> C[练习]'}
          spellCheck={false}
          className="min-h-[180px] w-full rounded-lg border border-slate-200 bg-slate-950 p-2.5 font-mono text-xs leading-relaxed text-slate-100 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </label>
      <p className="text-xs leading-relaxed text-slate-400">Mermaid 输入有语法错误时会显示错误提示，不会影响其他页面。</p>
    </div>
  );
}

function ImageContentEditor({
  content,
  onChange,
}: {
  content: { assetId?: string; alt?: string; objectFit?: string };
  onChange: (field: string, value: unknown) => void;
}) {
  const { assets, addAssets, removeAsset, getUsages } = useCoursewareAssets();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const currentAsset = assets.find((asset) => asset.id === content.assetId);

  const selectAsset = (asset: (typeof assets)[number]) => {
    onChange('assetId', asset.id);
    if (!content.alt?.trim()) {
      onChange('alt', asset.description || asset.filename.replace(/\.[^.]+$/, ''));
    }
    setLibraryOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-white p-2">
          {currentAsset ? (
            <img
              src={currentAsset.url}
              alt={content.alt || currentAsset.filename}
              className="h-full w-full"
              style={{ objectFit: (content.objectFit || 'contain') as React.CSSProperties['objectFit'] }}
            />
          ) : (
            <div className="px-4 text-center text-xs leading-5 text-slate-400">
              {content.assetId ? '原图片素材已丢失，请重新选择' : '尚未选择图片'}
            </div>
          )}
        </div>
        <div className="border-t border-slate-200 px-3 py-2">
          {currentAsset ? (
            <>
              <div className="truncate text-xs font-semibold text-slate-700" title={currentAsset.filename}>
                {currentAsset.filename}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                {formatFileSize(currentAsset.size)}
                {currentAsset.width && currentAsset.height
                  ? ` · ${currentAsset.width} × ${currentAsset.height}`
                  : ''}
              </div>
            </>
          ) : (
            <span className="text-xs text-amber-600">选择或上传图片后即可显示</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setLibraryOpen(true)}
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          {currentAsset ? '替换图片' : '选择图片'}
        </button>
        <button
          type="button"
          onClick={() => onChange('assetId', '')}
          disabled={!content.assetId}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          移除图片
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">图片替代文本</label>
        <input
          type="text"
          value={content.alt || ''}
          onChange={(e) => onChange('alt', e.target.value)}
          placeholder="例如：长江两岸的山水风景"
          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
        />
        <p className="text-[11px] leading-4 text-slate-400">用于无障碍阅读，也会在图片加载失败时显示。</p>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">图片显示方式</label>
        <select
          value={content.objectFit || 'contain'}
          onChange={(e) => onChange('objectFit', e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
        >
          <option value="contain">完整显示（可能留白）</option>
          <option value="cover">铺满区域（可能裁切）</option>
          <option value="fill">拉伸填满</option>
        </select>
      </div>

      <AssetLibrary
        open={libraryOpen}
        assets={assets}
        filter="image"
        title="选择图片"
        selectedAssetId={content.assetId}
        selectionMode
        onClose={() => setLibraryOpen(false)}
        onAssetsAdded={addAssets}
        onSelect={selectAsset}
        onDelete={removeAsset}
        getUsageCount={(assetId) => getUsages(assetId).length}
      />
    </div>
  );
}

function MediaContentEditor({
  mediaType,
  content,
  onChange,
}: {
  mediaType: 'audio' | 'video';
  content: { assetId?: string; autoPlay?: boolean; loop?: boolean; controls?: boolean };
  onChange: (field: string, value: unknown) => void;
}) {
  const { assets, addAssets, removeAsset, getUsages } = useCoursewareAssets();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const currentAsset = assets.find(
    (asset) => asset.id === content.assetId && asset.type === mediaType,
  );
  const label = assetTypeLabel(mediaType);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        <div className="flex min-h-[112px] items-center justify-center bg-white p-3">
          {currentAsset ? (
            mediaType === 'audio' ? (
              <audio src={currentAsset.url} controls preload="metadata" className="w-full" />
            ) : (
              <video
                src={currentAsset.url}
                controls
                preload="metadata"
                className="max-h-44 max-w-full rounded-lg"
              />
            )
          ) : (
            <div className="text-center text-xs leading-5 text-slate-400">
              {content.assetId ? `原${label}素材已丢失，请重新选择` : `尚未选择${label}`}
            </div>
          )}
        </div>
        {currentAsset && (
          <div className="border-t border-slate-200 px-3 py-2">
            <div className="truncate text-xs font-semibold text-slate-700" title={currentAsset.filename}>
              {currentAsset.filename}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">{formatFileSize(currentAsset.size)}</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setLibraryOpen(true)}
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          {currentAsset ? `替换${label}` : `选择${label}`}
        </button>
        <button
          type="button"
          onClick={() => onChange('assetId', '')}
          disabled={!content.assetId}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          移除{label}
        </button>
      </div>

      <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
        <label className="flex items-center justify-between gap-3 text-sm text-slate-700">
          <span>进入页面时自动播放</span>
          <input
            type="checkbox"
            checked={content.autoPlay ?? false}
            onChange={(event) => onChange('autoPlay', event.target.checked)}
            className="h-4 w-4 accent-slate-700"
          />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm text-slate-700">
          <span>循环播放</span>
          <input
            type="checkbox"
            checked={content.loop ?? false}
            onChange={(event) => onChange('loop', event.target.checked)}
            className="h-4 w-4 accent-slate-700"
          />
        </label>
        {mediaType === 'video' && (
          <label className="flex items-center justify-between gap-3 text-sm text-slate-700">
            <span>显示播放控件</span>
            <input
              type="checkbox"
              checked={content.controls ?? true}
              onChange={(event) => onChange('controls', event.target.checked)}
              className="h-4 w-4 accent-slate-700"
            />
          </label>
        )}
      </div>

      {content.autoPlay && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-4 text-amber-700">
          浏览器可能会阻止带声音的自动播放；课堂使用前建议先预览一次。
        </p>
      )}

      <AssetLibrary
        open={libraryOpen}
        assets={assets}
        filter={mediaType}
        title={`选择${label}`}
        selectedAssetId={content.assetId}
        selectionMode
        onClose={() => setLibraryOpen(false)}
        onAssetsAdded={addAssets}
        onSelect={(asset) => {
          onChange('assetId', asset.id);
          setLibraryOpen(false);
        }}
        onDelete={removeAsset}
        getUsageCount={(assetId) => getUsages(assetId).length}
      />
    </div>
  );
}

interface QuizContent {
  type?: string;
  question?: string;
  options?: { id: string; text: string; isCorrect?: boolean; explanation?: string }[];
  correctAnswer?: string | string[];
  explanation?: string;
  hint?: string;
  allowRetry?: boolean;
  placeholder?: string;
}

function QuizContentEditor({
  content,
  onChange,
}: {
  content: QuizContent;
  onChange: (updates: Partial<QuizContent>) => void;
}) {
  const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const quizType = content.type || 'single-choice';
  const isChoice = quizType === 'single-choice' || quizType === 'multiple-choice';
  const isFillBlank = quizType === 'fill-blank';

  const options = content.options || [];

  const handleTypeChange = (newType: string) => {
    if (newType === quizType) return;
    const updates: Partial<QuizContent> = { type: newType };
    if (newType === 'single-choice') {
      updates.options = options.length
        ? options.map((o, i) => ({ ...o, isCorrect: i === 0 }))
        : [
            { id: generateId('opt'), text: '选项 A', isCorrect: true },
            { id: generateId('opt'), text: '选项 B', isCorrect: false },
          ];
      updates.correctAnswer = updates.options.find((o) => o.isCorrect)?.id || '';
    } else if (newType === 'multiple-choice') {
      updates.options = options.length
        ? options.map((o) => ({ ...o, isCorrect: false }))
        : [
            { id: generateId('opt'), text: '选项 A', isCorrect: false },
            { id: generateId('opt'), text: '选项 B', isCorrect: false },
          ];
      updates.correctAnswer = [];
    } else if (newType === 'fill-blank') {
      updates.options = undefined;
      updates.correctAnswer = Array.isArray(content.correctAnswer)
        ? content.correctAnswer[0] || ''
        : content.correctAnswer || '';
    } else if (newType === 'reveal') {
      updates.options = undefined;
      updates.correctAnswer = Array.isArray(content.correctAnswer)
        ? content.correctAnswer.join(', ')
        : content.correctAnswer || '';
    }
    onChange(updates);
  };

  const updateOption = (index: number, updates: Partial<typeof options[0]>) => {
    const next = options.map((o, i) => (i === index ? { ...o, ...updates } : { ...o }));
    if (quizType === 'single-choice' && updates.isCorrect) {
      next.forEach((o, i) => {
        if (i !== index) o.isCorrect = false;
      });
    }
    const correctIds = next.filter((o) => o.isCorrect).map((o) => o.id);
    onChange({
      options: next,
      correctAnswer: quizType === 'multiple-choice' ? correctIds : correctIds[0] || '',
    });
  };

  const addOption = () => {
    const next = [
      ...options,
      { id: generateId('opt'), text: `选项 ${String.fromCharCode(65 + options.length)}`, isCorrect: false },
    ];
    onChange({ options: next });
  };

  const deleteOption = (index: number) => {
    const next = options.filter((_, i) => i !== index);
    const correctIds = next.filter((o) => o.isCorrect).map((o) => o.id);
    onChange({
      options: next,
      correctAnswer: quizType === 'multiple-choice' ? correctIds : correctIds[0] || '',
    });
  };

  const correctAnswerText = Array.isArray(content.correctAnswer)
    ? content.correctAnswer.join(', ')
    : content.correctAnswer || '';

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-500">题型</label>
        <select
          aria-label="题型"
          value={quizType}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
        >
          <option value="single-choice">单选题</option>
          <option value="multiple-choice">多选题</option>
          <option value="fill-blank">填空题</option>
          <option value="reveal">揭示题</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-500">题目</label>
        <textarea
          aria-label="题目"
          data-testid="quiz-question-input"
          value={content.question || ''}
          onChange={(e) => onChange({ question: e.target.value })}
          className="min-h-[80px] w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
        />
      </div>

      {isChoice && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">选项</span>
            <button
              data-testid="add-quiz-option"
              onClick={addOption}
              className="rounded-lg border border-dashed border-slate-300 px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-50"
            >
              + 添加选项
            </button>
          </div>
          {options.map((option, index) => (
            <div key={option.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
              <input
                aria-label={`将“${option.text || `选项 ${index + 1}`}”设为正确答案`}
                type={quizType === 'multiple-choice' ? 'checkbox' : 'radio'}
                checked={!!option.isCorrect}
                onChange={(e) => updateOption(index, { isCorrect: e.target.checked })}
                className="h-4 w-4 accent-slate-600"
              />
              <input
                aria-label={`选项 ${index + 1}`}
                type="text"
                data-testid="quiz-option-text"
                value={option.text}
                onChange={(e) => updateOption(index, { text: e.target.value })}
                className="min-w-0 flex-1 rounded border border-slate-200 px-2 py-1 text-sm"
              />
              <button
                aria-label={`删除选项 ${index + 1}`}
                onClick={() => deleteOption(index)}
                className="text-xs text-red-600 hover:underline"
              >
                删除
              </button>
            </div>
          ))}
          {options.length === 0 && (
            <p className="text-sm text-slate-500">点击“添加选项”创建答案选项。</p>
          )}
        </div>
      )}

      {!isChoice && (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500">{isFillBlank ? '正确答案' : '揭示内容'}</label>
          <input
            aria-label={isFillBlank ? '正确答案' : '揭示内容'}
            type="text"
            value={correctAnswerText}
            onChange={(e) =>
              onChange({
                correctAnswer: isFillBlank ? e.target.value : e.target.value,
              })
            }
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
          />
        </div>
      )}

      {isFillBlank && (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500">占位提示</label>
          <input
            aria-label="占位提示"
            type="text"
            value={content.placeholder || ''}
            onChange={(e) => onChange({ placeholder: e.target.value })}
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
          />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-500">提示</label>
        <input
          aria-label="提示"
          type="text"
          value={content.hint || ''}
          onChange={(e) => onChange({ hint: e.target.value })}
          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-500">解析</label>
        <textarea
          aria-label="解析"
          value={content.explanation || ''}
          onChange={(e) => onChange({ explanation: e.target.value })}
          className="min-h-[80px] w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={content.allowRetry ?? true}
          onChange={(e) => onChange({ allowRetry: e.target.checked })}
          className="h-4 w-4 accent-slate-600"
        />
        允许重试
      </label>
    </div>
  );
}
