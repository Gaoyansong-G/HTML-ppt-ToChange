import type { Element } from '@courseware/shared';

interface ShapeElementProps {
  element: Element;
}

const SHAPE_CLIP_PATH: Record<string, string> = {
  triangle: 'polygon(50% 0%, 0% 100%, 100% 100%)',
  star: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
  arrow: 'polygon(0% 35%, 60% 35%, 60% 0%, 100% 50%, 60% 100%, 60% 65%, 0% 65%)',
  callout: 'polygon(0% 0%, 100% 0%, 100% 75%, 60% 75%, 50% 100%, 40% 75%, 0% 75%)',
};

export function ShapeElement({ element }: ShapeElementProps) {
  const content = element.content as {
    shapeType?: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
  };
  const { geometry, style } = element;
  const shapeType = content.shapeType || 'rectangle';

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: geometry.x,
    top: geometry.y,
    width: geometry.width,
    height: geometry.height,
    zIndex: geometry.zIndex,
    transform: geometry.rotation ? `rotate(${geometry.rotation}deg)` : undefined,
    background: content.fill,
    borderRadius: style.borderRadius ? `${style.borderRadius}px` : undefined,
    borderWidth: content.strokeWidth ? `${content.strokeWidth}px` : undefined,
    borderColor: content.stroke,
    borderStyle: content.stroke ? 'solid' : undefined,
    opacity: style.opacity ?? 1,
    boxShadow: style.shadow,
  };

  if (shapeType === 'circle') {
    baseStyle.borderRadius = '50%';
  }

  if (shapeType === 'line') {
    baseStyle.height = content.strokeWidth || 2;
    baseStyle.background = content.stroke || content.fill;
    baseStyle.borderRadius = 0;
  }

  if (SHAPE_CLIP_PATH[shapeType]) {
    baseStyle.clipPath = SHAPE_CLIP_PATH[shapeType];
  }

  return <div id={element.id} style={baseStyle} />;
}
