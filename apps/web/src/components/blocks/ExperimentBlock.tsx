import type { ExperimentSlot, StepSlot } from '@courseware/shared';
import { BlockShell, useBlockData, useTheme, type BlockComponentProps } from './BlockShell';
import { FitText } from './FitText';

function getExperiment(slots: Record<string, unknown>): ExperimentSlot {
  const v = slots.experiment;
  const e = (v && typeof v === 'object' ? v : {}) as Partial<ExperimentSlot>;
  return {
    name: typeof e.name === 'string' ? e.name : '',
    materials: Array.isArray(e.materials) ? e.materials.filter((m): m is string => typeof m === 'string') : [],
    steps: Array.isArray(e.steps)
      ? e.steps
          .filter((s): s is StepSlot => !!s && typeof s === 'object' && typeof (s as StepSlot).title === 'string')
          .slice(0, 6)
      : [],
    observation: typeof e.observation === 'string' ? e.observation : '',
    conclusion: typeof e.conclusion === 'string' ? e.conclusion : '',
  };
}

/** 实验探究页：器材 + 步骤 + 观察 + 结论 四区布局，variant: default | compact */
export function ExperimentBlock({ element }: BlockComponentProps) {
  const { tokens } = useTheme();
  const { variant, slots } = useBlockData(element);
  const exp = getExperiment(slots);
  const isCompact = variant === 'compact';

  const sectionLabel = (text: string, color: string) => (
    <span
      style={{
        fontSize: tokens.fontSizes.sm,
        fontWeight: 700,
        color,
        fontFamily: tokens.fonts.heading,
        letterSpacing: 1,
        flexShrink: 0,
      }}
    >
      {text}
    </span>
  );

  const materialsPane = (
    <div
      style={{
        minHeight: 0,
        minWidth: 0,
        padding: '14px 18px',
        borderRadius: tokens.borderRadius.lg,
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        overflow: 'hidden',
        boxSizing: 'border-box',
        flex: 1,
      }}
    >
      {sectionLabel('🧪 实验器材', tokens.colors.primary)}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {exp.materials.slice(0, 6).map((m, i) => (
          <div key={i} style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: tokens.colors.primary,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, height: '100%', maxHeight: 40 }}>
              <FitText
                fontSize={tokens.fontSizes.sm}
                minFontSize={10}
                fontFamily={tokens.fonts.body}
                color={tokens.colors.text}
                lineHeight={1.3}
              >
                {m}
              </FitText>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const stepsPane = (
    <div
      style={{
        minHeight: 0,
        minWidth: 0,
        padding: '14px 18px',
        borderRadius: tokens.borderRadius.lg,
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        overflow: 'hidden',
        boxSizing: 'border-box',
        flex: 2,
      }}
    >
      {sectionLabel('📋 实验步骤', tokens.colors.accent)}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {exp.steps.map((s, i) => (
          <div key={i} style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: tokens.colors.accent,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: tokens.fontSizes.xs,
                fontWeight: 700,
                fontFamily: tokens.fonts.heading,
                flexShrink: 0,
              }}
            >
              {i + 1}
            </span>
            <div style={{ flex: 1, minHeight: 0, maxHeight: '100%' }}>
              <FitText
                fontSize={tokens.fontSizes.sm}
                minFontSize={10}
                fontFamily={tokens.fonts.body}
                color={tokens.colors.text}
                lineHeight={1.35}
              >
                {s.title}
                {s.detail && !isCompact ? `　${s.detail}` : ''}
              </FitText>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const observationPane = (
    <div
      style={{
        minHeight: 0,
        minWidth: 0,
        padding: '14px 18px',
        borderRadius: tokens.borderRadius.lg,
        background: `${tokens.colors.warning}0d`,
        border: `1px dashed ${tokens.colors.warning}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        overflow: 'hidden',
        boxSizing: 'border-box',
        flex: 1,
      }}
    >
      {sectionLabel('👀 观察记录', tokens.colors.warning)}
      <div style={{ flex: 1, minHeight: 0 }}>
        <FitText
          fontSize={tokens.fontSizes.sm}
          minFontSize={10}
          fontFamily={tokens.fonts.body}
          color={tokens.colors.text}
          lineHeight={1.45}
        >
          {exp.observation || '（实验过程中记录现象）'}
        </FitText>
      </div>
    </div>
  );

  const conclusionPane = exp.conclusion ? (
    <div
      style={{
        flexShrink: 0,
        maxHeight: isCompact ? '20%' : '22%',
        padding: '12px 20px',
        borderRadius: tokens.borderRadius.lg,
        background: `${tokens.colors.success}14`,
        border: `2px solid ${tokens.colors.success}`,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxSizing: 'border-box',
      }}
    >
      <span
        style={{
          padding: '4px 12px',
          borderRadius: tokens.borderRadius.full,
          background: tokens.colors.success,
          color: '#fff',
          fontSize: tokens.fontSizes.sm,
          fontWeight: 700,
          fontFamily: tokens.fonts.heading,
          flexShrink: 0,
        }}
      >
        结论
      </span>
      <div style={{ flex: 1, height: '100%', maxHeight: 72 }}>
        <FitText
          fontSize={tokens.fontSizes.base}
          minFontSize={11}
          fontFamily={tokens.fonts.body}
          fontWeight={600}
          color={tokens.colors.text}
          lineHeight={1.4}
        >
          {exp.conclusion}
        </FitText>
      </div>
    </div>
  ) : null;

  return (
    <BlockShell
      element={element}
      padding={isCompact ? 36 : 44}
      style={{ background: tokens.colors.background, display: 'flex', flexDirection: 'column', gap: isCompact ? 12 : 16 }}
    >
      {/* 实验名称 */}
      {exp.name && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0, height: 48 }}>
          <div
            style={{
              width: 7,
              height: 32,
              borderRadius: 4,
              background: tokens.colors.primary,
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, height: '100%' }}>
            <FitText
              fontSize={tokens.fontSizes['2xl']}
              minFontSize={18}
              fontFamily={tokens.fonts.heading}
              fontWeight={700}
              color={tokens.colors.text}
              multiline={false}
              lineHeight={1.2}
            >
              {exp.name}
            </FitText>
          </div>
        </div>
      )}

      {isCompact ? (
        /* 紧凑：上下两行两列 */
        <>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 14 }}>
            {materialsPane}
            {stepsPane}
          </div>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 14 }}>
            {observationPane}
          </div>
        </>
      ) : (
        /* 标准：左器材观察，右步骤 */
        <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 16 }}>
          <div style={{ width: '40%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {materialsPane}
            {observationPane}
          </div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex' }}>{stepsPane}</div>
        </div>
      )}
      {conclusionPane}
    </BlockShell>
  );
}
