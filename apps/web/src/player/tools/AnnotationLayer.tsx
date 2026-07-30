import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

export type AnnotationToolMode = 'pen' | 'eraser';
export type AnnotationPenSize = 'thin' | 'thick';

export interface AnnotationLayerHandle {
  /** Remove all strokes on the current slide. */
  clear: () => void;
  /** Remove the most recent stroke on the current slide. */
  undo: () => void;
}

interface AnnotationLayerProps {
  /** Strokes are kept per slide id, in memory only. */
  slideId: string;
  /** When false the canvas ignores all pointer events. */
  active: boolean;
  tool: AnnotationToolMode;
  /** CSS color used for pen strokes. */
  color: string;
  size: AnnotationPenSize;
}

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  tool: AnnotationToolMode;
  color: string;
  width: number;
  points: Point[];
}

/** Internal coordinate space of the player stage. */
const STAGE_WIDTH = 1280;
const STAGE_HEIGHT = 720;

const PEN_WIDTHS: Record<AnnotationPenSize, number> = {
  thin: 3,
  thick: 7,
};
const ERASER_WIDTH = 28;

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  const pts = stroke.points;
  if (pts.length === 0 || !pts[0]) return;

  ctx.save();
  ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = stroke.width;
  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;

  if (pts.length === 1) {
    // A single tap renders as a dot.
    ctx.beginPath();
    ctx.arc(pts[0].x, pts[0].y, stroke.width / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    // Smooth the polyline with quadratic curves through midpoints.
    for (let i = 1; i < pts.length - 1; i++) {
      const current = pts[i];
      const next = pts[i + 1];
      if (!current || !next) continue;
      ctx.quadraticCurveTo(current.x, current.y, (current.x + next.x) / 2, (current.y + next.y) / 2);
    }
    const last = pts[pts.length - 1];
    if (last) {
      ctx.lineTo(last.x, last.y);
    }
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Transparent canvas overlay for teacher annotations. Sits above the slide
 * content; pointer events are only enabled while annotation mode is active.
 * Strokes are stored per slide id in memory and redrawn when returning.
 */
export const AnnotationLayer = forwardRef<AnnotationLayerHandle, AnnotationLayerProps>(
  function AnnotationLayer({ slideId, active, tool, color, size }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const strokesBySlide = useRef<Map<string, Stroke[]>>(new Map());
    const currentStrokeRef = useRef<Stroke | null>(null);

    const redraw = useCallback(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
      const strokes = strokesBySlide.current.get(slideId) ?? [];
      strokes.forEach((stroke) => drawStroke(ctx, stroke));
      if (currentStrokeRef.current) {
        drawStroke(ctx, currentStrokeRef.current);
      }
    }, [slideId]);

    // Repaint when switching slides so per-page annotations are restored.
    useEffect(() => {
      redraw();
    }, [redraw]);

    useImperativeHandle(
      ref,
      () => ({
        clear: () => {
          strokesBySlide.current.set(slideId, []);
          currentStrokeRef.current = null;
          redraw();
        },
        undo: () => {
          const strokes = strokesBySlide.current.get(slideId);
          if (strokes && strokes.length > 0) {
            strokes.pop();
            redraw();
          }
        },
      }),
      [slideId, redraw],
    );

    const getPos = (e: ReactPointerEvent<HTMLCanvasElement>): Point => {
      // The stage may be scaled via CSS transform; normalise back to the
      // 1280x720 coordinate space by dividing by the displayed size.
      const rect = e.currentTarget.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * STAGE_WIDTH,
        y: ((e.clientY - rect.top) / rect.height) * STAGE_HEIGHT,
      };
    };

    const handlePointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
      if (!active || e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      currentStrokeRef.current = {
        tool,
        color,
        width: tool === 'eraser' ? ERASER_WIDTH : PEN_WIDTHS[size],
        points: [getPos(e)],
      };
      redraw();
    };

    const handlePointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
      const stroke = currentStrokeRef.current;
      if (!stroke) return;
      stroke.points.push(getPos(e));
      redraw();
    };

    const finishStroke = () => {
      const stroke = currentStrokeRef.current;
      if (!stroke) return;
      currentStrokeRef.current = null;
      if (stroke.points.length > 0) {
        const strokes = strokesBySlide.current.get(slideId) ?? [];
        strokes.push(stroke);
        strokesBySlide.current.set(slideId, strokes);
      }
      redraw();
    };

    const handlePointerUp = () => {
      finishStroke();
    };

    const handlePointerCancel = () => {
      finishStroke();
    };

    return (
      <canvas
        ref={canvasRef}
        width={STAGE_WIDTH}
        height={STAGE_HEIGHT}
        className="absolute inset-0 z-40 h-full w-full"
        style={{
          pointerEvents: active ? 'auto' : 'none',
          cursor: active ? 'crosshair' : 'default',
          touchAction: 'none',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      />
    );
  },
);
