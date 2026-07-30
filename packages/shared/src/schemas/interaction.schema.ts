import { z } from 'zod';

export const InteractionTrigger = z.enum([
  'click',
  'double-click',
  'hover',
  'mouse-enter',
  'mouse-leave',
  'drag',
  'voice',
  'auto',
  'timeout',
  'quiz-select',
  'quiz-submit',
  'quiz-correct',
  'quiz-incorrect',
  'quiz-explain',
  'quiz-retry',
  'answer-reveal',
  'media-ended',
  'interactive-complete',
]);

export const InteractionActionType = z.enum([
  'show',
  'hide',
  'toggle',
  'animate',
  'speak',
  'ask-ai',
  'reveal-answer',
  'set-state',
  'navigate',
  'open-url',
  'play-media',
  'pause-media',
  'toggle-media',
  'restart-media',
  'play-sound',
  'record-annotation',
]);

export const InteractionActionSchema = z.object({
  id: z.string(),
  type: InteractionActionType,
  targetId: z.string().optional(),
  payload: z.record(z.any()).optional(),
});

export const InteractionConfigSchema = z.object({
  id: z.string(),
  trigger: InteractionTrigger,
  enabled: z.boolean().optional(),
  delayMs: z.number().int().min(0).max(600_000).optional(),
  condition: z.string().optional(),
  actions: z.array(InteractionActionSchema).min(1),
});

export const StateTransitionSchema = z.object({
  target: z.string(),
  actions: z.array(InteractionActionSchema).optional(),
});

export const StateNodeSchema = z.object({
  on: z.record(StateTransitionSchema).optional(),
  entry: z.array(InteractionActionSchema).optional(),
  exit: z.array(InteractionActionSchema).optional(),
});

export const StateMachineConfigSchema = z.object({
  id: z.string(),
  initial: z.string(),
  states: z.record(StateNodeSchema),
});

export const AIAssistantConfigSchema = z.object({
  enabled: z.boolean().default(false),
  contextScope: z.enum(['slide', 'courseware', 'document']).default('slide'),
  systemPrompt: z.string().optional(),
  welcomeMessage: z.string().optional(),
  suggestedQuestions: z.array(z.string()).optional(),
});
