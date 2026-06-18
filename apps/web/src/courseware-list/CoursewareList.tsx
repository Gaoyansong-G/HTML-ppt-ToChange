import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditorStore } from '../stores/editor.store';
import { AuroraBackground } from '../components/ui/AuroraBackground';
import { FileText, Play, PenLine, Plus, Trash2, Loader2 } from 'lucide-react';
import { SlideThumbnail } from '../editor/SlideThumbnail';
import type { Courseware } from '@courseware/shared';

const API_BASE = 'http://localhost:3001/api';

export function CoursewareList() {
  const navigate = useNavigate();
  const { setCourseware } = useEditorStore();
  const [items, setItems] = useState<Courseware[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/courseware`);
      if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
      const data = await res.json();
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

  const handleOpenEditor = (cw: Courseware) => {
    setCourseware(cw);
    navigate('/editor');
  };

  const handleOpenPlayer = (cw: Courseware) => {
    setCourseware(cw);
    navigate('/player');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定删除这个课件吗？')) return;
    try {
      const res = await fetch(`${API_BASE}/courseware/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('删除失败');
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
          <button
            onClick={() => navigate('/wizard')}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800"
          >
            <Plus size={16} /> 新建课件
          </button>
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
            <p className="max-w-sm text-slate-600">你还没有生成或保存过课件。点击右上角“新建课件”开始创建。</p>
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
                    {cw.slides.length} 页
                  </div>

                  {cw.slides[0] ? (
                    <SlideThumbnail
                      slide={cw.slides[0]}
                      assets={cw.assets || []}
                      className="h-full w-full rounded-none border-0 shadow-none"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <FileText size={52} strokeWidth={1.2} className="text-slate-300" />
                    </div>
                  )}

                  {/* Hover quick actions */}
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-white/50 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100">
                    <button
                      onClick={() => handleOpenEditor(cw)}
                      title="编辑"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg transition hover:scale-110 hover:bg-slate-800"
                    >
                      <PenLine size={16} />
                    </button>
                    <button
                      onClick={() => handleOpenPlayer(cw)}
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
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400">
                    <span>{new Date(cw.updatedAt).toLocaleDateString()}</span>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-500">
                      {cw.slides.length} 页
                    </span>
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
