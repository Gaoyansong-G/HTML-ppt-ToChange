import { BlockShell, useBlockData, str, strList, useTheme, type BlockComponentProps } from './BlockShell';
import { FitText } from './FitText';

/** 讨论任务页：大问题 + 要求清单 + 提示 + 时长徽章，variant: card | poster */
export function DiscussionBlock({ element }: BlockComponentProps) {
  const { tokens } = useTheme();
  const { variant, slots } = useBlockData(element);
  const question = str(slots, 'question', '讨论问题');
  const requirements = strList(slots, 'requirements').slice(0, 4);
  const hint = str(slots, 'hint');
  const time = str(slots, 'time');
  const isPoster = variant === 'poster';

  const timeBadge = time ? (
    <div
      style={{
        padding: '8px 20px',
        borderRadius: tokens.borderRadius.full,
        background: tokens.colors.warning,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: tokens.fontSizes.base,
        fontWeight: 700,
        fontFamily: tokens.fonts.heading,
        flexShrink: 0,
        boxShadow: tokens.shadows.sm,
      }}
    >
      ⏱ {time}
    </div>
  ) : null;

  if (isPoster) {
    /* 海报式：整面主题色底 + 白色大字问题 */
    return (
      <BlockShell
        element={element}
        padding={56}
        style={{
          background: `linear-gradient(135deg, ${tokens.colors.primary} 0%, ${tokens.colors.accent} 100%)`,
          display: 'flex',
          flexDirection: 'column',
          gap: 22,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span
            style={{
              fontSize: tokens.fontSizes.lg,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.85)',
              fontFamily: tokens.fonts.heading,
              letterSpacing: 4,
            }}
          >
            💬 小组讨论
          </span>
          {timeBadge}
        </div>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center' }}>
          <FitText
            fontSize={tokens.fontSizes['3xl']}
            minFontSize={20}
            fontFamily={tokens.fonts.heading}
            fontWeight={700}
            color="#fff"
            lineHeight={1.4}
          >
            {question}
          </FitText>
        </div>
        {requirements.length > 0 && (
          <div style={{ flexShrink: 0, display: 'flex', flexWrap: 'wrap', gap: 12, maxHeight: '30%' }}>
            {requirements.map((r, i) => (
              <div
                key={i}
                style={{
                  flex: '1 1 40%',
                  minWidth: 0,
                  maxHeight: 64,
                  padding: '8px 16px',
                  borderRadius: tokens.borderRadius.md,
                  background: 'rgba(255,255,255,0.16)',
                  border: '1px solid rgba(255,255,255,0.35)',
                  boxSizing: 'border-box',
                }}
              >
                <FitText
                  fontSize={tokens.fontSizes.sm}
                  minFontSize={10}
                  fontFamily={tokens.fonts.body}
                  color="#fff"
                  lineHeight={1.35}
                >
                  {i + 1}. {r}
                </FitText>
              </div>
            ))}
          </div>
        )}
        {hint && (
          <div
            style={{
              flexShrink: 0,
              maxHeight: '16%',
              padding: '8px 18px',
              borderRadius: tokens.borderRadius.md,
              background: 'rgba(0,0,0,0.18)',
            }}
          >
            <FitText
              fontSize={tokens.fontSizes.sm}
              minFontSize={10}
              fontFamily={tokens.fonts.body}
              color="rgba(255,255,255,0.9)"
              lineHeight={1.35}
            >
              💡 提示：{hint}
            </FitText>
          </div>
        )}
      </BlockShell>
    );
  }

  /* 卡片式 */
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
          borderTop: `6px solid ${tokens.colors.accent}`,
          boxShadow: tokens.shadows.md,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span
            style={{
              padding: '6px 18px',
              borderRadius: tokens.borderRadius.full,
              background: tokens.colors.accent,
              color: '#fff',
              fontSize: tokens.fontSizes.base,
              fontWeight: 700,
              fontFamily: tokens.fonts.heading,
            }}
          >
            💬 小组讨论
          </span>
          {timeBadge}
        </div>

        {/* 大问题 */}
        <div style={{ flex: 1.2, minHeight: 0, display: 'flex', alignItems: 'center' }}>
          <FitText
            fontSize={tokens.fontSizes['2xl']}
            minFontSize={16}
            fontFamily={tokens.fonts.heading}
            fontWeight={700}
            color={tokens.colors.primary}
            lineHeight={1.4}
          >
            {question}
          </FitText>
        </div>

        {/* 要求清单 */}
        {requirements.length > 0 && (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span
              style={{
                fontSize: tokens.fontSizes.sm,
                fontWeight: 700,
                color: tokens.colors.textMuted,
                fontFamily: tokens.fonts.heading,
                letterSpacing: 2,
                flexShrink: 0,
              }}
            >
              任务要求
            </span>
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {requirements.map((r, i) => (
                <div key={i} style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      border: `2px solid ${tokens.colors.accent}`,
                      color: tokens.colors.accent,
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
                  <div style={{ flex: 1, height: '100%', maxHeight: 44 }}>
                    <FitText
                      fontSize={tokens.fontSizes.sm}
                      minFontSize={10}
                      fontFamily={tokens.fonts.body}
                      color={tokens.colors.text}
                      lineHeight={1.35}
                    >
                      {r}
                    </FitText>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 提示 */}
        {hint && (
          <div
            style={{
              flexShrink: 0,
              maxHeight: '18%',
              padding: '10px 18px',
              borderRadius: tokens.borderRadius.md,
              background: `${tokens.colors.warning}14`,
              border: `1px dashed ${tokens.colors.warning}`,
            }}
          >
            <FitText
              fontSize={tokens.fontSizes.sm}
              minFontSize={10}
              fontFamily={tokens.fonts.body}
              color={tokens.colors.text}
              lineHeight={1.35}
            >
              💡 提示：{hint}
            </FitText>
          </div>
        )}
      </div>
    </BlockShell>
  );
}
