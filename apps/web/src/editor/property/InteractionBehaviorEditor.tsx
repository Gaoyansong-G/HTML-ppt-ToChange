import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Eye,
  MousePointerClick,
  Plus,
  Trash2,
  Zap,
} from 'lucide-react';
import type {
  Element,
  InteractionAction,
  InteractionConfig,
  Slide,
} from '@courseware/shared';

interface InteractionBehaviorEditorProps {
  element: Element;
  slideElements: Element[];
  slides: Slide[];
  onChange: (interactions: Element['interactions'], coalesceKey?: string) => void;
  onSetInitiallyHidden: (elementId: string, hidden: boolean) => void;
}

type Trigger = InteractionConfig['trigger'];
type ActionType = InteractionAction['type'];

const TRIGGER_LABELS: Record<Trigger, string> = {
  click: '点击元素',
  'double-click': '双击元素',
  hover: '鼠标移入（旧配置）',
  'mouse-enter': '鼠标移入',
  'mouse-leave': '鼠标移出',
  drag: '拖拽（旧配置）',
  voice: '语音（旧配置）',
  auto: '页面出现后自动',
  timeout: '等待一段时间',
  'quiz-select': '选择答案后',
  'quiz-submit': '提交答案后',
  'quiz-correct': '回答正确后',
  'quiz-incorrect': '回答错误后',
  'quiz-explain': '查看解析后',
  'quiz-retry': '重新作答后',
  'answer-reveal': '揭示答案后',
  'media-ended': '媒体播放结束后',
  'interactive-complete': '课堂互动完成后',
};

const ACTION_LABELS: Record<ActionType, string> = {
  show: '显示元素',
  hide: '隐藏元素',
  toggle: '切换显示/隐藏',
  animate: '强调反馈',
  speak: '朗读内容',
  'ask-ai': '询问 AI',
  'reveal-answer': '揭示答案元素',
  'set-state': '切换状态',
  navigate: '跳转页面',
  'open-url': '打开网页',
  'play-media': '播放媒体',
  'pause-media': '暂停媒体',
  'toggle-media': '播放/暂停媒体',
  'restart-media': '从头播放媒体',
  'play-sound': '播放声音（旧配置）',
  'record-annotation': '记录批注',
};

const TARGET_ACTIONS = new Set<ActionType>([
  'show',
  'hide',
  'toggle',
  'animate',
  'reveal-answer',
  'play-media',
  'pause-media',
  'toggle-media',
  'restart-media',
  'play-sound',
]);

const MEDIA_ACTIONS = new Set<ActionType>([
  'play-media',
  'pause-media',
  'toggle-media',
  'restart-media',
  'play-sound',
]);

const REVEAL_ACTIONS = new Set<ActionType>(['show', 'toggle', 'reveal-answer']);

function makeId(prefix: string) {
  const suffix =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}-${suffix}`;
}

function cloneInteractions(interactions: Element['interactions']): InteractionConfig[] {
  return interactions.map((interaction): InteractionConfig => ({
    ...interaction,
    actions: interaction.actions.map((action) => ({
      ...action,
      payload: action.payload ? { ...action.payload } : undefined,
    })),
  }));
}

function flattenElements(elements: Element[]) {
  const flattened: Element[] = [];
  const visited = new Set<string>();

  const visit = (element: Element) => {
    if (visited.has(element.id)) return;
    visited.add(element.id);
    flattened.push(element);

    if (element.type !== 'group') return;
    const children = (element.content as { children?: unknown }).children;
    if (!Array.isArray(children)) return;
    (children as Element[]).forEach(visit);
  };

  elements.forEach(visit);
  return flattened;
}

function elementLabel(element: Element, index: number) {
  const content = element.content as Record<string, unknown>;
  const detail = [element.name, content.text, content.title, content.question, content.alt].find(
    (value): value is string => typeof value === 'string' && value.trim().length > 0,
  );
  const typeLabels: Partial<Record<Element['type'], string>> = {
    text: '文本',
    image: '图片',
    shape: '形状',
    quiz: '题目',
    audio: '音频',
    video: '视频',
    block: '内容组件',
    interactive: '课堂互动',
    formula: '公式',
    diagram: '图表',
    group: '组合',
  };
  return `${index + 1}. ${detail?.trim().slice(0, 24) || typeLabels[element.type] || element.type}`;
}

function triggersFor(element: Element): Trigger[] {
  const triggers: Trigger[] = [
    'click',
    'double-click',
    'mouse-enter',
    'mouse-leave',
    'auto',
    'timeout',
  ];
  if (element.type === 'quiz') {
    triggers.push(
      'quiz-select',
      'quiz-submit',
      'quiz-correct',
      'quiz-incorrect',
      'quiz-explain',
      'quiz-retry',
      'answer-reveal',
    );
  }
  if (element.type === 'audio' || element.type === 'video') {
    triggers.push('media-ended');
  }
  if (element.type === 'interactive') {
    triggers.push('interactive-complete');
  }
  return triggers;
}

function defaultAction(element: Element): InteractionAction {
  return {
    id: makeId('action'),
    type: 'animate',
    targetId: element.id,
    payload: { preset: 'pulse' },
  };
}

function actionError(action: InteractionAction, slideElements: Element[]) {
  if (TARGET_ACTIONS.has(action.type) && !action.targetId) {
    return '请选择这个动作要作用到哪个元素。';
  }
  if (
    TARGET_ACTIONS.has(action.type) &&
    action.targetId &&
    !slideElements.some((element) => element.id === action.targetId)
  ) {
    return '原目标元素已不存在，请重新选择作用对象。';
  }
  if (
    MEDIA_ACTIONS.has(action.type) &&
    action.targetId &&
    !slideElements.some(
      (element) =>
        element.id === action.targetId &&
        (element.type === 'audio' || element.type === 'video'),
    )
  ) {
    return '媒体动作只能作用于音频或视频元素。';
  }
  if (action.type === 'open-url') {
    const url = typeof action.payload?.url === 'string' ? action.payload.url.trim() : '';
    if (!url) return '请输入要打开的网址。';
    if (/^\s*javascript:/i.test(url)) return '出于安全考虑，不允许 javascript: 链接。';
  }
  return null;
}

export function InteractionBehaviorEditor({
  element,
  slideElements,
  slides,
  onChange,
  onSetInitiallyHidden,
}: InteractionBehaviorEditorProps) {
  const interactions = element.interactions || [];
  const triggerOptions = triggersFor(element);
  const availableElements = flattenElements(slideElements);
  const firstOther = availableElements.find((item) => item.id !== element.id);

  const updateRule = (
    index: number,
    updater: (interaction: InteractionConfig) => InteractionConfig,
    coalesceKey?: string,
  ) => {
    const next = cloneInteractions(interactions);
    next[index] = updater(next[index]);
    onChange(next, coalesceKey);
  };

  const removeRule = (index: number) => {
    onChange(interactions.filter((_, itemIndex) => itemIndex !== index));
  };

  const moveRule = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= interactions.length) return;
    const next = cloneInteractions(interactions);
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const addRule = (trigger: Trigger = 'click', action = defaultAction(element)) => {
    onChange([
      ...cloneInteractions(interactions),
      {
        id: makeId('interaction'),
        enabled: true,
        trigger,
        actions: [action],
      },
    ]);
  };

  const addRevealRecipe = () => {
    const target = firstOther;
    const action: InteractionAction = {
      id: makeId('action'),
      type: 'show',
      targetId: target?.id,
    };
    addRule('click', action);
    if (target) onSetInitiallyHidden(target.id, true);
  };

  const addNextPageRecipe = () => {
    addRule('click', {
      id: makeId('action'),
      type: 'navigate',
      payload: { direction: 'next' },
    });
  };

  const addCompletionRecipe = () => {
    const trigger: Trigger =
      element.type === 'quiz'
        ? 'quiz-correct'
        : element.type === 'interactive'
          ? 'interactive-complete'
          : 'click';
    addRule(trigger, {
      id: makeId('action'),
      type: 'animate',
      targetId: element.id,
      payload: { preset: 'highlight' },
    });
  };

  return (
    <div className="space-y-4" data-testid="interaction-behavior-editor">
      <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-blue-950">
          <Zap size={15} />
          元素行为
        </div>
        <p className="mt-1 text-xs leading-relaxed text-blue-800">
          把“什么时候发生”与“发生什么”组合起来。保存后可在顶部“预览”中直接验证。
        </p>
      </div>

      <div>
        <div className="mb-2 text-xs font-semibold text-slate-600">快速创建</div>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={addRevealRecipe}
            className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-2 text-center text-[11px] font-medium text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
          >
            <Eye size={15} />
            点击揭示
          </button>
          <button
            type="button"
            onClick={addNextPageRecipe}
            className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-2 text-center text-[11px] font-medium text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
          >
            <MousePointerClick size={15} />
            点击下一页
          </button>
          <button
            type="button"
            onClick={addCompletionRecipe}
            className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-2 text-center text-[11px] font-medium text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
          >
            <Zap size={15} />
            完成反馈
          </button>
        </div>
        {!firstOther && (
          <p className="mt-2 text-[11px] text-amber-700">
            当前页只有一个元素；“点击揭示”创建后需再添加目标元素。
          </p>
        )}
      </div>

      {interactions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
          <MousePointerClick className="mx-auto text-slate-300" size={24} />
          <p className="mt-2 text-sm font-medium text-slate-600">还没有元素行为</p>
          <p className="mt-1 text-xs text-slate-400">使用上方模板，或从空白行为开始。</p>
        </div>
      ) : (
        <div className="space-y-3">
          {interactions.map((interaction, interactionIndex) => {
            const currentTriggerOptions = triggerOptions.includes(interaction.trigger)
              ? triggerOptions
              : [...triggerOptions, interaction.trigger];
            return (
              <section
                key={interaction.id}
                className={`overflow-hidden rounded-xl border bg-white shadow-sm ${
                  interaction.enabled === false ? 'border-slate-200 opacity-60' : 'border-slate-200'
                }`}
                data-testid="interaction-rule"
              >
                <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
                  <label className="flex min-w-0 flex-1 items-center gap-2 text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={interaction.enabled !== false}
                      onChange={(event) =>
                        updateRule(interactionIndex, (rule) => ({
                          ...rule,
                          enabled: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 accent-blue-600"
                    />
                    行为 {interactionIndex + 1}
                  </label>
                  <button
                    type="button"
                    onClick={() => moveRule(interactionIndex, -1)}
                    disabled={interactionIndex === 0}
                    title="上移行为"
                    className="rounded p-1 text-slate-500 hover:bg-white disabled:opacity-30"
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveRule(interactionIndex, 1)}
                    disabled={interactionIndex === interactions.length - 1}
                    title="下移行为"
                    className="rounded p-1 text-slate-500 hover:bg-white disabled:opacity-30"
                  >
                    <ArrowDown size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRule(interactionIndex)}
                    title="删除行为"
                    className="rounded p-1 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <div className="space-y-3 p-3">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-medium text-slate-500">当……</span>
                    <select
                      value={interaction.trigger}
                      onChange={(event) =>
                        updateRule(interactionIndex, (rule) => ({
                          ...rule,
                          trigger: event.target.value as Trigger,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    >
                      {currentTriggerOptions.map((trigger) => (
                        <option key={trigger} value={trigger}>
                          {TRIGGER_LABELS[trigger]}
                        </option>
                      ))}
                    </select>
                  </label>

                  {(interaction.trigger === 'auto' || interaction.trigger === 'timeout') && (
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-medium text-slate-500">等待时间（毫秒）</span>
                      <input
                        type="number"
                        min={0}
                        max={600000}
                        step={100}
                        value={interaction.delayMs ?? (interaction.trigger === 'timeout' ? 1000 : 0)}
                        onChange={(event) =>
                          updateRule(
                            interactionIndex,
                            (rule) => ({ ...rule, delayMs: Math.max(0, Number(event.target.value) || 0) }),
                            `interaction:${interaction.id}:delay`,
                          )
                        }
                        className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs"
                      />
                    </label>
                  )}

                  <div className="space-y-2">
                    <div className="text-[11px] font-medium text-slate-500">就执行……</div>
                    {interaction.actions.map((action, actionIndex) => (
                      <ActionEditor
                        key={action.id}
                        action={action}
                        actionIndex={actionIndex}
                        canDelete={interaction.actions.length > 1}
                        slideElements={availableElements}
                        slides={slides}
                        onChange={(updated, coalesceKey) =>
                          updateRule(
                            interactionIndex,
                            (rule) => ({
                              ...rule,
                              actions: rule.actions.map((item, index) =>
                                index === actionIndex ? updated : item,
                              ),
                            }),
                            coalesceKey,
                          )
                        }
                        onDelete={() => {
                          if (interaction.actions.length <= 1) return;
                          updateRule(interactionIndex, (rule) => ({
                            ...rule,
                            actions: rule.actions.filter((_, index) => index !== actionIndex),
                          }));
                        }}
                        onSetInitiallyHidden={onSetInitiallyHidden}
                      />
                    ))}
                    {interaction.actions.length === 1 && (
                      <p className="text-[10px] leading-relaxed text-slate-500">
                        每条行为至少保留一个动作；若不再需要，请删除整条行为。
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        updateRule(interactionIndex, (rule) => ({
                          ...rule,
                          actions: [...rule.actions, defaultAction(element)],
                        }))
                      }
                      className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 py-2 text-xs font-medium text-slate-600 transition hover:border-blue-300 hover:bg-blue-50"
                    >
                      <Plus size={13} />
                      再执行一个动作
                    </button>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => addRule()}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
      >
        <Plus size={14} />
        新建空白行为
      </button>
    </div>
  );
}

interface ActionEditorProps {
  action: InteractionAction;
  actionIndex: number;
  canDelete: boolean;
  slideElements: Element[];
  slides: Slide[];
  onChange: (action: InteractionAction, coalesceKey?: string) => void;
  onDelete: () => void;
  onSetInitiallyHidden: (elementId: string, hidden: boolean) => void;
}

function ActionEditor({
  action,
  actionIndex,
  canDelete,
  slideElements,
  slides,
  onChange,
  onDelete,
  onSetInitiallyHidden,
}: ActionEditorProps) {
  const error = actionError(action, slideElements);
  const target = slideElements.find((element) => element.id === action.targetId);
  const targetOptions = MEDIA_ACTIONS.has(action.type)
    ? slideElements.filter((element) => element.type === 'audio' || element.type === 'video')
    : slideElements;

  const updatePayload = (field: string, value: unknown, coalesce = false) => {
    onChange(
      { ...action, payload: { ...(action.payload || {}), [field]: value } },
      coalesce ? `interaction-action:${action.id}:${field}` : undefined,
    );
  };

  const handleTypeChange = (type: ActionType) => {
    const next: InteractionAction = { id: action.id, type };
    if (TARGET_ACTIONS.has(type)) {
      const preferredTargets = MEDIA_ACTIONS.has(type)
        ? slideElements.filter((element) => element.type === 'audio' || element.type === 'video')
        : slideElements;
      next.targetId =
        preferredTargets.some((element) => element.id === action.targetId)
          ? action.targetId
          : preferredTargets[0]?.id;
    }
    if (type === 'animate') next.payload = { preset: 'pulse' };
    if (type === 'navigate') next.payload = { direction: 'next' };
    if (type === 'speak') {
      next.targetId = action.targetId || slideElements[0]?.id;
      next.payload = { lang: 'zh-CN' };
    }
    onChange(next);
  };

  return (
    <div className={`rounded-lg border p-2.5 ${error ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200 bg-slate-50/60'}`}>
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-[10px] font-semibold text-slate-400">{actionIndex + 1}</span>
        <select
          value={action.type}
          onChange={(event) => handleTypeChange(event.target.value as ActionType)}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
        >
          {(Object.keys(ACTION_LABELS) as ActionType[]).map((type) => (
            <option key={type} value={type}>
              {ACTION_LABELS[type]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onDelete}
          disabled={!canDelete}
          title={
            canDelete
              ? '删除动作'
              : '每条行为至少需要一个动作；若不再需要，请删除整条行为'
          }
          className="rounded p-1 text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {TARGET_ACTIONS.has(action.type) && (
        <label className="mt-2 block">
          <span className="mb-1 block text-[10px] font-medium text-slate-500">作用对象</span>
          <select
            value={action.targetId || ''}
            onChange={(event) => onChange({ ...action, targetId: event.target.value || undefined })}
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
          >
            <option value="">请选择元素</option>
            {targetOptions.map((item, index) => (
              <option key={item.id} value={item.id}>
                {elementLabel(item, slideElements.indexOf(item) >= 0 ? slideElements.indexOf(item) : index)}
              </option>
            ))}
          </select>
        </label>
      )}

      {REVEAL_ACTIONS.has(action.type) && target && (
        <label className="mt-2 flex items-start gap-2 rounded-lg bg-blue-50 px-2 py-2 text-[11px] text-blue-900">
          <input
            type="checkbox"
            checked={target.initiallyHidden === true}
            onChange={(event) => onSetInitiallyHidden(target.id, event.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 accent-blue-600"
          />
          <span>
            播放时先隐藏该元素
            <span className="mt-0.5 block text-[10px] text-blue-700">适合“点击后揭示答案/提示”。编辑画布中仍保持可见。</span>
          </span>
        </label>
      )}

      {action.type === 'animate' && (
        <label className="mt-2 block">
          <span className="mb-1 block text-[10px] font-medium text-slate-500">反馈效果</span>
          <select
            value={typeof action.payload?.preset === 'string' ? action.payload.preset : 'pulse'}
            onChange={(event) => updatePayload('preset', event.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
          >
            <option value="pulse">轻微放大</option>
            <option value="highlight">高亮闪烁</option>
            <option value="shake">左右摇动</option>
            <option value="bounce">向上弹跳</option>
            <option value="spin">旋转一周</option>
          </select>
        </label>
      )}

      {action.type === 'navigate' && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-[10px] font-medium text-slate-500">跳转方式</span>
            <select
              value={
                typeof action.payload?.slideIndex === 'number'
                  ? 'specific'
                  : typeof action.payload?.direction === 'string'
                    ? action.payload.direction
                    : 'next'
              }
              onChange={(event) => {
                const value = event.target.value;
                onChange({
                  ...action,
                  payload:
                    value === 'specific'
                      ? { slideIndex: 0 }
                      : { direction: value },
                });
              }}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
            >
              <option value="next">下一页</option>
              <option value="prev">上一页</option>
              <option value="specific">指定页面</option>
            </select>
          </label>
          {typeof action.payload?.slideIndex === 'number' && (
            <label className="block">
              <span className="mb-1 block text-[10px] font-medium text-slate-500">目标页面</span>
              <select
                value={action.payload.slideIndex}
                onChange={(event) => updatePayload('slideIndex', Number(event.target.value))}
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
              >
                {slides.map((slide, index) => (
                  <option key={slide.id} value={index}>
                    {index + 1}. {slide.title || '未命名页面'}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      {action.type === 'open-url' && (
        <label className="mt-2 block">
          <span className="mb-1 block text-[10px] font-medium text-slate-500">网址</span>
          <input
            type="url"
            value={typeof action.payload?.url === 'string' ? action.payload.url : ''}
            onChange={(event) => updatePayload('url', event.target.value, true)}
            placeholder="https://example.com"
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
          />
        </label>
      )}

      {action.type === 'speak' && (
        <div className="mt-2 space-y-2">
          <label className="block">
            <span className="mb-1 block text-[10px] font-medium text-slate-500">自定义朗读文字（留空则朗读目标元素）</span>
            <textarea
              value={typeof action.payload?.text === 'string' ? action.payload.text : ''}
              onChange={(event) => updatePayload('text', event.target.value, true)}
              className="min-h-16 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-medium text-slate-500">语言</span>
            <select
              value={typeof action.payload?.lang === 'string' ? action.payload.lang : 'zh-CN'}
              onChange={(event) => updatePayload('lang', event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
            >
              <option value="zh-CN">普通话</option>
              <option value="en-US">英语（美国）</option>
              <option value="en-GB">英语（英国）</option>
            </select>
          </label>
        </div>
      )}

      {action.type === 'ask-ai' && (
        <label className="mt-2 block">
          <span className="mb-1 block text-[10px] font-medium text-slate-500">提问内容</span>
          <textarea
            value={typeof action.payload?.prompt === 'string' ? action.payload.prompt : ''}
            onChange={(event) => updatePayload('prompt', event.target.value, true)}
            className="min-h-16 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
          />
        </label>
      )}

      {action.type === 'set-state' && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input
            value={typeof action.payload?.machineId === 'string' ? action.payload.machineId : ''}
            onChange={(event) => updatePayload('machineId', event.target.value, true)}
            placeholder="状态组 ID"
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
          />
          <input
            value={typeof action.payload?.state === 'string' ? action.payload.state : ''}
            onChange={(event) => updatePayload('state', event.target.value, true)}
            placeholder="状态名称"
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
          />
        </div>
      )}

      <label className="mt-2 block">
        <span className="mb-1 block text-[10px] font-medium text-slate-500">动作延迟（毫秒，可选）</span>
        <input
          type="number"
          min={0}
          max={600000}
          step={100}
          value={typeof action.payload?.delayMs === 'number' ? action.payload.delayMs : 0}
          onChange={(event) => updatePayload('delayMs', Math.max(0, Number(event.target.value) || 0), true)}
          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
        />
      </label>

      {error && (
        <div className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-800">
          <AlertCircle className="mt-0.5 shrink-0" size={12} />
          {error}
        </div>
      )}
    </div>
  );
}
