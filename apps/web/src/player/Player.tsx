import { useCallback, useEffect, useRef, useState } from 'react';
import type { Courseware, SlideTransition } from '@courseware/shared';
import { useGSAP } from '@gsap/react';
import { gsap } from '../lib/gsap';
import { SlideView } from './SlideView';
import { AIAssistantLayer } from './AIAssistantLayer';
import { ThemeProvider } from '../lib/theme-context';
import { AnnotationLayer } from './tools/AnnotationLayer';
import type { AnnotationLayerHandle, AnnotationPenSize, AnnotationToolMode } from './tools/AnnotationLayer';
import { PointerToolLayer } from './tools/PointerToolLayer';
import { stopSpeak } from './tools/speech';
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Maximize,
  Minimize,
  PenLine,
  Target,
  Flashlight,
  Search,
  Trash2,
  Undo2,
  Eraser,
  X,
} from 'lucide-react';

interface PlayerProps {
  courseware: Courseware;
  controls?: boolean;
}

/** Active teaching tool. Pointer tools are mutually exclusive by construction,
 * and annotation mode is exclusive with all pointer tools. */
type PlayerTool = 'none' | 'annotate' | 'laser' | 'spotlight' | 'magnifier';

const ANNOTATION_COLORS: Array<{ name: string; value: string }> = [
  { name: '红色', value: '#ef4444' },
  { name: '黄色', value: '#facc15' },
  { name: '蓝色', value: '#3b82f6' },
];

function mapEasing(easing?: string): string {
  if (!easing) return 'power2.inOut';
  const validEasings = [
    'power1.in', 'power1.out', 'power1.inOut',
    'power2.in', 'power2.out', 'power2.inOut',
    'power3.in', 'power3.out', 'power3.inOut',
    'power4.in', 'power4.out', 'power4.inOut',
    'back.in', 'back.out', 'back.inOut',
    'elastic.in', 'elastic.out', 'elastic.inOut',
    'bounce.in', 'bounce.out', 'bounce.inOut',
    'circ.in', 'circ.out', 'circ.inOut',
    'expo.in', 'expo.out', 'expo.inOut',
    'none',
  ];
  return validEasings.includes(easing) ? easing : 'power2.inOut';
}

function createTransitionTimeline(
  from: HTMLElement,
  to: HTMLElement,
  transition: SlideTransition,
  onComplete: () => void,
) {
  const duration = transition.duration || 0.8;
  const easing = mapEasing(transition.easing);
  const direction = transition.direction || 'right';

  const tl = gsap.timeline({ onComplete });

  gsap.set(to, {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
    zIndex: 2,
    clearProps: 'transform',
  });

  gsap.set(from, {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 1,
    clearProps: 'transform',
  });

  switch (transition.type) {
    case 'slide': {
      const axis = direction === 'left' || direction === 'right' ? 'x' : 'y';
      const fromSign = direction === 'right' || direction === 'down' ? -1 : 1;
      const toSign = direction === 'right' || direction === 'down' ? 1 : -1;
      const distance = axis === 'x' ? from.offsetWidth : from.offsetHeight;

      gsap.set(to, { [axis]: toSign * distance, opacity: 1 });
      tl.to(from, { [axis]: fromSign * distance, duration, ease: easing }, 0);
      tl.to(to, { [axis]: 0, duration, ease: easing }, 0);
      break;
    }
    case 'zoom': {
      gsap.set(to, { scale: 1.5, opacity: 1 });
      tl.to(from, { scale: 0.8, opacity: 0, duration, ease: easing }, 0);
      tl.to(to, { scale: 1, opacity: 1, duration, ease: easing }, 0);
      break;
    }
    case 'flip': {
      gsap.set(to, { rotationY: 90, opacity: 1 });
      tl.to(from, { rotationY: -90, duration: duration * 0.5, ease: easing }, 0);
      tl.to(to, { rotationY: 0, duration: duration * 0.5, ease: easing }, duration * 0.5);
      break;
    }
    case 'wipe': {
      gsap.set(to, { opacity: 1 });
      gsap.set(from, { clipPath: 'inset(0% 0% 0% 0%)' });

      let inset = 'inset(0% 0% 0% 0%)';
      switch (direction) {
        case 'right':
          inset = 'inset(0% 100% 0% 0%)';
          break;
        case 'left':
          inset = 'inset(0% 0% 0% 100%)';
          break;
        case 'down':
          inset = 'inset(0% 0% 100% 0%)';
          break;
        case 'up':
          inset = 'inset(100% 0% 0% 0%)';
          break;
      }

      tl.to(from, { clipPath: inset, duration, ease: easing }, 0);
      break;
    }
    case 'parallax': {
      const axis = direction === 'left' || direction === 'right' ? 'x' : 'y';
      const fromSign = direction === 'right' || direction === 'down' ? -1 : 1;
      const toSign = direction === 'right' || direction === 'down' ? 1 : -1;
      const distance = axis === 'x' ? from.offsetWidth : from.offsetHeight;

      gsap.set(to, { [axis]: toSign * distance, opacity: 1 });
      tl.to(from, { [axis]: fromSign * distance * 0.3, duration, ease: easing }, 0);
      tl.to(to, { [axis]: 0, duration, ease: easing }, 0);
      break;
    }
    case 'morph':
    case 'fade':
    default: {
      tl.to(from, { opacity: 0, duration: duration * 0.5, ease: easing }, 0);
      tl.to(to, { opacity: 1, duration: duration * 0.5, ease: easing }, `-=${duration * 0.3}`);
      break;
    }
  }

  return tl;
}

export function Player({ courseware, controls = true }: PlayerProps) {
  const { slides } = courseware;
  const [displayIndex, setDisplayIndex] = useState(0);
  const [targetIndex, setTargetIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTool, setActiveTool] = useState<PlayerTool>('none');
  const [penColor, setPenColor] = useState(ANNOTATION_COLORS[0]?.value ?? '#ef4444');
  const [penSize, setPenSize] = useState<AnnotationPenSize>('thin');
  const [annotationMode, setAnnotationMode] = useState<AnnotationToolMode>('pen');
  const annotationRef = useRef<AnnotationLayerHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const slideARef = useRef<HTMLDivElement>(null);
  const slideBRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const currentSlide = slides[displayIndex] ?? slides[0];
  const targetSlide = slides[targetIndex];

  const goToSlide = useCallback(
    (newIndex: number) => {
      if (isTransitioning) return;
      if (newIndex === displayIndex) return;
      if (newIndex < 0 || newIndex >= slides.length) return;

      setIsTransitioning(true);
      setTargetIndex(newIndex);
    },
    [displayIndex, isTransitioning, slides.length],
  );

  const goNext = useCallback(() => {
    goToSlide(displayIndex + 1);
  }, [displayIndex, goToSlide]);

  const goPrev = useCallback(() => {
    goToSlide(displayIndex - 1);
  }, [displayIndex, goToSlide]);

  // Handle transition animation when targetIndex changes using a scoped GSAP context.
  useGSAP(
    () => {
      if (targetIndex === displayIndex) return;

      const fromRef = slideARef.current;
      const toRef = slideBRef.current;
      if (!fromRef || !toRef) return;

      const transition = slides[displayIndex]?.transition || slides[targetIndex]?.transition || {
        type: 'fade',
        duration: 0.8,
        easing: 'power2.inOut',
      };

      const tl = createTransitionTimeline(fromRef, toRef, transition, () => {
        setDisplayIndex(targetIndex);
        setIsTransitioning(false);
      });

      tl.play();

      return () => {
        tl.kill();
      };
    },
    { scope: containerRef, dependencies: [targetIndex, displayIndex, slides] },
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 输入框/文本域/可编辑区域中不劫持按键（AI 助手输入等）
      const target = e.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev]);

  // Teaching-tool shortcuts: B = annotate, L = laser, S = spotlight, Esc = exit tool.
  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      return (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const key = e.key.toLowerCase();
      if (key === 'b') {
        setActiveTool((t) => (t === 'annotate' ? 'none' : 'annotate'));
      } else if (key === 'l') {
        setActiveTool((t) => (t === 'laser' ? 'none' : 'laser'));
      } else if (key === 's') {
        setActiveTool((t) => (t === 'spotlight' ? 'none' : 'spotlight'));
      } else if (e.key === 'Escape') {
        setActiveTool('none');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Stop any in-flight speech when the player unmounts.
  useEffect(() => {
    return () => stopSpeak();
  }, []);

  const toggleTool = useCallback((tool: PlayerTool) => {
    setActiveTool((current) => (current === tool ? 'none' : tool));
  }, []);

  const handleRestart = () => {
    setIsTransitioning(false);
    setTargetIndex(0);
    setDisplayIndex(0);
  };

  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        // Fullscreen the canvas area so the stage keeps its flex centering
        // and can be scaled to fill the viewport without top-left offset.
        await canvasRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;

    const updateScale = () => {
      const styles = window.getComputedStyle(canvas);
      const horizontalPadding =
        Number.parseFloat(styles.paddingLeft) + Number.parseFloat(styles.paddingRight);
      const verticalPadding =
        Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom);
      const availableWidth = Math.max(1, canvas.clientWidth - horizontalPadding);
      const availableHeight = Math.max(1, canvas.clientHeight - verticalPadding);
      const scale = Math.min(availableWidth / 1280, availableHeight / 720);
      stage.style.transform = `scale(${scale})`;
      stage.style.transformOrigin = 'center center';
    };

    updateScale();
    const resizeObserver = new ResizeObserver(updateScale);
    resizeObserver.observe(canvas);
    window.addEventListener('resize', updateScale);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, [isFullscreen]);

  if (!currentSlide) {
    return (
      <ThemeProvider
        themeId={courseware.designSystem?.id}
        gradeLevel={courseware.gradeLevel || 'unknown'}
        tokensOverride={courseware.designSystem?.tokens}
      >
        <div className="flex h-full min-h-0 w-full flex-col bg-slate-900 text-white">
          {controls && (
            <div className="flex shrink-0 items-center justify-between gap-3 bg-slate-800 px-4 py-3">
              <h1 className="min-w-0 truncate text-lg font-semibold" title={courseware.title}>
                {courseware.title}
              </h1>
              <div className="shrink-0 text-sm text-slate-400">0 / 0</div>
            </div>
          )}
          <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-center">
            <div className="rounded-2xl border border-slate-700 bg-slate-800/80 px-8 py-7 shadow-xl">
              <p className="text-lg font-semibold">课件暂无可播放页面</p>
              <p className="mt-2 text-sm text-slate-400">请返回编辑器添加页面后再播放。</p>
            </div>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider themeId={courseware.designSystem?.id} gradeLevel={courseware.gradeLevel || 'unknown'} tokensOverride={courseware.designSystem?.tokens}>
    <div ref={containerRef} className="flex h-full min-h-0 w-full flex-col bg-slate-900">
      {controls && (
        <div className="flex shrink-0 items-center justify-between gap-3 bg-slate-800 px-4 py-3 text-white">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              onClick={() => (window.location.href = '/')}
              className="shrink-0 rounded-lg bg-slate-700 px-3 py-1.5 text-sm hover:bg-slate-600"
            >
              ← 返回首页
            </button>
            <h1 className="min-w-0 truncate text-lg font-semibold" title={courseware.title}>
              {courseware.title}
            </h1>
          </div>
          <div className="shrink-0 text-sm text-slate-400">
            {displayIndex + 1} / {slides.length}
          </div>
        </div>
      )}

      {/* Slide canvas area */}
      <div
        ref={canvasRef}
        className="player-canvas relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4"
        style={{
          cursor:
            activeTool === 'annotate'
              ? 'crosshair'
              : activeTool !== 'none'
                ? 'none'
                : 'default',
        }}
      >
        <div
          ref={stageRef}
          className="relative shrink-0 bg-slate-900"
          style={{
            width: 1280,
            height: 720,
            aspectRatio: '16 / 9',
          }}
        >
          {/* Current slide */}
          <div
            key={currentSlide.id}
            ref={slideARef}
            className="absolute inset-0"
            style={{ zIndex: 1 }}
          >
            <SlideView
              courseware={courseware}
              slide={currentSlide}
              isActive={!isTransitioning}
              onNavigate={(direction) => {
                if (typeof direction === 'number') {
                  goToSlide(direction);
                } else if (direction === 'next') {
                  goNext();
                } else if (direction === 'prev') {
                  goPrev();
                }
              }}
            />
          </div>

          {/* Target slide for transition */}
          {isTransitioning && targetSlide && (
            <div
              key={targetSlide.id}
              ref={slideBRef}
              className="absolute inset-0 opacity-0"
              style={{ zIndex: 2 }}
            >
              <SlideView
                courseware={courseware}
                slide={targetSlide}
                isActive={false}
                onNavigate={(direction) => {
                  if (typeof direction === 'number') {
                    goToSlide(direction);
                  } else if (direction === 'next') {
                    goNext();
                  } else if (direction === 'prev') {
                    goPrev();
                  }
                }}
              />
            </div>
          )}

          {/* Teaching-tool overlays: above slide content, below the AI assistant (z-50). */}
          <AnnotationLayer
            ref={annotationRef}
            slideId={currentSlide.id}
            active={activeTool === 'annotate'}
            tool={annotationMode}
            color={penColor}
            size={penSize}
          />
          {(activeTool === 'laser' || activeTool === 'spotlight' || activeTool === 'magnifier') && (
            <PointerToolLayer
              mode={activeTool}
              slideId={currentSlide.id}
              contentRef={slideARef}
            />
          )}

          <AIAssistantLayer courseware={courseware} slide={currentSlide} />
        </div>

        {/* Annotation options bar (colors / size / eraser / undo / clear). */}
        {activeTool === 'annotate' && (
          <div className="absolute left-1/2 top-3 z-40 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-slate-800/95 px-3 py-2 shadow-lg">
            {ANNOTATION_COLORS.map((c) => (
              <button
                key={c.value}
                title={c.name}
                onClick={() => {
                  setPenColor(c.value);
                  setAnnotationMode('pen');
                }}
                className={`h-6 w-6 rounded-full border-2 ${
                  annotationMode === 'pen' && penColor === c.value
                    ? 'border-white'
                    : 'border-transparent'
                }`}
                style={{ backgroundColor: c.value }}
              />
            ))}
            <div className="h-5 w-px bg-slate-600" />
            <button
              title="细笔"
              onClick={() => {
                setPenSize('thin');
                setAnnotationMode('pen');
              }}
              className={`rounded px-2 py-1 text-xs text-white ${
                annotationMode === 'pen' && penSize === 'thin' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              细
            </button>
            <button
              title="粗笔"
              onClick={() => {
                setPenSize('thick');
                setAnnotationMode('pen');
              }}
              className={`rounded px-2 py-1 text-xs text-white ${
                annotationMode === 'pen' && penSize === 'thick' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              粗
            </button>
            <button
              title="橡皮擦"
              onClick={() => setAnnotationMode('eraser')}
              className={`rounded p-1.5 text-white ${
                annotationMode === 'eraser' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              <Eraser size={16} />
            </button>
            <div className="h-5 w-px bg-slate-600" />
            <button
              title="撤销上一笔"
              onClick={() => annotationRef.current?.undo()}
              className="rounded bg-slate-700 p-1.5 text-white hover:bg-slate-600"
            >
              <Undo2 size={16} />
            </button>
            <button
              title="清屏"
              onClick={() => annotationRef.current?.clear()}
              className="rounded bg-slate-700 p-1.5 text-white hover:bg-slate-600"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      {controls && (
        <div className="shrink-0 overflow-x-auto overscroll-x-contain bg-slate-800 [scrollbar-color:rgb(71_85_105)_transparent] [scrollbar-width:thin]">
          <div className="mx-auto flex w-max min-w-full items-center justify-center gap-4 px-4 py-3">
            <button
              onClick={goPrev}
              disabled={displayIndex === 0 || isTransitioning}
              title="上一页"
              className="shrink-0 rounded-lg bg-slate-700 p-2 text-white hover:bg-slate-600 disabled:opacity-40"
            >
              <ChevronLeft size={20} />
            </button>

            <button
              onClick={handleRestart}
              title="重新开始"
              className="shrink-0 rounded-lg bg-slate-700 p-2 text-white hover:bg-slate-600"
            >
              <RotateCcw size={20} />
            </button>

            <button
              onClick={goNext}
              disabled={displayIndex === slides.length - 1 || isTransitioning}
              title="下一页"
              className="shrink-0 rounded-lg bg-slate-700 p-2 text-white hover:bg-slate-600 disabled:opacity-40"
            >
              <ChevronRight size={20} />
            </button>

            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? '退出全屏' : '全屏播放'}
              className="shrink-0 rounded-lg bg-slate-700 p-2 text-white hover:bg-slate-600"
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>

            <div className="mx-1 h-6 w-px shrink-0 bg-slate-600" />

            <button
              onClick={() => toggleTool('annotate')}
              title="批注 (B)"
              className={`shrink-0 rounded-lg p-2 text-white ${
                activeTool === 'annotate' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              <PenLine size={20} />
            </button>

            <button
              onClick={() => toggleTool('laser')}
              title="激光笔 (L)"
              className={`shrink-0 rounded-lg p-2 text-white ${
                activeTool === 'laser' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              <Target size={20} />
            </button>

            <button
              onClick={() => toggleTool('spotlight')}
              title="聚光灯 (S)"
              className={`shrink-0 rounded-lg p-2 text-white ${
                activeTool === 'spotlight' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              <Flashlight size={20} />
            </button>

            <button
              onClick={() => toggleTool('magnifier')}
              title="放大镜"
              className={`shrink-0 rounded-lg p-2 text-white ${
                activeTool === 'magnifier' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              <Search size={20} />
            </button>

            <button
              onClick={() => annotationRef.current?.clear()}
              disabled={activeTool !== 'annotate'}
              title="清屏"
              className="shrink-0 rounded-lg bg-slate-700 p-2 text-white hover:bg-slate-600 disabled:opacity-40"
            >
              <Trash2 size={20} />
            </button>

            <button
              onClick={() => setActiveTool('none')}
              disabled={activeTool === 'none'}
              title="关闭工具 (Esc)"
              className="shrink-0 rounded-lg bg-slate-700 p-2 text-white hover:bg-slate-600 disabled:opacity-40"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
    </ThemeProvider>
  );
}
