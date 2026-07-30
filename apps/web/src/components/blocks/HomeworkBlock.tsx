import { BlockShell, useBlockData, str, strList, useTheme, type BlockComponentProps } from './BlockShell';
import { FitText } from './FitText';

/** 作业布置页：条目清单 + 拓展挑战区，variant: list | ticket（任务卡·虚线撕边） */
export function HomeworkBlock({ element }: BlockComponentProps) {
  const { tokens } = useTheme();
  const { variant, slots } = useBlockData(element);
  const title = str(slots, 'title', '课后作业');
  const items = strList(slots, 'items').slice(0, 5);
  const extension = str(slots, 'extension');
  const isTicket = variant === 'ticket';

  const titleRow = (
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
      {isTicket && (
        <span
          style={{
            padding: '5px 16px',
            borderRadius: tokens.borderRadius.full,
            background: tokens.colors.accent,
            color: '#fff',
            fontSize: tokens.fontSizes.sm,
            fontWeight: 700,
            fontFamily: tokens.fonts.heading,
            flexShrink: 0,
          }}
        >
          任务卡
        </span>
      )}
    </div>
  );

  const itemRow = (item: string, i: number) => (
    <div
      key={i}
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: isTicket ? '10px 20px' : '8px 16px',
        borderRadius: isTicket ? tokens.borderRadius.md : 0,
        background: isTicket ? tokens.colors.surface : 'transparent',
        border: isTicket ? `1px solid ${tokens.colors.border}` : undefined,
        borderBottom: isTicket ? undefined : `1px dashed ${tokens.colors.border}`,
        boxShadow: isTicket ? tokens.shadows.sm : undefined,
      }}
    >
      <span
        style={{
          width: 32,
          height: 32,
          borderRadius: isTicket ? tokens.borderRadius.md : '50%',
          background: tokens.colors.primary,
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
        {i + 1}
      </span>
      <div style={{ flex: 1, minHeight: 0, maxHeight: '100%' }}>
        <FitText
          fontSize={tokens.fontSizes.base}
          minFontSize={11}
          fontFamily={tokens.fonts.body}
          color={tokens.colors.text}
          lineHeight={1.4}
        >
          {item}
        </FitText>
      </div>
      {isTicket && (
        /* 完成勾选框 */
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: tokens.borderRadius.sm,
            border: `2px solid ${tokens.colors.border}`,
            flexShrink: 0,
          }}
        />
      )}
    </div>
  );

  const extensionPane = extension ? (
    <div
      style={{
        flexShrink: 0,
        maxHeight: '26%',
        marginTop: 16,
        padding: '12px 20px',
        borderRadius: tokens.borderRadius.lg,
        background: `${tokens.colors.accent}10`,
        border: `2px dashed ${tokens.colors.accent}`,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxSizing: 'border-box',
      }}
    >
      <span
        style={{
          padding: '4px 12px',
          borderRadius: tokens.borderRadius.full,
          background: tokens.colors.accent,
          color: '#fff',
          fontSize: tokens.fontSizes.sm,
          fontWeight: 700,
          fontFamily: tokens.fonts.heading,
          flexShrink: 0,
        }}
      >
        🚀 拓展挑战
      </span>
      <div style={{ flex: 1, height: '100%', maxHeight: 72 }}>
        <FitText
          fontSize={tokens.fontSizes.base}
          minFontSize={11}
          fontFamily={tokens.fonts.body}
          color={tokens.colors.text}
          lineHeight={1.4}
        >
          {extension}
        </FitText>
      </div>
    </div>
  ) : null;

  if (isTicket) {
    /* 任务卡：虚线撕边票根效果 */
    return (
      <BlockShell
        element={element}
        padding={44}
        style={{
          background: tokens.colors.background,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: '88%',
            height: '100%',
            padding: '24px 32px',
            borderRadius: tokens.borderRadius.xl,
            background: tokens.colors.background,
            border: `3px dashed ${tokens.colors.primary}`,
            boxShadow: tokens.shadows.md,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxSizing: 'border-box',
            position: 'relative',
          }}
        >
          {/* 票根顶部穿孔线装饰 */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: 14,
              left: 32,
              right: 32,
              borderTop: `2px dashed ${tokens.colors.border}`,
            }}
          />
          {titleRow}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {items.map((item, i) => itemRow(item, i))}
          </div>
          {extensionPane}
        </div>
      </BlockShell>
    );
  }

  /* 清单式 */
  return (
    <BlockShell
      element={element}
      padding={44}
      style={{ background: tokens.colors.background, display: 'flex', flexDirection: 'column' }}
    >
      {titleRow}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item, i) => itemRow(item, i))}
      </div>
      {extensionPane}
    </BlockShell>
  );
}
