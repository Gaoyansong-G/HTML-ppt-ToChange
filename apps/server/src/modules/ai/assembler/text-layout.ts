import type { Element } from '@courseware/shared';

const SLIDE_WIDTH = 1280;
const SLIDE_HEIGHT = 720;

interface TextGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  rotation?: number;
}

function getTextContent(el: Element): string {
  if (typeof el.content === 'string') return el.content;
  if (el.content && typeof el.content === 'object') {
    return String((el.content as Record<string, unknown>).text ?? '');
  }
  return '';
}

export function estimateTextHeight(text: string, fontSize: number, lineHeight: number, width: number): number {
  if (!text || width <= 0) return Math.ceil(fontSize * lineHeight);
  const avgCharWidth = fontSize * 0.55;
  const charsPerLine = Math.max(1, Math.floor(width / avgCharWidth));
  const lines = text.split('\n').reduce((sum, para) => {
    if (!para) return sum + 1;
    return sum + Math.max(1, Math.ceil(para.length / charsPerLine));
  }, 0);
  return Math.ceil(lines * fontSize * lineHeight);
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function fitTextElement(el: Element): void {
  if (el.type !== 'text') return;
  const text = getTextContent(el);
  if (!text) return;

  const geom = el.geometry as TextGeometry;
  let fontSize = typeof el.style.fontSize === 'number' ? el.style.fontSize : 24;
  const lineHeight = typeof el.style.lineHeight === 'number' ? el.style.lineHeight : 1.6;
  const maxAvailableHeight = Math.max(40, SLIDE_HEIGHT - geom.y - 20);

  let needed = estimateTextHeight(text, fontSize, lineHeight, geom.width);

  // Reduce font size if content clearly cannot fit at current size.
  while (needed > maxAvailableHeight && fontSize > 18) {
    fontSize -= 2;
    needed = estimateTextHeight(text, fontSize, lineHeight, geom.width);
  }

  if (fontSize !== el.style.fontSize) {
    el.style.fontSize = fontSize;
  }

  // Give a small extra breath room (one line) so descenders/line wraps do not clip.
  const targetHeight = Math.min(maxAvailableHeight, needed + Math.ceil(fontSize * lineHeight * 0.5));
  geom.height = clamp(targetHeight, 20, maxAvailableHeight);

  // Keep element within slide bounds horizontally/vertically.
  geom.width = clamp(geom.width, 20, SLIDE_WIDTH - geom.x);
  geom.y = clamp(geom.y, 0, SLIDE_HEIGHT - geom.height);
}

export function fitAllTextElements(elements: Element[]): void {
  elements.forEach((el) => fitTextElement(el));
}
