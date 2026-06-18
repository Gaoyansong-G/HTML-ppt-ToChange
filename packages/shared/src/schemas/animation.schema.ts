import { z } from 'zod';

export const AnimationType = z.enum([
  'fade',
  'slide-up',
  'slide-down',
  'slide-left',
  'slide-right',
  'scale-in',
  'scale-out',
  'rotate',
  'draw',
  'typewriter',
  'morph',
  'bounce',
]);

export const AnimationTrigger = z.enum([
  'auto',
  'click',
  'after-prev',
  'with-prev',
]);

export const EasingSchema = z.enum([
  'power1.in',
  'power1.out',
  'power1.inOut',
  'power2.in',
  'power2.out',
  'power2.inOut',
  'power3.in',
  'power3.out',
  'power3.inOut',
  'power4.in',
  'power4.out',
  'power4.inOut',
  'back.in',
  'back.out',
  'back.inOut',
  'elastic.in',
  'elastic.out',
  'elastic.inOut',
  'bounce.in',
  'bounce.out',
  'bounce.inOut',
  'circ.in',
  'circ.out',
  'circ.inOut',
  'expo.in',
  'expo.out',
  'expo.inOut',
  'none',
]);

export const AnimationStepSchema = z.object({
  id: z.string(),
  type: AnimationType,
  duration: z.number().min(0).default(0.6),
  delay: z.number().min(0).default(0),
  easing: EasingSchema.default('power2.out'),
  trigger: AnimationTrigger.default('auto'),
  params: z.record(z.any()).optional(),
});

export const ElementAnimationSchema = z.object({
  entrance: z.array(AnimationStepSchema).default([]),
  exit: z.array(AnimationStepSchema).default([]),
  emphasis: z.array(AnimationStepSchema).optional(),
});

export const SlideTransitionType = z.enum([
  'slide',
  'fade',
  'zoom',
  'flip',
  'wipe',
  'morph',
  'parallax',
]);

export const SlideTransitionSchema = z.object({
  type: SlideTransitionType.default('fade'),
  duration: z.number().min(0).default(0.8),
  easing: EasingSchema.default('power2.inOut'),
  direction: z.enum(['left', 'right', 'up', 'down']).optional(),
});

export const TimelineConfigSchema = z.object({
  autoPlay: z.boolean().optional(),
  loop: z.boolean().optional(),
  pauseOnInteraction: z.boolean().optional(),
});
