import type { PairSlot } from '@courseware/shared';
import { BlockShell, useBlockData, str, useTheme, type BlockComponentProps } from './BlockShell';
import { FitText } from './FitText';

/** 防御式取 pairs 槽位 */
function getPairs(slots: Record<string, unknown>, key: string, max: number): PairSlot[] {
  const v = slots[key];
  if (!Array.isArray(v)) return [];
  return v
    .filter(
      (p): p is PairSlot =>
        !!p && typeof p === 'object' && typeof (p as PairSlot).left === 'string' && typeof (p as PairSlot).right === 'string',
    )
    .slice(0, max);
}

/** 对比双栏：左 vs 右，variant: columns | vs（VS 徽章居中） */
export function CompareBlock({ element }: BlockComponentProps) {
  const { tokens } = useTheme();
  const { variant, slots } = useBlockData(element);
  const title = str(slots, 'title');
  const leftTitle = str(slots, 'leftTitle', 'A');
  const rightTitle = str(slots, 'rightTitle', 'B');
  const pairs = getPairs(slots, 'pairs', 5);
  const isVs = variant === 'vs';

  const columnHeader = (text: string, color: string) => (
    <div
      style={{
        padding: '10px 20px',
        borderRadius: tokens.borderRadius.lg,
        background: color,
        color: '#fff',
        flexShrink: 0,
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ width: '100%', height: '100%' }}>
        <FitText
          fontSize={tokens.fontSizes.xl}
          minFontSize={14}
          fontFamily={tokens.fonts.heading}
          fontWeight={700}
          color="#fff"
          textAlign="center"
          multiline={false}
          lineHeight={1.2}
        >
          {text}
        </FitText>
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
        <div style={{ flexShrink: 0, height: 48, marginBottom: 20 }}>
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
      )}

      {/* 栏目标题 */}
      <div style={{ display: 'flex', gap: isVs ? 72 : 24, marginBottom: 16, flexShrink: 0, position: 'relative' }}>
        <div style={{ flex: 1, minWidth: 0 }}>{columnHeader(leftTitle, tokens.colors.primary)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>{columnHeader(rightTitle, tokens.colors.accent)}</div>
        {isVs && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: tokens.colors.warning,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: tokens.fontSizes.lg,
              fontWeight: 800,
              fontFamily: tokens.fonts.heading,
              boxShadow: tokens.shadows.md,
              border: '3px solid #fff',
            }}
          >
            VS
          </div>
        )}
      </div>

      {/* 对比行 */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12, position: 'relative' }}>
        {isVs && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 0,
              bottom: 0,
              width: 2,
              background: tokens.colors.border,
              transform: 'translateX(-50%)',
            }}
          />
        )}
        {pairs.map((pair, i) => (
          <div key={i} style={{ flex: 1, minHeight: 0, display: 'flex', gap: isVs ? 72 : 24 }}>
            {[
              { text: pair.left, border: tokens.colors.primary },
              { text: pair.right, border: tokens.colors.accent },
            ].map((cell, j) => (
              <div
                key={j}
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: '10px 20px',
                  borderRadius: tokens.borderRadius.lg,
                  background: tokens.colors.surface,
                  border: `1px solid ${tokens.colors.border}`,
                  borderLeft: `4px solid ${cell.border}`,
                  overflow: 'hidden',
                }}
              >
                <FitText
                  fontSize={tokens.fontSizes.base}
                  minFontSize={11}
                  fontFamily={tokens.fonts.body}
                  color={tokens.colors.text}
                  lineHeight={1.4}
                >
                  {cell.text}
                </FitText>
              </div>
            ))}
          </div>
        ))}
      </div>
    </BlockShell>
  );
}
