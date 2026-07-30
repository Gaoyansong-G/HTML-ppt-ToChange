import { useRef, useCallback, useEffect } from 'react';
import type { Courseware, Element as CoursewareElement, Slide } from '@courseware/shared';
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

function getGroupChildren(element: CoursewareElement): CoursewareElement[] {
  if (element.type !== 'group') return [];
  const children = (element.content as { children?: unknown }).children;
  return Array.isArray(children) ? (children as CoursewareElement[]) : [];
}

function flattenElements(elements: CoursewareElement[]): CoursewareElement[] {
  const flattened: CoursewareElement[] = [];
  const visited = new Set<string>();

  const visit = (element: CoursewareElement) => {
    if (visited.has(element.id)) return;
    visited.add(element.id);
    flattened.push(element);
    getGroupChildren(element).forEach(visit);
  };

  elements.forEach(visit);
  return flattened;
}

function findRenderedRoot(wrapper: HTMLDivElement, elementId: string): HTMLElement {
  const children = Array.from(wrapper.children);
  const exactRoot = children.find(
    (child): child is HTMLElement => child instanceof HTMLElement && child.id === elementId,
  );
  if (exactRoot) return exactRoot;

  const firstVisualRoot = children.find(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.tagName.toLowerCase() !== 'style',
  );
  return firstVisualRoot ?? wrapper;
}

function registerGroupChildRefs(
  element: CoursewareElement,
  root: HTMLElement,
  refs: Map<string, HTMLElement>,
) {
  const descendants = Array.from(root.querySelectorAll<HTMLElement>('[id]'));
  getGroupChildren(element).forEach((child) => {
    const childRoot = descendants.find((candidate) => candidate.id === child.id);
    if (!childRoot) return;
    refs.set(child.id, childRoot);
    registerGroupChildRefs(child, childRoot, refs);
  });
}

export function SlideView({ courseware, slide, isActive, onNavigate }: SlideViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const elementRefs = useRef<Map<string, HTMLElement>>(new Map());
  const timelineRef = useRef<TimelineController | null>(null);
  const interactionRef = useRef<InteractionController | null>(null);
  const hasStartedRef = useRef(false);
  const onNavigateRef = useRef(onNavigate);
  onNavigateRef.current = onNavigate;

  const handleInteractionNavigate = useCallback(
    (direction: 'next' | 'prev' | number) => onNavigateRef.current?.(direction),
    [],
  );

  const setElementRef = useCallback((id: string) => {
    return (wrapper: HTMLDivElement | null) => {
      if (wrapper) {
        // ElementRenderer owns the real positioned box. Binding interactions and
        // GSAP to the zero-sized React wrapper makes keyboard/click targeting
        // unreliable, especially after the 1280×720 stage is scaled.
        elementRefs.current.set(id, findRenderedRoot(wrapper, id));
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

      const allElements = flattenElements(slide.elements);
      const runtimeElementIds = new Set(allElements.map((element) => element.id));
      elementRefs.current.forEach((_, id) => {
        if (!runtimeElementIds.has(id)) elementRefs.current.delete(id);
      });
      slide.elements.forEach((element) => {
        const root = elementRefs.current.get(element.id);
        if (root) registerGroupChildRefs(element, root, elementRefs.current);
      });
      hasStartedRef.current = false;

      // Immediately hide all element refs so they don't flash at full opacity
      // before the entrance timeline starts.
      elementRefs.current.forEach((ref) => {
        gsap.set(ref, { opacity: 0 });
      });

      const timeline = new TimelineController({
        slide,
        elements: allElements,
        elementRefs: elementRefs.current,
        onComplete: () => {
          console.log(`[SlideView] Slide ${slide.id} timeline completed`);
        },
      });
      timelineRef.current = timeline;

      const interaction = new InteractionController({
        elementRefs: elementRefs.current,
        onNavigate: handleInteractionNavigate,
      });
      interactionRef.current = interaction;

      allElements.forEach((el) => {
        interaction.registerInteractions(el.id, el.interactions, slide.stateMachine);
      });

      if (slide.stateMachine) {
        interaction.registerStateMachine(slide.stateMachine);
      }
      interaction.setActive(isActive);

      // Safety: any element without an entrance animation must remain visible at its intended opacity.
      // SlideView starts every ref at opacity:0, so elements with no timeline entry would otherwise disappear.
      allElements.forEach((el) => {
        const ref = elementRefs.current.get(el.id);
        if (!ref) return;
        if (el.initiallyHidden) {
          ref.dataset.interactionHidden = 'true';
          gsap.set(ref, { opacity: 0, visibility: 'hidden', pointerEvents: 'none' });
          return;
        }
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
    {
      scope: containerRef,
      dependencies: [slide, handleInteractionNavigate],
      revertOnUpdate: true,
    },
  );

  // Pause/resume timeline when the slide's active state changes.
  useEffect(() => {
    if (!timelineRef.current) return;
    interactionRef.current?.setActive(isActive);
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
        <div
          key={element.id}
          ref={setElementRef(element.id)}
          onClick={(event) => {
            let current: HTMLElement | null =
              event.target instanceof HTMLElement
                ? event.target
                : event.target instanceof Element
                  ? event.target.parentElement
                  : null;
            let clickedElementId: string | undefined;
            while (current && current !== event.currentTarget) {
              if (current.id && elementRefs.current.has(current.id)) {
                clickedElementId = current.id;
                break;
              }
              current = current.parentElement;
            }
            if (isActive) {
              timelineRef.current?.triggerClickAnimation(clickedElementId ?? element.id);
            }
          }}
        >
          <ElementRenderer
            element={element}
            assets={courseware.assets}
            onInteraction={(elementId, event) => {
              interactionRef.current?.trigger(elementId, event);
            }}
          />
        </div>
      ))}
    </div>
  );
}
