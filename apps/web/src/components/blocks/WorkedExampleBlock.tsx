import type { StepSlot } from '@courseware/shared';
import { BlockShell, useBlockData, str, useTheme, type BlockComponentProps } from './BlockShell';
import { FitText } from './FitText';

function getSteps(slots: Record<string, unknown>, max: number): StepSlot[] {
  const v = slots.steps;
  if (!Array.isArray(v)) return [];
  return v
    .filter((s): s is StepSlot => !!s && typeof s === 'object' && typeof (s as StepSlot).title === 'string')
    .slice(0, max);
}

/** 例题讲解页：题目卡 + 分步解答 + 答案高亮，variant: split（左题右解） | stack（上题下解） */
export function WorkedExampleBlock({ element }: BlockComponentProps) {
  const { tokens } = useTheme();
  const { variant, slots } = useBlockData(element);
  const problem = str(slots, 'problem');
  const steps = getSteps(slots, 6);
  const answer = str(slots, 'answer');
  const isStack = variant === 'stack';

  const problemPane = (
    <div
      style={{
        [isStack ? 'maxHeight' : 'width']: isStack ? '32%' : '42%',
        ...(isStack ? { width: '100%', flexShrink: 0 } : { height: '100%' }),
        minWidth: 0,
        padding: '20px 24px',
        borderRadius: tokens.borderRadius.lg,
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        borderTop: `5px solid ${tokens.colors.primary}`,
        boxShadow: tokens.shadows.sm,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          alignSelf: 'flex-start',
          padding: '4px 14px',
          borderRadius: tokens.borderRadius.full,
          background: tokens.colors.primary,
          color: '#fff',
          fontSize: tokens.fontSizes.sm,
          fontWeight: 700,
          fontFamily: tokens.fonts.heading,
          flexShrink: 0,
        }}
      >
        例题
      </span>
      <div style={{ flex: 1, minHeight: 0 }}>
        <FitText
          fontSize={tokens.fontSizes.lg}
          minFontSize={12}
          fontFamily={tokens.fonts.body}
          color={tokens.colors.text}
          lineHeight={1.6}
        >
          {problem}
        </FitText>
      </div>
    </div>
  );

  const solutionPane = (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <span
        style={{
          fontSize: tokens.fontSizes.sm,
          fontWeight: 700,
          color: tokens.colors.success,
          fontFamily: tokens.fonts.heading,
          letterSpacing: 2,
          flexShrink: 0,
        }}
      >
        解答过程
      </span>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {steps.map((step, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: '8px 16px',
              borderRadius: tokens.borderRadius.md,
              background: tokens.colors.background,
              border: `1px solid ${tokens.colors.border}`,
            }}
          >
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: tokens.colors.primary,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: tokens.fontSizes.sm,
                fontWeight: 700,
                fontFamily: tokens.fonts.heading,
                flexShrink: 0,
              }}
            >
              {i + 1}
            </span>
            <div style={{ flex: 1, minHeight: 0, maxHeight: '100%' }}>
              <FitText
                fontSize={tokens.fontSizes.base}
                minFontSize={11}
                fontFamily={tokens.fonts.body}
                color={tokens.colors.text}
                lineHeight={1.4}
              >
                {step.title}
                {step.detail ? `　${step.detail}` : ''}
              </FitText>
            </div>
          </div>
        ))}
      </div>
      {answer && (
        <div
          style={{
            flexShrink: 0,
            maxHeight: '24%',
            padding: '10px 20px',
            borderRadius: tokens.borderRadius.md,
            background: `${tokens.colors.success}14`,
            border: `2px solid ${tokens.colors.success}`,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span
            style={{
              fontSize: tokens.fontSizes.sm,
              fontWeight: 700,
              color: tokens.colors.success,
              fontFamily: tokens.fonts.heading,
              flexShrink: 0,
            }}
          >
            答案
          </span>
          <div style={{ flex: 1, height: '100%', maxHeight: 56 }}>
            <FitText
              fontSize={tokens.fontSizes.lg}
              minFontSize={12}
              fontFamily={tokens.fonts.heading}
              fontWeight={700}
              color={tokens.colors.success}
              lineHeight={1.3}
            >
              {answer}
            </FitText>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <BlockShell
      element={element}
      padding={44}
      style={{
        background: tokens.colors.background,
        display: 'flex',
        flexDirection: isStack ? 'column' : 'row',
        gap: 22,
      }}
    >
      {problemPane}
      {solutionPane}
    </BlockShell>
  );
}
