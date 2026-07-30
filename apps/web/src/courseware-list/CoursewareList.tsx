import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEFAULT_DESIGN_SYSTEM } from '@courseware/shared';
import { AuroraBackground } from '../components/ui/AuroraBackground';
import { FileText, Play, PenLine, Plus, Trash2, Loader2, Sparkles } from 'lucide-react';
import { API_BASE } from '../lib/api';

interface CoursewareSummary {
  id: string;
  title: string;
  topicDescription: string;
  subject?: string;
  gradeLevel?: 'primary' | 'middle' | 'high' | 'unknown';
  slideCount: number;
  createdAt: string;
  updatedAt: string;
  revision: number;
}

export function CoursewareList() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CoursewareSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/courseware/summaries`);
      if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
      const data = (await res.json()) as CoursewareSummary[];
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleOpenEditor = (id: string) => {
    navigate(`/courseware/${encodeURIComponent(id)}/edit`);
  };

  const handleOpenPlayer = (id: string) => {
    navigate(`/courseware/${encodeURIComponent(id)}/present`);
  };

  const handleCreateBlank = async () => {
    if (creating) return;
    setCreating(true);
    setError(null);
    const suffix =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}`;
    const now = new Date().toISOString();
    try {
      const response = await fetch(`${API_BASE}/courseware`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: '1.0',
          title: '未命名课件',
          topicDescription: '个人备课',
          gradeLevel: 'unknown',
          designSystem: DEFAULT_DESIGN_SYSTEM,
          slides: [
            {
              id: `slide-${suffix}`,
              order: 0,
              title: '第 1 页',
              layout: { templateId: 'blank', variant: 'default', constraints: [] },
              background: { color: '#ffffff' },
              elements: [],
              transition: { type: 'fade', duration: 0.5, easing: 'power2.out' },
              timeline: { autoPlay: true },
            },
          ],
          assets: [],
          createdAt: now,
          updatedAt: now,
        }),
      });
      if (!response.ok) throw new Error('新建课件失败，请稍后重试');
      const created = (await response.json()) as { id: string };
      navigate(`/courseware/${encodeURIComponent(created.id)}/edit`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : '新建课件失败');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定删除这个课件吗？')) return;
    try {
      const res = await fetch(`${API_BASE}/courseware/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('删除失败');
      try {
        localStorage.removeItem(`cw.document-draft.${id}`);
      } catch {
        // Browser storage can be unavailable; server deletion still succeeded.
      }
      setItems((prev) => prev.filter((cw) => cw.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  return (
    <AuroraBackground className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-white/60 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md">
              <FileText size={18} />
            </div>
            <span className="text-lg font-bold text-slate-900">我的课件</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/wizard')}
              className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:flex"
            >
              <Sparkles size={16} /> AI 生成
            </button>
            <button
              onClick={handleCreateBlank}
              disabled={creating}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800 disabled:opacity-60"
            >
              {creating ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
              新建空白课件
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-500">
            <Loader2 className="animate-spin" size={32} />
            <p>正在加载课件列表...</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-white/70 bg-white/80 p-6 text-red-800 shadow-lg backdrop-blur-sm">
            <p>{error}</p>
            <button
              onClick={fetchItems}
              className="mt-3 rounded-lg bg-red-100 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-200"
            >
              重试
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-white/70 bg-white/80 p-12 text-center shadow-xl shadow-slate-900/5 backdrop-blur-sm">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <FileText size={40} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">暂无课件</h2>
            <p className="max-w-sm text-slate-600">你还没有课件。可以从空白页面开始备课，也可以交给 AI 生成初稿。</p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={handleCreateBlank}
                disabled={creating}
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                新建空白课件
              </button>
              <button
                onClick={() => navigate('/wizard')}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700"
              >
                AI 生成初稿
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((cw) => (
              <div
                key={cw.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                {/* Cover */}
                <div className="relative aspect-video overflow-hidden bg-slate-100">
                  <div className="absolute left-3 top-3 z-10 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-slate-600 shadow-sm backdrop-blur">
                    {cw.slideCount} 页
                  </div>

                  <div className="flex h-full w-full flex-col justify-between bg-gradient-to-br from-slate-50 via-white to-indigo-50 p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-md">
                      <FileText size={24} />
                    </div>
                    <div>
                      {cw.subject && (
                        <span className="mb-2 inline-flex rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-slate-500 shadow-sm">
                          {cw.subject}
                        </span>
                      )}
                      <p className="line-clamp-2 text-lg font-bold leading-snug text-slate-800">
                        {cw.title}
                      </p>
                    </div>
                  </div>

                  {/* Hover quick actions */}
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-white/50 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100">
                    <button
                      onClick={() => handleOpenEditor(cw.id)}
                      title="编辑"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg transition hover:scale-110 hover:bg-slate-800"
                    >
                      <PenLine size={16} />
                    </button>
                    <button
                      onClick={() => handleOpenPlayer(cw.id)}
                      title="预览"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-white shadow-lg transition hover:scale-110 hover:bg-slate-600"
                    >
                      <Play size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(cw.id)}
                      title="删除"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition hover:scale-110 hover:bg-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="mb-1 line-clamp-1 text-base font-bold text-slate-900">{cw.title}</h3>
                  <p className="line-clamp-2 text-sm leading-relaxed text-slate-500">{cw.topicDescription || '无描述'}</p>
                  <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
                    <button
                      onClick={() => handleOpenEditor(cw.id)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                    >
                      <PenLine size={13} /> 编辑
                    </button>
                    <button
                      onClick={() => handleOpenPlayer(cw.id)}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      <Play size={13} /> 播放
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </AuroraBackground>
  );
}
