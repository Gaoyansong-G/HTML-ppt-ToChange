import type { ComponentType } from 'react';
import { BlockShell, useBlockData, useTheme, type BlockComponentProps } from './BlockShell';
import { CoverBlock } from './CoverBlock';
import { TitleContentBlock } from './TitleContentBlock';
import { QuizBlock } from './QuizBlock';
import { TocBlock } from './TocBlock';
import { SectionHeaderBlock } from './SectionHeaderBlock';
import { ObjectivesBlock } from './ObjectivesBlock';
import { TextImageBlock } from './TextImageBlock';
import { ImageFocusBlock } from './ImageFocusBlock';
import { QuoteBlock } from './QuoteBlock';
import { ConceptBlock } from './ConceptBlock';
import { StepsBlock } from './StepsBlock';
import { CompareBlock } from './CompareBlock';
import { TableBlock } from './TableBlock';
import { PoemBlock } from './PoemBlock';
import { ReadingBlock } from './ReadingBlock';
import { FormulaCardBlock } from './FormulaCardBlock';
import { WorkedExampleBlock } from './WorkedExampleBlock';
import { VocabCardsBlock } from './VocabCardsBlock';
import { DialogueBlock } from './DialogueBlock';
import { ExperimentBlock } from './ExperimentBlock';
import { DataChartBlock } from './DataChartBlock';
import { TimelineBlock } from './TimelineBlock';
import { MindmapBlock } from './MindmapBlock';
import { DiscussionBlock } from './DiscussionBlock';
import { SummaryBlock } from './SummaryBlock';
import { HomeworkBlock } from './HomeworkBlock';

/** blockType → 渲染组件注册表 */
const BLOCK_RENDERERS: Record<string, ComponentType<BlockComponentProps>> = {
  cover: CoverBlock,
  toc: TocBlock,
  'section-header': SectionHeaderBlock,
  objectives: ObjectivesBlock,
  'title-content': TitleContentBlock,
  'text-image': TextImageBlock,
  'image-focus': ImageFocusBlock,
  quote: QuoteBlock,
  concept: ConceptBlock,
  steps: StepsBlock,
  compare: CompareBlock,
  table: TableBlock,
  poem: PoemBlock,
  reading: ReadingBlock,
  'formula-card': FormulaCardBlock,
  'worked-example': WorkedExampleBlock,
  'vocab-cards': VocabCardsBlock,
  dialogue: DialogueBlock,
  experiment: ExperimentBlock,
  'data-chart': DataChartBlock,
  timeline: TimelineBlock,
  mindmap: MindmapBlock,
  quiz: QuizBlock,
  discussion: DiscussionBlock,
  summary: SummaryBlock,
  homework: HomeworkBlock,
};

/** 未知版式的兜底渲染（永不让页面空白） */
function FallbackBlock({ element }: BlockComponentProps) {
  const { tokens } = useTheme();
  const { blockType, slots } = useBlockData(element);
  const title = typeof slots.title === 'string' ? slots.title : blockType;
  const texts = Object.values(slots).filter((v) => typeof v === 'string') as string[];
  return (
    <BlockShell element={element} padding={40} style={{ background: tokens.colors.background }}>
      <h2
        style={{
          fontSize: tokens.fontSizes['2xl'],
          color: tokens.colors.text,
          fontFamily: tokens.fonts.heading,
          marginBottom: 16,
        }}
      >
        {title}
      </h2>
      {texts.slice(0, 4).map((t, i) => (
        <p
          key={i}
          style={{
            fontSize: tokens.fontSizes.lg,
            color: tokens.colors.textMuted,
            fontFamily: tokens.fonts.body,
            marginBottom: 8,
          }}
        >
          {t}
        </p>
      ))}
    </BlockShell>
  );
}

/** Block 元素统一入口：按 blockType 分发到具体渲染器 */
export function BlockRenderer(props: BlockComponentProps) {
  const { blockType } = useBlockData(props.element);
  const Renderer = BLOCK_RENDERERS[blockType] || FallbackBlock;
  return <Renderer {...props} />;
}

export { BLOCK_RENDERERS };
