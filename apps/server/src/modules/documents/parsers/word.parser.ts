import mammoth from 'mammoth';
import type { DocumentNode } from '@courseware/shared';
import type { DocumentParser, ParseResult } from './base.parser';
import { generateNodeId } from './base.parser';

export class WordParser implements DocumentParser {
  async parse(buffer: Buffer, filename: string): Promise<ParseResult> {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;
    const lines = text.split('\n');
    const structure: DocumentNode[] = [];
    let nodeIndex = 0;
    let paragraphBuffer: string[] = [];

    const flushParagraph = () => {
      if (paragraphBuffer.length > 0) {
        structure.push({
          id: generateNodeId('p', nodeIndex++),
          type: 'paragraph',
          content: paragraphBuffer.join('\n'),
        });
        paragraphBuffer = [];
      }
    };

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        flushParagraph();
        continue;
      }

      if (trimmed.length < 80 && !/[。，；：！？.]$/.test(trimmed)) {
        flushParagraph();
        structure.push({
          id: generateNodeId('h', nodeIndex++),
          type: 'heading',
          content: trimmed,
          level: 2,
        });
      } else {
        paragraphBuffer.push(trimmed);
      }
    }

    flushParagraph();

    return {
      filename,
      extractedText: text,
      structure,
    };
  }
}
