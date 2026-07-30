import type { PairSlot } from '@courseware/shared';
import { BlockShell, useBlockData, str, useTheme, type BlockComponentProps } from './BlockShell';
import { FitText } from './FitText';

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

/** 知识结构图：中心主题 + 分支卡，variant: radial（放射） | tree（树状） */
export function MindmapBlock({ element }: BlockComponentProps) {
  const { tokens } = useTheme();
  const { variant, slots } = useBlockData(element);
  const center = str(slots, 'center', '中心主题');
  const branches = getPairs(slots, 'branches', 6);
  const isTree = variant === 'tree';

  const centerNode = (size: number) => (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${tokens.colors.primary}, ${tokens.colors.accent})`,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: tokens.shadows.md,
        flexShrink: 0,
        padding: 12,
        boxSizing: 'border-box',
        zIndex: 1,
      }}
    >
      <div style={{ width: '100%', height: '100%' }}>
        <FitText
          fontSize={tokens.fontSizes.xl}
          minFontSize={12}
          fontFamily={tokens.fonts.heading}
          fontWeight={700}
          color="#fff"
          textAlign="center"
          lineHeight={1.25}
        >
          {center}
        </FitText>
      </div>
    </div>
  );

  const branchCard = (b: PairSlot, i: number) => (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        padding: '10px 16px',
        borderRadius: tokens.borderRadius.lg,
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        borderLeft: `4px solid ${i % 2 === 0 ? tokens.colors.primary : tokens.colors.accent}`,
        boxShadow: tokens.shadows.sm,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        overflow: 'hidden',
      }}
    >
      <div style={{ width: '34%', flexShrink: 0, height: '100%', maxHeight: 48 }}>
        <FitText
          fontSize={tokens.fontSizes.base}
          minFontSize={11}
          fontFamily={tokens.fonts.heading}
          fontWeight={700}
          color={tokens.colors.primary}
          lineHeight={1.25}
        >
          {b.left}
        </FitText>
      </div>
      <div style={{ flex: 1, minWidth: 0, height: '100%' }}>
        <FitText
          fontSize={tokens.fontSizes.sm}
          minFontSize={10}
          fontFamily={tokens.fonts.body}
          color={tokens.colors.textMuted}
          lineHeight={1.35}
        >
          {b.right}
        </FitText>
      </div>
    </div>
  );

  if (isTree) {
    /* 树状：顶部中心 + 下挂分支行 */
    return (
      <BlockShell
        element={element}
        padding={44}
        style={{
          background: tokens.colors.background,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {centerNode(130)}
        {/* 树干与分叉线 */}
        <div style={{ width: 3, height: 26, background: tokens.colors.border, flexShrink: 0 }} />
        <div
          style={{
            width: `${Math.min(90, branches.length * 16)}%`,
            height: 3,
            background: tokens.colors.border,
            borderRadius: 2,
            flexShrink: 0,
            display: branches.length > 1 ? 'block' : 'none',
          }}
        />
        <div
          style={{
            flex: 1,
            minHeight: 0,
            width: '100%',
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(3, Math.max(1, branches.length))}, minmax(0, 1fr))`,
            gridAutoRows: '1fr',
            gap: 16,
            marginTop: 18,
          }}
        >
          {branches.map((b, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, minHeight: 0 }}>
              <div style={{ width: 3, height: 16, background: tokens.colors.border, flexShrink: 0 }} />
              <div style={{ flex: 1, minHeight: 0, width: '100%', display: 'flex' }}>{branchCard(b, i)}</div>
            </div>
          ))}
        </div>
      </BlockShell>
    );
  }

  /* 放射式：中心圆居左，分支卡两列绕右 */
  return (
    <BlockShell
      element={element}
      padding={44}
      style={{ background: tokens.colors.background, display: 'flex', alignItems: 'center', gap: 32 }}
    >
      <div
        style={{
          width: '30%',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {centerNode(170)}
      </div>
      {/* 放射连接线装饰 */}
      <div
        aria-hidden
        style={{
          width: 32,
          alignSelf: 'stretch',
          background: `repeating-linear-gradient(to bottom, transparent, transparent calc(100% / ${Math.max(1, branches.length)} - 1px), ${tokens.colors.border} calc(100% / ${Math.max(1, branches.length)} - 1px), ${tokens.colors.border} calc(100% / ${Math.max(1, branches.length)}))`,
          flexShrink: 0,
        }}
      />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          height: '100%',
          display: 'grid',
          gridTemplateColumns: branches.length > 3 ? 'minmax(0, 1fr) minmax(0, 1fr)' : '1fr',
          gridAutoRows: '1fr',
          gap: 14,
        }}
      >
        {branches.map((b, i) => (
          <div key={i} style={{ display: 'flex', minHeight: 0 }}>{branchCard(b, i)}</div>
        ))}
      </div>
    </BlockShell>
  );
}
