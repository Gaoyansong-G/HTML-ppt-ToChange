import { BlockShell, useBlockData, str, useTheme, type BlockComponentProps } from './BlockShell';
import { FitText } from './FitText';

/** 章节过渡页：大号序号 + 标题 + 简述，variant: center | band */
export function SectionHeaderBlock({ element }: BlockComponentProps) {
  const { tokens } = useTheme();
  const { variant, slots } = useBlockData(element);
  const title = str(slots, 'title', '章节标题');
  const subtitle = str(slots, 'subtitle');
  const index = str(slots, 'index');
  const isBand = variant === 'band';

  if (isBand) {
    /* 横带式：整宽色带横贯中部 */
    return (
      <BlockShell
        element={element}
        style={{
          background: tokens.colors.background,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            background: `linear-gradient(90deg, ${tokens.colors.primary} 0%, ${tokens.colors.accent} 100%)`,
            padding: '48px 64px',
            display: 'flex',
            alignItems: 'center',
            gap: 40,
            boxShadow: tokens.shadows.md,
            maxHeight: '70%',
          }}
        >
          {index && (
            <span
              style={{
                fontSize: 96,
                fontWeight: 700,
                fontFamily: tokens.fonts.heading,
                color: 'rgba(255,255,255,0.35)',
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              {index}
            </span>
          )}
          <div style={{ flex: 1, minHeight: 0, maxHeight: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ maxHeight: subtitle ? '62%' : '100%' }}>
              <FitText
                fontSize={tokens.fontSizes['3xl']}
                minFontSize={24}
                fontFamily={tokens.fonts.heading}
                fontWeight={700}
                color="#fff"
                lineHeight={1.2}
              >
                {title}
              </FitText>
            </div>
            {subtitle && (
              <div style={{ maxHeight: '34%' }}>
                <FitText
                  fontSize={tokens.fontSizes.lg}
                  minFontSize={13}
                  fontFamily={tokens.fonts.body}
                  color="rgba(255,255,255,0.85)"
                  lineHeight={1.4}
                >
                  {subtitle}
                </FitText>
              </div>
            )}
          </div>
        </div>
        {/* 上下细装饰线 */}
        <div style={{ position: 'absolute', top: '14%', left: 64, right: 64, height: 1, background: tokens.colors.border }} />
        <div style={{ position: 'absolute', bottom: '14%', left: 64, right: 64, height: 1, background: tokens.colors.border }} />
      </BlockShell>
    );
  }

  /* 居中式 */
  return (
    <BlockShell
      element={element}
      padding={64}
      style={{
        background: `linear-gradient(135deg, ${tokens.colors.background} 0%, ${tokens.colors.surface} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      {index && (
        <div style={{ position: 'relative', marginBottom: 24, flexShrink: 0 }}>
          <span
            style={{
              fontSize: 140,
              fontWeight: 700,
              fontFamily: tokens.fonts.heading,
              color: tokens.colors.primary,
              opacity: 0.14,
              lineHeight: 1,
              display: 'block',
            }}
          >
            {index}
          </span>
          <span
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: tokens.fontSizes['2xl'],
              fontWeight: 700,
              fontFamily: tokens.fonts.heading,
              color: tokens.colors.primary,
            }}
          >
            {index}
          </span>
        </div>
      )}
      <div
        style={{
          width: 72,
          height: 6,
          borderRadius: 3,
          background: tokens.colors.accent,
          marginBottom: 28,
          flexShrink: 0,
        }}
      />
      <div style={{ width: '100%', maxHeight: '34%' }}>
        <FitText
          fontSize={tokens.fontSizes['4xl']}
          minFontSize={30}
          fontFamily={tokens.fonts.heading}
          fontWeight={700}
          color={tokens.colors.text}
          textAlign="center"
          lineHeight={1.25}
        >
          {title}
        </FitText>
      </div>
      {subtitle && (
        <div style={{ width: '80%', maxHeight: '20%', marginTop: 24 }}>
          <FitText
            fontSize={tokens.fontSizes.xl}
            minFontSize={14}
            fontFamily={tokens.fonts.body}
            color={tokens.colors.textMuted}
            textAlign="center"
            lineHeight={1.5}
          >
            {subtitle}
          </FitText>
        </div>
      )}
    </BlockShell>
  );
}
