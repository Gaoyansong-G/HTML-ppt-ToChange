import { BlockShell, useBlockData, str, useTheme, type BlockComponentProps } from './BlockShell';
import { FitText } from './FitText';

/** 公式定理框：名称 + 高亮公式区 + 解读 + 例题，variant: card | banner */
export function FormulaCardBlock({ element }: BlockComponentProps) {
  const { tokens } = useTheme();
  const { variant, slots } = useBlockData(element);
  const title = str(slots, 'title', '公式定理');
  const formula = str(slots, 'formula');
  const explanation = str(slots, 'explanation');
  const example = str(slots, 'example');
  const isBanner = variant === 'banner';

  const nameRow = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
      <span
        style={{
          padding: '6px 16px',
          borderRadius: tokens.borderRadius.full,
          background: tokens.colors.primary,
          color: '#fff',
          fontSize: tokens.fontSizes.sm,
          fontWeight: 700,
          fontFamily: tokens.fonts.heading,
          flexShrink: 0,
        }}
      >
        定理 / 公式
      </span>
      <div style={{ flex: 1, height: 44 }}>
        <FitText
          fontSize={tokens.fontSizes['2xl']}
          minFontSize={18}
          fontFamily={tokens.fonts.heading}
          fontWeight={700}
          color={tokens.colors.text}
          multiline={false}
          lineHeight={1.2}
        >
          {title}
        </FitText>
      </div>
    </div>
  );

  const formulaPane = (
    <div
      style={{
        flex: isBanner ? 1 : undefined,
        minHeight: 0,
        maxHeight: isBanner ? undefined : '38%',
        padding: '20px 32px',
        borderRadius: tokens.borderRadius.lg,
        background: `linear-gradient(135deg, ${tokens.colors.primary}12, ${tokens.colors.accent}12)`,
        border: `2px solid ${tokens.colors.primary}`,
        boxShadow: tokens.shadows.sm,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ width: '100%', height: '100%', maxHeight: '100%' }}>
        <FitText
          fontSize={tokens.fontSizes['2xl']}
          minFontSize={14}
          fontFamily={tokens.fonts.mono || 'monospace'}
          fontWeight={600}
          color={tokens.colors.primary}
          textAlign="center"
          lineHeight={1.4}
        >
          {formula}
        </FitText>
      </div>
    </div>
  );

  const explanationPane = explanation ? (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        padding: '14px 20px',
        borderRadius: tokens.borderRadius.md,
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <span
        style={{
          fontSize: tokens.fontSizes.sm,
          fontWeight: 700,
          color: tokens.colors.primary,
          fontFamily: tokens.fonts.heading,
          flexShrink: 0,
        }}
      >
        解读
      </span>
      <div style={{ flex: 1, minHeight: 0 }}>
        <FitText
          fontSize={tokens.fontSizes.base}
          minFontSize={11}
          fontFamily={tokens.fonts.body}
          color={tokens.colors.text}
          lineHeight={1.55}
        >
          {explanation}
        </FitText>
      </div>
    </div>
  ) : null;

  const examplePane = example ? (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        padding: '14px 20px',
        borderRadius: tokens.borderRadius.md,
        background: `${tokens.colors.accent}0d`,
        border: `1px dashed ${tokens.colors.accent}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <span
        style={{
          fontSize: tokens.fontSizes.sm,
          fontWeight: 700,
          color: tokens.colors.accent,
          fontFamily: tokens.fonts.heading,
          flexShrink: 0,
        }}
      >
        例题
      </span>
      <div style={{ flex: 1, minHeight: 0 }}>
        <FitText
          fontSize={tokens.fontSizes.base}
          minFontSize={11}
          fontFamily={tokens.fonts.body}
          color={tokens.colors.text}
          lineHeight={1.55}
        >
          {example}
        </FitText>
      </div>
    </div>
  ) : null;

  if (isBanner) {
    /* 横幅式：顶部名称条 + 公式横幅铺满 + 底部解读例题并排 */
    return (
      <BlockShell
        element={element}
        padding={44}
        style={{ background: tokens.colors.background, display: 'flex', flexDirection: 'column', gap: 18 }}
      >
        {nameRow}
        {formulaPane}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 18 }}>
          {explanationPane}
          {examplePane}
        </div>
      </BlockShell>
    );
  }

  /* 卡片式：单卡纵向居中 */
  return (
    <BlockShell
      element={element}
      padding={48}
      style={{
        background: tokens.colors.background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '88%',
          height: '100%',
          padding: '26px 34px',
          borderRadius: tokens.borderRadius.xl,
          background: tokens.colors.surface,
          border: `1px solid ${tokens.colors.border}`,
          boxShadow: tokens.shadows.md,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {nameRow}
        {formulaPane}
        {explanationPane}
        {examplePane}
      </div>
    </BlockShell>
  );
}
