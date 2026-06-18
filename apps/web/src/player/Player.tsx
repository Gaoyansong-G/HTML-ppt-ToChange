import { useCallback, useEffect, useRef, useState } from 'react';
import type { Courseware, SlideTransition } from '@courseware/shared';
import { useGSAP } from '@gsap/react';
import { gsap } from '../lib/gsap';
import { SlideView } from './SlideView';
import { AIAssistantLayer } from './AIAssistantLayer';
import { ChevronLeft, ChevronRight, RotateCcw, Maximize, Minimize } from 'lucide-react';

interface PlayerProps {
  courseware: Courseware;
  controls?: boolean;
}

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
  const containerRef = useRef<HTMLDivElement>(null);
  const slideARef = useRef<HTMLDivElement>(null);
  const slideBRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const currentSlide = slides[displayIndex];
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
      if (!isFullscreen) {
        stage.style.transform = 'none';
        return;
      }
      // Measure the actual canvas area (fullscreen viewport) so the stage
      // scales to fill without relying on window.innerWidth.
      const rect = canvas.getBoundingClientRect();
      const scale = Math.min(rect.width / 1280, rect.height / 720);
      stage.style.transform = `scale(${scale})`;
      stage.style.transformOrigin = 'center center';
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [isFullscreen]);

  return (
    <div ref={containerRef} className="flex h-screen flex-col bg-slate-900">
      {controls && (
        <div className="flex items-center justify-between bg-slate-800 px-4 py-3 text-white">
          <div className="flex items-center gap-3">
            <button
              onClick={() => (window.location.href = '/')}
              className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm hover:bg-slate-600"
            >
              ← 返回首页
            </button>
            <h1 className="text-lg font-semibold">{courseware.title}</h1>
          </div>
          <div className="text-sm text-slate-400">
            {displayIndex + 1} / {slides.length}
          </div>
        </div>
      )}

      {/* Slide canvas area */}
      <div
        ref={canvasRef}
        className="player-canvas relative flex flex-1 items-center justify-center overflow-hidden p-4"
      >
        <div
          ref={stageRef}
          className="relative bg-slate-900"
          style={{
            width: 1280,
            height: 720,
            maxWidth: isFullscreen ? 'none' : '100%',
            maxHeight: isFullscreen ? 'none' : '100%',
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

          <AIAssistantLayer courseware={courseware} slide={currentSlide} />
        </div>
      </div>

      {controls && (
        <div className="flex items-center justify-center gap-4 bg-slate-800 px-4 py-3">
          <button
            onClick={goPrev}
            disabled={displayIndex === 0 || isTransitioning}
            title="上一页"
            className="rounded-lg bg-slate-700 p-2 text-white hover:bg-slate-600 disabled:opacity-40"
          >
            <ChevronLeft size={20} />
          </button>

          <button
            onClick={handleRestart}
            title="重新开始"
            className="rounded-lg bg-slate-700 p-2 text-white hover:bg-slate-600"
          >
            <RotateCcw size={20} />
          </button>

          <button
            onClick={goNext}
            disabled={displayIndex === slides.length - 1 || isTransitioning}
            title="下一页"
            className="rounded-lg bg-slate-700 p-2 text-white hover:bg-slate-600 disabled:opacity-40"
          >
            <ChevronRight size={20} />
          </button>

          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? '退出全屏' : '全屏播放'}
            className="rounded-lg bg-slate-700 p-2 text-white hover:bg-slate-600"
          >
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
        </div>
      )}
    </div>
  );
}
