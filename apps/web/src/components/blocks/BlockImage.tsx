import { useTheme } from '../../lib/theme-context';
import type { Asset } from '@courseware/shared';

export interface ImageSlotValue {
  assetId?: string;
  url?: string;
  alt?: string;
  description?: string;
}

interface BlockImageProps {
  value: unknown;               // slots.image 原始值
  assets: Asset[];
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  objectFit?: 'cover' | 'contain' | 'fill';
}

/**
 * Block 图片槽位统一渲染：
 * 1. assetId 命中 assets → 渲染真实图片
 * 2. 否则渲染主题化占位（图标 + 描述文字），永不出破碎图
 */
export function BlockImage({ value, assets, width = '100%', height = '100%', borderRadius = 12, objectFit = 'cover' }: BlockImageProps) {
  const { tokens } = useTheme();
  const v = (value || {}) as ImageSlotValue;
  const asset = v.assetId ? assets.find((a) => a.id === v.assetId) : undefined;
  const src = asset?.url || v.url;

  if (src) {
    return (
      <img
        src={src}
        alt={v.alt || v.description || ''}
        style={{
          width,
          height,
          objectFit,
          borderRadius,
          display: 'block',
        }}
        onError={(e) => {
          // 加载失败时替换为占位
          const el = e.currentTarget;
          el.style.display = 'none';
          el.parentElement?.querySelector('[data-fallback]')?.removeAttribute('hidden');
        }}
      />
    );
  }

  return (
    <div
      data-fallback
      style={{
        width,
        height,
        borderRadius,
        background: `repeating-linear-gradient(45deg, ${tokens.colors.surface}, ${tokens.colors.surface} 12px, ${tokens.colors.border}22 12px, ${tokens.colors.border}22 24px)`,
        border: `2px dashed ${tokens.colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: 20,
        boxSizing: 'border-box',
      }}
    >
      <span style={{ fontSize: 40 }}>🖼️</span>
      {v.description && (
        <span
          style={{
            fontSize: tokens.fontSizes.sm,
            color: tokens.colors.textMuted,
            fontFamily: tokens.fonts.body,
            textAlign: 'center',
            lineHeight: 1.4,
          }}
        >
          {v.description}
        </span>
      )}
    </div>
  );
}
