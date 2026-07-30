import { useLayoutEffect, useMemo, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import type { Element } from '@courseware/shared';

interface FormulaElementProps {
  element: Element;
}

interface FormulaContent {
  latex?: string;
  displayMode?: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function FormulaElement({ element }: FormulaElementProps) {
  const content = element.content as FormulaContent;
  const { geometry, style } = element;
  const latex = content.latex ?? '';
  const displayMode = content.displayMode ?? false;
  const innerRef = useRef<HTMLDivElement | null>(null);

  const { html, error } = useMemo(() => {
    if (!latex.trim()) {
      return { html: '', error: '公式内容为空' };
    }
    try {
      const rendered = katex.renderToString(latex, {
        displayMode,
        throwOnError: false,
        output: 'html',
      });
      return { html: rendered, error: null as string | null };
    } catch (err) {
      // throwOnError:false 已兜住大部分解析错误，这里兜底其他异常，绝不白屏
      return { html: '', error: err instanceof Error ? err.message : '公式渲染失败' };
    }
  }, [latex, displayMode]);

  // 字号随元素高度自适应：优先 style.fontSize，否则按高度比例估算
  const autoFontSize = clamp(
    geometry.height * (displayMode ? 0.35 : 0.5),
    10,
    160,
  );
  const fontSize = style.fontSize ?? autoFontSize;

  // 渲染后测量实际公式尺寸，超出容器则整体等比缩小（只缩不放）
  useLayoutEffect(() => {
    const inner = innerRef.current;
    if (!inner || !html) return;
    const parent = inner.parentElement;
    if (!parent) return;
    inner.style.transform = 'none';
    const scaleX = parent.clientWidth / Math.max(inner.offsetWidth, 1);
    const scaleY = parent.clientHeight / Math.max(inner.offsetHeight, 1);
    const s = Math.min(1, scaleX, scaleY);
    inner.style.transform = s < 1 ? `scale(${s})` : 'none';
  }, [html, fontSize, geometry.width, geometry.height]);

  const wrapperStyle: React.CSSProperties = {
    position: 'absolute',
    left: geometry.x,
    top: geometry.y,
    width: geometry.width,
    height: geometry.height,
    zIndex: geometry.zIndex,
    transform: geometry.rotation ? `rotate(${geometry.rotation}deg)` : undefined,
    color: style.color,
    backgroundColor: style.backgroundColor,
    borderRadius: style.borderRadius ? `${style.borderRadius}px` : undefined,
    borderWidth: style.borderWidth ? `${style.borderWidth}px` : undefined,
    borderColor: style.borderColor,
    borderStyle: style.borderStyle,
    padding: style.padding ? `${style.padding}px` : undefined,
    opacity: style.opacity ?? 1,
    boxShadow: style.shadow,
    fontSize: `${fontSize}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: style.textAlign === 'left' ? 'flex-start' : style.textAlign === 'right' ? 'flex-end' : 'center',
    overflow: 'hidden',
  };

  if (error || !html) {
    return (
      <div id={element.id} style={wrapperStyle}>
        <span className="text-xs text-red-500" style={{ fontSize: '12px' }}>
          {error ? `公式错误：${error}` : '公式渲染失败'}
        </span>
        <code
          className="ml-2 break-all text-xs text-red-400"
          style={{ fontSize: '12px' }}
        >
          {latex}
        </code>
      </div>
    );
  }

  return (
    <div id={element.id} style={wrapperStyle}>
      <div
        ref={innerRef}
        style={{ transformOrigin: 'center center', lineHeight: 1 }}
        // KaTeX 输出为可信的本地生成 HTML（非用户 HTML 注入）
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
