import { BlockShell, useBlockData, str, strList, useTheme, type BlockComponentProps } from './BlockShell';
import { FitText } from './FitText';

/** 阅读理解页：原文摘录 + 思考问题，variant: split（左60右40） | stack（上下） */
export function ReadingBlock({ element }: BlockComponentProps) {
  const { tokens } = useTheme();
  const { variant, slots } = useBlockData(element);
  const title = str(slots, 'title');
  const excerpt = str(slots, 'excerpt');
  const questions = strList(slots, 'questions').slice(0, 4);
  const isStack = variant === 'stack';

  const excerptPane = (
    <div
      style={{
        [isStack ? 'height' : 'width']: isStack ? '52%' : '60%',
        ...(isStack ? { width: '100%' } : { height: '100%' }),
        minWidth: 0,
        minHeight: 0,
        padding: '22px 26px',
        borderRadius: tokens.borderRadius.lg,
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        borderLeft: `5px solid ${tokens.colors.primary}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          fontSize: tokens.fontSizes.sm,
          fontWeight: 700,
          color: tokens.colors.primary,
          fontFamily: tokens.fonts.heading,
          letterSpacing: 2,
          flexShrink: 0,
        }}
      >
        原文摘录
      </span>
      <div style={{ flex: 1, minHeight: 0 }}>
        <FitText
          fontSize={tokens.fontSizes.lg}
          minFontSize={12}
          fontFamily={tokens.fonts.body}
          color={tokens.colors.text}
          lineHeight={1.7}
        >
          {excerpt}
        </FitText>
      </div>
    </div>
  );

  const questionsPane = (
    <div
      style={{
        [isStack ? 'height' : 'width']: isStack ? '48%' : '40%',
        ...(isStack ? { width: '100%' } : { height: '100%' }),
        minWidth: 0,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        boxSizing: 'border-box',
      }}
    >
      <span
        style={{
          fontSize: tokens.fontSizes.sm,
          fontWeight: 700,
          color: tokens.colors.accent,
          fontFamily: tokens.fonts.heading,
          letterSpacing: 2,
          flexShrink: 0,
        }}
      >
        思考问题
      </span>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {questions.map((q, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: '10px 16px',
              borderRadius: tokens.borderRadius.md,
              background: tokens.colors.background,
              border: `1px solid ${tokens.colors.border}`,
              boxShadow: tokens.shadows.sm,
            }}
          >
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: tokens.borderRadius.md,
                background: tokens.colors.accent,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: tokens.fontSizes.sm,
                fontWeight: 700,
                fontFamily: tokens.fonts.heading,
                flexShrink: 0,
              }}
            >
              Q{i + 1}
            </span>
            <div style={{ flex: 1, minHeight: 0, maxHeight: '100%' }}>
              <FitText
                fontSize={tokens.fontSizes.base}
                minFontSize={11}
                fontFamily={tokens.fonts.body}
                color={tokens.colors.text}
                lineHeight={1.45}
              >
                {q}
              </FitText>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <BlockShell
      element={element}
      padding={44}
      style={{ background: tokens.colors.background, display: 'flex', flexDirection: 'column' }}
    >
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, flexShrink: 0, height: 50 }}>
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
      )}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: isStack ? 'column' : 'row',
          gap: 20,
        }}
      >
        {excerptPane}
        {questionsPane}
      </div>
    </BlockShell>
  );
}
