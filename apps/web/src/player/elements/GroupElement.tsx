import type { Element, Asset } from '@courseware/shared';
import { TextElement } from './TextElement';
import { ShapeElement } from './ShapeElement';
import { ImageElement } from './ImageElement';
import { QuizElement } from './QuizElement';
import { FillBlankElement } from './FillBlankElement';

interface GroupElementProps {
  element: Element;
  assets: Asset[];
  onInteraction?: (elementId: string, event: string) => void;
}

function renderChild(
  child: Element,
  assets: Asset[],
  onInteraction?: (elementId: string, event: string) => void,
) {
  switch (child.type) {
    case 'text':
      return <TextElement element={child} />;
    case 'shape':
      return <ShapeElement element={child} />;
    case 'image':
      return <ImageElement element={child} assets={assets} />;
    case 'quiz': {
      const contentType = (child.content as { type?: string }).type;
      if (contentType === 'fill-blank') {
        return <FillBlankElement element={child} onInteraction={onInteraction} />;
      }
      return <QuizElement element={child} onInteraction={onInteraction} />;
    }
    default:
      return null;
  }
}

export function GroupElement({ element, assets, onInteraction }: GroupElementProps) {
  const content = element.content as { children?: Element[] };
  const children = content.children || [];
  const { geometry, style } = element;

  return (
    <div
      id={element.id}
      className="absolute overflow-visible"
      style={{
        left: geometry.x,
        top: geometry.y,
        width: geometry.width,
        height: geometry.height,
        zIndex: geometry.zIndex,
        transform: geometry.rotation ? `rotate(${geometry.rotation}deg)` : undefined,
        opacity: style.opacity ?? 1,
      }}
    >
      {children.map((child) => {
        // Children are already stored relative to the group origin in the editor store.
        return (
          <div key={child.id}>
            {renderChild(child, assets, onInteraction)}
          </div>
        );
      })}
    </div>
  );
}
