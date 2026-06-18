import { useState } from 'react';
import type { Element, Asset } from '@courseware/shared';
import { ImageIcon, Loader2 } from 'lucide-react';

interface ImageElementProps {
  element: Element;
  assets: Asset[];
}

function Placeholder({ alt, borderRadius }: { alt?: string; borderRadius?: number }) {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-4 text-center text-slate-400"
      style={{ borderRadius: borderRadius ? `${borderRadius}px` : undefined }}
    >
      <ImageIcon size={36} strokeWidth={1.5} />
      <span className="line-clamp-2 text-sm font-medium">{alt || '图片'}</span>
    </div>
  );
}

export function ImageElement({ element, assets }: ImageElementProps) {
  const content = element.content as { assetId?: string; alt?: string; objectFit?: string };
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
        <Placeholder alt={content.alt} borderRadius={style.borderRadius} />
      </div>
    );
  }

  return (
    <div id={element.id} className="absolute overflow-hidden" style={wrapperStyle}>
      {status === 'loading' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-50/80 text-slate-400">
          <Loader2 size={28} className="animate-spin" />
        </div>
      )}
      {status === 'error' ? (
        <Placeholder alt={content.alt} borderRadius={style.borderRadius} />
      ) : (
        <img
          src={asset.url}
          alt={content.alt || asset.filename}
          className="h-full w-full"
          style={{ objectFit: (content.objectFit || 'contain') as React.CSSProperties['objectFit'] }}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
        />
      )}
    </div>
  );
}
