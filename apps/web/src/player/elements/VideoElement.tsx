import { useState } from 'react';
import type { Element, Asset } from '@courseware/shared';
import { Clapperboard, Loader2 } from 'lucide-react';

interface VideoElementProps {
  element: Element;
  assets: Asset[];
  onInteraction?: (elementId: string, event: string) => void;
}

interface VideoContent {
  assetId?: string;
  autoPlay?: boolean;
  loop?: boolean;
  controls?: boolean;
}

function MissingAssetPlaceholder({ label }: { label?: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-4 text-center text-slate-400">
      <Clapperboard size={36} strokeWidth={1.5} />
      <span className="line-clamp-2 text-sm font-medium">{label || '视频资源缺失'}</span>
    </div>
  );
}

export function VideoElement({ element, assets, onInteraction }: VideoElementProps) {
  const content = element.content as VideoContent;
  const { geometry, style } = element;
  const asset = assets.find((a) => a.id === content.assetId);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

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

  if (!asset) {
    return (
      <div id={element.id} className="absolute overflow-hidden" style={wrapperStyle}>
        <MissingAssetPlaceholder />
      </div>
    );
  }

  const autoPlay = content.autoPlay ?? false;

  return (
    <div id={element.id} className="absolute overflow-hidden" style={wrapperStyle}>
      {status === 'loading' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-50/80 text-slate-400">
          <Loader2 size={28} className="animate-spin" />
        </div>
      )}
      {status === 'error' ? (
        <MissingAssetPlaceholder label={asset.filename} />
      ) : (
        <video
          src={asset.url}
          className="h-full w-full bg-black"
          style={{ objectFit: 'contain' }}
          controls={content.controls ?? true}
          autoPlay={autoPlay}
          // 浏览器要求自动播放必须静音
          muted={autoPlay || undefined}
          loop={content.loop ?? false}
          playsInline
          preload="metadata"
          onCanPlay={() => setStatus('loaded')}
          onEnded={() => onInteraction?.(element.id, 'ENDED')}
          onError={() => setStatus('error')}
        />
      )}
    </div>
  );
}
