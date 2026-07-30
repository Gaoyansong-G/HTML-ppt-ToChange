import {
  TEACHING_PHASE_LABELS,
  BLOCK_CATALOG,
  type TeachingScript,
  type TeachingPhase,
} from '@courseware/shared';
import { Plus, Trash2, Clock, Target, MessageSquare } from 'lucide-react';

interface ScriptEditorProps {
  script: TeachingScript;
  onChange: (script: TeachingScript) => void;
}

const PHASE_COLORS: Record<TeachingPhase, string> = {
  'lead-in': 'bg-amber-100 text-amber-800 border-amber-200',
  objectives: 'bg-sky-100 text-sky-800 border-sky-200',
  teaching: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  practice: 'bg-violet-100 text-violet-800 border-violet-200',
  summary: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  homework: 'bg-rose-100 text-rose-800 border-rose-200',
};

/**
 * 教学脚本编辑器：向导"确认教学设计"步骤的核心组件。
 * 支持编辑页面标题/知识点/版式、增删页面、调整环节时长。
 */
export function ScriptEditor({ script, onChange }: ScriptEditorProps) {
  let globalIndex = 0;

  const updatePage = (phaseIdx: number, pageIdx: number, patch: Partial<TeachingScript['phases'][number]['pages'][number]>) => {
    const next = structuredClone(script);
    Object.assign(next.phases[phaseIdx].pages[pageIdx], patch);
    onChange(next);
  };

  const removePage = (phaseIdx: number, pageIdx: number) => {
    const next = structuredClone(script);
    next.phases[phaseIdx].pages.splice(pageIdx, 1);
    // 环节空了则移除环节（保留至少一个环节）
    next.phases = next.phases.filter((p) => p.pages.length > 0);
    if (!next.phases.length) return;
    onChange(next);
  };

  const addPage = (phaseIdx: number) => {
    const next = structuredClone(script);
    const phase = next.phases[phaseIdx];
    phase.pages.push({
      id: `u${Date.now()}`,
      intent: '新建页面',
      keyPoints: ['要点一'],
      sourceRefs: [],
      suggestedBlock: 'title-content',
      speakerNotes: '',
    });
    onChange(next);
  };

  const totalPages = script.phases.reduce((n, p) => n + p.pages.length, 0);
  const totalMinutes = script.phases.reduce((n, p) => n + (p.durationMin || 0), 0);

  return (
    <div className="space-y-5 text-left">
      {/* 课程信息条 */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/60 bg-white/70 p-4 text-sm backdrop-blur-sm">
        <span className="rounded-full bg-slate-900 px-3 py-1 text-white">{script.courseInfo.subject}</span>
        <span className="rounded-full bg-slate-200 px-3 py-1 text-slate-700">
          {script.courseInfo.gradeLevel === 'primary' ? '小学' : script.courseInfo.gradeLevel === 'middle' ? '初中' : script.courseInfo.gradeLevel === 'high' ? '高中' : '通用'}
        </span>
        <span className="flex items-center gap-1 text-slate-600"><Clock size={14} /> {totalMinutes} 分钟</span>
        <span className="text-slate-600">共 {totalPages} 页</span>
        <div className="ml-auto flex flex-wrap gap-1">
          {script.courseInfo.objectives.slice(0, 3).map((o, i) => (
            <span key={i} className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              <Target size={10} /> {o.length > 18 ? o.slice(0, 18) + '…' : o}
            </span>
          ))}
        </div>
      </div>

      {/* 环节与页面 */}
      <div className="max-h-[46vh] space-y-4 overflow-y-auto pr-1">
        {script.phases.map((phase, phaseIdx) => (
          <div key={phaseIdx} className="rounded-2xl border border-white/60 bg-white/60 p-4 backdrop-blur-sm">
            <div className="mb-3 flex items-center gap-2">
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${PHASE_COLORS[phase.phase] || 'bg-slate-100 text-slate-700'}`}>
                {TEACHING_PHASE_LABELS[phase.phase] || phase.phase}
              </span>
              <span className="font-semibold text-slate-800">{phase.title}</span>
              <span className="ml-auto flex items-center gap-1 text-xs text-slate-500">
                <Clock size={12} />
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={phase.durationMin}
                  onChange={(e) => {
                    const next = structuredClone(script);
                    next.phases[phaseIdx].durationMin = Math.max(1, Number(e.target.value) || 1);
                    onChange(next);
                  }}
                  className="w-12 rounded border border-slate-200 bg-white px-1 py-0.5 text-center"
                />
                分钟
              </span>
            </div>

            <ul className="space-y-2">
              {phase.pages.map((page, pageIdx) => {
                globalIndex += 1;
                const pageNum = globalIndex;
                const isInteraction = script.rhythm.interactionPoints.includes(pageNum);
                return (
                  <li key={page.id} className="group rounded-xl border border-white/70 bg-white/80 p-3 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">
                        {pageNum}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            value={page.intent}
                            onChange={(e) => updatePage(phaseIdx, pageIdx, { intent: e.target.value })}
                            className="flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 font-semibold text-slate-900 hover:border-slate-200 focus:border-slate-400 focus:outline-none"
                          />
                          {isInteraction && (
                            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700">互动点</span>
                          )}
                          <select
                            value={page.suggestedBlock}
                            onChange={(e) => updatePage(phaseIdx, pageIdx, { suggestedBlock: e.target.value })}
                            className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
                            title="版式"
                          >
                            {BLOCK_CATALOG.map((b) => (
                              <option key={b.blockType} value={b.blockType}>{b.name}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => removePage(phaseIdx, pageIdx)}
                            className="rounded p-1 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                            title="删除本页"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        {/* 知识点编辑 */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {page.keyPoints.map((kp, kpIdx) => (
                            <span key={kpIdx} className="group/kp flex items-center rounded-full bg-slate-100 pl-2.5 pr-1 py-0.5 text-xs text-slate-600">
                              <input
                                value={kp}
                                onChange={(e) => {
                                  const kps = [...page.keyPoints];
                                  kps[kpIdx] = e.target.value;
                                  updatePage(phaseIdx, pageIdx, { keyPoints: kps });
                                }}
                                className="w-auto min-w-[3rem] bg-transparent focus:outline-none"
                                style={{ width: `${Math.max(3, kp.length)}em` }}
                              />
                              <button
                                onClick={() => {
                                  const kps = page.keyPoints.filter((_, i) => i !== kpIdx);
                                  updatePage(phaseIdx, pageIdx, { keyPoints: kps });
                                }}
                                className="rounded-full px-1 text-slate-400 hover:text-red-500"
                              >×</button>
                            </span>
                          ))}
                          <button
                            onClick={() => updatePage(phaseIdx, pageIdx, { keyPoints: [...page.keyPoints, '新要点'] })}
                            className="rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-xs text-slate-400 hover:border-slate-400 hover:text-slate-600"
                          >+ 要点</button>
                        </div>
                        {page.interaction && (
                          <div className="flex items-center gap-1 text-xs text-violet-600">
                            <MessageSquare size={11} /> {page.interaction}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <button
              onClick={() => addPage(phaseIdx)}
              className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-slate-300 py-2 text-xs text-slate-400 transition hover:border-slate-400 hover:text-slate-600"
            >
              <Plus size={13} /> 在此环节加一页
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
