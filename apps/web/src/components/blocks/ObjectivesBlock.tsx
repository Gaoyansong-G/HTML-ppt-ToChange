import { Target } from 'lucide-react';
import { BlockShell, useBlockData, str, strList, useTheme, type BlockComponentProps } from './BlockShell';
import { FitText } from './FitText';

/** 学习目标卡：图标 + 目标条目，variant: cards | list */
export function ObjectivesBlock({ element }: BlockComponentProps) {
  const { tokens } = useTheme();
  const { variant, slots } = useBlockData(element);
  const title = str(slots, 'title', '学习目标');
  const items = strList(slots, 'items').slice(0, 4);
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
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: tokens.colors.primary,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Target size={28} />
        </div>
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
      </div>

      {isCards ? (
        /* 卡片式：按条目数自适应列数 */
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'grid',
            gridTemplateColumns: items.length > 2 ? 'minmax(0, 1fr) minmax(0, 1fr)' : '1fr',
            gridAutoRows: '1fr',
            gap: 20,
          }}
        >
          {items.map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                padding: '20px 24px',
                borderRadius: tokens.borderRadius.xl,
                background: tokens.colors.surface,
                border: `1px solid ${tokens.colors.border}`,
                borderTop: `4px solid ${tokens.colors.accent}`,
                boxShadow: tokens.shadows.sm,
                minHeight: 0,
                overflow: 'hidden',
              }}
            >
              <span
                style={{
                  alignSelf: 'flex-start',
                  padding: '4px 14px',
                  borderRadius: tokens.borderRadius.full,
                  background: `${tokens.colors.accent}18`,
                  color: tokens.colors.accent,
                  fontSize: tokens.fontSizes.sm,
                  fontWeight: 700,
                  fontFamily: tokens.fonts.heading,
                  flexShrink: 0,
                }}
              >
                目标 {i + 1}
              </span>
              <div style={{ flex: 1, minHeight: 0 }}>
                <FitText
                  fontSize={tokens.fontSizes.lg}
                  minFontSize={13}
                  fontFamily={tokens.fonts.body}
                  color={tokens.colors.text}
                  lineHeight={1.5}
                >
                  {item}
                </FitText>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* 清单式 */
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {items.map((item, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                padding: '12px 24px',
                borderRadius: tokens.borderRadius.lg,
                background: tokens.colors.surface,
                border: `1px solid ${tokens.colors.border}`,
              }}
            >
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: `3px solid ${tokens.colors.accent}`,
                  color: tokens.colors.accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: tokens.fontSizes.base,
                  fontWeight: 700,
                  fontFamily: tokens.fonts.heading,
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </span>
              <div style={{ flex: 1, minHeight: 0, maxHeight: '100%' }}>
                <FitText
                  fontSize={tokens.fontSizes.xl}
                  minFontSize={14}
                  fontFamily={tokens.fonts.body}
                  color={tokens.colors.text}
                  lineHeight={1.4}
                >
                  {item}
                </FitText>
              </div>
            </div>
          ))}
        </div>
      )}
    </BlockShell>
  );
}
