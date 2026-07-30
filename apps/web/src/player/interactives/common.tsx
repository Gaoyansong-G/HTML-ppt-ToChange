import type { CSSProperties, ReactNode } from 'react';
import type { Element } from '@courseware/shared';
import { useTheme, type ThemeTokens } from '../../lib/theme-context';

/** 互动组件渲染模式：player 可交互；editor 只展示初始状态、禁用交互 */
export type InteractiveMode = 'player' | 'editor';

export interface InteractiveComponentProps {
  element: Element;
  mode: InteractiveMode;
  onInteraction?: (elementId: string, event: string) => void;
}

/* ------------------------------------------------------------------ */
/* 防御式 config 解析 helpers                                          */
/* ------------------------------------------------------------------ */

export function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/** 读取元素的互动 config（永远返回一个 Record，不抛错） */
export function getInteractiveConfig(element: Element): Record<string, unknown> {
  const content = asRecord(element.content);
  return asRecord(content.config);
}

/* ------------------------------------------------------------------ */
/* 颜色/乱序 helpers                                                   */
/* ------------------------------------------------------------------ */

/** 给 #rrggbb 颜色追加 alpha（非 6 位 hex 原样返回） */
export function withAlpha(color: string, alpha: number): string {
  if (/^#[0-9a-fA-F]{6}$/.test(color)) {
    const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
      .toString(16)
      .padStart(2, '0');
    return `${color}${a}`;
  }
  return color;
}

/** 字符串散列，用作确定性乱序种子（避免每次渲染顺序乱跳） */
export function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 确定性 Fisher-Yates 乱序（同种子同结果） */
export function seededShuffle<T>(arr: readonly T[], seed: number): T[] {
  const a = [...arr];
  let s = seed || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

/** 组件配色回退调色板（全部来自主题令牌） */
export function themePalette(tokens: ThemeTokens): string[] {
  return [
    tokens.colors.primary,
    tokens.colors.accent,
    tokens.colors.secondary,
    tokens.colors.success,
    tokens.colors.danger,
  ];
}

/* ------------------------------------------------------------------ */
/* 通用 UI                                                             */
/* ------------------------------------------------------------------ */

/** 组件内共用 CSS keyframes（抖动/放大/闪烁/弹出） */
export function InteractiveStyles() {
  return (
    <style>{`
      @keyframes cw-shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
      }
      @keyframes cw-bump {
        0% { transform: scale(1); }
        40% { transform: scale(1.4); }
        100% { transform: scale(1); }
      }
      @keyframes cw-flash {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }
      @keyframes cw-pop {
        0% { transform: scale(0.6); opacity: 0; }
        100% { transform: scale(1); opacity: 1; }
      }
    `}</style>
  );
}

interface InteractiveShellProps {
  element: Element;
  mode: InteractiveMode;
  children: ReactNode;
  padding?: number;
}

/**
 * 互动组件外壳：按 geometry 绝对定位 + 主题化卡片容器。
 * editor 模式下整体 pointer-events: none，只展示不交互。
 */
export function InteractiveShell({ element, mode, children, padding = 16 }: InteractiveShellProps) {
  const { tokens } = useTheme();
  const { geometry, style } = element;
  return (
    <div
      id={element.id}
      className="absolute overflow-hidden"
      style={{
        left: geometry.x,
        top: geometry.y,
        width: geometry.width,
        height: geometry.height,
        zIndex: geometry.zIndex,
        opacity: style.opacity ?? 1,
        background: style.backgroundColor ?? tokens.colors.surface,
        borderRadius: style.borderRadius ?? tokens.borderRadius.xl,
        border: `1px solid ${tokens.colors.border}`,
        boxShadow: tokens.shadows.md,
        pointerEvents: mode === 'editor' ? 'none' : 'auto',
        userSelect: mode === 'editor' ? 'none' : 'auto',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          padding,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          fontFamily: tokens.fonts.body,
          color: style.color ?? tokens.colors.text,
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** config 缺失/为空时的空态提示（不报错） */
export function EmptyHint({ message }: { message: string }) {
  const { tokens } = useTheme();
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `2px dashed ${tokens.colors.border}`,
        borderRadius: tokens.borderRadius.lg,
        color: tokens.colors.textMuted,
        fontSize: tokens.fontSizes.sm,
        padding: 16,
        textAlign: 'center',
      }}
    >
      {message}
    </div>
  );
}

/** 组件标题行 */
export function InteractiveTitle({ title }: { title: string }) {
  const { tokens } = useTheme();
  return (
    <div
      style={{
        fontFamily: tokens.fonts.heading,
        fontSize: tokens.fontSizes.lg,
        fontWeight: 600,
        color: tokens.colors.text,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {title}
    </div>
  );
}

/** 主按钮样式（开始/提交等） */
export function primaryButtonStyle(tokens: ThemeTokens, disabled: boolean): CSSProperties {
  return {
    padding: '8px 20px',
    borderRadius: tokens.borderRadius.md,
    border: 'none',
    background: tokens.colors.primary,
    color: '#ffffff',
    fontSize: tokens.fontSizes.sm,
    fontFamily: tokens.fonts.body,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    boxShadow: tokens.shadows.sm,
    flexShrink: 0,
  };
}

/** 次按钮样式（重试/重置等） */
export function secondaryButtonStyle(tokens: ThemeTokens, disabled: boolean): CSSProperties {
  return {
    padding: '8px 20px',
    borderRadius: tokens.borderRadius.md,
    border: `1px solid ${tokens.colors.border}`,
    background: tokens.colors.background,
    color: tokens.colors.text,
    fontSize: tokens.fontSizes.sm,
    fontFamily: tokens.fonts.body,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    flexShrink: 0,
  };
}
