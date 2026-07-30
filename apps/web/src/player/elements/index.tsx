import type { Element } from '@courseware/shared';
import { TextElement } from './TextElement';
import { ShapeElement } from './ShapeElement';
import { ImageElement } from './ImageElement';
import { QuizElement } from './QuizElement';
import { FillBlankElement } from './FillBlankElement';
import { GroupElement } from './GroupElement';
import { FormulaElement } from './FormulaElement';
import { DiagramElement } from './DiagramElement';
import { AudioElement } from './AudioElement';
import { VideoElement } from './VideoElement';
import { BlockRenderer } from '../../components/blocks';
import { InteractiveRenderer } from '../interactives';
import type { Asset } from '@courseware/shared';

export interface ElementRendererProps {
  element: Element;
  assets: Asset[];
  onInteraction?: (elementId: string, event: string) => void;
}

export function ElementRenderer({ element, assets, onInteraction }: ElementRendererProps) {
  switch (element.type) {
    case 'text':
      return <TextElement element={element} />;
    case 'shape':
      return <ShapeElement element={element} />;
    case 'image':
      return <ImageElement element={element} assets={assets} />;
    case 'quiz': {
      const contentType = (element.content as { type?: string }).type;
      if (contentType === 'fill-blank') {
        return <FillBlankElement element={element} onInteraction={onInteraction} />;
      }
      return <QuizElement element={element} onInteraction={onInteraction} />;
    }
    case 'group':
      return <GroupElement element={element} assets={assets} onInteraction={onInteraction} />;
    case 'formula':
      return <FormulaElement element={element} />;
    case 'diagram':
      return <DiagramElement element={element} />;
    case 'audio':
      return <AudioElement element={element} assets={assets} onInteraction={onInteraction} />;
    case 'video':
      return <VideoElement element={element} assets={assets} onInteraction={onInteraction} />;
    case 'block':
      return <BlockRenderer element={element} assets={assets} mode="player" onInteraction={onInteraction} />;
    case 'interactive':
      return <InteractiveRenderer element={element} mode="player" onInteraction={onInteraction} />;
    default:
      // For unsupported types, render a placeholder
      return (
        <div
          id={element.id}
          className="absolute flex items-center justify-center border-2 border-dashed border-slate-400 bg-slate-100 text-xs text-slate-500"
          style={{
            left: element.geometry.x,
            top: element.geometry.y,
            width: element.geometry.width,
            height: element.geometry.height,
            zIndex: element.geometry.zIndex,
          }}
        >
          {element.type} 元素
        </div>
      );
  }
}

export { TextElement, ShapeElement, ImageElement, QuizElement, FillBlankElement };
