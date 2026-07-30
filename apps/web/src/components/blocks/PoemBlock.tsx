import type { PoemSlot } from '@courseware/shared';
import { BlockShell, useBlockData, useTheme, type BlockComponentProps } from './BlockShell';
import { FitText } from './FitText';

/** 防御式取 poem 槽位 */
function getPoem(slots: Record<string, unknown>): PoemSlot {
  const v = slots.poem;
  const p = (v && typeof v === 'object' ? v : {}) as Partial<PoemSlot>;
  return {
    title: typeof p.title === 'string' ? p.title : '',
    author: typeof p.author === 'string' ? p.author : '',
    dynasty: typeof p.dynasty === 'string' ? p.dynasty : '',
    lines: Array.isArray(p.lines)
      ? p.lines
          .filter((l): l is string => typeof l === 'string')
          .map((l) => l.replace(/\//g, '').trim())
          .filter(Boolean)
      : [],
    translation: typeof p.translation === 'string' ? p.translation : '',
    appreciation: typeof p.appreciation === 'string' ? p.appreciation : '',
  };
}

/** 古诗词赏析页，variant: classic（米纸·右侧译文卡） | ink（水墨·下方译文卡） */
export function PoemBlock({ element }: BlockComponentProps) {
  const { tokens } = useTheme();
  const { variant, slots } = useBlockData(element);
  const poem = getPoem(slots);
  const isInk = variant === 'ink';
  const handFont = (tokens.fonts as { hand?: string }).hand || tokens.fonts.heading;
  // 译文/赏析都没有时不渲染空卡（此前会出现右上角空框）
  const hasSideContent = !!(poem.translation || poem.appreciation);

  /* 米纸 / 水墨 背景（全部基于 token 调色） */
  const paperBg = isInk
    ? `linear-gradient(160deg, ${tokens.colors.surface} 0%, ${tokens.colors.border}55 100%)`
    : `repeating-linear-gradient(0deg, ${tokens.colors.surface}, ${tokens.colors.surface} 26px, ${tokens.colors.border}33 26px, ${tokens.colors.border}33 27px)`;

  /* 译文赏析卡 */
  const sideCard = (
    <div
      style={{
        padding: '20px 24px',
        borderRadius: tokens.borderRadius.lg,
        background: tokens.colors.background,
        border: `1px solid ${tokens.colors.border}`,
        borderTop: `4px solid ${tokens.colors.primary}`,
        boxShadow: tokens.shadows.sm,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        minHeight: 0,
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      {poem.translation && (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span
            style={{
              fontSize: tokens.fontSizes.sm,
              fontWeight: 700,
              color: tokens.colors.primary,
              fontFamily: tokens.fonts.heading,
              flexShrink: 0,
            }}
          >
            译文
          </span>
          <div style={{ flex: 1, minHeight: 0 }}>
            <FitText
              fontSize={tokens.fontSizes.base}
              minFontSize={11}
              fontFamily={tokens.fonts.body}
              color={tokens.colors.text}
              lineHeight={1.55}
            >
              {poem.translation}
            </FitText>
          </div>
        </div>
      )}
      {poem.appreciation && (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span
            style={{
              fontSize: tokens.fontSizes.sm,
              fontWeight: 700,
              color: tokens.colors.accent,
              fontFamily: tokens.fonts.heading,
              flexShrink: 0,
            }}
          >
            赏析
          </span>
          <div style={{ flex: 1, minHeight: 0 }}>
            <FitText
              fontSize={tokens.fontSizes.base}
              minFontSize={11}
              fontFamily={tokens.fonts.body}
              color={tokens.colors.textMuted}
              lineHeight={1.55}
            >
              {poem.appreciation}
            </FitText>
          </div>
        </div>
      )}
    </div>
  );

  /* 诗句区 */
  const poemPane = (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        position: 'relative',
      }}
    >
      {/* 装饰性大字水印 */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          right: 8,
          top: 8,
          fontSize: 120,
          fontFamily: handFont,
          color: tokens.colors.primary,
          opacity: 0.06,
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        诗
      </span>
      {poem.title && (
        <div style={{ width: '100%', maxHeight: 52, flexShrink: 0, marginBottom: 6 }}>
          <FitText
            fontSize={tokens.fontSizes['2xl']}
            minFontSize={18}
            fontFamily={handFont}
            fontWeight={700}
            color={tokens.colors.primary}
            textAlign="center"
            multiline={false}
            lineHeight={1.2}
          >
            {poem.title}
          </FitText>
        </div>
      )}
      <div
        style={{
          width: '100%',
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: poem.lines.length <= 4 ? 'center' : 'flex-start',
          gap: poem.lines.length <= 4 ? 20 : 4,
        }}
      >
        {poem.lines.slice(0, 8).map((line, i) => (
          <div key={i} style={poem.lines.length <= 4 ? { flexShrink: 0 } : { flex: 1, minHeight: 0 }}>
            <FitText
              fontSize={tokens.fontSizes.xl}
              minFontSize={14}
              fontFamily={handFont}
              color={tokens.colors.text}
              textAlign="center"
              lineHeight={1.3}
            >
              {line}
            </FitText>
          </div>
        ))}
      </div>
    </div>
  );

  /* 底部作者朝代条 */
  const authorBar = (
    <div
      style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        padding: '10px 24px',
        borderTop: `1px solid ${tokens.colors.border}`,
        height: 44,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ width: 40, height: 1, background: tokens.colors.border, flexShrink: 0 }} />
      <div style={{ height: '100%', maxWidth: '80%' }}>
        <FitText
          fontSize={tokens.fontSizes.base}
          minFontSize={11}
          fontFamily={handFont}
          color={tokens.colors.textMuted}
          textAlign="center"
          multiline={false}
          lineHeight={1.3}
        >
          {poem.dynasty ? `〔${poem.dynasty}〕` : ''}
          {poem.author}
        </FitText>
      </div>
      <div style={{ width: 40, height: 1, background: tokens.colors.border, flexShrink: 0 }} />
    </div>
  );

  return (
    <BlockShell
      element={element}
      padding={isInk ? 44 : 40}
      style={{ background: paperBg, display: 'flex', flexDirection: 'column' }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: isInk ? 'column' : 'row',
          gap: 24,
          marginBottom: 12,
        }}
      >
        {isInk ? (
          <>
            <div style={{ flex: 3, minHeight: 0, display: 'flex' }}>{poemPane}</div>
            {hasSideContent && <div style={{ flex: 2, minHeight: 0, display: 'flex' }}>{sideCard}</div>}
          </>
        ) : (
          <>
            <div style={{ width: hasSideContent ? '58%' : '100%', minWidth: 0, display: 'flex' }}>{poemPane}</div>
            {hasSideContent && (
              <div style={{ width: '42%', minWidth: 0, display: 'flex', flexDirection: 'column' }}>{sideCard}</div>
            )}
          </>
        )}
      </div>
      {authorBar}
    </BlockShell>
  );
}
