import { useRef, useCallback, useEffect } from 'react';
import type { Courseware, Slide } from '@courseware/shared';
import { useGSAP } from '@gsap/react';
import { gsap } from '../lib/gsap';
import { ElementRenderer } from './elements';
import { TimelineController } from './TimelineController';
import { InteractionController } from './InteractionController';

interface SlideViewProps {
  courseware: Courseware;
  slide: Slide;
  isActive: boolean;
  onNavigate?: (direction: 'next' | 'prev' | number) => void;
}

export function SlideView({ courseware, slide, isActive, onNavigate }: SlideViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const elementRefs = useRef<Map<string, HTMLElement>>(new Map());
  const timelineRef = useRef<TimelineController | null>(null);
  const interactionRef = useRef<InteractionController | null>(null);
  const hasStartedRef = useRef(false);

  const setElementRef = useCallback((id: string) => {
    return (el: HTMLElement | null) => {
      if (el) {
        elementRefs.current.set(id, el);
      } else {
        elementRefs.current.delete(id);
      }
    };
  }, []);

  // Build timeline and interactions inside a scoped GSAP context.
  // useGSAP ensures all tweens/listeners are reverted on unmount or slide change.
  useGSAP(
    () => {
      if (!containerRef.current) return;

      // Immediately hide all element refs so they don't flash at full opacity
      // before the entrance timeline starts.
      elementRefs.current.forEach((ref) => {
        gsap.set(ref, { opacity: 0 });
      });

      const timeline = new TimelineController({
        slide,
        elementRefs: elementRefs.current,
        onComplete: () => {
          console.log(`[SlideView] Slide ${slide.id} timeline completed`);
        },
      });
      timelineRef.current = timeline;

      const interaction = new InteractionController({
        elementRefs: elementRefs.current,
        onNavigate,
      });
      interactionRef.current = interaction;

      slide.elements.forEach((el) => {
        interaction.registerInteractions(el.id, el.interactions, slide.stateMachine);
      });

      if (slide.stateMachine) {
        interaction.registerStateMachine(slide.stateMachine);
      }

      // Safety: any element without an entrance animation must remain visible at its intended opacity.
      // SlideView starts every ref at opacity:0, so elements with no timeline entry would otherwise disappear.
      slide.elements.forEach((el) => {
        const ref = elementRefs.current.get(el.id);
        if (!ref) return;
        const hasEntrance = el.animation?.entrance && el.animation.entrance.length > 0;
        if (!hasEntrance) {
          const targetOpacity = typeof el.style.opacity === 'number' ? el.style.opacity : 1;
          gsap.set(ref, { opacity: targetOpacity });
        }
      });

      if (isActive && !hasStartedRef.current) {
        hasStartedRef.current = true;
        timeline.play();
      }

      return () => {
        timelineRef.current?.destroy();
        interactionRef.current?.destroy();
        timelineRef.current = null;
        interactionRef.current = null;
      };
    },
    { scope: containerRef, dependencies: [slide, onNavigate] },
  );

  // Pause/resume timeline when the slide's active state changes.
  useEffect(() => {
    if (!timelineRef.current) return;
    if (isActive) {
      if (!hasStartedRef.current) {
        hasStartedRef.current = true;
        timelineRef.current.play();
      } else {
        timelineRef.current.play();
      }
    } else {
      timelineRef.current.pause();
    }
  }, [isActive]);

  const backgroundStyle: React.CSSProperties = {};
  if (slide.background.color) {
    backgroundStyle.backgroundColor = slide.background.color;
  }
  if (slide.background.gradient) {
    backgroundStyle.backgroundImage = slide.background.gradient;
  }
  if (slide.background.imageAssetId) {
    const asset = courseware.assets.find((a) => a.id === slide.background.imageAssetId);
    if (asset) {
      backgroundStyle.backgroundImage = `url(${asset.url})`;
      backgroundStyle.backgroundSize = 'cover';
      backgroundStyle.backgroundPosition = 'center';
    }
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
      style={{
        ...backgroundStyle,
        width: '100%',
        height: '100%',
      }}
    >
      {slide.elements.map((element) => (
        <div key={element.id} ref={setElementRef(element.id)}>
          <ElementRenderer
            element={element}
            assets={courseware.assets}
            onInteraction={() => {
              timelineRef.current?.triggerClickAnimation(element.id);
            }}
          />
        </div>
      ))}
    </div>
  );
}
