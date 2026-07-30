import type { CSSProperties, ReactNode } from 'react';
import { useTheme } from '../../lib/theme-context';
import type { Element, Asset } from '@courseware/shared';

export interface BlockComponentProps {
  element: Element;
  assets: Asset[];
  /** player: 含交互；editor: 纯渲染 */
  mode?: 'player' | 'editor';
  onInteraction?: (elementId: string, event: string) => void;
}

/** 从元素 content 中取 block 数据（带宽容默认值） */
export function useBlockData(element: Element) {
  const content = (element.content || {}) as {
    blockType?: string;
    variant?: string;
    slots?: Record<string, unknown>;
    emphasis?: string[];
  };
  return {
    blockType: content.blockType || 'title-content',
    variant: content.variant || 'default',
    slots: content.slots || {},
    emphasis: content.emphasis || [],
  };
}

/** 取字符串槽位 */
export function str(slots: Record<string, unknown>, key: string, fallback = ''): string {
  const v = slots[key];
  return typeof v === 'string' ? v : fallback;
}

/** 取字符串数组槽位 */
export function strList(slots: Record<string, unknown>, key: string): string[] {
  const v = slots[key];
  return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
}

interface BlockShellProps {
  element: Element;
  children: ReactNode;
  /** 额外容器样式 */
  style?: CSSProperties;
  /** 内边距（默认 32） */
  padding?: number;
  className?: string;
}

/**
 * Block 外壳：统一处理绝对定位几何 + 基础排版容器。
 * 所有 Block 组件必须用它包裹，保证与元素系统兼容。
 */
export function BlockShell({ element, children, style, padding = 0, className }: BlockShellProps) {
  const g = element.geometry;
  return (
    <div
      id={element.id}
      className={className}
      style={{
        position: 'absolute',
        left: g.x,
        top: g.y,
        width: g.width,
        height: g.height,
        zIndex: g.zIndex,
        padding,
        boxSizing: 'border-box',
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export { useTheme };
