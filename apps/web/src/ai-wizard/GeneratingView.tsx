import { CheckCircle, Loader2, Circle, Sparkles } from 'lucide-react';
import type { TeachingScript } from '@courseware/shared';

export interface PageProgress {
  pageId: string;
  title: string;
  status: 'pending' | 'active' | 'done';
}

interface GeneratingViewProps {
  script: TeachingScript;
  pages: Map<string, PageProgress>;
  stageMessage: string;
  mock?: boolean;
}

/** 生成进度视图：逐页点亮缩略图列表 */
export function GeneratingView({ script, pages, stageMessage, mock }: GeneratingViewProps) {
  const flatPages = script.phases.flatMap((p) => p.pages);
  const doneCount = [...pages.values()].filter((p) => p.status === 'done').length;
  const total = flatPages.length;

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-white">
          <Sparkles size={28} className="animate-pulse" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">AI 正在生成课件</h2>
        <p className="mt-2 text-slate-600">
          {stageMessage || '正在逐页编排内容与版式…'}
          {mock && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">Mock 模式</span>}
        </p>
      </div>

      {/* 总进度条 */}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-slate-900 transition-all duration-500"
          style={{ width: `${total ? (doneCount / total) * 100 : 0}%` }}
        />
      </div>
      <div className="text-center text-sm text-slate-500">{doneCount} / {total} 页完成</div>

      {/* 逐页状态 */}
      <div className="grid max-h-[40vh] grid-cols-2 gap-2 overflow-y-auto pr-1">
        {flatPages.map((page, i) => {
          const prog = pages.get(page.id);
          const status = prog?.status || 'pending';
          return (
            <div
              key={page.id}
              className={`flex items-center gap-2.5 rounded-xl border p-3 transition-all duration-500 ${
                status === 'done'
                  ? 'border-emerald-200 bg-emerald-50/70'
                  : status === 'active'
                    ? 'border-slate-400 bg-white shadow-sm'
                    : 'border-white/70 bg-white/50 opacity-50'
              }`}
            >
              {status === 'done' ? (
                <CheckCircle size={17} className="shrink-0 text-emerald-600" />
              ) : status === 'active' ? (
                <Loader2 size={17} className="shrink-0 animate-spin text-slate-700" />
              ) : (
                <Circle size={17} className="shrink-0 text-slate-300" />
              )}
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-800">
                  {i + 1}. {page.intent}
                </div>
                <div className="text-xs text-slate-400">
                  {status === 'done' ? '已完成' : status === 'active' ? '生成中…' : '等待中'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
