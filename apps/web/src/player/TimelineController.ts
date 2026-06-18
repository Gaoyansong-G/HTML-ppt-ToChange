import { gsap } from '../lib/gsap';
import type { AnimationStep, Slide } from '@courseware/shared';

export interface TimelineControllerOptions {
  slide: Slide;
  elementRefs: Map<string, HTMLElement>;
  onComplete?: () => void;
}

export class TimelineController {
  private timeline: gsap.core.Timeline;
  private slide: Slide;
  private elementRefs: Map<string, HTMLElement>;
  private clickTriggeredAnimations: Map<string, gsap.core.Timeline> = new Map();

  constructor(options: TimelineControllerOptions) {
    this.slide = options.slide;
    this.elementRefs = options.elementRefs;
    this.timeline = gsap.timeline({
      paused: true,
      onComplete: options.onComplete,
    });

    this.buildTimeline();
  }

  private buildTimeline() {
    const { elements } = this.slide;

    // Build entrance animations sequentially based on trigger
    let lastAutoIndex = -1;

    elements.forEach((el, index) => {
      const { entrance } = el.animation;
      if (!entrance || entrance.length === 0) return;

      entrance.forEach((step) => {
        switch (step.trigger) {
          case 'auto':
            this.addAnimationStep(el.id, step, lastAutoIndex < 0 ? undefined : lastAutoIndex);
            lastAutoIndex = index;
            break;
          case 'after-prev':
            this.addAnimationStep(el.id, step, lastAutoIndex < 0 ? undefined : lastAutoIndex);
            lastAutoIndex = index;
            break;
          case 'with-prev':
            this.addAnimationStep(el.id, step, lastAutoIndex < 0 ? undefined : lastAutoIndex, true);
            break;
          case 'click':
            this.registerClickAnimation(el.id, step);
            break;
        }
      });
    });
  }

  private addAnimationStep(
    elementId: string,
    step: AnimationStep,
    prevIndex?: number,
    withPrev = false,
  ) {
    const ref = this.elementRefs.get(elementId);
    if (!ref) return;

    const animation = this.createAnimation(ref, step);
    const position = withPrev && prevIndex !== undefined
      ? `<` // Start with previous
      : prevIndex !== undefined
        ? `>` // Start after previous
        : undefined;

    this.timeline.add(animation, position);
  }

  private registerClickAnimation(elementId: string, step: AnimationStep) {
    const ref = this.elementRefs.get(elementId);
    if (!ref) return;

    const clickTimeline = gsap.timeline({ paused: true });
    const animation = this.createAnimation(ref, step);
    clickTimeline.add(animation);
    this.clickTriggeredAnimations.set(`${elementId}-${step.id}`, clickTimeline);
  }

  private createAnimation(ref: HTMLElement, step: AnimationStep): gsap.core.Tween {
    const duration = step.duration || 0.6;
    const delay = step.delay || 0;
    const easing = this.mapEasing(step.easing);

    switch (step.type) {
      case 'fade':
        return gsap.fromTo(ref, { opacity: 0 }, { opacity: 1, duration, delay, ease: easing });

      case 'slide-up':
        return gsap.fromTo(ref, { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration, delay, ease: easing });

      case 'slide-down':
        return gsap.fromTo(ref, { y: -50, opacity: 0 }, { y: 0, opacity: 1, duration, delay, ease: easing });

      case 'slide-left':
        return gsap.fromTo(ref, { x: 50, opacity: 0 }, { x: 0, opacity: 1, duration, delay, ease: easing });

      case 'slide-right':
        return gsap.fromTo(ref, { x: -50, opacity: 0 }, { x: 0, opacity: 1, duration, delay, ease: easing });

      case 'scale-in':
        return gsap.fromTo(ref, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration, delay, ease: easing });

      case 'scale-out':
        return gsap.fromTo(ref, { scale: 1.5, opacity: 0 }, { scale: 1, opacity: 1, duration, delay, ease: easing });

      case 'rotate':
        return gsap.fromTo(ref, { rotation: -180, opacity: 0 }, { rotation: 0, opacity: 1, duration, delay, ease: easing });

      case 'bounce':
        return gsap.fromTo(ref, { y: -50, opacity: 0 }, { y: 0, opacity: 1, duration, delay, ease: 'bounce.out' });

      case 'draw':
      case 'typewriter':
      case 'morph':
      default:
        // Fallback to fade for unsupported types
        return gsap.fromTo(ref, { opacity: 0 }, { opacity: 1, duration, delay, ease: easing });
    }
  }

  private mapEasing(easing?: string): string {
    if (!easing) return 'power2.out';
    // GSAP easing names are mostly compatible, just ensure bounce/elastic/back use .out variants safely
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
    return validEasings.includes(easing) ? easing : 'power2.out';
  }

  play() {
    this.timeline.play();
  }

  pause() {
    this.timeline.pause();
  }

  restart() {
    this.timeline.restart();
  }

  reverse() {
    this.timeline.reverse();
  }

  seek(time: number) {
    this.timeline.seek(time);
  }

  getDuration() {
    return this.timeline.duration();
  }

  triggerClickAnimation(elementId: string, stepId?: string) {
    if (stepId) {
      const key = `${elementId}-${stepId}`;
      const tl = this.clickTriggeredAnimations.get(key);
      tl?.play();
    } else {
      // Trigger all click animations for this element
      this.clickTriggeredAnimations.forEach((tl, key) => {
        if (key.startsWith(`${elementId}-`)) {
          tl?.play();
        }
      });
    }
  }

  destroy() {
    this.timeline.kill();
    this.clickTriggeredAnimations.forEach((tl) => tl.kill());
    this.clickTriggeredAnimations.clear();
  }
}
