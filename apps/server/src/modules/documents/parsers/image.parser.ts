import type { DocumentNode } from '@courseware/shared';
import type { DocumentParser, ParseResult } from './base.parser';
import { generateNodeId } from './base.parser';

export class ImageParser implements DocumentParser {
  parse(buffer: Buffer, filename: string): ParseResult {
    // TODO: Integrate real OCR or multimodal model in phase 4
    const structure: DocumentNode[] = [
      {
        id: generateNodeId('img', 0),
        type: 'image',
        content: `图片资源：${filename}，需 OCR 识别内容`,
      },
    ];

    return {
      filename,
      extractedText: `[图片：${filename}]`,
      structure,
    };
  }
}
