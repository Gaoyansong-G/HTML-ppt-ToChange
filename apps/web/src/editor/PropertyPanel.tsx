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
    record(courseware);
    updateSlide(currentSlide.id, (slide) => {
      Object.assign(slide, updates);
    });
  };

  const handleElementGeometryChange = (updates: Partial<Element['geometry']>) => {
    if (!currentSlide || !selectedElement) return;
    record(courseware);
    updateElement(currentSlide.id, selectedElement.id, (el) => {
      Object.assign(el.geometry, updates);
    });
  };

  const handleElementStyleChange = (updates: Partial<Element['style']>) => {
    if (!currentSlide || !selectedElement) return;
    record(courseware);
    updateElement(currentSlide.id, selectedElement.id, (el) => {
      Object.assign(el.style, updates);
    });
  };

  const handleElementContentChange = (field: string, value: unknown) => {
    if (!currentSlide || !selectedElement) return;
    record(courseware);
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
    record(courseware);
    updateElement(currentSlide.id, selectedElement.id, (el) => {
      el.content = { ...el.content, ...updates };
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
                  ) : (
                    <p className="text-sm text-slate-500">该元素类型暂无内容编辑</p>
                  )}
                </div>
              </CollapsibleSection>
            );
          }

          return (
            <CollapsibleSection title="交互" defaultOpen>
              <InteractionEditor
                element={selectedElement}
                slideElements={currentSlide.elements}
                onChange={(interactions) => {
                  record(courseware);
                  updateElement(currentSlide.id, selectedElement.id, (el) => {
                    el.interactions = interactions;
                  });
                }}
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

function ImageContentEditor({
  content,
  onChange,
}: {
  content: { assetId?: string; alt?: string; objectFit?: string };
  onChange: (field: string, value: unknown) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-500">资源 ID</label>
        <input
          type="text"
          value={content.assetId || ''}
          onChange={(e) => onChange('assetId', e.target.value)}
          placeholder="输入图片资源 ID"
          className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-500">Alt 文本</label>
        <input
          type="text"
          value={content.alt || ''}
          onChange={(e) => onChange('alt', e.target.value)}
          placeholder="描述图片内容"
          className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-500">填充方式</label>
        <select
          value={content.objectFit || 'contain'}
          onChange={(e) => onChange('objectFit', e.target.value)}
          className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
        >
          <option value="contain">适应</option>
          <option value="cover">填充</option>
          <option value="fill">拉伸</option>
        </select>
      </div>
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
                type={quizType === 'multiple-choice' ? 'checkbox' : 'radio'}
                checked={!!option.isCorrect}
                onChange={(e) => updateOption(index, { isCorrect: e.target.checked })}
                className="h-4 w-4 accent-slate-600"
              />
              <input
                type="text"
                data-testid="quiz-option-text"
                value={option.text}
                onChange={(e) => updateOption(index, { text: e.target.value })}
                className="min-w-0 flex-1 rounded border border-slate-200 px-2 py-1 text-sm"
              />
              <button
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
          type="text"
          value={content.hint || ''}
          onChange={(e) => onChange({ hint: e.target.value })}
          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-500">解析</label>
        <textarea
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

function InteractionEditor({
  element,
  slideElements,
  onChange,
}: {
  element: Element;
  slideElements: Element[];
  onChange: (interactions: Element['interactions']) => void;
}) {
  const addInteraction = () => {
    const newInteraction: Element['interactions'][0] = {
      id: `int-${Date.now()}`,
      trigger: 'click',
      actions: [
        {
          id: `act-${Date.now()}`,
          type: 'show',
          targetId: slideElements.find((e) => e.id !== element.id)?.id || '',
        },
      ],
    };
    onChange([...element.interactions, newInteraction]);
  };

  const updateInteraction = (index: number, updater: (interaction: Element['interactions'][0]) => void) => {
    const updated = [...element.interactions];
    updater(updated[index]);
    onChange(updated);
  };

  const deleteInteraction = (index: number) => {
    const updated = element.interactions.filter((_, i) => i !== index);
    onChange(updated);
  };

  const addAction = (interactionIndex: number) => {
    updateInteraction(interactionIndex, (interaction) => {
      interaction.actions.push({
        id: `act-${Date.now()}`,
        type: 'show',
        targetId: slideElements.find((e) => e.id !== element.id)?.id || '',
      });
    });
  };

  const updateAction = (
    interactionIndex: number,
    actionIndex: number,
    updates: Partial<Element['interactions'][0]['actions'][0]>,
  ) => {
    updateInteraction(interactionIndex, (interaction) => {
      Object.assign(interaction.actions[actionIndex], updates);
    });
  };

  const deleteAction = (interactionIndex: number, actionIndex: number) => {
    updateInteraction(interactionIndex, (interaction) => {
      interaction.actions.splice(actionIndex, 1);
    });
  };

  return (
    <div className="space-y-3">
      {element.interactions.length === 0 && (
        <p className="text-sm text-slate-500">暂无交互，点击下方按钮添加</p>
      )}

      {element.interactions.map((interaction, interactionIndex) => (
        <div key={interaction.id} className="rounded border border-slate-200 p-2">
          <div className="mb-2 flex items-center justify-between">
            <select
              value={interaction.trigger}
              onChange={(e) =>
                updateInteraction(interactionIndex, (int) => {
                  int.trigger = e.target.value as Element['interactions'][0]['trigger'];
                })
              }
              className="rounded border border-slate-300 px-2 py-1 text-xs"
            >
              <option value="click">点击</option>
              <option value="hover">悬停</option>
              <option value="auto">自动</option>
            </select>
            <button
              onClick={() => deleteInteraction(interactionIndex)}
              className="text-xs text-red-600 hover:underline"
            >
              删除
            </button>
          </div>

          <div className="space-y-2">
            {interaction.actions.map((action, actionIndex) => (
              <div key={action.id} className="flex items-center gap-2">
                <select
                  value={action.type}
                  onChange={(e) =>
                    updateAction(interactionIndex, actionIndex, {
                      type: e.target.value as Element['interactions'][0]['actions'][0]['type'],
                    })
                  }
                  className="rounded border border-slate-300 px-1 py-1 text-xs"
                >
                  <option value="show">显示</option>
                  <option value="hide">隐藏</option>
                  <option value="toggle">切换</option>
                  <option value="animate">动画</option>
                  <option value="navigate">导航</option>
                </select>
                <select
                  value={action.targetId || ''}
                  onChange={(e) =>
                    updateAction(interactionIndex, actionIndex, { targetId: e.target.value })
                  }
                  className="flex-1 rounded border border-slate-300 px-1 py-1 text-xs"
                >
                  <option value="">选择目标</option>
                  {slideElements
                    .filter((e) => e.id !== element.id)
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name || e.id} ({e.type})
                      </option>
                    ))}
                </select>
                <button
                  onClick={() => deleteAction(interactionIndex, actionIndex)}
                  className="text-xs text-red-600 hover:underline"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={() => addAction(interactionIndex)}
            className="mt-2 text-xs text-slate-600 hover:underline"
          >
            + 添加动作
          </button>
        </div>
      ))}

      <button
        onClick={addInteraction}
        className="w-full rounded border border-dashed border-slate-300 py-2 text-sm text-slate-600 hover:bg-slate-50"
      >
        + 添加交互
      </button>
    </div>
  );
}
