import { useRef, useEffect, useCallback } from 'react';
import type { Element } from '@courseware/shared';
import { useEditorStore } from '../stores/editor.store';
import { useHistoryStore } from '../stores/history.store';
import { getTextElementStyles } from '../player/elements/TextElement';

interface InlineTextEditorProps {
  element: Element;
  slideId: string;
}

export function InlineTextEditor({ element, slideId }: InlineTextEditorProps) {
  const { courseware, updateElement, setEditingElement } = useEditorStore();
  const { record } = useHistoryStore();
  const ref = useRef<HTMLDivElement>(null);
  const committed = useRef(false);

  const originalText = String((element.content as { text?: string }).text || '');

  useEffect(() => {
    if (ref.current) {
      ref.current.focus();
      // Place cursor at end
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(ref.current);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, []);

  const commit = useCallback(() => {
    if (committed.current) return;
    committed.current = true;

    const newText = ref.current?.innerText || '';
    if (newText !== originalText) {
      record(courseware);
      updateElement(slideId, element.id, (el) => {
        el.content = { ...el.content, text: newText, html: false };
      });
    }
    setEditingElement(null);
  }, [courseware, element.id, originalText, record, setEditingElement, slideId, updateElement]);

  const cancel = useCallback(() => {
    committed.current = true;
    setEditingElement(null);
  }, [setEditingElement]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancel();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        commit();
      }
    },
    [cancel, commit],
  );

  const handleBlur = useCallback(() => {
    commit();
  }, [commit]);

  return (
    <div
      ref={ref}
      contentEditable
      data-testid="inline-text-editor"
      suppressContentEditableWarning
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      style={getTextElementStyles(element)}
      className="cursor-text"
    >
      {originalText}
    </div>
  );
}
