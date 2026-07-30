import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CoursewareSchema, type Courseware } from '@courseware/shared';
import { FileQuestion, Loader2 } from 'lucide-react';
import { Player } from './Player';
import { API_BASE } from '../lib/api';

export function PlayerPage() {
  const { id } = useParams<{ id: string }>();
  const [courseware, setCourseware] = useState<Courseware | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'not-found' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (!id) {
      setStatus('not-found');
      return;
    }
    const controller = new AbortController();
    setStatus('loading');
    setError(null);
    setCourseware(null);

    void (async () => {
      try {
        const response = await fetch(`${API_BASE}/courseware/${encodeURIComponent(id)}`, {
          signal: controller.signal,
        });
        if (response.status === 404) {
          setStatus('not-found');
          return;
        }
        if (!response.ok) throw new Error(`课件加载失败（${response.status}）`);
        const parsed = CoursewareSchema.safeParse(await response.json());
        if (!parsed.success) throw new Error('服务器返回的课件格式无效');
        setCourseware(parsed.data);
        setStatus('ready');
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(loadError instanceof Error ? loadError.message : '课件加载失败');
        setStatus('error');
      }
    })();

    return () => controller.abort();
  }, [id, retryToken]);

  if (status === 'ready' && courseware) {
    return (
      <div className="h-dvh min-h-0 w-full bg-slate-900">
        <Player courseware={courseware} />
      </div>
    );
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center text-white">
      {status === 'loading' ? (
        <>
          <Loader2 className="animate-spin text-slate-300" size={32} />
          <p className="text-sm text-slate-300">正在加载课件…</p>
        </>
      ) : (
        <>
          <FileQuestion size={42} className="text-slate-400" />
          <h1 className="text-xl font-semibold">
            {status === 'not-found' ? '找不到这个课件' : '暂时无法打开课件'}
          </h1>
          <p className="max-w-md text-sm text-slate-400">
            {status === 'not-found' ? '课件可能已被删除，或链接不完整。' : error}
          </p>
          <div className="flex gap-3">
            {status === 'error' && (
              <button
                onClick={() => setRetryToken((value) => value + 1)}
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900"
              >
                重试
              </button>
            )}
            <Link
              to="/courseware-list"
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200"
            >
              返回课件列表
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
