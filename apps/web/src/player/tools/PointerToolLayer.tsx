import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

export type PointerToolMode = 'laser' | 'spotlight' | 'magnifier';

interface PointerToolLayerProps {
  mode: PointerToolMode;
  /** Used to refresh the magnifier snapshot when the slide changes. */
  slideId: string;
  /** The rendered slide DOM, used as the magnifier's magnification source. */
  contentRef: RefObject<HTMLDivElement>;
}

/** Internal coordinate space of the player stage. */
const STAGE_WIDTH = 1280;
const STAGE_HEIGHT = 720;

const LENS_RADIUS = 130;
const MAGNIFIER_ZOOM = 2;
/** How often the magnifier re-snapshots the slide DOM (ms). */
const MAGNIFIER_REFRESH_MS = 1000;

interface PointerPosition {
  x: number;
  y: number;
  inside: boolean;
}

const HIDDEN: PointerPosition = { x: 0, y: 0, inside: false };

/**
 * Laser pointer / spotlight / magnifier overlay. Always pointer-events-none
 * so it never blocks slide interactions; the cursor is tracked via a window
 * mousemove listener and mapped into the 1280x720 stage coordinate space.
 */
export function PointerToolLayer({ mode, slideId, contentRef }: PointerToolLayerProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const cloneHostRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<PointerPosition>(HIDDEN);

  // Track the cursor, throttled to one state update per animation frame.
  useEffect(() => {
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      if (raf !== 0) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const layer = layerRef.current;
        if (!layer) return;
        const rect = layer.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const x = ((e.clientX - rect.left) / rect.width) * STAGE_WIDTH;
        const y = ((e.clientY - rect.top) / rect.height) * STAGE_HEIGHT;
        const inside = x >= 0 && x <= STAGE_WIDTH && y >= 0 && y <= STAGE_HEIGHT;
        setPos((prev) =>
          prev.x === x && prev.y === y && prev.inside === inside ? prev : { x, y, inside },
        );
      });
    };

    const onLeaveWindow = () => setPos(HIDDEN);

    window.addEventListener('mousemove', onMove);
    document.documentElement.addEventListener('mouseleave', onLeaveWindow);
    return () => {
      window.removeEventListener('mousemove', onMove);
      document.documentElement.removeEventListener('mouseleave', onLeaveWindow);
      if (raf !== 0) window.cancelAnimationFrame(raf);
    };
  }, []);

  // Magnifier: snapshot the slide DOM into the lens. cloneNode(true) copies
  // the current inline styles, so GSAP-driven opacity/transform states are
  // captured. Refreshed periodically to approximate live content.
  useEffect(() => {
    if (mode !== 'magnifier') return;

    const refresh = () => {
      const source = contentRef.current;
      const host = cloneHostRef.current;
      if (!source || !host) return;
      const clone = source.cloneNode(true) as HTMLElement;
      clone.style.opacity = '';
      clone.style.transform = '';
      host.replaceChildren(clone);
    };

    refresh();
    const interval = window.setInterval(refresh, MAGNIFIER_REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [mode, slideId, contentRef]);

  return (
    <div ref={layerRef} className="pointer-events-none absolute inset-0 z-40">
      {pos.inside && mode === 'laser' && (
        <div
          className="absolute rounded-full"
          style={{
            width: 14,
            height: 14,
            backgroundColor: '#ef4444',
            boxShadow:
              '0 0 10px 4px rgba(239, 68, 68, 0.9), 0 0 28px 14px rgba(239, 68, 68, 0.45)',
            transform: `translate(${pos.x - 7}px, ${pos.y - 7}px)`,
          }}
        />
      )}

      {pos.inside && mode === 'spotlight' && (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: 'rgba(2, 6, 23, 0.78)',
            WebkitMaskImage: `radial-gradient(circle 170px at ${pos.x}px ${pos.y}px, transparent 0, transparent 125px, black 170px)`,
            maskImage: `radial-gradient(circle 170px at ${pos.x}px ${pos.y}px, transparent 0, transparent 125px, black 170px)`,
          }}
        />
      )}

      {pos.inside && mode === 'magnifier' && (
        <div
          className="absolute overflow-hidden rounded-full border-2 border-white/90 shadow-2xl"
          style={{
            width: LENS_RADIUS * 2,
            height: LENS_RADIUS * 2,
            backgroundColor: '#0f172a',
            transform: `translate(${pos.x - LENS_RADIUS}px, ${pos.y - LENS_RADIUS}px)`,
          }}
        >
          <div
            ref={cloneHostRef}
            style={{
              position: 'absolute',
              width: STAGE_WIDTH,
              height: STAGE_HEIGHT,
              left: LENS_RADIUS - pos.x * MAGNIFIER_ZOOM,
              top: LENS_RADIUS - pos.y * MAGNIFIER_ZOOM,
              transform: `scale(${MAGNIFIER_ZOOM})`,
              transformOrigin: '0 0',
            }}
          />
        </div>
      )}
    </div>
  );
}
