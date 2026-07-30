import { BlockShell, useBlockData, str, strList, useTheme, type BlockComponentProps } from './BlockShell';
import { FitText } from './FitText';

/** 标题要点页：标题 + 要点列表，variant: default | numbered */
export function TitleContentBlock({ element }: BlockComponentProps) {
  const { tokens } = useTheme();
  const { variant, slots, emphasis } = useBlockData(element);
  const title = str(slots, 'title');
  const points = strList(slots, 'points').slice(0, 6);
  const note = str(slots, 'note');
  const numbered = variant === 'numbered';

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
      </div>

      {/* 要点列表 */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          minHeight: 0,
          justifyContent: points.length <= 3 ? 'space-evenly' : 'flex-start',
        }}
      >
        {points.map((point, i) => {
          const emphasized = emphasis.includes(`points.${i}`) || emphasis.includes('points');
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 16,
                padding: '14px 20px',
                borderRadius: tokens.borderRadius.lg,
                background: emphasized ? tokens.colors.surface : 'transparent',
                border: emphasized
                  ? `2px solid ${tokens.colors.accent}`
                  : `1px solid ${tokens.colors.border}`,
                boxShadow: emphasized ? tokens.shadows?.md : undefined,
                flex: points.length <= 3 ? 1 : undefined,
                minHeight: 0,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: numbered ? tokens.borderRadius.md : '50%',
                  background: tokens.colors.primary,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: tokens.fontSizes.lg,
                  fontWeight: 700,
                  flexShrink: 0,
                  fontFamily: tokens.fonts.heading,
                }}
              >
                {numbered ? i + 1 : '◆'}
              </div>
              <div style={{ flex: 1, minHeight: 0 }}>
                <FitText
                  fontSize={tokens.fontSizes.xl}
                  minFontSize={14}
                  fontFamily={tokens.fonts.body}
                  color={tokens.colors.text}
                  lineHeight={1.45}
                >
                  {point}
                </FitText>
              </div>
            </div>
          );
        })}
      </div>

      {/* 补充说明 */}
      {note && (
        <div
          style={{
            marginTop: 20,
            padding: '12px 20px',
            borderLeft: `4px solid ${tokens.colors.accent}`,
            background: tokens.colors.surface,
            borderRadius: tokens.borderRadius.md,
            flexShrink: 0,
            maxHeight: '18%',
          }}
        >
          <FitText
            fontSize={tokens.fontSizes.base}
            minFontSize={12}
            fontFamily={tokens.fonts.body}
            color={tokens.colors.textMuted}
          >
            {note}
          </FitText>
        </div>
      )}
    </BlockShell>
  );
}
