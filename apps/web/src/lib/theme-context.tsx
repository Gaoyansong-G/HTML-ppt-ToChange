import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  resolveTheme,
  DEFAULT_DESIGN_SYSTEM,
  type GradeTypographyKey,
} from '@courseware/shared';

export type ThemeTokens = typeof DEFAULT_DESIGN_SYSTEM.tokens;

export interface ThemeContextValue {
  themeId: string;
  themeName: string;
  tokens: ThemeTokens;
  gradeLevel: GradeTypographyKey;
}

const defaultResolved = resolveTheme(undefined, 'unknown');

const ThemeContext = createContext<ThemeContextValue>({
  themeId: defaultResolved.id,
  themeName: defaultResolved.name,
  tokens: defaultResolved.tokens,
  gradeLevel: 'unknown',
});

interface ThemeProviderProps {
  /** 主题 ID（courseware.designSystem.id）。传 undefined 用默认主题 */
  themeId?: string;
  gradeLevel?: GradeTypographyKey;
  /** 课件级 tokens 覆盖（AI 全局样式修改等会改写 designSystem.tokens，必须生效） */
  tokensOverride?: unknown;
  children: ReactNode;
}

/** 深合并 tokens（colors/fonts/fontSizes/spacing/borderRadius/shadows 逐子项合并） */
function mergeTokens(base: ThemeTokens, override?: Partial<ThemeTokens>): ThemeTokens {
  if (!override) return base;
  const merged = { ...base } as Record<string, unknown>;
  for (const [key, value] of Object.entries(override)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && typeof merged[key] === 'object' && merged[key] !== null) {
      merged[key] = { ...(merged[key] as Record<string, unknown>), ...(value as Record<string, unknown>) };
    } else if (value !== undefined) {
      merged[key] = value;
    }
  }
  return merged as ThemeTokens;
}

/**
 * 全局主题上下文：播放器/编辑器/缩略图统一从这里取设计令牌。
 * 主题 ID + 学段 → resolveTheme 确定性解析（含字体配方与字号缩放）。
 */
export function ThemeProvider({ themeId, gradeLevel = 'unknown', tokensOverride, children }: ThemeProviderProps) {
  const value = useMemo<ThemeContextValue>(() => {
    const resolved = resolveTheme(themeId, gradeLevel);
    return {
      themeId: resolved.id,
      themeName: resolved.name,
      tokens: mergeTokens(resolved.tokens, tokensOverride as Partial<ThemeTokens> | undefined),
      gradeLevel,
    };
  }, [themeId, gradeLevel, tokensOverride]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
