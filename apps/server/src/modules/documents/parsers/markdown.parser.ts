import MarkdownIt from 'markdown-it';
import type { DocumentNode } from '@courseware/shared';
import type { DocumentParser, ParseResult } from './base.parser';
import { generateNodeId } from './base.parser';

const md = new MarkdownIt();

export class MarkdownParser implements DocumentParser {
  parse(buffer: Buffer, filename: string): ParseResult {
    const markdown = buffer.toString('utf-8');
    const tokens = md.parse(markdown, {});
    const structure: DocumentNode[] = [];
    let paragraphBuffer: string[] = [];
    let nodeIndex = 0;

    const flushParagraph = () => {
      if (paragraphBuffer.length > 0) {
        structure.push({
          id: generateNodeId('p', nodeIndex++),
          type: 'paragraph',
          content: paragraphBuffer.join(''),
        });
        paragraphBuffer = [];
      }
    };

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (token.type === 'heading_open') {
        flushParagraph();
        const level = parseInt(token.tag.replace('h', ''), 10);
        const content = tokens[i + 1]?.content || '';
        structure.push({
          id: generateNodeId('h', nodeIndex++),
          type: 'heading',
          content,
          level,
        });
        i++; // Skip content token
      } else if (token.type === 'paragraph_open') {
        const content = tokens[i + 1]?.content || '';
        if (content) {
          paragraphBuffer.push(content);
        }
        i++; // Skip content token
      } else if (token.type === 'inline' && paragraphBuffer.length === 0) {
        // Inline token outside paragraph
        paragraphBuffer.push(token.content);
      }
    }

    flushParagraph();

    return {
      filename,
      extractedText: markdown,
      structure,
    };
  }
}
