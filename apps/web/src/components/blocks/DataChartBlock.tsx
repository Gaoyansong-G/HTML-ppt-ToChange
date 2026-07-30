import { BlockShell, useBlockData, str, useTheme, type BlockComponentProps } from './BlockShell';
import { FitText } from './FitText';
import { getTable } from './TableBlock';

/** 数据图表页：数据表 + 结论卡，variant: default */
export function DataChartBlock({ element }: BlockComponentProps) {
  const { tokens } = useTheme();
  const { slots } = useBlockData(element);
  const title = str(slots, 'title');
  const conclusion = str(slots, 'conclusion');
  const table = getTable(slots);

  return (
    <BlockShell
      element={element}
      padding={44}
      style={{ background: tokens.colors.background, display: 'flex', flexDirection: 'column', gap: 18 }}
    >
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0, height: 50 }}>
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
          <span
            style={{
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
            📊 数据分析
          </span>
        </div>
      )}

      {table && (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: tokens.borderRadius.lg,
            overflow: 'hidden',
            border: `1px solid ${tokens.colors.border}`,
            boxShadow: tokens.shadows.sm,
          }}
        >
          {/* 表头 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${table.headers.length}, minmax(0, 1fr))`,
              background: tokens.colors.primary,
              flexShrink: 0,
              minHeight: 42,
            }}
          >
            {table.headers.map((h, i) => (
              <div key={i} style={{ padding: '8px 14px', overflow: 'hidden', height: '100%' }}>
                <FitText
                  fontSize={tokens.fontSizes.base}
                  minFontSize={11}
                  fontFamily={tokens.fonts.heading}
                  fontWeight={700}
                  color="#fff"
                  textAlign="center"
                  lineHeight={1.3}
                >
                  {h}
                </FitText>
              </div>
            ))}
          </div>
          {/* 数据行（斑马纹） */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {table.rows.map((row, ri) => (
              <div
                key={ri}
                style={{
                  flex: 1,
                  minHeight: 0,
                  display: 'grid',
                  gridTemplateColumns: `repeat(${table!.headers.length}, minmax(0, 1fr))`,
                  background: ri % 2 === 1 ? tokens.colors.surface : tokens.colors.background,
                }}
              >
                {table!.headers.map((_, ci) => (
                  <div
                    key={ci}
                    style={{
                      padding: '8px 14px',
                      overflow: 'hidden',
                      height: '100%',
                      borderBottom: `1px solid ${tokens.colors.border}`,
                    }}
                  >
                    <FitText
                      fontSize={tokens.fontSizes.sm}
                      minFontSize={10}
                      fontFamily={tokens.fonts.body}
                      color={tokens.colors.text}
                      textAlign="center"
                      lineHeight={1.35}
                    >
                      {row[ci] ?? ''}
                    </FitText>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 结论卡 */}
      {conclusion && (
        <div
          style={{
            flexShrink: 0,
            maxHeight: '26%',
            padding: '14px 22px',
            borderRadius: tokens.borderRadius.lg,
            background: `${tokens.colors.success}12`,
            border: `2px solid ${tokens.colors.success}`,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            boxSizing: 'border-box',
          }}
        >
          <span
            style={{
              padding: '5px 14px',
              borderRadius: tokens.borderRadius.full,
              background: tokens.colors.success,
              color: '#fff',
              fontSize: tokens.fontSizes.sm,
              fontWeight: 700,
              fontFamily: tokens.fonts.heading,
              flexShrink: 0,
            }}
          >
            结论
          </span>
          <div style={{ flex: 1, height: '100%', maxHeight: 88 }}>
            <FitText
              fontSize={tokens.fontSizes.base}
              minFontSize={11}
              fontFamily={tokens.fonts.body}
              color={tokens.colors.text}
              lineHeight={1.45}
            >
              {conclusion}
            </FitText>
          </div>
        </div>
      )}
    </BlockShell>
  );
}
