import type { DocumentNode } from '@courseware/shared';
import type { DocumentParser, ParseResult } from './base.parser';
import { generateNodeId } from './base.parser';

export class PdfParser implements DocumentParser {
  parse(buffer: Buffer, filename: string): ParseResult {
    // TODO: Integrate pdfjs-dist in phase 4
    const structure: DocumentNode[] = [
      {
        id: generateNodeId('pdf', 0),
        type: 'section',
        content: `PDF 文档：${filename}，需 pdfjs-dist 解析`,
      },
    ];

    return {
      filename,
      extractedText: `[PDF：${filename}]`,
      structure,
    };
  }
}
