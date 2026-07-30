import type { StepSlot } from '@courseware/shared';
import { BlockShell, useBlockData, str, useTheme, type BlockComponentProps } from './BlockShell';
import { FitText } from './FitText';

/** 防御式取 steps 槽位 */
function getSteps(slots: Record<string, unknown>, max: number): StepSlot[] {
  const v = slots.steps;
  if (!Array.isArray(v)) return [];
  return v
    .filter((s): s is StepSlot => !!s && typeof s === 'object' && typeof (s as StepSlot).title === 'string')
    .slice(0, max);
}

/** 步骤流程条：序号徽章 + 连接线，variant: vertical | horizontal */
export function StepsBlock({ element }: BlockComponentProps) {
  const { tokens } = useTheme();
  const { variant, slots } = useBlockData(element);
  const title = str(slots, 'title');
  const steps = getSteps(slots, 6);
  const isHorizontal = variant === 'horizontal';

  const badge = (i: number) => (
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${tokens.colors.primary}, ${tokens.colors.accent})`,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: tokens.fontSizes.xl,
        fontWeight: 700,
        fontFamily: tokens.fonts.heading,
        flexShrink: 0,
        zIndex: 1,
        boxShadow: tokens.shadows.sm,
      }}
    >
      {i + 1}
    </div>
  );

  return (
    <BlockShell
      element={element}
      padding={44}
      style={{ background: tokens.colors.background, display: 'flex', flexDirection: 'column' }}
    >
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, flexShrink: 0, height: 52 }}>
          <div
            style={{
              width: 7,
              height: 34,
              borderRadius: 4,
              background: tokens.colors.primary,
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, height: '100%' }}>
            <FitText
              fontSize={tokens.fontSizes['2xl']}
              minFontSize={20}
              fontFamily={tokens.fonts.heading}
              fontWeight={700}
              color={tokens.colors.text}
              lineHeight={1.2}
            >
              {title}
            </FitText>
          </div>
        </div>
      )}

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: isHorizontal ? 'row' : 'column',
          gap: isHorizontal ? 0 : 14,
          position: 'relative',
        }}
      >
        {steps.map((step, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              minHeight: 0,
              minWidth: 0,
              display: 'flex',
              flexDirection: isHorizontal ? 'column' : 'row',
              alignItems: isHorizontal ? 'center' : 'flex-start',
              gap: isHorizontal ? 12 : 18,
              position: 'relative',
              padding: isHorizontal ? '0 14px' : '0 0 0 8px',
            }}
          >
            {/* 连接线 */}
            {i < steps.length - 1 &&
              (isHorizontal ? (
                <div
                  style={{
                    position: 'absolute',
                    top: 24,
                    left: 'calc(50% + 32px)',
                    width: 'calc(100% - 64px)',
                    height: 3,
                    borderRadius: 2,
                    background: `linear-gradient(90deg, ${tokens.colors.accent}, ${tokens.colors.border})`,
                  }}
                />
              ) : (
                <div
                  style={{
                    position: 'absolute',
                    left: 31,
                    top: 52,
                    bottom: -16,
                    width: 3,
                    borderRadius: 2,
                    background: `linear-gradient(to bottom, ${tokens.colors.accent}, ${tokens.colors.border})`,
                  }}
                />
              ))}
            {badge(i)}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                minWidth: 0,
                width: isHorizontal ? '100%' : undefined,
                padding: '14px 18px',
                borderRadius: tokens.borderRadius.lg,
                background: tokens.colors.surface,
                border: `1px solid ${tokens.colors.border}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                overflow: 'hidden',
              }}
            >
              <div style={{ height: 30, flexShrink: 0 }}>
                <FitText
                  fontSize={tokens.fontSizes.lg}
                  minFontSize={13}
                  fontFamily={tokens.fonts.heading}
                  fontWeight={700}
                  color={tokens.colors.primary}
                  multiline={false}
                  lineHeight={1.25}
                >
                  {step.title}
                </FitText>
              </div>
              {step.detail && (
                <div style={{ flex: 1, minHeight: 0 }}>
                  <FitText
                    fontSize={tokens.fontSizes.sm}
                    minFontSize={11}
                    fontFamily={tokens.fonts.body}
                    color={tokens.colors.textMuted}
                    lineHeight={1.45}
                  >
                    {step.detail}
                  </FitText>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </BlockShell>
  );
}
