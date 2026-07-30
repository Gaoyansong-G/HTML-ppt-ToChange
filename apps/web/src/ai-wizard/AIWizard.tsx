import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  Loader2,
  FileText,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Wand2,
  RefreshCw,
  FileQuestion,
  PenLine,
  Play,
  ClipboardList,
  Sparkles,
} from 'lucide-react';
import { AuroraBackground } from '../components/ui/AuroraBackground';
import { useEditorStore } from '../stores/editor.store';
import { ScriptEditor } from './ScriptEditor';
import { GeneratingView, type PageProgress } from './GeneratingView';
import { postSSE } from '../lib/sse';
import type { TeachingScript } from '@courseware/shared';
import { API_BASE } from '../lib/api';



function detectPageCount(text: string): number | undefined {
  const match = text.match(/(\d+)\s*(?:页|张|page|pages|p)/i);
  if (!match) return undefined;
  const n = parseInt(match[1], 10);
  return n >= 2 && n <= 50 ? n : undefined;
}

type WizardStep = 1 | 2 | 3 | 4 | 5;

export function AIWizard() {
  const navigate = useNavigate();
  const { setCourseware } = useEditorStore();
  const [step, setStep] = useState<WizardStep>(1);
  const [file, setFile] = useState<File | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [script, setScript] = useState<TeachingScript | null>(null);
  const [isMock, setIsMock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pageProgress, setPageProgress] = useState<Map<string, PageProgress>>(new Map());
  const [stageMessage, setStageMessage] = useState('');
  const [generatedCoursewareId, setGeneratedCoursewareId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setLoadingText('正在解析文档...');
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE}/documents/upload`, { method: 'POST', body: formData });
      if (!response.ok) throw new Error(`Upload failed: ${response.statusText}`);
      const data = await response.json();
      setDocumentId(data.id);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
      setLoadingText('');
    }
  };

  /** 阶段一：生成教学脚本 */
  const handleGenerateScript = async () => {
    if (!documentId || !description.trim()) return;
    setLoading(true);
    setLoadingText('AI 教学设计师正在分析文档、设计课堂教学环节…');
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/ai/v2/script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          description,
          options: { includeQuiz: true, pageCount: detectPageCount(description) },
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || `脚本生成失败: ${response.statusText}`);
      }
      const data = await response.json();
      setScript(data.script);
      setIsMock(!!data.mock);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : '脚本生成失败');
    } finally {
      setLoading(false);
      setLoadingText('');
    }
  };

  /** 阶段二：按脚本逐页生成（SSE） */
  const handleGenerateCourseware = async () => {
    if (!documentId || !script) return;
    setError(null);
    setGeneratedCoursewareId(null);
    // 初始化进度：全部 pending
    const initial = new Map<string, PageProgress>();
    script.phases.forEach((p) =>
      p.pages.forEach((pg) => initial.set(pg.id, { pageId: pg.id, title: pg.intent, status: 'pending' })),
    );
    setPageProgress(initial);
    setStageMessage('开始生成…');
    setStep(4);

    try {
      await postSSE(
        `${API_BASE}/ai/v2/generate`,
        {
          documentId,
          description,
          script,
          options: { includeQuiz: true, pageCount: detectPageCount(description) },
        },
        {
          onEvent: (evt) => {
            const type = evt.type as string;
            if (type === 'stage') {
              setStageMessage((evt.message as string) || '');
            } else if (type === 'page:start') {
              const pageId = evt.pageId as string;
              setPageProgress((prev) => {
                const next = new Map(prev);
                const cur = next.get(pageId);
                if (cur) next.set(pageId, { ...cur, status: 'active' });
                return next;
              });
            } else if (type === 'page:done') {
              const pageId = (evt.page as { id?: string })?.id;
              if (pageId) {
                setPageProgress((prev) => {
                  const next = new Map(prev);
                  const cur = next.get(pageId);
                  if (cur) next.set(pageId, { ...cur, status: 'done' });
                  return next;
                });
              }
              setStageMessage(`已完成 ${evt.index}/${evt.total} 页`);
            } else if (type === 'assets') {
              setStageMessage('正在装配课件与配图…');
            } else if (type === 'done') {
              if (evt.courseware) {
                setCourseware(evt.courseware as never);
                const generated = evt.courseware as { id?: string };
                setGeneratedCoursewareId(
                  (evt.coursewareId as string | undefined) || generated.id || null,
                );
                setStep(5);
              } else {
                setError((evt.schemaError as string) || '课件生成失败');
              }
            } else if (type === 'error') {
              setError((evt.message as string) || '生成失败');
              setStep(3);
            }
          },
          onError: (err) => {
            setError(err.message);
            setStep(3);
          },
        },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
      setStep(3);
    }
  };

  const steps = [
    { label: '上传文档', icon: Upload },
    { label: '描述需求', icon: FileText },
    { label: '教学设计', icon: ClipboardList },
    { label: '生成课件', icon: Sparkles },
    { label: '完成', icon: CheckCircle },
  ];

  return (
    <AuroraBackground className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-white/60 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md">
              <Wand2 size={18} />
            </div>
            <span className="text-lg font-bold text-slate-900">AI 课件生成向导</span>
          </div>
          <div className="flex gap-2">
            {steps.map((s, idx) => {
              const StepIcon = s.icon;
              const active = idx + 1 === step;
              const completed = idx + 1 < step;
              return (
                <div
                  key={idx}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition ${
                    completed ? 'bg-slate-700 text-white' : active ? 'bg-slate-900 text-white shadow-lg' : 'bg-white/70 text-slate-500'
                  }`}
                >
                  {completed ? <CheckCircle size={16} /> : <StepIcon size={16} />}
                </div>
              );
            })}
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-6">
        <div className={`w-full ${step >= 3 && step <= 4 ? 'max-w-4xl' : 'max-w-3xl'}`}>
          <div className="mb-6 flex justify-between px-2 text-sm font-medium text-slate-500">
            {steps.map((s, idx) => (
              <span key={idx} className={idx + 1 <= step ? 'text-slate-800' : ''}>{s.label}</span>
            ))}
          </div>

          <div className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-xl shadow-slate-900/5 backdrop-blur-sm">
            {/* 步骤 1：上传 */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                    <Upload size={32} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">上传教学材料</h2>
                  <p className="mt-2 text-slate-600">支持 PDF、Word、Markdown、TXT 文档</p>
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition ${
                    file ? 'border-slate-400 bg-slate-50/50' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50/30'
                  }`}
                >
                  {file ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileText size={24} className="text-slate-600" />
                      <div className="text-left">
                        <div className="font-semibold text-slate-900">{file.name}</div>
                        <div className="text-sm text-slate-500">点击更换文件</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-500">
                      <div className="text-base font-medium">点击选择文件</div>
                      <div className="mt-1 text-sm">或将文件拖拽到此处</div>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept=".pdf,.md,.txt,.docx,.doc" onChange={handleFileSelect} className="hidden" />
                </div>

                <button
                  onClick={handleUpload}
                  disabled={!file || loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3.5 font-semibold text-white shadow-lg transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {loading ? (<><Loader2 className="animate-spin" size={20} />{loadingText}</>) : (<>下一步 <ArrowRight size={18} /></>)}
                </button>
              </div>
            )}

            {/* 步骤 2：描述需求 */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                    <Wand2 size={32} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">描述课件范围</h2>
                  <p className="mt-2 text-slate-600">告诉 AI 你想生成什么样的课件</p>
                </div>

                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="例如：生成 8 页小学六年级语文课件，重点讲解春节习俗，包含一个课堂小测。"
                  disabled={loading}
                  className="min-h-[140px] w-full rounded-2xl border border-slate-200 bg-white/80 p-5 text-slate-800 shadow-sm backdrop-blur-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20 disabled:bg-slate-50"
                />

                {loading && (
                  <div className="space-y-3 rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur-sm">
                    <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200" />
                    <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200" />
                    <p className="text-center text-xs text-slate-400">{loadingText}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-white/70 bg-white/70 px-6 py-3.5 font-semibold text-slate-700 backdrop-blur-sm transition hover:bg-white/90 disabled:opacity-60"
                  >
                    <ArrowLeft size={18} /> 上一步
                  </button>
                  <button
                    onClick={handleGenerateScript}
                    disabled={!description.trim() || loading}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3.5 font-semibold text-white shadow-lg transition hover:bg-slate-800 disabled:opacity-60"
                  >
                    {loading ? (<><Loader2 className="animate-spin" size={20} />{loadingText}</>) : (<>AI 设计教学方案 <ArrowRight size={18} /></>)}
                  </button>
                </div>
              </div>
            )}

            {/* 步骤 3：教学脚本确认/编辑 */}
            {step === 3 && script && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                    <ClipboardList size={32} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">确认教学设计</h2>
                  <p className="mt-2 text-slate-600">AI 已完成课堂教学设计，你可以修改后生成课件</p>
                </div>

                <ScriptEditor script={script} onChange={setScript} />

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(2)}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-white/70 bg-white/70 px-6 py-3.5 font-semibold text-slate-700 backdrop-blur-sm transition hover:bg-white/90 disabled:opacity-60"
                  >
                    <ArrowLeft size={18} /> 返回修改
                  </button>
                  <button
                    onClick={handleGenerateScript}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-white/70 bg-white/70 px-6 py-3.5 font-semibold text-slate-700 backdrop-blur-sm transition hover:bg-white/90 disabled:opacity-60"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />} 重新设计
                  </button>
                  <button
                    onClick={handleGenerateCourseware}
                    disabled={loading}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3.5 font-semibold text-white shadow-lg transition hover:bg-slate-800 disabled:opacity-60"
                  >
                    按此设计生成课件 <Sparkles size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* 步骤 4：生成进度 */}
            {step === 4 && script && (
              <GeneratingView script={script} pages={pageProgress} stageMessage={stageMessage} mock={isMock} />
            )}

            {/* 步骤 5：完成 */}
            {step === 5 && (
              <div className="space-y-6 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle size={40} />
                </div>
                <h2 className="text-3xl font-bold text-slate-900">课件生成完成！</h2>
                <p className="text-slate-600">课件已进入编辑器，你可以继续编辑或预览播放。</p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() =>
                      navigate(
                        generatedCoursewareId
                          ? `/courseware/${encodeURIComponent(generatedCoursewareId)}/edit`
                          : '/editor',
                      )
                    }
                    className="flex items-center gap-2 rounded-2xl bg-slate-900 px-8 py-3.5 font-semibold text-white shadow-lg transition hover:bg-slate-800"
                  >
                    <PenLine size={18} /> 进入编辑器
                  </button>
                  <button
                    onClick={() =>
                      navigate(
                        generatedCoursewareId
                          ? `/courseware/${encodeURIComponent(generatedCoursewareId)}/present`
                          : '/player',
                      )
                    }
                    className="flex items-center gap-2 rounded-2xl border border-white/70 bg-white/70 px-8 py-3.5 font-semibold text-slate-700 backdrop-blur-sm transition hover:bg-white/90"
                  >
                    <Play size={18} /> 预览播放
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-red-800">
                <FileQuestion size={20} className="mt-0.5 shrink-0" />
                <div>{error}</div>
              </div>
            )}
          </div>
        </div>
      </main>
    </AuroraBackground>
  );
}
