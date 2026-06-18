import { z } from 'zod';
import {
  AssetSchema,
  CoursewareSchema,
  DesignSystemSchema,
  DesignTokenSchema,
  DocumentNodeSchema,
  SourceDocumentSchema,
} from '../schemas/courseware.schema';
import {
  BackgroundSchema,
  LayoutConstraintSchema,
  SlideLayoutSchema,
  SlideSchema,
} from '../schemas/slide.schema';
import {
  ElementSchema,
  ElementStyleSchema,
  GeometrySchema,
  QuizContentSchema,
  QuizOptionSchema,
  TextContentSchema,
} from '../schemas/element.schema';
import {
  AnimationStepSchema,
  ElementAnimationSchema,
  EasingSchema,
  SlideTransitionSchema,
  TimelineConfigSchema,
} from '../schemas/animation.schema';
import {
  AIAssistantConfigSchema,
  InteractionActionSchema,
  InteractionConfigSchema,
  StateMachineConfigSchema,
} from '../schemas/interaction.schema';

export type Courseware = z.infer<typeof CoursewareSchema>;
export type Slide = z.infer<typeof SlideSchema>;
export type Element = z.infer<typeof ElementSchema>;
export type Asset = z.infer<typeof AssetSchema>;
export type SourceDocument = z.infer<typeof SourceDocumentSchema>;
export type DocumentNode = z.infer<typeof DocumentNodeSchema>;
export type DesignSystem = z.infer<typeof DesignSystemSchema>;
export type DesignToken = z.infer<typeof DesignTokenSchema>;

export type SlideLayout = z.infer<typeof SlideLayoutSchema>;
export type LayoutConstraint = z.infer<typeof LayoutConstraintSchema>;
export type Background = z.infer<typeof BackgroundSchema>;

export type Geometry = z.infer<typeof GeometrySchema>;
export type ElementStyle = z.infer<typeof ElementStyleSchema>;
export type TextContent = z.infer<typeof TextContentSchema>;
export type QuizContent = z.infer<typeof QuizContentSchema>;
export type QuizOption = z.infer<typeof QuizOptionSchema>;

export type AnimationStep = z.infer<typeof AnimationStepSchema>;
export type ElementAnimation = z.infer<typeof ElementAnimationSchema>;
export type SlideTransition = z.infer<typeof SlideTransitionSchema>;
export type TimelineConfig = z.infer<typeof TimelineConfigSchema>;
export type Easing = z.infer<typeof EasingSchema>;

export type InteractionConfig = z.infer<typeof InteractionConfigSchema>;
export type InteractionAction = z.infer<typeof InteractionActionSchema>;
export type StateMachineConfig = z.infer<typeof StateMachineConfigSchema>;
export type AIAssistantConfig = z.infer<typeof AIAssistantConfigSchema>;
