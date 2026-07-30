import { DEFAULT_DESIGN_SYSTEM, DESIGN_THEMES, GRADE_TYPOGRAPHY } from './design-system';

/**
 * 主题字体配方：各学科的标题/正文字体组合。
 * 全部使用课堂教学机常见的系统字体，保证导出 HTML 离线可用。
 */
export const THEME_FONTS: Record<string, { heading: string; body: string; hand?: string }> = {
  default: {
    heading: '"Microsoft YaHei", "PingFang SC", sans-serif',
    body: '"Microsoft YaHei", "PingFang SC", sans-serif',
  },
  academic: {
    heading: '"Microsoft YaHei", "PingFang SC", sans-serif',
    body: '"Microsoft YaHei", "PingFang SC", sans-serif',
  },
  humanities: {
    heading: '"SimSun", "Songti SC", serif',
    body: '"Microsoft YaHei", "PingFang SC", sans-serif',
  },
  language: {
    heading: '"YouYuan", "Yuanti SC", "Microsoft YaHei", sans-serif',
    body: '"Microsoft YaHei", "PingFang SC", sans-serif',
  },
  tech: {
    heading: '"Microsoft YaHei", "PingFang SC", sans-serif',
    body: '"Microsoft YaHei", "PingFang SC", sans-serif',
  },
  chinese: {
    heading: '"KaiTi", "STKaiti", "Kaiti SC", serif',
    body: '"KaiTi", "STKaiti", "Microsoft YaHei", serif',
    hand: '"KaiTi", "STKaiti", serif',
  },
  math: {
    heading: '"Microsoft YaHei", "Arial", sans-serif',
    body: '"Microsoft YaHei", "Arial", sans-serif',
  },
  english: {
    heading: '"Comic Sans MS", "YouYuan", "Microsoft YaHei", sans-serif',
    body: '"Microsoft YaHei", "PingFang SC", sans-serif',
  },
  science: {
    heading: '"Microsoft YaHei", "PingFang SC", sans-serif',
    body: '"Microsoft YaHei", "PingFang SC", sans-serif',
  },
  history: {
    heading: '"SimSun", "Songti SC", serif',
    body: '"Microsoft YaHei", "PingFang SC", sans-serif',
  },
  geography: {
    heading: '"Microsoft YaHei", "PingFang SC", sans-serif',
    body: '"Microsoft YaHei", "PingFang SC", sans-serif',
  },
  picturebook: {
    heading: '"YouYuan", "Yuanti SC", "Comic Sans MS", sans-serif',
    body: '"YouYuan", "Yuanti SC", "Microsoft YaHei", sans-serif',
    hand: '"YouYuan", "Yuanti SC", sans-serif',
  },
  chalk: {
    heading: '"KaiTi", "STKaiti", serif',
    body: '"KaiTi", "STKaiti", "Microsoft YaHei", serif',
    hand: '"KaiTi", "STKaiti", serif',
  },
  minimal: {
    heading: '"Microsoft YaHei", "PingFang SC", sans-serif',
    body: '"Microsoft YaHei", "PingFang SC", sans-serif',
  },
  nature: {
    heading: '"Microsoft YaHei", "PingFang SC", sans-serif',
    body: '"Microsoft YaHei", "PingFang SC", sans-serif',
  },
  apple: {
    heading: '-apple-system, "SF Pro Display", "Helvetica Neue", "PingFang SC", "Microsoft YaHei", sans-serif',
    body: '-apple-system, "SF Pro Text", "Helvetica Neue", "PingFang SC", "Microsoft YaHei", sans-serif',
  },
};

/** 追加的风格主题（在 9 套学科主题之外，按风格维度补充） */
export const STYLE_THEMES: Record<string, typeof DEFAULT_DESIGN_SYSTEM> = {
  apple: {
    id: 'apple',
    name: 'Apple 极简',
    tokens: {
      colors: {
        primary: '#1d1d1f',       // Apple 标志性近黑标题色
        secondary: '#6e6e73',
        success: '#34c759',
        warning: '#ff9f0a',
        danger: '#ff3b30',
        background: '#f5f5f7',    // Apple 官网浅灰底
        surface: '#ffffff',
        text: '#1d1d1f',
        textMuted: '#86868b',
        border: '#d2d2d7',        // 发丝级边框
        accent: '#0071e3',        // Apple 蓝
      },
      fonts: DEFAULT_DESIGN_SYSTEM.tokens.fonts,
      // Apple 官网的大字号标题哲学：display 级拉满
      fontSizes: { xs: 12, sm: 14, base: 17, lg: 21, xl: 28, '2xl': 40, '3xl': 56, '4xl': 72 },
      spacing: { xs: 4, sm: 8, md: 16, lg: 28, xl: 40, '2xl': 64 },
      borderRadius: { sm: 8, md: 12, lg: 18, xl: 28, full: 9999 },
      shadows: {
        sm: '0 2px 8px 0 rgb(0 0 0 / 0.04)',
        md: '0 8px 24px 0 rgb(0 0 0 / 0.08)',
        lg: '0 24px 48px 0 rgb(0 0 0 / 0.12)',
      },
    },
  },
  picturebook: {
    id: 'picturebook',
    name: '绘本童趣',
    tokens: {
      colors: {
        primary: '#FF8A65',
        secondary: '#4FC3F7',
        success: '#81C784',
        warning: '#FFD54F',
        danger: '#E57373',
        background: '#FFFDE7',
        surface: '#FFF9C4',
        text: '#4E342E',
        textMuted: '#8D6E63',
        border: '#FFE0B2',
        accent: '#F06292',
      },
      fonts: DEFAULT_DESIGN_SYSTEM.tokens.fonts,
      fontSizes: DEFAULT_DESIGN_SYSTEM.tokens.fontSizes,
      spacing: DEFAULT_DESIGN_SYSTEM.tokens.spacing,
      borderRadius: { sm: 8, md: 16, lg: 24, xl: 32, full: 9999 },
      shadows: {
        sm: '0 2px 4px 0 rgb(255 138 101 / 0.12)',
        md: '0 8px 16px -4px rgb(255 138 101 / 0.2)',
        lg: '0 20px 25px -5px rgb(255 138 101 / 0.25)',
      },
    },
  },
  chalk: {
    id: 'chalk',
    name: '黑板粉笔',
    tokens: {
      colors: {
        primary: '#F5F5F5',
        secondary: '#FFD54F',
        success: '#A5D6A7',
        warning: '#FFCC80',
        danger: '#EF9A9A',
        background: '#2E4036',
        surface: '#3B5247',
        text: '#FAFAFA',
        textMuted: '#C8E6C9',
        border: '#4E6B5B',
        accent: '#FFD54F',
      },
      fonts: DEFAULT_DESIGN_SYSTEM.tokens.fonts,
      fontSizes: DEFAULT_DESIGN_SYSTEM.tokens.fontSizes,
      spacing: DEFAULT_DESIGN_SYSTEM.tokens.spacing,
      borderRadius: DEFAULT_DESIGN_SYSTEM.tokens.borderRadius,
      shadows: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.2)',
        md: '0 8px 16px -4px rgb(0 0 0 / 0.3)',
        lg: '0 20px 25px -5px rgb(0 0 0 / 0.4)',
      },
    },
  },
  minimal: {
    id: 'minimal',
    name: '极简留白',
    tokens: {
      colors: {
        primary: '#111827',
        secondary: '#6B7280',
        success: '#059669',
        warning: '#D97706',
        danger: '#DC2626',
        background: '#FFFFFF',
        surface: '#F9FAFB',
        text: '#111827',
        textMuted: '#6B7280',
        border: '#E5E7EB',
        accent: '#111827',
      },
      fonts: DEFAULT_DESIGN_SYSTEM.tokens.fonts,
      fontSizes: DEFAULT_DESIGN_SYSTEM.tokens.fontSizes,
      spacing: DEFAULT_DESIGN_SYSTEM.tokens.spacing,
      borderRadius: { sm: 2, md: 4, lg: 6, xl: 8, full: 9999 },
      shadows: DEFAULT_DESIGN_SYSTEM.tokens.shadows,
    },
  },
  nature: {
    id: 'nature',
    name: '自然青野',
    tokens: {
      colors: {
        primary: '#2E7D32',
        secondary: '#558B2F',
        success: '#43A047',
        warning: '#F9A825',
        danger: '#E53935',
        background: '#F1F8E9',
        surface: '#DCEDC8',
        text: '#1B5E20',
        textMuted: '#558B2F',
        border: '#C5E1A5',
        accent: '#00897B',
      },
      fonts: DEFAULT_DESIGN_SYSTEM.tokens.fonts,
      fontSizes: DEFAULT_DESIGN_SYSTEM.tokens.fontSizes,
      spacing: DEFAULT_DESIGN_SYSTEM.tokens.spacing,
      borderRadius: DEFAULT_DESIGN_SYSTEM.tokens.borderRadius,
      shadows: {
        sm: '0 1px 2px 0 rgb(46 125 50 / 0.08)',
        md: '0 8px 16px -4px rgb(46 125 50 / 0.15)',
        lg: '0 20px 25px -5px rgb(46 125 50 / 0.2)',
      },
    },
  },
};

export const ALL_THEMES: Record<string, typeof DEFAULT_DESIGN_SYSTEM> = {
  ...DESIGN_THEMES,
  ...STYLE_THEMES,
};

type ThemeTokens = typeof DEFAULT_DESIGN_SYSTEM.tokens;

/**
 * 解析最终主题：主题字体配方 + 学段字号缩放。
 * 这是渲染层唯一取主题入口，保证全局一致性。
 */
export function resolveTheme(
  themeId: string | undefined,
  gradeLevel: keyof typeof GRADE_TYPOGRAPHY = 'unknown',
): { id: string; name: string; tokens: ThemeTokens } {
  const base = (themeId && ALL_THEMES[themeId]) || DEFAULT_DESIGN_SYSTEM;
  const fonts = THEME_FONTS[base.id] || THEME_FONTS.default;
  const grade = GRADE_TYPOGRAPHY[gradeLevel] || GRADE_TYPOGRAPHY.unknown;

  const scaledSizes: Record<string, number> = {};
  for (const [k, v] of Object.entries(base.tokens.fontSizes)) {
    scaledSizes[k] = Math.round((v as number) * grade.scale);
  }
  // 正文底线：投影可读性
  if (scaledSizes.base < grade.minBody) scaledSizes.base = grade.minBody;
  if (scaledSizes.lg < grade.minBody + 2) scaledSizes.lg = grade.minBody + 2;

  return {
    id: base.id,
    name: base.name,
    tokens: {
      ...base.tokens,
      colors: { ...base.tokens.colors },
      fonts: {
        heading: fonts.heading,
        body: fonts.body,
        mono: '"JetBrains Mono", "Fira Code", monospace',
        ...(fonts.hand ? { hand: fonts.hand } : {}),
      },
      fontSizes: scaledSizes as ThemeTokens['fontSizes'],
    },
  };
}

/** 学科关键词 → 主题 ID（更细粒度匹配，覆盖原 layout-engine 的 chooseTheme 逻辑） */
export function chooseThemeId(subject: string, gradeLevel?: string): string {
  const s = (subject || '').toLowerCase();
  if (/语文|诗词|古诗|作文|汉字|chinese/.test(s)) return 'chinese';
  if (/数学|math|几何|代数|算术/.test(s)) return 'math';
  if (/英语|english|英文/.test(s)) return 'english';
  if (/物理|化学|生物|科学|实验|science|physics|chemistry|biology/.test(s)) return 'science';
  if (/历史|history|道德|政治|道法/.test(s)) return 'history';
  if (/地理|geography/.test(s)) return 'geography';
  if (/信息|编程|计算机|科技|tech|coding/.test(s)) return 'tech';
  if (gradeLevel === 'primary') return 'picturebook';
  return 'academic';
}
