import { BlockShell, useBlockData, str, strList, useTheme, type BlockComponentProps } from './BlockShell';
import { FitText } from './FitText';

/** 目录页：编号列表或卡片网格，variant: numbered | cards */
export function TocBlock({ element }: BlockComponentProps) {
  const { tokens } = useTheme();
  const { variant, slots } = useBlockData(element);
  const title = str(slots, 'title', '目录');
  const items = strList(slots, 'items').slice(0, 6);
  const isCards = variant === 'cards';

  return (
    <BlockShell
      element={element}
      padding={48}
      style={{ background: tokens.colors.background, display: 'flex', flexDirection: 'column' }}
    >
      {/* 标题区 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, flexShrink: 0 }}>
        <div
          style={{
            width: 8,
            height: 40,
            borderRadius: 4,
            background: tokens.colors.primary,
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, height: 56 }}>
          <FitText
            fontSize={tokens.fontSizes['3xl']}
            minFontSize={24}
            fontFamily={tokens.fonts.heading}
            fontWeight={700}
            color={tokens.colors.text}
            lineHeight={1.2}
          >
            {title}
          </FitText>
        </div>
        {!isCards && (
          <span
            style={{
              fontSize: tokens.fontSizes.lg,
              color: tokens.colors.textMuted,
              fontFamily: tokens.fonts.body,
              flexShrink: 0,
            }}
          >
            CONTENTS
          </span>
        )}
      </div>

      {isCards ? (
        /* 卡片网格：2 列 */
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
            gridAutoRows: '1fr',
            gap: 20,
          }}
        >
          {items.map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                padding: '18px 24px',
                borderRadius: tokens.borderRadius.xl,
                background: tokens.colors.surface,
                border: `1px solid ${tokens.colors.border}`,
                boxShadow: tokens.shadows.sm,
                minHeight: 0,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: tokens.borderRadius.lg,
                  background: `linear-gradient(135deg, ${tokens.colors.primary}, ${tokens.colors.accent})`,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: tokens.fontSizes.xl,
                  fontWeight: 700,
                  fontFamily: tokens.fonts.heading,
                  flexShrink: 0,
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </div>
              <div style={{ flex: 1, minHeight: 0, maxHeight: '100%' }}>
                <FitText
                  fontSize={tokens.fontSizes.xl}
                  minFontSize={14}
                  fontFamily={tokens.fonts.heading}
                  fontWeight={600}
                  color={tokens.colors.text}
                  lineHeight={1.35}
                >
                  {item}
                </FitText>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* 编号列表 */
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {items.map((item, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                padding: '8px 20px',
                borderBottom: `1px dashed ${tokens.colors.border}`,
              }}
            >
              <span
                style={{
                  fontSize: tokens.fontSizes['2xl'],
                  fontWeight: 700,
                  fontFamily: tokens.fonts.heading,
                  color: tokens.colors.accent,
                  flexShrink: 0,
                  minWidth: 64,
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <div style={{ flex: 1, minHeight: 0, maxHeight: '100%' }}>
                <FitText
                  fontSize={tokens.fontSizes.xl}
                  minFontSize={15}
                  fontFamily={tokens.fonts.body}
                  color={tokens.colors.text}
                  lineHeight={1.3}
                >
                  {item}
                </FitText>
              </div>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: tokens.colors.border,
                  flexShrink: 0,
                }}
              />
            </div>
          ))}
        </div>
      )}
    </BlockShell>
  );
}
