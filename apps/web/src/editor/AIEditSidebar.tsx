import { useState } from 'react';
import { Sparkles, X, Send, Loader2, Wand2 } from 'lucide-react';
import { useEditorStore } from '../stores/editor.store';
import { useHistoryStore } from '../stores/history.store';
import type { Courseware } from '@courseware/shared';
import { API_BASE } from '../lib/api';



type Scope = 'element' | 'slide' | 'courseware';

const SCOPE_LABELS: Record<Scope, string> = {
  element: '选中元素',
  slide: '当前页面',
  courseware: '整个课件',
};

const SCOPE_HINTS: Record<Scope, string[]> = {
  element: ['这段文字精简一半', '把标题改得更吸引学生', '换成红色强调'],
  slide: ['这页改成对比布局', '加一道巩固练习', '内容再简单一点'],
  courseware: ['全部标题字号加大', '整体换成更活泼的配色', '文案改成适合小学的语气'],
};

interface EditResponse {
  scope: Scope;
  element?: unknown;
  slide?: unknown;
  tokens?: unknown;
  title?: string;
  message?: string;
}

interface AIEditSidebarProps {
  mobile?: boolean;
  rightOffset?: number;
  bottomOffset?: number;
}

/** AI 编辑侧边栏：三级作用域对话式修改（flash 模型，结构化应用） */
export function AIEditSidebar({
  mobile = false,
  rightOffset = 24,
  bottomOffset = 24,
}: AIEditSidebarProps) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<Scope>('slide');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const {
    courseware,
    currentSlideId,
    selectedElementId,
    updateElement,
    updateSlide,
    setCourseware,
  } = useEditorStore();

  if (!courseware) return null;
  const cw = courseware as Courseware;

  const applyResult = (result: EditResponse) => {
    // 先快照进撤销链，AI 修改才能 Ctrl+Z 撤回
    useHistoryStore.getState().record(cw);
    if (result.scope === 'element' && result.element && currentSlideId && selectedElementId) {
      updateElement(currentSlideId, selectedElementId, (el) => {
        const next = result.element as typeof el;
        Object.keys(el).forEach((k) => delete (el as Record<string, unknown>)[k]);
        Object.assign(el, next);
      });
      return '元素已更新';
    }
    if (result.scope === 'slide' && result.slide && currentSlideId) {
      updateSlide(currentSlideId, (slide) => {
        const next = result.slide as typeof slide;
        Object.keys(slide).forEach((k) => delete (slide as Record<string, unknown>)[k]);
        Object.assign(slide, next);
      });
      return '页面已更新';
    }
    if (result.scope === 'courseware') {
      const next = JSON.parse(JSON.stringify(cw)) as Courseware;
      if (result.tokens) next.designSystem.tokens = result.tokens as Courseware['designSystem']['tokens'];
      if (result.title) next.title = result.title;
      setCourseware(next);
      return '课件已更新';
    }
    return null;
  };

  const handleSend = async (text?: string) => {
    const instruction = (text ?? input).trim();
    if (!instruction || loading) return;
    if (scope === 'element' && !selectedElementId) {
      setError('请先在画布中选中一个元素');
      return;
    }
    setInput('');
    setError(null);
    setLog((prev) => [...prev, { role: 'user', text: `【${SCOPE_LABELS[scope]}】${instruction}` }]);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/ai/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope,
          instruction,
          courseware: cw,
          slideId: currentSlideId,
          elementId: selectedElementId,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || `请求失败 ${response.status}`);
      const applied = applyResult(data);
      setLog((prev) => [...prev, { role: 'ai', text: applied ? `✅ ${applied}（可 Ctrl+Z 撤销）` : '⚠️ 没有可应用的修改' }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '修改失败');
      setLog((prev) => [...prev, { role: 'ai', text: `❌ ${err instanceof Error ? err.message : '修改失败'}` }]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="AI 编辑助手"
        className="fixed z-[80] flex items-center gap-2 rounded-full bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 transition hover:bg-violet-500"
        style={{
          right: mobile ? 16 : rightOffset,
          bottom: mobile ? 16 : bottomOffset,
        }}
      >
        <Sparkles size={16} /> AI 修改
      </button>
    );
  }

  const panel = (
    <div
      role="dialog"
      aria-modal={mobile || undefined}
      aria-label="AI 编辑助手"
      className={`fixed z-[80] flex flex-col overflow-hidden border border-slate-200 bg-white shadow-2xl ${
        mobile
          ? 'inset-x-2 bottom-2 h-[min(70dvh,32rem)] max-h-[calc(100dvh-1rem)] rounded-2xl'
          : 'h-[30rem] rounded-2xl'
      }`}
      style={
        mobile
          ? undefined
          : {
              right: rightOffset,
              bottom: bottomOffset,
              width: `min(22rem, calc(100vw - ${rightOffset + 16}px))`,
              maxHeight: `calc(100dvh - ${bottomOffset + 96}px)`,
            }
      }
    >
      <div className="flex items-center justify-between bg-violet-600 px-4 py-3 text-white">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Wand2 size={15} /> AI 编辑助手
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="关闭 AI 编辑助手"
          className="rounded p-1 hover:bg-white/20"
        >
          <X size={15} />
        </button>
      </div>

      {/* 作用域选择 */}
      <div className="flex gap-1 border-b border-slate-100 p-2">
        {(Object.keys(SCOPE_LABELS) as Scope[]).map((s) => (
          <button
            key={s}
            onClick={() => setScope(s)}
            className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition ${
              scope === s ? 'bg-violet-100 text-violet-700' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {SCOPE_LABELS[s]}
          </button>
        ))}
      </div>

      {/* 对话记录 */}
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {log.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-400">告诉我你想怎么修改{SCOPE_LABELS[scope]}：</p>
            {SCOPE_HINTS[scope].map((hint) => (
              <button
                key={hint}
                onClick={() => handleSend(hint)}
                className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-xs text-slate-600 transition hover:border-violet-300 hover:bg-violet-50"
              >
                {hint}
              </button>
            ))}
          </div>
        )}
        {log.map((m, i) => (
          <div
            key={i}
            className={`rounded-xl px-3 py-2 text-xs leading-relaxed ${
              m.role === 'user' ? 'ml-6 bg-violet-600 text-white' : 'mr-6 bg-slate-100 text-slate-700'
            }`}
          >
            {m.text}
          </div>
        ))}
        {loading && (
          <div className="mr-6 flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-500">
            <Loader2 size={12} className="animate-spin" /> AI 正在修改…
          </div>
        )}
      </div>

      {error && <div className="px-3 pb-1 text-xs text-red-500">{error}</div>}

      {/* 输入 */}
      <div className="flex items-center gap-2 border-t border-slate-100 p-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={`修改${SCOPE_LABELS[scope]}…`}
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
          aria-label="发送修改指令"
          className="rounded-lg bg-violet-600 p-2 text-white transition hover:bg-violet-500 disabled:opacity-40"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );

  if (!mobile) {
    return panel;
  }

  return (
    <>
      <button
        type="button"
        aria-label="关闭 AI 编辑助手"
        onClick={() => setOpen(false)}
        className="fixed inset-0 z-[70] bg-slate-950/35 backdrop-blur-[1px]"
      />
      {panel}
    </>
  );
}
