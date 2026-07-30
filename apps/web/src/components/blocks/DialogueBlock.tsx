import type { DialogueTurnSlot } from '@courseware/shared';
import { BlockShell, useBlockData, str, useTheme, type BlockComponentProps } from './BlockShell';
import { FitText } from './FitText';

function getTurns(slots: Record<string, unknown>, max: number): DialogueTurnSlot[] {
  const v = slots.turns;
  if (!Array.isArray(v)) return [];
  return v
    .filter(
      (t): t is DialogueTurnSlot =>
        !!t && typeof t === 'object' && typeof (t as DialogueTurnSlot).speaker === 'string',
    )
    .slice(0, max);
}

/** 对话气泡页：左右交替气泡，variant: bubbles | script */
export function DialogueBlock({ element }: BlockComponentProps) {
  const { tokens } = useTheme();
  const { variant, slots } = useBlockData(element);
  const title = str(slots, 'title');
  const turns = getTurns(slots, 8);
  const isScript = variant === 'script';

  const avatar = (speaker: string, color: string) => (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        background: color,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: tokens.fontSizes.lg,
        fontWeight: 700,
        fontFamily: tokens.fonts.heading,
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {(speaker || '?').trim().charAt(0).toUpperCase()}
    </div>
  );

  return (
    <BlockShell
      element={element}
      padding={44}
      style={{ background: tokens.colors.background, display: 'flex', flexDirection: 'column' }}
    >
      {title && (
        <div
          style={{
            flexShrink: 0,
            alignSelf: 'center',
            maxWidth: '80%',
            height: 44,
            marginBottom: 20,
            padding: '0 28px',
            borderRadius: tokens.borderRadius.full,
            background: tokens.colors.surface,
            border: `1px solid ${tokens.colors.border}`,
            display: 'flex',
            alignItems: 'center',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ width: '100%', height: 28 }}>
            <FitText
              fontSize={tokens.fontSizes.lg}
              minFontSize={13}
              fontFamily={tokens.fonts.heading}
              fontWeight={700}
              color={tokens.colors.primary}
              textAlign="center"
              multiline={false}
              lineHeight={1.2}
            >
              {title}
            </FitText>
          </div>
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {turns.map((turn, i) => {
          const leftSide = isScript ? true : i % 2 === 0;
          const bubbleColor = leftSide ? tokens.colors.primary : tokens.colors.accent;
          return (
            <div
              key={i}
              style={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: leftSide ? 'row' : 'row-reverse',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              {avatar(turn.speaker, bubbleColor)}
              <div
                style={{
                  maxWidth: isScript ? '90%' : '72%',
                  flex: isScript ? 1 : undefined,
                  minWidth: 0,
                  minHeight: 0,
                  maxHeight: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: leftSide ? 'flex-start' : 'flex-end',
                }}
              >
                <span
                  style={{
                    fontSize: tokens.fontSizes.xs,
                    color: tokens.colors.textMuted,
                    fontFamily: tokens.fonts.body,
                    marginBottom: 3,
                    flexShrink: 0,
                  }}
                >
                  {turn.speaker}
                </span>
                <div
                  style={{
                    minHeight: 0,
                    maxHeight: '100%',
                    padding: '10px 18px',
                    borderRadius: tokens.borderRadius.lg,
                    borderTopLeftRadius: leftSide && !isScript ? 2 : tokens.borderRadius.lg,
                    borderTopRightRadius: !leftSide && !isScript ? 2 : tokens.borderRadius.lg,
                    background: isScript
                      ? tokens.colors.surface
                      : leftSide
                        ? tokens.colors.surface
                        : `${tokens.colors.accent}14`,
                    border: `1px solid ${isScript ? tokens.colors.border : leftSide ? tokens.colors.border : tokens.colors.accent}`,
                    borderLeft: isScript ? `4px solid ${bubbleColor}` : undefined,
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                  }}
                >
                  <FitText
                    fontSize={tokens.fontSizes.base}
                    minFontSize={11}
                    fontFamily={tokens.fonts.body}
                    color={tokens.colors.text}
                    lineHeight={1.4}
                  >
                    {turn.text}
                    {turn.translation ? `\n` : ''}
                    {turn.translation && (
                      <span style={{ fontSize: '0.85em', color: tokens.colors.textMuted }}>
                        {turn.translation}
                      </span>
                    )}
                  </FitText>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </BlockShell>
  );
}
