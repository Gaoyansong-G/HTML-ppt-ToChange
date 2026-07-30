import type { TimelineEventSlot } from '@courseware/shared';
import { BlockShell, useBlockData, str, useTheme, type BlockComponentProps } from './BlockShell';
import { FitText } from './FitText';

function getEvents(slots: Record<string, unknown>, max: number): TimelineEventSlot[] {
  const v = slots.events;
  if (!Array.isArray(v)) return [];
  return v
    .filter(
      (e): e is TimelineEventSlot =>
        !!e && typeof e === 'object' && typeof (e as TimelineEventSlot).time === 'string',
    )
    .slice(0, max);
}

/** 历史时间轴，variant: horizontal（横轴上下交替） | vertical（纵轴左右交替） */
export function TimelineBlock({ element }: BlockComponentProps) {
  const { tokens } = useTheme();
  const { variant, slots } = useBlockData(element);
  const title = str(slots, 'title');
  const events = getEvents(slots, 6);
  const isVertical = variant === 'vertical';

  const eventCard = (e: TimelineEventSlot, _i: number) => (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        padding: '10px 14px',
        borderRadius: tokens.borderRadius.lg,
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        borderTop: `3px solid ${tokens.colors.accent}`,
        boxShadow: tokens.shadows.sm,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        overflow: 'hidden',
      }}
    >
      <div style={{ height: 26, flexShrink: 0 }}>
        <FitText
          fontSize={tokens.fontSizes.base}
          minFontSize={11}
          fontFamily={tokens.fonts.heading}
          fontWeight={700}
          color={tokens.colors.primary}
          multiline={false}
          lineHeight={1.2}
        >
          {e.event}
        </FitText>
      </div>
      {e.detail && (
        <div style={{ flex: 1, minHeight: 0 }}>
          <FitText
            fontSize={tokens.fontSizes.xs}
            minFontSize={10}
            fontFamily={tokens.fonts.body}
            color={tokens.colors.textMuted}
            lineHeight={1.35}
          >
            {e.detail}
          </FitText>
        </div>
      )}
    </div>
  );

  const timeBadge = (time: string) => (
    <div
      style={{
        padding: '4px 12px',
        borderRadius: tokens.borderRadius.full,
        background: tokens.colors.primary,
        color: '#fff',
        fontSize: tokens.fontSizes.xs,
        fontWeight: 700,
        fontFamily: tokens.fonts.heading,
        flexShrink: 0,
        maxWidth: 120,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {time}
    </div>
  );

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

      {isVertical ? (
        /* 纵轴：中轴线 + 左右交替 */
        <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 0,
              bottom: 0,
              width: 3,
              borderRadius: 2,
              background: `linear-gradient(to bottom, ${tokens.colors.primary}, ${tokens.colors.accent})`,
              transform: 'translateX(-50%)',
            }}
          />
          {events.map((e, i) => {
            const leftSide = i % 2 === 0;
            return (
              <div key={i} style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'stretch', gap: 20 }}>
                <div style={{ flex: 1, minWidth: 0, display: 'flex' }}>
                  {leftSide ? eventCard(e, i) : null}
                </div>
                <div
                  style={{
                    width: 110,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: tokens.colors.accent,
                      border: `3px solid ${tokens.colors.background}`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  />
                  {timeBadge(e.time)}
                </div>
                <div style={{ flex: 1, minWidth: 0, display: 'flex' }}>
                  {!leftSide ? eventCard(e, i) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 横轴：中轴线 + 上下交替 */
        <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', gap: 16 }}>
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              right: 0,
              height: 3,
              borderRadius: 2,
              background: `linear-gradient(90deg, ${tokens.colors.primary}, ${tokens.colors.accent})`,
              transform: 'translateY(-50%)',
            }}
          />
          {events.map((e, i) => {
            const topSide = i % 2 === 0;
            return (
              <div key={i} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
                  {topSide ? eventCard(e, i) : null}
                </div>
                <div
                  style={{
                    height: 46,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: tokens.colors.accent,
                      border: `3px solid ${tokens.colors.background}`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  />
                  {timeBadge(e.time)}
                </div>
                <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
                  {!topSide ? eventCard(e, i) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </BlockShell>
  );
}
