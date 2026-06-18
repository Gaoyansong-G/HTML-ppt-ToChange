import { gsap } from '../lib/gsap';
import type { InteractionAction, InteractionConfig, StateMachineConfig } from '@courseware/shared';

export interface InteractionControllerOptions {
  elementRefs: Map<string, HTMLElement>;
  onNavigate?: (direction: 'next' | 'prev' | number) => void;
  onStateChange?: (machineId: string, state: string) => void;
}

export class InteractionController {
  private elementRefs: Map<string, HTMLElement>;
  private onNavigate?: (direction: 'next' | 'prev' | number) => void;
  private onStateChange?: (machineId: string, state: string) => void;
  private stateMachines: Map<string, string> = new Map();
  private handlers: Array<{ elementId: string; handler: () => void }> = [];

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
    interactions.forEach((interactionConfig: InteractionConfig) => {
      if (interactionConfig.trigger === 'click') {
        const ref = this.elementRefs.get(elementId);
        if (!ref) return;

        const handler = () => {
          this.executeActions(interactionConfig.actions);

          // Also send event to state machine if configured
          if (stateMachine) {
            const eventName = interactionConfig.id.toUpperCase().replace(/-/g, '_');
            this.sendStateEvent(stateMachine, eventName);
          }
        };

        ref.addEventListener('click', handler);
        ref.style.cursor = 'pointer';
        this.handlers.push({ elementId, handler });
      }
    });
  }

  registerStateMachine(stateMachine: StateMachineConfig) {
    this.stateMachines.set(stateMachine.id, stateMachine.initial);

    // Execute entry actions of initial state
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

    // Execute exit actions of current state
    if (currentState.exit) {
      this.executeActions(currentState.exit);
    }

    // Execute transition actions
    if (transition.actions) {
      this.executeActions(transition.actions);
    }

    // Move to next state
    this.stateMachines.set(stateMachine.id, transition.target);
    this.onStateChange?.(stateMachine.id, transition.target);

    // Execute entry actions of new state
    const nextState = stateMachine.states[transition.target];
    if (nextState?.entry) {
      this.executeActions(nextState.entry);
    }
  }

  executeActions(actions: InteractionAction[]) {
    actions.forEach((action) => {
      this.executeAction(action);
    });
  }

  private executeAction(action: InteractionAction) {
    const target = action.targetId ? this.elementRefs.get(action.targetId) : undefined;

    switch (action.type) {
      case 'show':
        if (target) {
          gsap.to(target, { opacity: 1, duration: 0.3 });
        }
        break;

      case 'hide':
        if (target) {
          gsap.to(target, { opacity: 0, duration: 0.3 });
        }
        break;

      case 'toggle':
        if (target) {
          const currentOpacity = gsap.getProperty(target, 'opacity') as number;
          gsap.to(target, { opacity: currentOpacity > 0 ? 0 : 1, duration: 0.3 });
        }
        break;

      case 'animate':
        if (target) {
          gsap.to(target, {
            ...(action.payload || {}),
            duration: 0.5,
          });
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

      case 'reveal-answer':
        if (target) {
          gsap.to(target, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out' });
        }
        break;

      case 'set-state':
        if (action.payload?.machineId && action.payload?.state) {
          this.stateMachines.set(action.payload.machineId, action.payload.state);
        }
        break;

      case 'speak':
      case 'ask-ai':
      case 'play-sound':
      case 'record-annotation':
      default:
        console.log(`[Interaction] ${action.type} action is not implemented yet`);
        break;
    }
  }

  destroy() {
    this.handlers.forEach(({ elementId, handler }) => {
      const ref = this.elementRefs.get(elementId);
      if (ref) {
        ref.removeEventListener('click', handler);
        ref.style.cursor = '';
      }
    });
    this.handlers = [];
    this.stateMachines.clear();
  }
}
