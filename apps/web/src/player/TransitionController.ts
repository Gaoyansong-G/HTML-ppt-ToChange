import { gsap } from '../lib/gsap';
import type { SlideTransition } from '@courseware/shared';

export interface TransitionControllerOptions {
  fromSlideRef: HTMLElement;
  toSlideRef: HTMLElement;
  transition: SlideTransition;
  onComplete?: () => void;
}

export class TransitionController {
  private tl: gsap.core.Timeline;

  constructor(options: TransitionControllerOptions) {
    const { fromSlideRef, toSlideRef, transition, onComplete } = options;
    const duration = transition.duration || 0.8;
    const easing = this.mapEasing(transition.easing);
    const direction = transition.direction || 'right';

    this.tl = gsap.timeline({
      onComplete,
    });

    // Prepare to-slide for entry animation
    gsap.set(toSlideRef, {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      opacity: 0,
      zIndex: 2,
    });

    gsap.set(fromSlideRef, {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 1,
    });

    switch (transition.type) {
      case 'slide':
        this.slideTransition(fromSlideRef, toSlideRef, duration, easing, direction);
        break;
      case 'zoom':
        this.zoomTransition(fromSlideRef, toSlideRef, duration, easing);
        break;
      case 'flip':
        this.flipTransition(fromSlideRef, toSlideRef, duration, easing);
        break;
      case 'wipe':
        this.wipeTransition(fromSlideRef, toSlideRef, duration, easing, direction);
        break;
      case 'parallax':
        this.parallaxTransition(fromSlideRef, toSlideRef, duration, easing, direction);
        break;
      case 'morph':
      case 'fade':
      default:
        this.fadeTransition(fromSlideRef, toSlideRef, duration, easing);
        break;
    }
  }

  private fadeTransition(from: HTMLElement, to: HTMLElement, duration: number, easing: string) {
    this.tl
      .to(from, { opacity: 0, duration: duration * 0.5, ease: easing })
      .to(to, { opacity: 1, duration: duration * 0.5, ease: easing }, `-=${duration * 0.3}`);
  }

  private slideTransition(
    from: HTMLElement,
    to: HTMLElement,
    duration: number,
    easing: string,
    direction: string,
  ) {
    const axis = direction === 'left' || direction === 'right' ? 'x' : 'y';
    const fromSign = direction === 'right' || direction === 'down' ? -1 : 1;
    const toSign = direction === 'right' || direction === 'down' ? 1 : -1;
    const distance = axis === 'x' ? from.offsetWidth : from.offsetHeight;

    gsap.set(to, { [axis]: toSign * distance, opacity: 1 });

    this.tl
      .to(from, { [axis]: fromSign * distance, duration, ease: easing }, 0)
      .to(to, { [axis]: 0, duration, ease: easing }, 0);
  }

  private zoomTransition(from: HTMLElement, to: HTMLElement, duration: number, easing: string) {
    gsap.set(to, { scale: 1.5, opacity: 1 });

    this.tl
      .to(from, { scale: 0.8, opacity: 0, duration, ease: easing }, 0)
      .to(to, { scale: 1, opacity: 1, duration, ease: easing }, 0);
  }

  private flipTransition(from: HTMLElement, to: HTMLElement, duration: number, easing: string) {
    gsap.set(to, { rotationY: 90, opacity: 1 });

    this.tl
      .to(from, { rotationY: -90, duration: duration * 0.5, ease: easing }, 0)
      .to(to, { rotationY: 0, duration: duration * 0.5, ease: easing }, duration * 0.5);
  }

  private wipeTransition(
    from: HTMLElement,
    to: HTMLElement,
    duration: number,
    easing: string,
    direction: string,
  ) {
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

    this.tl.to(from, { clipPath: inset, duration, ease: easing }, 0);
  }

  private parallaxTransition(
    from: HTMLElement,
    to: HTMLElement,
    duration: number,
    easing: string,
    direction: string,
  ) {
    const axis = direction === 'left' || direction === 'right' ? 'x' : 'y';
    const fromSign = direction === 'right' || direction === 'down' ? -1 : 1;
    const toSign = direction === 'right' || direction === 'down' ? 1 : -1;
    const distance = axis === 'x' ? from.offsetWidth : from.offsetHeight;

    gsap.set(to, { [axis]: toSign * distance, opacity: 1 });

    this.tl
      .to(from, { [axis]: fromSign * distance * 0.3, duration, ease: easing }, 0)
      .to(to, { [axis]: 0, duration, ease: easing }, 0);
  }

  private mapEasing(easing?: string): string {
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

  play() {
    this.tl.play();
  }

  destroy() {
    this.tl.kill();
  }
}
