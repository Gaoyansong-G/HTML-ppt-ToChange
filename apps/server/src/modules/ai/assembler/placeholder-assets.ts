import type { Asset, DesignSystem } from '@courseware/shared';

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function pickGradient(seed: number, colors: string[]): string {
  const i = seed % colors.length;
  const j = (seed + 1) % colors.length;
  return `linear-gradient(135deg, ${colors[i]}, ${colors[j]})`;
}

function detectSubject(alt: string): string {
  const text = alt.toLowerCase();
  if (/诗|词|诗人|古诗|李白|杜甫|苏轼|散文|文学|阅读/.test(text)) return 'poetry';
  if (/数学|几何|代数|公式|定理|函数|方程|计算/.test(text)) return 'math';
  if (/英语|英文|单词|对话|句型|语法|字母|abc/.test(text)) return 'english';
  if (/科学|物理|化学|生物|生态|能量|物质|细胞|基因|进化|实验|试管|分子|原子/.test(text)) return 'science';
  if (/历史|古代|朝代|文物|史料|革命|战争/.test(text)) return 'history';
  if (/地理|地图|地球|区域|气候|山脉|河流/.test(text)) return 'geography';
  if (/艺术|美术|音乐|体育|绘画|乐器/.test(text)) return 'arts';
  return 'default';
}

export interface PlaceholderContext {
  title?: string;
  bodyExcerpt?: string;
}

const SUBJECT_KEYWORDS: Record<string, string[]> = {
  poetry: ['山水', '明月', '清风', '杨柳', '梅花', '菊花', '江南', '边塞', '田园', '送别', '思乡', '壮志', '离愁', '春光', '秋色', '江河', '花鸟', 'moon', 'mountain', 'river', 'flower'],
  math: ['函数', '方程', '几何', '代数', '三角形', '圆', '坐标', '概率', '统计', '微积分', '导数', '积分', '向量', '数列', '不等式', 'function', 'equation', 'geometry', 'algebra', 'triangle', 'coordinate'],
  english: ['单词', '语法', '对话', '阅读', '写作', '听力', '口语', '时态', '句型', '字母', '词汇', '发音', 'vocabulary', 'grammar', 'dialogue', 'reading', 'writing', 'listening'],
  science: ['实验', '细胞', '分子', '原子', '生态', '能量', '力', '光合', '进化', '物质', '溶液', '电路', '基因', '地球', '自养', '异养', '有机物', '食物链', '分解者', '消费者', 'organism', 'ecosystem', 'energy', 'cell', 'molecule', 'experiment'],
  history: ['朝代', '文物', '革命', '战争', '改革', '帝王', '民族', '条约', '起义', '制度', '文化', '科技', 'dynasty', 'revolution', 'war', 'reform', 'civilization'],
  geography: ['地球', '地图', '山脉', '河流', '气候', '海洋', '城市', '人口', '资源', '区域', '经纬度', '地形', 'earth', 'map', 'mountain', 'river', 'climate', 'ocean'],
  arts: ['音乐', '美术', '舞蹈', '绘画', '乐器', '色彩', '节奏', '线条', '旋律', '构图', '表演', 'music', 'art', 'dance', 'painting', 'instrument', 'color'],
  default: ['学习', '知识', '探索', '课堂', '成长', '发现', '思考', '实践', '创新', 'study', 'knowledge', 'explore', 'discover'],
};

function extractKeywords(subject: string, alt: string, context?: PlaceholderContext): string[] {
  const source = `${alt} ${context?.title || ''} ${context?.bodyExcerpt || ''}`.toLowerCase();
  const candidates = SUBJECT_KEYWORDS[subject] || SUBJECT_KEYWORDS.default;
  const matched = candidates.filter((kw) => source.includes(kw.toLowerCase()));
  if (matched.length > 0) {
    return matched.slice(0, 3);
  }
  // Fallback: pick a few generic positive keywords if subject-specific ones not found.
  const seed = hashString(source);
  const fallback = SUBJECT_KEYWORDS.default;
  const start = seed % fallback.length;
  return fallback.slice(start, start + 2);
}

function renderKeywordBadges(keywords: string[], seed: number): string {
  if (keywords.length === 0) return '';
  const badgeHeight = 34;
  const paddingX = 16;
  const gap = 12;
  const charWidth = 18;
  const widths = keywords.map((k) => Math.max(60, k.length * charWidth + paddingX * 2));
  const totalWidth = widths.reduce((a, b) => a + b, 0) + gap * (keywords.length - 1);
  let startX = (640 - totalWidth) / 2;
  const y = 420;
  return keywords
    .map((kw, i) => {
      const w = widths[i];
      const x = startX;
      startX += w + gap;
      const opacity = 0.12 + ((seed + i) % 5) * 0.04;
      return `<g transform="translate(${x}, ${y})">
        <rect width="${w}" height="${badgeHeight}" rx="17" fill="rgba(255,255,255,${opacity})" stroke="rgba(255,255,255,0.25)" stroke-width="1"/>
        <text x="${w / 2}" y="${badgeHeight / 2 + 6}" text-anchor="middle" fill="rgba(255,255,255,0.85)" font-size="16" font-weight="500" font-family="system-ui, sans-serif">${escapeXml(kw)}</text>
      </g>`;
    })
    .join('');
}

function defaultSvg(colors: string[], title: string, keywords: string[], seed: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${colors[seed % colors.length]}" />
        <stop offset="100%" stop-color="${colors[(seed + 2) % colors.length]}" />
      </linearGradient>
    </defs>
    <rect width="640" height="480" fill="url(#g)" />
    <circle cx="320" cy="200" r="80" fill="rgba(255,255,255,0.15)" />
    <circle cx="520" cy="80" r="48" fill="rgba(255,255,255,0.10)" />
    <circle cx="120" cy="400" r="64" fill="rgba(255,255,255,0.10)" />
    ${renderKeywordBadges(keywords, seed)}
  </svg>`;
}

function poetrySvg(colors: string[], title: string, keywords: string[], seed: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
    <defs>
      <linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${colors[seed % colors.length]}" />
        <stop offset="100%" stop-color="${colors[(seed + 2) % colors.length]}" />
      </linearGradient>
    </defs>
    <rect width="640" height="480" fill="url(#pg)" />
    <circle cx="500" cy="100" r="48" fill="rgba(255,255,255,0.2)" />
    <polygon points="120,360 240,240 360,320 480,200 560,280 560,480 80,480" fill="rgba(255,255,255,0.12)" />
    <polygon points="60,400 180,300 300,380 420,260 640,420 640,480 0,480" fill="rgba(255,255,255,0.08)" />
    <path d="M80 160 Q120 120 160 160 T240 160" stroke="rgba(255,255,255,0.25)" stroke-width="3" fill="none" />
    ${renderKeywordBadges(keywords, seed)}
  </svg>`;
}

function mathSvg(colors: string[], title: string, keywords: string[], seed: number): string {
  const displaySymbol = keywords[0] || '∑ ƒ(x)';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
    <defs>
      <linearGradient id="mg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${colors[0]}" />
        <stop offset="100%" stop-color="${colors[2 % colors.length]}" />
      </linearGradient>
    </defs>
    <rect width="640" height="480" fill="url(#mg)" />
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1" />
    </pattern>
    <rect width="640" height="480" fill="url(#grid)" />
    <g fill="rgba(255,255,255,0.9)" text-anchor="middle" font-family="'JetBrains Mono', monospace">
      <text x="320" y="180" font-size="56" font-weight="700" opacity="0.25">${escapeXml(displaySymbol)}</text>
      <circle cx="320" cy="300" r="80" stroke="rgba(255,255,255,0.3)" stroke-width="4" fill="none" />
    </g>
    ${renderKeywordBadges(keywords.slice(1), seed)}
  </svg>`;
}

function englishSvg(colors: string[], title: string, keywords: string[], seed: number): string {
  const displayWord = keywords[0] || 'Hello';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
    <defs>
      <linearGradient id="eg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${colors[0]}" />
        <stop offset="100%" stop-color="${colors[2 % colors.length]}" />
      </linearGradient>
    </defs>
    <rect width="640" height="480" fill="url(#eg)" />
    <g fill="rgba(255,255,255,0.9)" text-anchor="middle" font-family="system-ui, sans-serif">
      <rect x="120" y="160" width="180" height="120" rx="16" fill="rgba(255,255,255,0.2)" />
      <text x="210" y="230" font-size="32" font-weight="600">ABC</text>
      <rect x="340" y="160" width="180" height="120" rx="16" fill="rgba(255,255,255,0.15)" />
      <text x="430" y="230" font-size="28" font-weight="600">${escapeXml(displayWord)}</text>
      <path d="M300 220 L340 220" stroke="rgba(255,255,255,0.5)" stroke-width="3" stroke-linecap="round" />
    </g>
    ${renderKeywordBadges(keywords.slice(1), seed)}
  </svg>`;
}

function scienceSvg(colors: string[], title: string, keywords: string[], seed: number): string {
  const displayLabel = keywords[0] || '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
    <defs>
      <linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${colors[0]}" />
        <stop offset="100%" stop-color="${colors[2 % colors.length]}" />
      </linearGradient>
    </defs>
    <rect width="640" height="480" fill="url(#sg)" />
    <g fill="rgba(255,255,255,0.9)" text-anchor="middle" font-family="system-ui, sans-serif">
      <path d="M320 140 L340 260 L300 260 Z" fill="rgba(255,255,255,0.2)" />
      <rect x="300" y="260" width="40" height="80" rx="6" fill="rgba(255,255,255,0.3)" />
      <circle cx="280" cy="180" r="10" fill="rgba(255,255,255,0.25)" />
      <circle cx="360" cy="200" r="14" fill="rgba(255,255,255,0.2)" />
      <circle cx="260" cy="240" r="8" fill="rgba(255,255,255,0.2)" />
      ${displayLabel ? `<text x="320" y="380" font-size="24" font-weight="600" opacity="0.6">${escapeXml(displayLabel)}</text>` : ''}
    </g>
    ${renderKeywordBadges(keywords.slice(1), seed)}
  </svg>`;
}

function historySvg(colors: string[], title: string, keywords: string[], seed: number): string {
  const displayLabel = keywords[0] || '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
    <defs>
      <linearGradient id="hg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${colors[0]}" />
        <stop offset="100%" stop-color="${colors[2 % colors.length]}" />
      </linearGradient>
    </defs>
    <rect width="640" height="480" fill="url(#hg)" />
    <g fill="rgba(255,255,255,0.9)" text-anchor="middle" font-family="system-ui, sans-serif">
      <rect x="220" y="160" width="200" height="140" rx="8" fill="rgba(255,255,255,0.15)" />
      <rect x="200" y="140" width="240" height="20" rx="4" fill="rgba(255,255,255,0.25)" />
      <text x="320" y="235" font-size="40" font-weight="600" opacity="0.9">史</text>
      ${displayLabel ? `<text x="320" y="360" font-size="22" font-weight="500" opacity="0.7">${escapeXml(displayLabel)}</text>` : ''}
    </g>
    ${renderKeywordBadges(keywords.slice(1), seed)}
  </svg>`;
}

function geographySvg(colors: string[], title: string, keywords: string[], seed: number): string {
  const displayLabel = keywords[0] || '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
    <defs>
      <linearGradient id="gg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${colors[0]}" />
        <stop offset="100%" stop-color="${colors[2 % colors.length]}" />
      </linearGradient>
    </defs>
    <rect width="640" height="480" fill="url(#gg)" />
    <g fill="rgba(255,255,255,0.9)" text-anchor="middle" font-family="system-ui, sans-serif">
      <circle cx="320" cy="240" r="120" fill="rgba(255,255,255,0.15)" />
      <path d="M260 220 Q320 180 380 220 T420 280" stroke="rgba(255,255,255,0.4)" stroke-width="4" fill="none" />
      <circle cx="260" cy="210" r="8" fill="rgba(255,255,255,0.5)" />
      <circle cx="380" cy="270" r="8" fill="rgba(255,255,255,0.4)" />
      ${displayLabel ? `<text x="320" y="390" font-size="24" font-weight="600" opacity="0.6">${escapeXml(displayLabel)}</text>` : ''}
    </g>
    ${renderKeywordBadges(keywords.slice(1), seed)}
  </svg>`;
}

function artsSvg(colors: string[], title: string, keywords: string[], seed: number): string {
  const displayLabel = keywords[0] || '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
    <defs>
      <linearGradient id="ag" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${colors[0]}" />
        <stop offset="100%" stop-color="${colors[2 % colors.length]}" />
      </linearGradient>
    </defs>
    <rect width="640" height="480" fill="url(#ag)" />
    <g fill="rgba(255,255,255,0.9)" text-anchor="middle" font-family="system-ui, sans-serif">
      <rect x="240" y="140" width="160" height="160" rx="80" fill="rgba(255,255,255,0.15)" />
      <rect x="300" y="200" width="40" height="80" rx="4" fill="rgba(255,255,255,0.3)" />
      <circle cx="280" cy="180" r="10" fill="rgba(255,255,255,0.3)" />
      <circle cx="360" cy="260" r="12" fill="rgba(255,255,255,0.25)" />
      ${displayLabel ? `<text x="320" y="360" font-size="24" font-weight="600" opacity="0.7">${escapeXml(displayLabel)}</text>` : ''}
    </g>
    ${renderKeywordBadges(keywords.slice(1), seed)}
  </svg>`;
}

function buildSvg(subject: string, alt: string, colors: string[], keywords: string[], seed: number): string {
  const title = alt.slice(0, 18);

  switch (subject) {
    case 'poetry':
      return poetrySvg(colors, title, keywords, seed);
    case 'math':
      return mathSvg(colors, title, keywords, seed);
    case 'english':
      return englishSvg(colors, title, keywords, seed);
    case 'science':
      return scienceSvg(colors, title, keywords, seed);
    case 'history':
      return historySvg(colors, title, keywords, seed);
    case 'geography':
      return geographySvg(colors, title, keywords, seed);
    case 'arts':
      return artsSvg(colors, title, keywords, seed);
    default:
      return defaultSvg(colors, title, keywords, seed);
  }
}

export function createPlaceholderAsset(
  alt: string,
  designSystem: DesignSystem,
  context?: PlaceholderContext,
): Asset {
  const c = designSystem.tokens.colors;
  const seed = hashString(alt);
  const palette = [c.primary, c.accent, c.secondary, c.success, c.warning];
  const subject = detectSubject(alt);
  const id = `asset-placeholder-${subject}-${seed.toString(36)}`;
  const keywords = extractKeywords(subject, alt, context);

  const svg = buildSvg(subject, alt, palette, keywords, seed);
  const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg.replace(/\n\s*/g, ''))}`;

  return {
    id,
    type: 'image',
    filename: `${id}.svg`,
    mimeType: 'image/svg+xml',
    url: dataUrl,
    width: 640,
    height: 480,
    description: alt,
  };
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
