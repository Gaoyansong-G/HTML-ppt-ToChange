import { BlockShell, useBlockData, str, useTheme, type BlockComponentProps } from './BlockShell';
import { FitText } from './FitText';

/** 概念定义卡：术语徽章 + 定义 + 示例 + 易错提示，variant: card | split */
export function ConceptBlock({ element }: BlockComponentProps) {
  const { tokens } = useTheme();
  const { variant, slots } = useBlockData(element);
  const term = str(slots, 'term', '核心概念');
  const definition = str(slots, 'definition');
  const example = str(slots, 'example');
  const tip = str(slots, 'tip');
  const isSplit = variant === 'split';

  const termBadge = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
      <span
        style={{
          padding: '8px 22px',
          borderRadius: tokens.borderRadius.full,
          background: `linear-gradient(135deg, ${tokens.colors.primary}, ${tokens.colors.accent})`,
          color: '#fff',
          fontSize: tokens.fontSizes.xl,
          fontWeight: 700,
          fontFamily: tokens.fonts.heading,
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {term}
      </span>
      <span
        style={{
          fontSize: tokens.fontSizes.sm,
          color: tokens.colors.textMuted,
          fontFamily: tokens.fonts.body,
          letterSpacing: 2,
          flexShrink: 0,
        }}
      >
        概念
      </span>
    </div>
  );

  const definitionPane = (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        padding: '18px 24px',
        borderRadius: tokens.borderRadius.lg,
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
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
        定义
      </span>
      <div style={{ flex: 1, minHeight: 0 }}>
        <FitText
          fontSize={tokens.fontSizes.lg}
          minFontSize={13}
          fontFamily={tokens.fonts.body}
          color={tokens.colors.text}
          lineHeight={1.6}
        >
          {definition}
        </FitText>
      </div>
    </div>
  );

  const examplePane = example ? (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        padding: '18px 24px',
        borderRadius: tokens.borderRadius.lg,
        background: `${tokens.colors.accent}0d`,
        border: `1px dashed ${tokens.colors.accent}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
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
        示例
      </span>
      <div style={{ flex: 1, minHeight: 0 }}>
        <FitText
          fontSize={tokens.fontSizes.base}
          minFontSize={12}
          fontFamily={tokens.fonts.body}
          color={tokens.colors.text}
          lineHeight={1.55}
        >
          {example}
        </FitText>
      </div>
    </div>
  ) : null;

  const tipBar = tip ? (
    <div
      style={{
        flexShrink: 0,
        maxHeight: '18%',
        padding: '10px 20px',
        borderRadius: tokens.borderRadius.md,
        background: `${tokens.colors.warning}14`,
        border: `1px solid ${tokens.colors.warning}`,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <span style={{ fontSize: tokens.fontSizes.lg, flexShrink: 0 }}>⚠️</span>
      <div style={{ flex: 1, height: '100%', maxHeight: 64 }}>
        <FitText
          fontSize={tokens.fontSizes.base}
          minFontSize={11}
          fontFamily={tokens.fonts.body}
          color={tokens.colors.text}
          lineHeight={1.4}
        >
          易错提示：{tip}
        </FitText>
      </div>
    </div>
  ) : null;

  if (isSplit) {
    /* 左右分栏：左术语+定义，右示例+提示 */
    return (
      <BlockShell
        element={element}
        padding={48}
        style={{ background: tokens.colors.background, display: 'flex', gap: 28 }}
      >
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {termBadge}
          {definitionPane}
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {examplePane}
          {tipBar}
        </div>
      </BlockShell>
    );
  }

  /* 卡片式：单卡纵向 */
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
          padding: '28px 36px',
          borderRadius: tokens.borderRadius.xl,
          background: tokens.colors.surface,
          border: `1px solid ${tokens.colors.border}`,
          borderTop: `5px solid ${tokens.colors.primary}`,
          boxShadow: tokens.shadows.md,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {termBadge}
        {definitionPane}
        {examplePane}
        {tipBar}
      </div>
    </BlockShell>
  );
}
