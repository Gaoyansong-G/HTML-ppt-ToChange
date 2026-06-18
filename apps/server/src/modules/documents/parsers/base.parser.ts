import type { DocumentNode } from '@courseware/shared';

export interface ParseResult {
  filename: string;
  extractedText: string;
  structure: DocumentNode[];
}

export interface DocumentParser {
  parse(buffer: Buffer, filename: string): Promise<ParseResult> | ParseResult;
}

export function createTextNode(content: string, id: string): DocumentNode {
  return {
    id,
    type: 'paragraph',
    content,
  };
}

export function createHeadingNode(content: string, level: number, id: string): DocumentNode {
  return {
    id,
    type: 'heading',
    content,
    level,
  };
}

export function createImageNode(description: string, id: string): DocumentNode {
  return {
    id,
    type: 'image',
    content: description,
  };
}

export function generateNodeId(prefix: string, index: number): string {
  return `${prefix}-${index}`;
}
