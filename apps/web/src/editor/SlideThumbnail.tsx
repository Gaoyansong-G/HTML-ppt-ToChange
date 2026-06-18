import { useRef, useState, useEffect } from 'react';
import type { Slide, Asset } from '@courseware/shared';
import { ElementRenderer } from '../player/elements';

const SLIDE_WIDTH = 1280;
const SLIDE_HEIGHT = 720;

interface SlideThumbnailProps {
  slide: Slide;
  assets: Asset[];
  className?: string;
}

export function SlideThumbnail({ slide, assets, className = '' }: SlideThumbnailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.15);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const width = el.clientWidth;
      if (width > 0) {
        setScale(width / SLIDE_WIDTH);
      }
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative aspect-video w-full overflow-hidden rounded-lg border border-slate-100 bg-white shadow-sm ${className}`}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: SLIDE_WIDTH,
          height: SLIDE_HEIGHT,
          transform: `scale(${scale})`,
          backgroundColor: slide.background.color || '#ffffff',
          backgroundImage: slide.background.gradient,
        }}
      >
        {slide.elements.map((element) => (
          <ElementRenderer key={element.id} element={element} assets={assets} />
        ))}
      </div>
    </div>
  );
}
