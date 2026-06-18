import { useEditorStore } from '../stores/editor.store';
import { useHistoryStore } from '../stores/history.store';
import { Trash2, Plus, Play } from 'lucide-react';
import type { Element, AnimationStep } from '@courseware/shared';

const ANIMATION_TYPES = [
  { value: 'fade', label: '淡入' },
  { value: 'slide-up', label: '上滑' },
  { value: 'slide-down', label: '下滑' },
  { value: 'slide-left', label: '左滑' },
  { value: 'slide-right', label: '右滑' },
  { value: 'scale-in', label: '放大' },
  { value: 'scale-out', label: '缩小' },
  { value: 'rotate', label: '旋转' },
  { value: 'bounce', label: '弹跳' },
];

const EASINGS = [
  'power1.in', 'power1.out', 'power1.inOut',
  'power2.in', 'power2.out', 'power2.inOut',
  'power3.in', 'power3.out', 'power3.inOut',
  'power4.in', 'power4.out', 'power4.inOut',
  'back.in', 'back.out', 'back.inOut',
  'elastic.in', 'elastic.out', 'elastic.inOut',
  'bounce.in', 'bounce.out', 'bounce.inOut',
  'circ.in', 'circ.out', 'circ.inOut',
  'expo.in', 'expo.out', 'expo.inOut',
  'none',
];

const TRIGGERS = [
  { value: 'auto', label: '自动' },
  { value: 'after-prev', label: '上一项后' },
  { value: 'with-prev', label: '与上一项同时' },
  { value: 'click', label: '点击' },
];

export function AnimationTimeline() {
  const { courseware, currentSlideId, selectedElementId, updateElement } = useEditorStore();
  const { record } = useHistoryStore();
  const currentSlide = courseware.slides.find((s) => s.id === currentSlideId);
  const selectedElement = currentSlide?.elements.find((e) => e.id === selectedElementId);

  const animations = selectedElement?.animation.entrance || [];

  const withHistory = (fn: () => void) => {
    record(courseware);
    fn();
  };

  const updateAnimation = (
    element: Element,
    index: number,
    updates: Partial<(typeof animations)[0]>,
  ) => {
    withHistory(() => {
      updateElement(currentSlide!.id, element.id, (el) => {
        Object.assign(el.animation.entrance[index], updates);
      });
    });
  };

  const handleDeleteAnimation = (index: number) => {
    if (!currentSlide || !selectedElement) return;
    withHistory(() => {
      updateElement(currentSlide.id, selectedElement.id, (el) => {
        el.animation.entrance.splice(index, 1);
      });
    });
  };

  const handleAddAnimation = () => {
    if (!currentSlide || !selectedElement) return;
    withHistory(() => {
      updateElement(currentSlide.id, selectedElement.id, (el) => {
        el.animation.entrance.push({
          id: `anim-${Date.now()}`,
          type: 'fade',
          duration: 0.6,
          delay: 0,
          easing: 'power2.out',
          trigger: 'auto',
        });
      });
    });
  };

  const handlePreview = () => {
    if (!selectedElement) return;
    // Trigger a re-render of the element by toggling a tiny style change?
    // For now we just rely on the player preview (F5) for full preview.
    // We can add a quick visual feedback.
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/60 bg-white/80 px-4 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">动画时间轴</span>
          {selectedElement && (
            <button
              onClick={handlePreview}
              title="在预览中查看动画"
              className="flex items-center gap-1 rounded-lg border border-white/60 bg-white/80 px-2 py-1 text-xs font-medium text-slate-600 shadow-sm backdrop-blur-sm transition hover:border-slate-400 hover:text-slate-900"
            >
              <Play size={12} /> 预览
            </button>
          )}
        </div>
        {selectedElement && (
          <button
            onClick={handleAddAnimation}
            className="flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Plus size={14} /> 添加入场动画
          </button>
        )}
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-3">
        {selectedElement ? (
          <div className="flex h-full items-center gap-3">
            {animations.length === 0 ? (
              <p className="text-sm text-slate-500">暂无动画，点击右上角添加</p>
            ) : (
              animations.map((anim, index) => (
                <div
                  key={anim.id}
                  className="relative flex h-[7.5rem] w-40 flex-shrink-0 flex-col justify-between overflow-hidden rounded-xl border border-white/60 bg-white/80 p-2 shadow-sm backdrop-blur-sm"
                >
                  <div className="absolute left-0 top-0 h-full w-1 bg-slate-900" />
                  <div className="flex items-center justify-between pl-2">
                    <select
                      data-testid="animation-type-select"
                      value={anim.type}
                      onChange={(e) =>
                        updateAnimation(selectedElement, index, { type: e.target.value as typeof anim.type })
                      }
                      className="max-w-[5.5rem] rounded border border-slate-200 bg-white px-1 py-0.5 text-xs font-bold text-slate-700"
                    >
                      {ANIMATION_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleDeleteAnimation(index)}
                      className="text-slate-400 transition hover:text-red-600"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  <div className="space-y-1.5 pl-2">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400">时长</span>
                      <input
                        type="number"
                        step={0.1}
                        min={0}
                        value={anim.duration}
                        onChange={(e) =>
                          updateAnimation(selectedElement, index, { duration: Number(e.target.value) })
                        }
                        className="w-12 rounded border border-slate-200 bg-white px-1 py-0.5 text-xs"
                      />
                      <span className="text-[10px] text-slate-400">延迟</span>
                      <input
                        type="number"
                        step={0.1}
                        min={0}
                        value={anim.delay}
                        onChange={(e) =>
                          updateAnimation(selectedElement, index, { delay: Number(e.target.value) })
                        }
                        className="w-12 rounded border border-slate-200 bg-white px-1 py-0.5 text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400">触发</span>
                      <select
                        value={anim.trigger}
                        onChange={(e) =>
                          updateAnimation(selectedElement, index, { trigger: e.target.value as typeof anim.trigger })
                        }
                        className="flex-1 rounded border border-slate-200 bg-white px-1 py-0.5 text-xs"
                      >
                        {TRIGGERS.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400">缓动</span>
                      <select
                        value={anim.easing}
                        onChange={(e) =>
                          updateAnimation(selectedElement, index, { easing: e.target.value as AnimationStep['easing'] })
                        }
                        className="flex-1 rounded border border-slate-200 bg-white px-1 py-0.5 text-xs"
                      >
                        {EASINGS.map((e) => (
                          <option key={e} value={e}>
                            {e}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500">选中一个元素以编辑其动画</p>
        )}
      </div>
    </div>
  );
}
