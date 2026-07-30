import { BlockShell, useBlockData, str, useTheme, type BlockComponentProps } from './BlockShell';
import { FitText } from './FitText';
import { BlockImage } from './BlockImage';

/** 图文页：文字 55% / 图片 45%，variant: text-left | text-right | text-top */
export function TextImageBlock({ element, assets }: BlockComponentProps) {
  const { tokens } = useTheme();
  const { variant, slots } = useBlockData(element);
  const title = str(slots, 'title');
  const text = str(slots, 'text');
  const caption = str(slots, 'caption');
  const horizontal = variant !== 'text-top';
  const textFirst = variant !== 'text-right';

  const textPane = (
    <div
      key="text"
      style={{
        [horizontal ? 'width' : 'height']: '55%',
        ...(horizontal ? { height: '100%' } : { width: '100%' }),
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        minHeight: 0,
        gap: 16,
      }}
    >
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0, height: 48 }}>
          <div
            style={{
              width: 7,
              height: 32,
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
          padding: '18px 22px',
          borderRadius: tokens.borderRadius.lg,
          background: tokens.colors.surface,
          border: `1px solid ${tokens.colors.border}`,
        }}
      >
        <FitText
          fontSize={tokens.fontSizes.lg}
          minFontSize={13}
          fontFamily={tokens.fonts.body}
          color={tokens.colors.text}
          lineHeight={1.6}
        >
          {text}
        </FitText>
      </div>
    </div>
  );

  const imagePane = (
    <div
      key="image"
      style={{
        [horizontal ? 'width' : 'height']: '45%',
        ...(horizontal ? { height: '100%' } : { width: '100%' }),
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        minHeight: 0,
        gap: 10,
      }}
    >
      <div style={{ flex: 1, minHeight: 0 }}>
        <BlockImage value={slots.image} assets={assets} borderRadius={tokens.borderRadius.lg} />
      </div>
      {caption && (
        <div style={{ flexShrink: 0, height: 28 }}>
          <FitText
            fontSize={tokens.fontSizes.sm}
            minFontSize={11}
            fontFamily={tokens.fonts.body}
            color={tokens.colors.textMuted}
            textAlign="center"
            multiline={false}
            lineHeight={1.4}
          >
            {caption}
          </FitText>
        </div>
      )}
    </div>
  );

  return (
    <BlockShell
      element={element}
      padding={40}
      style={{
        background: tokens.colors.background,
        display: 'flex',
        flexDirection: horizontal ? 'row' : 'column',
        gap: 28,
      }}
    >
      {textFirst ? [textPane, imagePane] : [imagePane, textPane]}
    </BlockShell>
  );
}
