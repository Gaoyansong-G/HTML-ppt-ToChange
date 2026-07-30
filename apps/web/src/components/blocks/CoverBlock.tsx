import { BlockShell, useBlockData, str, useTheme, type BlockComponentProps } from './BlockShell';
import { FitText } from './FitText';

/** 封面页：主标题 + 副标题 + 信息行，variant: center | left */
export function CoverBlock({ element, mode }: BlockComponentProps) {
  const { tokens, themeId } = useTheme();
  const { variant, slots } = useBlockData(element);
  const title = str(slots, 'title', '课件标题');
  const subtitle = str(slots, 'subtitle');
  const info = str(slots, 'info');

  const isLeft = variant === 'left';
  const align = isLeft ? 'flex-start' : 'center';
  const textAlign = isLeft ? 'left' : 'center';
  const isApple = themeId === 'apple';

  // Apple 官网 Hero 处理：超大标题 + 紧凑字距 + 大量留白 + 无多余装饰
  const heroBg = isApple
    ? `linear-gradient(180deg, ${tokens.colors.background} 0%, ${tokens.colors.surface} 100%)`
    : `linear-gradient(135deg, ${tokens.colors.background} 0%, ${tokens.colors.surface} 100%)`;

  return (
    <BlockShell
      element={element}
      padding={isApple ? 80 : 64}
      style={{
        background: heroBg,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: align,
      }}
    >
      {/* 顶部装饰条（Apple 风格省略） */}
      {!isApple && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 8,
            background: `linear-gradient(90deg, ${tokens.colors.primary}, ${tokens.colors.accent})`,
          }}
        />
      )}
      <div
        style={{
          width: isLeft ? 96 : 120,
          height: isApple ? 4 : 6,
          borderRadius: 3,
          background: tokens.colors.accent,
          marginBottom: isApple ? 40 : 32,
        }}
      />
      <div style={{ width: '100%', maxHeight: isApple ? '48%' : '40%' }}>
        <FitText
          fontSize={tokens.fontSizes['4xl']}
          minFontSize={32}
          fontFamily={tokens.fonts.heading}
          fontWeight={isApple ? 600 : 700}
          color={tokens.colors.primary}
          textAlign={textAlign}
          lineHeight={isApple ? 1.07 : 1.25}
          style={isApple ? { letterSpacing: '-0.02em' } : undefined}
        >
          {title}
        </FitText>
      </div>
      {subtitle && (
        <div style={{ width: '100%', maxHeight: '22%', marginTop: isApple ? 20 : 24 }}>
          <FitText
            fontSize={tokens.fontSizes['2xl']}
            minFontSize={18}
            fontFamily={tokens.fonts.heading}
            fontWeight={isApple ? 400 : 500}
            color={isApple ? tokens.colors.textMuted : tokens.colors.text}
            textAlign={textAlign}
            lineHeight={isApple ? 1.3 : 1.5}
          >
            {subtitle}
          </FitText>
        </div>
      )}
      {info && (
        <div
          style={
            isApple
              ? {
                  marginTop: 48,
                  padding: '8px 20px',
                  borderRadius: tokens.borderRadius.full,
                  background: tokens.colors.accent,
                  color: '#fff',
                  fontSize: tokens.fontSizes.base,
                  fontWeight: 500,
                  fontFamily: tokens.fonts.body,
                }
              : {
                  marginTop: 40,
                  padding: '10px 24px',
                  borderRadius: tokens.borderRadius.full,
                  background: tokens.colors.surface,
                  border: `1px solid ${tokens.colors.border}`,
                  fontSize: tokens.fontSizes.lg,
                  color: tokens.colors.textMuted,
                  fontFamily: tokens.fonts.body,
                }
          }
        >
          {info}
        </div>
      )}
      {/* 底部装饰（Apple 风格省略） */}
      {!isApple && (
        <div
          style={{
            position: 'absolute',
            bottom: 32,
            left: 64,
            right: 64,
            height: 1,
            background: tokens.colors.border,
          }}
        />
      )}
      {mode === 'player' && null}
    </BlockShell>
  );
}
