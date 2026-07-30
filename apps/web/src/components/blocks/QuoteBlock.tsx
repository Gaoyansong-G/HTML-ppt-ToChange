import { BlockShell, useBlockData, str, useTheme, type BlockComponentProps } from './BlockShell';
import { FitText } from './FitText';

/** 金句页：大引号装饰 + 居中大字 + 出处，variant: center | card */
export function QuoteBlock({ element }: BlockComponentProps) {
  const { tokens } = useTheme();
  const { variant, slots } = useBlockData(element);
  const quote = str(slots, 'quote');
  const source = str(slots, 'source');
  const isCard = variant === 'card';
  const handFont = (tokens.fonts as { hand?: string }).hand || tokens.fonts.heading;

  const quoteMark = (
    <span
      aria-hidden
      style={{
        fontSize: isCard ? 120 : 160,
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontWeight: 700,
        color: tokens.colors.accent,
        opacity: 0.28,
        lineHeight: 0.8,
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      “
    </span>
  );

  const body = (
    <>
      {quoteMark}
      <div style={{ width: '100%', flex: 1, minHeight: 0 }}>
        <FitText
          fontSize={tokens.fontSizes['3xl']}
          minFontSize={20}
          fontFamily={handFont}
          fontWeight={600}
          color={tokens.colors.primary}
          textAlign="center"
          lineHeight={1.5}
        >
          {quote}
        </FitText>
      </div>
      {source && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 20, flexShrink: 0, maxWidth: '100%' }}>
          <div style={{ width: 40, height: 2, background: tokens.colors.accent, flexShrink: 0 }} />
          <div style={{ height: 30, maxWidth: '80%' }}>
            <FitText
              fontSize={tokens.fontSizes.lg}
              minFontSize={12}
              fontFamily={tokens.fonts.body}
              color={tokens.colors.textMuted}
              multiline={false}
              lineHeight={1.3}
            >
              {source}
            </FitText>
          </div>
        </div>
      )}
    </>
  );

  if (isCard) {
    /* 卡片式：居中卡片承载 */
    return (
      <BlockShell
        element={element}
        padding={56}
        style={{
          background: tokens.colors.background,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: '86%',
            height: '100%',
            padding: '36px 48px',
            borderRadius: tokens.borderRadius.xl,
            background: tokens.colors.surface,
            border: `1px solid ${tokens.colors.border}`,
            borderLeft: `6px solid ${tokens.colors.accent}`,
            boxShadow: tokens.shadows.lg,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            boxSizing: 'border-box',
          }}
        >
          {body}
        </div>
      </BlockShell>
    );
  }

  /* 居中大字号 */
  return (
    <BlockShell
      element={element}
      padding={72}
      style={{
        background: `linear-gradient(135deg, ${tokens.colors.background} 0%, ${tokens.colors.surface} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {body}
    </BlockShell>
  );
}
