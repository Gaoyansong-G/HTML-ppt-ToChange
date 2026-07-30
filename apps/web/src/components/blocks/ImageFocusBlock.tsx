import { BlockShell, useBlockData, str, useTheme, type BlockComponentProps } from './BlockShell';
import { FitText } from './FitText';
import { BlockImage } from './BlockImage';

/** 大图赏析页：大图主体 + 标题/说明，variant: default | overlay */
export function ImageFocusBlock({ element, assets }: BlockComponentProps) {
  const { tokens } = useTheme();
  const { variant, slots } = useBlockData(element);
  const title = str(slots, 'title');
  const note = str(slots, 'note');
  const isOverlay = variant === 'overlay';

  if (isOverlay) {
    /* 文字叠加：图片铺满，底部渐变信息条 */
    return (
      <BlockShell element={element} style={{ background: tokens.colors.background }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <BlockImage value={slots.image} assets={assets} borderRadius={0} />
        </div>
        {(title || note) && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              maxHeight: '46%',
              padding: '40px 48px 28px',
              background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0) 100%)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {title && (
              <div style={{ maxHeight: note ? '52%' : '100%' }}>
                <FitText
                  fontSize={tokens.fontSizes['2xl']}
                  minFontSize={18}
                  fontFamily={tokens.fonts.heading}
                  fontWeight={700}
                  color="#fff"
                  lineHeight={1.25}
                >
                  {title}
                </FitText>
              </div>
            )}
            {note && (
              <div style={{ maxHeight: '44%' }}>
                <FitText
                  fontSize={tokens.fontSizes.base}
                  minFontSize={12}
                  fontFamily={tokens.fonts.body}
                  color="rgba(255,255,255,0.9)"
                  lineHeight={1.5}
                >
                  {note}
                </FitText>
              </div>
            )}
          </div>
        )}
      </BlockShell>
    );
  }

  /* 标准：顶部标题 + 大图 + 底部说明 */
  return (
    <BlockShell
      element={element}
      padding={40}
      style={{ background: tokens.colors.background, display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, height: 52 }}>
          <div style={{ maxWidth: '90%', height: '100%' }}>
            <FitText
              fontSize={tokens.fontSizes['2xl']}
              minFontSize={20}
              fontFamily={tokens.fonts.heading}
              fontWeight={700}
              color={tokens.colors.text}
              textAlign="center"
              multiline={false}
              lineHeight={1.2}
            >
              {title}
            </FitText>
          </div>
        </div>
      )}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          borderRadius: tokens.borderRadius.lg,
          overflow: 'hidden',
          boxShadow: tokens.shadows.md,
          border: `1px solid ${tokens.colors.border}`,
        }}
      >
        <BlockImage value={slots.image} assets={assets} borderRadius={0} />
      </div>
      {note && (
        <div
          style={{
            flexShrink: 0,
            maxHeight: '18%',
            padding: '10px 20px',
            borderRadius: tokens.borderRadius.md,
            background: tokens.colors.surface,
            border: `1px solid ${tokens.colors.border}`,
          }}
        >
          <FitText
            fontSize={tokens.fontSizes.base}
            minFontSize={12}
            fontFamily={tokens.fonts.body}
            color={tokens.colors.textMuted}
            textAlign="center"
            lineHeight={1.45}
          >
            {note}
          </FitText>
        </div>
      )}
    </BlockShell>
  );
}
