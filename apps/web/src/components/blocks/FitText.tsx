import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

interface FitTextProps {
  children: ReactNode;
  /** 起始字号（px），将自动缩小直至内容不溢出 */
  fontSize: number;
  minFontSize?: number;
  lineHeight?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  color?: string;
  textAlign?: CSSProperties['textAlign'];
  style?: CSSProperties;
  className?: string;
  /** 是否允许多行（默认 true） */
  multiline?: boolean;
}

/**
 * 溢出自适应文本：在固定容器内自动缩小字号直至内容完整显示。
 * 这是"生成内容不溢出"的核心兜底组件。
 */
export function FitText({
  children,
  fontSize,
  minFontSize = 12,
  lineHeight = 1.5,
  fontFamily,
  fontWeight,
  color,
  textAlign,
  style,
  className,
  multiline = true,
}: FitTextProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(fontSize);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let current = fontSize;
    el.style.fontSize = `${current}px`;
    // 最多迭代 8 次，防止死循环
    for (let i = 0; i < 8; i++) {
      const overflow =
        el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1;
      if (!overflow || current <= minFontSize) break;
      current = Math.max(minFontSize, Math.floor(current * 0.9));
      el.style.fontSize = `${current}px`;
    }
    setSize(current);
  }, [children, fontSize, minFontSize]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        fontSize: size,
        lineHeight,
        fontFamily,
        fontWeight,
        color,
        textAlign,
        whiteSpace: multiline ? 'pre-wrap' : 'nowrap',
        wordBreak: 'break-word',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
