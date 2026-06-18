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
  Layout,
  Target,
  PenLine,
  Play,
} from 'lucide-react';
import { AuroraBackground } from '../components/ui/AuroraBackground';
import { useEditorStore } from '../stores/editor.store';

const API_BASE = 'http://localhost:3001/api';

function detectPageCount(text: string): number | undefined {
  const match = text.match(/(\d+)\s*(?:页|张|page|pages|p)/i);
  if (!match) return undefined;
  const n = parseInt(match[1], 10);
  return n >= 2 && n <= 50 ? n : undefined;
}

interface OutlineSlide {
  order: number;
  title: string;
  learningObjective?: string;
  layoutTemplateId?: string;
  keyPoints?: string[];
}

interface Outline {
  title: string;
  slides: OutlineSlide[];
}

export function AIWizard() {
  const navigate = useNavigate();
  const { setCourseware } = useEditorStore();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [file, setFile] = useState<File | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [outline, setOutline] = useState<Outline | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [error, setError] = useState<string | null>(null);
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
      const response = await fetch(`${API_BASE}/documents/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

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

  const handleGenerateOutline = async () => {
    if (!documentId || !description.trim()) return;
    setLoading(true);
    setLoadingText('AI 正在分析文档并生成大纲...');
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/ai/outline`, {
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
        throw new Error(err.message || `Outline generation failed: ${response.statusText}`);
      }

      const data = await response.json();
      setOutline(data.outline);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Outline generation failed');
    } finally {
      setLoading(false);
      setLoadingText('');
    }
  };

  const handleGenerateCourseware = async () => {
    if (!documentId) return;
    setLoading(true);
    setLoadingText('AI 正在生成课件（内容、视觉、动画）...');
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/ai/generate`, {
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
        throw new Error(err.message || `Generation failed: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.valid) {
        throw new Error(result.error || 'Courseware validation failed');
      }

      // Auto-save generated courseware to backend so it appears in records and survives refresh
      try {
        const saveResponse = await fetch(`${API_BASE}/courseware`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result.courseware),
        });
        if (!saveResponse.ok) {
          const saveErr = await saveResponse.json().catch(() => ({}));
          console.warn('Auto-save generated courseware failed:', saveErr.message || saveResponse.statusText);
        } else {
          const saved = await saveResponse.json();
          result.courseware = saved;
        }
      } catch (saveErr) {
        console.warn('Auto-save generated courseware failed:', saveErr);
      }

      setCourseware(result.courseware);
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
      setLoadingText('');
    }
  };

  const steps = [
    { label: '上传文档', icon: Upload },
    { label: '描述需求', icon: FileText },
    { label: '确认大纲', icon: Layout },
    { label: '生成完成', icon: CheckCircle },
  ];

  return (
    <AuroraBackground className="min-h-screen">
      {/* Header */}
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
                    completed
                      ? 'bg-slate-700 text-white'
                      : active
                        ? 'bg-slate-900 text-white shadow-lg'
                        : 'bg-white/70 text-slate-500'
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
        <div className="w-full max-w-3xl">
          {/* Progress label */}
          <div className="mb-6 flex justify-between px-2 text-sm font-medium text-slate-500">
            {steps.map((s, idx) => (
              <span
                key={idx}
                className={idx + 1 <= step ? 'text-slate-800' : ''}
              >
                {s.label}
              </span>
            ))}
          </div>

          <div className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-xl shadow-slate-900/5 backdrop-blur-sm">
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                    <Upload size={32} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">上传教学材料</h2>
                  <p className="mt-2 text-slate-600">支持 Markdown、TXT、Word 文档</p>
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition ${
                    file
                      ? 'border-slate-400 bg-slate-50/50'
                      : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50/30'
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
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".md,.txt,.docx,.doc"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                <button
                  onClick={handleUpload}
                  disabled={!file || loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3.5 font-semibold text-white shadow-lg transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      {loadingText}
                    </>
                  ) : (
                    <>下一步 <ArrowRight size={18} /></>
                  )}
                </button>
              </div>
            )}

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
                  placeholder="例如：生成 5 页小学六年级语文课件，重点讲解春节习俗，包含一个课堂小测。"
                  disabled={loading}
                  className="min-h-[140px] w-full rounded-2xl border border-slate-200 bg-white/80 p-5 text-slate-800 shadow-sm backdrop-blur-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20 disabled:bg-slate-50"
                />

                {loading && (
                  <div className="space-y-3 rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur-sm">
                    <div className="h-4 w-1/3 rounded bg-slate-200 animate-pulse" />
                    <div className="h-3 w-2/3 rounded bg-slate-200 animate-pulse" />
                    <div className="h-3 w-1/2 rounded bg-slate-200 animate-pulse" />
                    <div className="mt-2 flex gap-2">
                      <div className="h-8 w-8 rounded-full bg-slate-200 animate-pulse" />
                      <div className="h-8 w-8 rounded-full bg-slate-200 animate-pulse" />
                      <div className="h-8 w-8 rounded-full bg-slate-200 animate-pulse" />
                    </div>
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
                    onClick={handleGenerateOutline}
                    disabled={!description.trim() || loading}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3.5 font-semibold text-white shadow-lg transition hover:bg-slate-800 disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        {loadingText}
                      </>
                    ) : (
                      <>生成大纲 <ArrowRight size={18} /></>
                    )}
                  </button>
                </div>
              </div>
            )}

            {step === 3 && outline && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                    <Layout size={32} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">确认课件大纲</h2>
                  <p className="mt-2 text-slate-600">{outline.title}</p>
                </div>

                <div className="rounded-2xl border border-white/60 bg-white/60 p-5 backdrop-blur-sm">
                  <ul className="space-y-4">
                    {outline.slides.map((item, index) => (
                      <li
                        key={index}
                        className="rounded-xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur-sm"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-700">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-slate-900">{item.title}</div>
                            {item.learningObjective && (
                              <div className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                                <Target size={12} />
                                {item.learningObjective}
                              </div>
                            )}
                            {item.keyPoints && item.keyPoints.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {item.keyPoints.map((kp, kidx) => (
                                  <span
                                    key={kidx}
                                    className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
                                  >
                                    {kp}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(2)}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-white/70 bg-white/70 px-6 py-3.5 font-semibold text-slate-700 backdrop-blur-sm transition hover:bg-white/90 disabled:opacity-60"
                  >
                    <ArrowLeft size={18} /> 返回修改
                  </button>
                  <button
                    onClick={handleGenerateOutline}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-white/70 bg-white/70 px-6 py-3.5 font-semibold text-slate-700 backdrop-blur-sm transition hover:bg-white/90 disabled:opacity-60"
                  >
                    <RefreshCw size={18} /> 重新生成
                  </button>
                  <button
                    onClick={handleGenerateCourseware}
                    disabled={loading}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3.5 font-semibold text-white shadow-lg transition hover:bg-slate-800 disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        {loadingText}
                      </>
                    ) : (
                      <>确认并生成课件 <CheckCircle size={18} /></>
                    )}
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                  <CheckCircle size={40} />
                </div>
                <h2 className="text-3xl font-bold text-slate-900">课件生成完成！</h2>
                <p className="text-slate-600">课件已进入编辑器，你可以继续编辑或预览播放。</p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => navigate('/editor')}
                    className="flex items-center gap-2 rounded-2xl bg-slate-900 px-8 py-3.5 font-semibold text-white shadow-lg transition hover:bg-slate-800"
                  >
                    <PenLine size={18} /> 进入编辑器
                  </button>
                  <button
                    onClick={() => navigate('/player')}
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
