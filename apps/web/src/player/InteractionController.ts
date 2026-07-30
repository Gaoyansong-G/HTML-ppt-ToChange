import { gsap } from '../lib/gsap';
import type { InteractionAction, InteractionConfig, StateMachineConfig } from '@courseware/shared';
import { isSpeaking, speakText, stopSpeak } from './tools/speech';

export interface InteractionControllerOptions {
  elementRefs: Map<string, HTMLElement>;
  onNavigate?: (direction: 'next' | 'prev' | number) => void;
  onStateChange?: (machineId: string, state: string) => void;
}

const DOM_EVENT_BY_TRIGGER: Partial<Record<InteractionConfig['trigger'], string>> = {
  click: 'click',
  'double-click': 'dblclick',
  hover: 'mouseenter',
  'mouse-enter': 'mouseenter',
  'mouse-leave': 'mouseleave',
};

const COMPONENT_EVENT_TO_TRIGGER: Record<string, InteractionConfig['trigger']> = {
  SELECT: 'quiz-select',
  JUDGE: 'quiz-submit',
  CORRECT: 'quiz-correct',
  INCORRECT: 'quiz-incorrect',
  EXPLAIN: 'quiz-explain',
  RETRY: 'quiz-retry',
  REVEAL: 'answer-reveal',
  ENDED: 'media-ended',
  COMPLETE: 'interactive-complete',
};

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : fallback;
}

function findMedia(target: HTMLElement | undefined): HTMLMediaElement | null {
  if (!target) return null;
  if (target instanceof HTMLMediaElement) return target;
  return target.querySelector<HTMLMediaElement>('audio, video');
}

function openSafeUrl(rawUrl: unknown) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return;
  try {
    const url = new URL(rawUrl.trim(), window.location.href);
    if (!['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) return;
    const opened = window.open(url.href, '_blank', 'noopener,noreferrer');
    if (opened) opened.opener = null;
  } catch {
    // Invalid links are ignored at runtime. The editor surfaces validation.
  }
}

export class InteractionController {
  private elementRefs: Map<string, HTMLElement>;
  private onNavigate?: (direction: 'next' | 'prev' | number) => void;
  private onStateChange?: (machineId: string, state: string) => void;
  private active = false;
  private stateMachines: Map<string, string> = new Map();
  private stateMachineConfigs: Map<string, StateMachineConfig> = new Map();
  private initializedStateMachines: Set<string> = new Set();
  private interactionsByElement: Map<
    string,
    { interactions: InteractionConfig[]; stateMachine?: StateMachineConfig }
  > = new Map();
  private handlers: Array<{ elementId: string; eventName: string; handler: EventListener }> = [];
  private timedInteractions: Map<
    string,
    {
      interactionConfig: InteractionConfig;
      stateMachine?: StateMachineConfig;
    }
  > = new Map();
  private timedInteractionTimers: Map<string, number> = new Map();
  private firedTimedInteractions: Set<string> = new Set();
  private actionTimers: number[] = [];

  constructor(options: InteractionControllerOptions) {
    this.elementRefs = options.elementRefs;
    this.onNavigate = options.onNavigate;
    this.onStateChange = options.onStateChange;
  }

  registerInteractions(
    elementId: string,
    interactions: InteractionConfig[],
    stateMachine?: StateMachineConfig,
  ) {
    this.interactionsByElement.set(elementId, { interactions, stateMachine });
    const ref = this.elementRefs.get(elementId);

    interactions.forEach((interactionConfig) => {
      if (interactionConfig.enabled === false) return;
      const domEventName = DOM_EVENT_BY_TRIGGER[interactionConfig.trigger];
      if (domEventName && ref) {
        const handler: EventListener = () => {
          if (!this.active) return;
          this.runInteraction(interactionConfig, stateMachine);
        };
        ref.addEventListener(domEventName, handler);
        if (interactionConfig.trigger === 'click' || interactionConfig.trigger === 'double-click') {
          ref.style.cursor = 'pointer';
          ref.setAttribute('role', ref.getAttribute('role') || 'button');
          if (!ref.hasAttribute('tabindex')) ref.tabIndex = 0;
        }
        this.handlers.push({ elementId, eventName: domEventName, handler });
        if (interactionConfig.trigger === 'click') {
          const keyboardHandler: EventListener = (event) => {
            const keyboardEvent = event as KeyboardEvent;
            if (
              this.active &&
              event.target === ref &&
              (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ')
            ) {
              keyboardEvent.preventDefault();
              this.runInteraction(interactionConfig, stateMachine);
            }
          };
          ref.addEventListener('keydown', keyboardHandler);
          this.handlers.push({ elementId, eventName: 'keydown', handler: keyboardHandler });
        }
        return;
      }

      if (interactionConfig.trigger === 'auto' || interactionConfig.trigger === 'timeout') {
        const key = `${elementId}:${interactionConfig.id}`;
        this.timedInteractions.set(key, { interactionConfig, stateMachine });
        this.scheduleTimedInteraction(key);
      }
    });
  }

  /**
   * Arms automatic/timeout interactions only while the slide is active.
   * A rule fires at most once per controller lifetime. If a slide is pre-mounted
   * for a transition, its delay starts when the slide actually becomes active.
   */
  setActive(active: boolean) {
    if (this.active === active) return;
    this.active = active;

    if (!active) {
      this.timedInteractionTimers.forEach((timer) => window.clearTimeout(timer));
      this.timedInteractionTimers.clear();
      return;
    }

    this.stateMachineConfigs.forEach((stateMachine) => {
      this.initializeStateMachine(stateMachine);
    });
    this.timedInteractions.forEach((_, key) => this.scheduleTimedInteraction(key));
  }

  private scheduleTimedInteraction(key: string) {
    if (
      !this.active ||
      this.firedTimedInteractions.has(key) ||
      this.timedInteractionTimers.has(key)
    ) {
      return;
    }
    const registration = this.timedInteractions.get(key);
    if (!registration) return;

    const fallbackDelay =
      registration.interactionConfig.trigger === 'timeout' ? 1000 : 0;
    const timer = window.setTimeout(() => {
      this.timedInteractionTimers.delete(key);
      if (!this.active || this.firedTimedInteractions.has(key)) return;
      this.firedTimedInteractions.add(key);
      this.runInteraction(registration.interactionConfig, registration.stateMachine);
    }, registration.interactionConfig.delayMs ?? fallbackDelay);
    this.timedInteractionTimers.set(key, timer);
  }

  /**
   * Receives semantic events emitted by internal controls such as quizzes,
   * fill-in-the-blank fields and media players.
   */
  trigger(elementId: string, event: string) {
    if (!this.active) return;
    const trigger = COMPONENT_EVENT_TO_TRIGGER[event.toUpperCase()];
    if (!trigger) return;
    const registration = this.interactionsByElement.get(elementId);
    if (!registration) return;
    registration.interactions
      .filter((config) => config.enabled !== false && config.trigger === trigger)
      .forEach((config) => this.runInteraction(config, registration.stateMachine));
  }

  private runInteraction(
    interactionConfig: InteractionConfig,
    stateMachine?: StateMachineConfig,
  ) {
    this.executeActions(interactionConfig.actions);

    if (stateMachine) {
      const eventName = interactionConfig.id.toUpperCase().replace(/-/g, '_');
      this.sendStateEvent(stateMachine, eventName);
    }
  }

  registerStateMachine(stateMachine: StateMachineConfig) {
    this.stateMachineConfigs.set(stateMachine.id, stateMachine);
    this.stateMachines.set(stateMachine.id, stateMachine.initial);
    if (this.active) this.initializeStateMachine(stateMachine);
  }

  private initializeStateMachine(stateMachine: StateMachineConfig) {
    if (this.initializedStateMachines.has(stateMachine.id)) return;
    this.initializedStateMachines.add(stateMachine.id);
    const initialState = stateMachine.states[stateMachine.initial];
    if (initialState?.entry) {
      this.executeActions(initialState.entry);
    }
  }

  sendStateEvent(stateMachine: StateMachineConfig, event: string) {
    const currentStateKey = this.stateMachines.get(stateMachine.id) || stateMachine.initial;
    const currentState = stateMachine.states[currentStateKey];
    if (!currentState?.on) return;

    const transition = currentState.on[event];
    if (!transition) return;

    if (currentState.exit) {
      this.executeActions(currentState.exit);
    }
    if (transition.actions) {
      this.executeActions(transition.actions);
    }

    this.stateMachines.set(stateMachine.id, transition.target);
    this.onStateChange?.(stateMachine.id, transition.target);

    const nextState = stateMachine.states[transition.target];
    if (nextState?.entry) {
      this.executeActions(nextState.entry);
    }
  }

  executeActions(actions: InteractionAction[]) {
    actions.forEach((action) => {
      const delayMs = clampNumber(action.payload?.delayMs, 0, 0, 600_000);
      if (delayMs > 0) {
        const timer = window.setTimeout(() => this.executeAction(action), delayMs);
        this.actionTimers.push(timer);
      } else {
        this.executeAction(action);
      }
    });
  }

  private showTarget(target: HTMLElement) {
    gsap.killTweensOf(target);
    target.dataset.interactionHidden = 'false';
    gsap.set(target, { visibility: 'visible', pointerEvents: 'auto' });
    gsap.to(target, { opacity: 1, duration: 0.25, overwrite: true });
  }

  private hideTarget(target: HTMLElement) {
    gsap.killTweensOf(target);
    target.dataset.interactionHidden = 'true';
    gsap.to(target, {
      opacity: 0,
      duration: 0.25,
      overwrite: true,
      onComplete: () => {
        if (target.dataset.interactionHidden === 'true') {
          gsap.set(target, { visibility: 'hidden', pointerEvents: 'none' });
        }
      },
    });
  }

  private animateTarget(target: HTMLElement, payload: Record<string, unknown> | undefined) {
    const preset = typeof payload?.preset === 'string' ? payload.preset : 'pulse';
    const duration = clampNumber(payload?.duration, 0.5, 0.05, 10);

    gsap.killTweensOf(target);
    switch (preset) {
      case 'shake':
        gsap.fromTo(
          target,
          { x: -10 },
          { x: 10, duration: duration / 6, repeat: 5, yoyo: true, clearProps: 'x' },
        );
        break;
      case 'bounce':
        gsap.fromTo(
          target,
          { y: 0 },
          { y: -24, duration: duration / 2, repeat: 1, yoyo: true, ease: 'power2.out', clearProps: 'y' },
        );
        break;
      case 'spin':
        gsap.to(target, { rotation: '+=360', duration, ease: 'power2.inOut', clearProps: 'rotation' });
        break;
      case 'highlight':
        gsap.fromTo(
          target,
          { filter: 'brightness(1)' },
          {
            filter: 'brightness(1.35)',
            duration: duration / 2,
            repeat: 1,
            yoyo: true,
            clearProps: 'filter',
          },
        );
        break;
      case 'pulse':
      default:
        gsap.fromTo(
          target,
          { scale: 1 },
          { scale: 1.08, duration: duration / 2, repeat: 1, yoyo: true, ease: 'power2.inOut', clearProps: 'scale' },
        );
        break;
    }
  }

  private executeAction(action: InteractionAction) {
    const target = action.targetId ? this.elementRefs.get(action.targetId) : undefined;

    switch (action.type) {
      case 'show':
      case 'reveal-answer':
        if (target) this.showTarget(target);
        break;

      case 'hide':
        if (target) this.hideTarget(target);
        break;

      case 'toggle':
        if (target) {
          const isHidden =
            target.dataset.interactionHidden === 'true' ||
            target.style.visibility === 'hidden' ||
            Number(gsap.getProperty(target, 'opacity')) <= 0.01;
          if (isHidden) this.showTarget(target);
          else this.hideTarget(target);
        }
        break;

      case 'animate':
        if (target) {
          this.animateTarget(target, action.payload);
        }
        break;

      case 'navigate':
        if (action.payload?.direction === 'next') {
          this.onNavigate?.('next');
        } else if (action.payload?.direction === 'prev') {
          this.onNavigate?.('prev');
        } else if (typeof action.payload?.slideIndex === 'number') {
          this.onNavigate?.(action.payload.slideIndex);
        }
        break;

      case 'open-url':
        openSafeUrl(action.payload?.url);
        break;

      case 'play-media':
      case 'play-sound': {
        const media = findMedia(target);
        if (media) void media.play().catch(() => undefined);
        break;
      }

      case 'pause-media': {
        findMedia(target)?.pause();
        break;
      }

      case 'toggle-media': {
        const media = findMedia(target);
        if (!media) break;
        if (media.paused) void media.play().catch(() => undefined);
        else media.pause();
        break;
      }

      case 'restart-media': {
        const media = findMedia(target);
        if (!media) break;
        media.currentTime = 0;
        void media.play().catch(() => undefined);
        break;
      }

      case 'set-state':
        if (action.payload?.machineId && action.payload?.state) {
          const machineId = String(action.payload.machineId);
          const state = String(action.payload.state);
          this.stateMachines.set(machineId, state);
          this.onStateChange?.(machineId, state);
        }
        break;

      case 'speak': {
        const payloadText =
          typeof action.payload?.text === 'string' ? action.payload.text : undefined;
        const text = payloadText ?? target?.textContent ?? '';
        if (isSpeaking()) {
          stopSpeak();
        } else if (text.trim()) {
          const lang =
            typeof action.payload?.lang === 'string' ? action.payload.lang : 'zh-CN';
          speakText(text, { lang });
        }
        break;
      }

      case 'ask-ai':
        window.dispatchEvent(
          new CustomEvent('courseware:ask-ai', {
            detail: { targetId: action.targetId, ...action.payload },
          }),
        );
        break;

      case 'record-annotation':
        window.dispatchEvent(
          new CustomEvent('courseware:record-annotation', {
            detail: { targetId: action.targetId, ...action.payload },
          }),
        );
        break;
    }
  }

  destroy() {
    this.active = false;
    this.handlers.forEach(({ elementId, eventName, handler }) => {
      const ref = this.elementRefs.get(elementId);
      if (ref) {
        ref.removeEventListener(eventName, handler);
        ref.style.cursor = '';
        ref.removeAttribute('role');
        ref.removeAttribute('tabindex');
      }
    });
    this.timedInteractionTimers.forEach((timer) => window.clearTimeout(timer));
    this.actionTimers.forEach((timer) => window.clearTimeout(timer));
    this.handlers = [];
    this.timedInteractions.clear();
    this.timedInteractionTimers.clear();
    this.firedTimedInteractions.clear();
    this.actionTimers = [];
    this.interactionsByElement.clear();
    this.stateMachines.clear();
    this.stateMachineConfigs.clear();
    this.initializedStateMachines.clear();
    stopSpeak();
  }
}
