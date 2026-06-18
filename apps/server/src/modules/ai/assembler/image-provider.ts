import { Logger } from '@nestjs/common';
import type { Asset, DesignSystem } from '@courseware/shared';
import type { ImageAgentDecision } from '../agents/image.agent';
import { createPlaceholderAsset } from './placeholder-assets';

const logger = new Logger('ImageProvider');

export type ImageProvider = 'pollinations' | 'unsplash' | 'svg';

export interface ImageContext {
  slideTitle?: string;
  bodyExcerpt?: string;
  subject?: string;
}

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function getProvider(): ImageProvider {
  const env = (process.env.IMAGE_PROVIDER || 'pollinations').toLowerCase();
  if (env === 'unsplash') return 'unsplash';
  if (env === 'svg') return 'svg';
  return 'pollinations';
}

function subjectStyleSuffix(subject?: string): string {
  const s = (subject || '').toLowerCase();
  if (/语文|古诗|文言|诗歌|阅读/.test(s)) return '，中国传统水墨画风格，诗意意境，柔和色调，无文字';
  if (/英语|外语|grammar|vocabulary|dialogue/.test(s)) return '，扁平插画风格，日常教学场景，明亮色彩，无文字';
  if (/数学|代数|几何|函数|方程|推导|formula|derivation/.test(s)) return '，几何图形与坐标网格风格，清晰线条，教育示意图，无文字';
  if (/物理|化学|生物|科学|实验|science|experiment/.test(s)) return '，科学实验示意图风格，微观结构，清晰标注，无文字';
  return '，教育插画，干净矢量风格，柔和色彩，无文字';
}

function buildPollinationsUrl(
  prompt: string,
  width = 640,
  height = 480,
  seedOffset = 0,
  context?: ImageContext,
): string {
  const seed = hashString(prompt) + seedOffset;
  const basePrompt = [context?.slideTitle, context?.bodyExcerpt, prompt]
    .filter((part) => typeof part === 'string' && part.trim().length > 0)
    .join('，');
  const styleSuffix = `${subjectStyleSuffix(context?.subject)}，educational illustration, clean vector art, soft colors, no text, no watermark, high quality`;
  const fullPrompt = `${basePrompt}${styleSuffix}`;
  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    seed: String(seed),
    nologo: 'true',
    negative_prompt: 'blurry, low quality, text, watermark, signature, distorted, dark',
  });
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?${params.toString()}`;
}

function buildUnsplashUrl(keyword: string, width = 640, height = 480, context?: ImageContext): string {
  const base = [context?.slideTitle, context?.bodyExcerpt, keyword]
    .filter((part) => typeof part === 'string' && part.trim().length > 0)
    .join(' ');
  return `https://source.unsplash.com/${width}x${height}/?${encodeURIComponent(base)}`;
}

function buildLoremPicsumUrl(seed: number, width = 640, height = 480): string {
  return `https://picsum.photos/seed/${seed}/${width}/${height}`;
}

function buildLoremFlickrUrl(keyword: string, seed: number, width = 640, height = 480): string {
  const safeKeyword = keyword
    .split(/[\s,，.。!！?？:：;；]+/)
    .filter((w) => /[一-龥a-zA-Z0-9]/.test(w))
    .slice(0, 4)
    .join(',');
  const encoded = encodeURIComponent(safeKeyword || 'nature');
  return `https://loremflickr.com/${width}/${height}/${encoded}?lock=${seed}`;
}

async function fetchAsDataUrl(url: string, mimeType = 'image/png'): Promise<string | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await (globalThis as any).fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) {
      logger.warn(`Image fetch HTTP ${res.status} for ${url.slice(0, 120)}...`);
      return null;
    }
    const detectedMime = res.headers.get('content-type') || mimeType;
    if (!detectedMime.startsWith('image/')) {
      logger.warn(`Image fetch returned non-image content-type: ${detectedMime} for ${url.slice(0, 120)}...`);
      return null;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length === 0) return null;
    return `data:${detectedMime};base64,${buffer.toString('base64')}`;
  } catch (err) {
    logger.warn(`Image fetch failed: ${err instanceof Error ? err.message : String(err)} for ${url.slice(0, 120)}...`);
    return null;
  }
}

async function fetchWithRetry(url: string, attempts = 3, baseDelay = 800): Promise<string | null> {
  for (let i = 0; i < attempts; i++) {
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, baseDelay * Math.pow(2, i - 1)));
    }
    const dataUrl = await fetchAsDataUrl(url);
    if (dataUrl) return dataUrl;
  }
  return null;
}

function clampSize(value: number, min = 128, max = 1280): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function sanitizeAlt(alt: string): string {
  return alt
    .replace(/[\n\r]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

export async function createImageAsset(
  alt: string,
  designSystem: DesignSystem,
  width = 640,
  height = 480,
  context?: ImageContext,
  decision?: ImageAgentDecision,
): Promise<Asset> {
  const envProvider = getProvider();
  const safeAlt = sanitizeAlt(alt);
  const decisionPrompt = decision?.prompt?.trim();
  const decisionProvider = decision?.provider;
  const effectiveProvider = decisionProvider || envProvider;
  const w = clampSize(width);
  const h = clampSize(height);
  const id = `asset-img-${hashString(safeAlt).toString(36)}`;

  logger.log(`Creating image asset [${effectiveProvider}] ${safeAlt.slice(0, 80)} (${w}x${h})`);

  const imageContext: ImageContext = {
    ...context,
    subject: context?.subject,
  };

  if (effectiveProvider === 'pollinations') {
    let dataUrl: string | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const url = buildPollinationsUrl(decisionPrompt || safeAlt, w, h, attempt, imageContext);
      logger.log(`Pollinations attempt ${attempt + 1}/3: ${url.slice(0, 140)}...`);
      dataUrl = await fetchAsDataUrl(url);
      if (dataUrl) {
        logger.log(`Pollinations success on attempt ${attempt + 1} (${dataUrl.length} chars)`);
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 800 * Math.pow(2, attempt)));
    }
    if (dataUrl) {
      return {
        id,
        type: 'image',
        filename: `${hashString(safeAlt).toString(36)}.png`,
        mimeType: 'image/png',
        url: dataUrl,
        width: w,
        height: h,
        description: safeAlt,
      };
    }
    logger.warn(`Pollinations failed for: ${safeAlt}; trying Unsplash fallback`);
    const unsplashUrl = buildUnsplashUrl(decisionPrompt || safeAlt, w, h, imageContext);
    const unsplashData = await fetchWithRetry(unsplashUrl, 2);
    if (unsplashData) {
      return {
        id,
        type: 'image',
        filename: `${hashString(safeAlt).toString(36)}.jpg`,
        mimeType: 'image/jpeg',
        url: unsplashData,
        width: w,
        height: h,
        description: safeAlt,
      };
    }
    logger.warn(`Unsplash fallback also failed for: ${safeAlt}; using subject SVG placeholder`);
  }

  if (effectiveProvider === 'unsplash') {
    const url = buildUnsplashUrl(decisionPrompt || safeAlt, w, h, imageContext);
    const dataUrl = await fetchWithRetry(url, 2);
    if (dataUrl) {
      return {
        id,
        type: 'image',
        filename: `${hashString(safeAlt).toString(36)}.jpg`,
        mimeType: 'image/jpeg',
        url: dataUrl,
        width: w,
        height: h,
        description: safeAlt,
      };
    }
  }

  return createPlaceholderAsset(safeAlt, designSystem);
}
