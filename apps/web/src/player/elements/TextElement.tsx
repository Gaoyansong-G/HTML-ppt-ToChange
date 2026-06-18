import type { Element, ElementStyle } from '@courseware/shared';

interface TextElementProps {
  element: Element;
}

export function getTextElementStyles(element: Element): React.CSSProperties {
  const { geometry, style } = element;
  return {
    position: 'absolute',
    left: geometry.x,
    top: geometry.y,
    width: geometry.width,
    height: geometry.height,
    zIndex: geometry.zIndex,
    transform: geometry.rotation ? `rotate(${geometry.rotation}deg)` : undefined,
    color: style.color,
    backgroundColor: style.backgroundColor,
    fontSize: style.fontSize ? `${style.fontSize}px` : undefined,
    fontFamily: style.fontFamily,
    fontWeight: style.fontWeight,
    fontStyle: (style as ElementStyle & { fontStyle?: string }).fontStyle,
    textDecoration: (style as ElementStyle & { textDecoration?: string }).textDecoration,
    lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing ? `${style.letterSpacing}em` : undefined,
    textAlign: style.textAlign,
    borderRadius: style.borderRadius ? `${style.borderRadius}px` : undefined,
    borderWidth: style.borderWidth ? `${style.borderWidth}px` : undefined,
    borderColor: style.borderColor,
    borderStyle: style.borderStyle,
    padding: style.padding ? `${style.padding}px` : undefined,
    opacity: style.opacity ?? 1,
    boxShadow: style.shadow,
    display: 'flex',
    alignItems: 'center',
    justifyContent: style.textAlign === 'center' ? 'center' : 'flex-start',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    overflow: 'hidden',
    outline: 'none',
  };
}

export function TextElement({ element }: TextElementProps) {
  const content = element.content as { text?: string; html?: boolean };

  return (
    <div
      id={element.id}
      style={getTextElementStyles(element)}
      dangerouslySetInnerHTML={
        content.html ? { __html: content.text || '' } : undefined
      }
    >
      {!content.html ? content.text : null}
    </div>
  );
}
