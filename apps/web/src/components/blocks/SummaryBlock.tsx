import { BlockShell, useBlockData, str, strList, useTheme, type BlockComponentProps } from './BlockShell';
import { FitText } from './FitText';

/** 总结回顾页：要点回顾 + 一句话收获高亮条，variant: cards | list */
export function SummaryBlock({ element }: BlockComponentProps) {
  const { tokens } = useTheme();
  const { variant, slots } = useBlockData(element);
  const title = str(slots, 'title', '课堂小结');
  const points = strList(slots, 'points').slice(0, 6);
  const takeaway = str(slots, 'takeaway');
  const isCards = variant === 'cards';

  return (
    <BlockShell
      element={element}
      padding={44}
      style={{ background: tokens.colors.background, display: 'flex', flexDirection: 'column' }}
    >
      {/* 标题区 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22, flexShrink: 0, height: 52 }}>
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
            multiline={false}
            lineHeight={1.2}
          >
            {title}
          </FitText>
        </div>
      </div>

      {/* 要点回顾 */}
      {isCards ? (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'grid',
            gridTemplateColumns: points.length > 2 ? 'minmax(0, 1fr) minmax(0, 1fr)' : '1fr',
            gridAutoRows: '1fr',
            gap: 14,
          }}
        >
          {points.map((p, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '12px 18px',
                borderRadius: tokens.borderRadius.lg,
                background: tokens.colors.surface,
                border: `1px solid ${tokens.colors.border}`,
                boxShadow: tokens.shadows.sm,
                minHeight: 0,
                overflow: 'hidden',
              }}
            >
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: tokens.borderRadius.md,
                  background: `${tokens.colors.primary}14`,
                  color: tokens.colors.primary,
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
                  fontSize={tokens.fontSizes.base}
                  minFontSize={11}
                  fontFamily={tokens.fonts.body}
                  color={tokens.colors.text}
                  lineHeight={1.4}
                >
                  {p}
                </FitText>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {points.map((p, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '6px 16px',
                borderBottom: `1px dashed ${tokens.colors.border}`,
              }}
            >
              <span style={{ color: tokens.colors.success, fontSize: tokens.fontSizes.lg, flexShrink: 0 }}>✓</span>
              <div style={{ flex: 1, minHeight: 0, maxHeight: '100%' }}>
                <FitText
                  fontSize={tokens.fontSizes.lg}
                  minFontSize={12}
                  fontFamily={tokens.fonts.body}
                  color={tokens.colors.text}
                  lineHeight={1.4}
                >
                  {p}
                </FitText>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 一句话收获高亮条 */}
      {takeaway && (
        <div
          style={{
            flexShrink: 0,
            maxHeight: '22%',
            marginTop: 18,
            padding: '14px 24px',
            borderRadius: tokens.borderRadius.lg,
            background: `linear-gradient(90deg, ${tokens.colors.primary}, ${tokens.colors.accent})`,
            boxShadow: tokens.shadows.md,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            boxSizing: 'border-box',
          }}
        >
          <span style={{ fontSize: tokens.fontSizes.xl, flexShrink: 0 }}>🌟</span>
          <div style={{ flex: 1, height: '100%', maxHeight: 72 }}>
            <FitText
              fontSize={tokens.fontSizes.lg}
              minFontSize={12}
              fontFamily={tokens.fonts.heading}
              fontWeight={700}
              color="#fff"
              lineHeight={1.35}
            >
              {takeaway}
            </FitText>
          </div>
        </div>
      )}
    </BlockShell>
  );
}
