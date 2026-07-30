import type { CSSProperties } from 'react';
import type { TableSlot } from '@courseware/shared';
import { BlockShell, useBlockData, str, useTheme, type BlockComponentProps } from './BlockShell';
import { FitText } from './FitText';

/** 防御式取 table 槽位 */
export function getTable(slots: Record<string, unknown>): TableSlot | null {
  const v = slots.table;
  if (!v || typeof v !== 'object') return null;
  const t = v as Partial<TableSlot>;
  if (!Array.isArray(t.headers) || !Array.isArray(t.rows)) return null;
  const headers = t.headers.filter((h): h is string => typeof h === 'string');
  const rows = t.rows
    .filter((r): r is string[] => Array.isArray(r))
    .map((r) => r.map((c) => (typeof c === 'string' ? c : String(c ?? ''))));
  if (!headers.length) return null;
  return { headers, rows: rows.slice(0, 12) };
}

/** 表格页：主题色表头 + 数据行，variant: striped | bordered */
export function TableBlock({ element }: BlockComponentProps) {
  const { tokens } = useTheme();
  const { variant, slots } = useBlockData(element);
  const title = str(slots, 'title');
  const note = str(slots, 'note');
  const table = getTable(slots);
  const isBordered = variant === 'bordered';

  const cellBase: CSSProperties = {
    padding: '8px 14px',
    overflow: 'hidden',
    border: isBordered ? `1px solid ${tokens.colors.border}` : undefined,
    borderBottom: isBordered ? undefined : `1px solid ${tokens.colors.border}`,
    minWidth: 0,
  };

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
              minHeight: 44,
            }}
          >
            {table.headers.map((h, i) => (
              <div key={i} style={{ ...cellBase, border: isBordered ? '1px solid rgba(255,255,255,0.25)' : undefined, height: '100%' }}>
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
          {/* 数据行 */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {table.rows.map((row, ri) => (
              <div
                key={ri}
                style={{
                  flex: 1,
                  minHeight: 0,
                  display: 'grid',
                  gridTemplateColumns: `repeat(${table!.headers.length}, minmax(0, 1fr))`,
                  background:
                    !isBordered && ri % 2 === 1 ? tokens.colors.surface : tokens.colors.background,
                }}
              >
                {table!.headers.map((_, ci) => (
                  <div key={ci} style={{ ...cellBase, height: '100%' }}>
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

      {note && (
        <div style={{ flexShrink: 0, marginTop: 14, height: 30 }}>
          <FitText
            fontSize={tokens.fontSizes.sm}
            minFontSize={11}
            fontFamily={tokens.fonts.body}
            color={tokens.colors.textMuted}
            multiline={false}
            lineHeight={1.4}
          >
            注：{note}
          </FitText>
        </div>
      )}
    </BlockShell>
  );
}
