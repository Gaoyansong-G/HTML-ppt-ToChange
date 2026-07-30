import type { Element, Asset } from '@courseware/shared';
import { TextElement } from './TextElement';
import { ShapeElement } from './ShapeElement';
import { ImageElement } from './ImageElement';
import { QuizElement } from './QuizElement';
import { FillBlankElement } from './FillBlankElement';
import { FormulaElement } from './FormulaElement';
import { DiagramElement } from './DiagramElement';
import { AudioElement } from './AudioElement';
import { VideoElement } from './VideoElement';
import { BlockRenderer } from '../../components/blocks';
import { InteractiveRenderer } from '../interactives';

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
    case 'group':
      return <GroupElement element={child} assets={assets} onInteraction={onInteraction} />;
    case 'formula':
      return <FormulaElement element={child} />;
    case 'diagram':
      return <DiagramElement element={child} />;
    case 'audio':
      return <AudioElement element={child} assets={assets} onInteraction={onInteraction} />;
    case 'video':
      return <VideoElement element={child} assets={assets} onInteraction={onInteraction} />;
    case 'block':
      return (
        <BlockRenderer
          element={child}
          assets={assets}
          mode="player"
          onInteraction={onInteraction}
        />
      );
    case 'interactive':
      return (
        <InteractiveRenderer
          element={child}
          mode="player"
          onInteraction={onInteraction}
        />
      );
    default:
      return (
        <div
          id={child.id}
          className="absolute flex items-center justify-center border-2 border-dashed border-slate-400 bg-slate-100 text-xs text-slate-500"
          style={{
            left: child.geometry.x,
            top: child.geometry.y,
            width: child.geometry.width,
            height: child.geometry.height,
            zIndex: child.geometry.zIndex,
            opacity: child.style.opacity ?? 1,
          }}
        >
          {child.type} 元素
        </div>
      );
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
