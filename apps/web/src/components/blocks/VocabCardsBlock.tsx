import type { VocabWordSlot } from '@courseware/shared';
import { BlockShell, useBlockData, str, useTheme, type BlockComponentProps } from './BlockShell';
import { FitText } from './FitText';

function getWords(slots: Record<string, unknown>, max: number): VocabWordSlot[] {
  const v = slots.words;
  if (!Array.isArray(v)) return [];
  return v
    .filter(
      (w): w is VocabWordSlot =>
        !!w && typeof w === 'object' && typeof (w as VocabWordSlot).word === 'string',
    )
    .slice(0, max);
}

/** 词汇卡片墙，variant: grid2（2 列） | grid3（3 列） */
export function VocabCardsBlock({ element }: BlockComponentProps) {
  const { tokens } = useTheme();
  const { variant, slots } = useBlockData(element);
  const title = str(slots, 'title');
  const words = getWords(slots, 6);
  const cols = variant === 'grid3' ? 3 : 2;

  return (
    <BlockShell
      element={element}
      padding={44}
      style={{ background: tokens.colors.background, display: 'flex', flexDirection: 'column' }}
    >
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22, flexShrink: 0, height: 50 }}>
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
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridAutoRows: '1fr',
          gap: 18,
        }}
      >
        {words.map((w, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              padding: '14px 20px',
              borderRadius: tokens.borderRadius.lg,
              background: tokens.colors.surface,
              border: `1px solid ${tokens.colors.border}`,
              borderTop: `4px solid ${i % 2 === 0 ? tokens.colors.primary : tokens.colors.accent}`,
              boxShadow: tokens.shadows.sm,
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexShrink: 0, height: 32 }}>
              <div style={{ flex: 1, height: '100%' }}>
                <FitText
                  fontSize={tokens.fontSizes.xl}
                  minFontSize={14}
                  fontFamily={tokens.fonts.heading}
                  fontWeight={700}
                  color={tokens.colors.primary}
                  multiline={false}
                  lineHeight={1.15}
                >
                  {w.word}
                </FitText>
              </div>
            </div>
            {w.phonetic && (
              <div style={{ height: 22, flexShrink: 0 }}>
                <FitText
                  fontSize={tokens.fontSizes.sm}
                  minFontSize={10}
                  fontFamily={tokens.fonts.mono || 'monospace'}
                  color={tokens.colors.textMuted}
                  multiline={false}
                  lineHeight={1.2}
                >
                  {w.phonetic}
                </FitText>
              </div>
            )}
            <div style={{ flex: 1, minHeight: 0 }}>
              <FitText
                fontSize={tokens.fontSizes.base}
                minFontSize={11}
                fontFamily={tokens.fonts.body}
                color={tokens.colors.text}
                lineHeight={1.4}
              >
                {w.meaning}
              </FitText>
            </div>
            {w.example && (
              <div
                style={{
                  flexShrink: 0,
                  maxHeight: '34%',
                  paddingTop: 6,
                  borderTop: `1px dashed ${tokens.colors.border}`,
                }}
              >
                <FitText
                  fontSize={tokens.fontSizes.xs}
                  minFontSize={10}
                  fontFamily={tokens.fonts.body}
                  color={tokens.colors.textMuted}
                  lineHeight={1.35}
                >
                  {w.example}
                </FitText>
              </div>
            )}
          </div>
        ))}
      </div>
    </BlockShell>
  );
}
