import type { ComponentType } from 'react';
import type { Element } from '@courseware/shared';
import {
  EmptyHint,
  InteractiveShell,
  InteractiveStyles,
  InteractiveTitle,
  asRecord,
  asString,
  type InteractiveComponentProps,
  type InteractiveMode,
} from './common';
import { MatchingInteractive } from './MatchingInteractive';
import { CategorizeInteractive } from './CategorizeInteractive';
import { OrderingInteractive } from './OrderingInteractive';
import { TimerInteractive } from './TimerInteractive';
import { ScoreboardInteractive } from './ScoreboardInteractive';
import { PickerInteractive } from './PickerInteractive';
import { CardFlipInteractive } from './CardFlipInteractive';

/** interactiveType → 组件注册表 */
const INTERACTIVE_RENDERERS: Record<string, ComponentType<InteractiveComponentProps>> = {
  matching: MatchingInteractive,
  categorize: CategorizeInteractive,
  ordering: OrderingInteractive,
  timer: TimerInteractive,
  scoreboard: ScoreboardInteractive,
  picker: PickerInteractive,
  'card-flip': CardFlipInteractive,
};

/** 未知互动类型的兜底渲染（永不让页面空白） */
function UnknownInteractive({ element, mode, interactiveType }: InteractiveComponentProps & { interactiveType: string }) {
  return (
    <InteractiveShell element={element} mode={mode}>
      <InteractiveTitle title="互动组件" />
      <EmptyHint message={`暂不支持的互动类型：${interactiveType || '（未设置 interactiveType）'}`} />
    </InteractiveShell>
  );
}

export interface InteractiveRendererProps {
  element: Element;
  /** player：可交互；editor：只展示初始状态、禁用交互 */
  mode?: InteractiveMode;
  onInteraction?: (elementId: string, event: string) => void;
}

/**
 * interactive 元素统一入口：按 content.interactiveType 分发。
 * 接线位置：apps/web/src/player/elements/index.tsx 的 ElementRenderer。
 */
export function InteractiveRenderer({ element, mode = 'player', onInteraction }: InteractiveRendererProps) {
  const content = asRecord(element.content);
  const interactiveType = asString(content.interactiveType);
  const Renderer = INTERACTIVE_RENDERERS[interactiveType];
  return (
    <>
      <InteractiveStyles />
      {Renderer ? (
        <Renderer element={element} mode={mode} onInteraction={onInteraction} />
      ) : (
        <UnknownInteractive
          element={element}
          mode={mode}
          interactiveType={interactiveType}
          onInteraction={onInteraction}
        />
      )}
    </>
  );
}

export {
  MatchingInteractive,
  CategorizeInteractive,
  OrderingInteractive,
  TimerInteractive,
  ScoreboardInteractive,
  PickerInteractive,
  CardFlipInteractive,
  INTERACTIVE_RENDERERS,
};
export type { InteractiveComponentProps, InteractiveMode };
