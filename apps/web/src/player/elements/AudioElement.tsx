import { useEffect, useRef, useState } from 'react';
import type { Element, Asset } from '@courseware/shared';
import { Music, Play, Pause } from 'lucide-react';

interface AudioElementProps {
  element: Element;
  assets: Asset[];
  onInteraction?: (elementId: string, event: string) => void;
}

interface AudioContent {
  assetId?: string;
  autoPlay?: boolean;
  loop?: boolean;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function MissingAssetPlaceholder() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-4 text-center text-slate-400">
      <Music size={32} strokeWidth={1.5} />
      <span className="text-sm font-medium">音频资源缺失</span>
    </div>
  );
}

export function AudioElement({ element, assets, onInteraction }: AudioElementProps) {
  const content = element.content as AudioContent;
  const { geometry, style } = element;
  const asset = assets.find((a) => a.id === content.assetId);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loadError, setLoadError] = useState(false);

  // 切换资源时重置状态
  useEffect(() => {
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setLoadError(false);
  }, [asset?.url]);

  const wrapperStyle: React.CSSProperties = {
    left: geometry.x,
    top: geometry.y,
    width: geometry.width,
    height: geometry.height,
    zIndex: geometry.zIndex,
    transform: geometry.rotation ? `rotate(${geometry.rotation}deg)` : undefined,
    borderRadius: style.borderRadius ? `${style.borderRadius}px` : undefined,
    borderWidth: style.borderWidth ? `${style.borderWidth}px` : undefined,
    borderColor: style.borderColor,
    borderStyle: style.borderStyle,
    opacity: style.opacity ?? 1,
    boxShadow: style.shadow,
  };

  if (!asset || loadError) {
    return (
      <div id={element.id} className="absolute overflow-hidden" style={wrapperStyle}>
        <MissingAssetPlaceholder />
        {asset && (
          <audio
            src={asset.url}
            onError={() => setLoadError(true)}
            className="hidden"
          />
        )}
      </div>
    );
  }

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      void audio.play().catch(() => {
        // 浏览器自动播放限制等导致的失败，保持暂停态即可
        setPlaying(false);
      });
    }
  };

  const progress = duration > 0 ? currentTime / duration : 0;

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    audio.currentTime = ratio * duration;
    setCurrentTime(ratio * duration);
  };

  return (
    <div id={element.id} className="absolute overflow-hidden" style={wrapperStyle}>
      <div className="flex h-full w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 px-4 shadow-sm">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <Music size={18} />
        </div>
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? '暂停' : '播放'}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700"
        >
          {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div
            className="group h-2 w-full cursor-pointer rounded-full bg-slate-200"
            onClick={seek}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
          >
            <div
              className="h-full rounded-full bg-blue-500 transition-[width]"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] tabular-nums text-slate-400">
            <span>{formatTime(currentTime)}</span>
            <span className="truncate px-2 text-slate-500">{asset.filename}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
      <audio
        ref={audioRef}
        src={asset.url}
        autoPlay={content.autoPlay ?? false}
        loop={content.loop ?? false}
        preload="metadata"
        className="hidden"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          onInteraction?.(element.id, 'ENDED');
        }}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onError={() => setLoadError(true)}
      />
    </div>
  );
}
