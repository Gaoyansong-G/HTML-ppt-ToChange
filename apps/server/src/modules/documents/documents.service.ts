import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import type { DocumentNode } from '@courseware/shared';
import {
  MarkdownParser,
  TextParser,
  WordParser,
  PdfParser,
  ImageParser,
  type DocumentParser,
  type ParseResult,
} from './parsers';

export interface UploadedDocument {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  structure: DocumentNode[];
  extractedText: string;
  path: string;
}

@Injectable()
export class DocumentsService {
  private documents = new Map<string, UploadedDocument>();

  async processFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    path: string,
    size: number,
  ): Promise<UploadedDocument> {
    const parser = this.getParser(mimeType, originalName);
    const result = await parser.parse(buffer, originalName);

    const document: UploadedDocument = {
      id: `doc-${uuidv4()}`,
      filename: originalName,
      originalName,
      mimeType,
      size,
      structure: result.structure,
      extractedText: result.extractedText,
      path,
    };

    this.documents.set(document.id, document);
    return document;
  }

  findById(id: string): UploadedDocument | undefined {
    return this.documents.get(id);
  }

  getDocumentStructure(id: string): DocumentNode[] {
    return this.documents.get(id)?.structure || [];
  }

  private getParser(mimeType: string, filename: string): DocumentParser {
    switch (mimeType) {
      case 'text/markdown':
      case 'text/x-markdown':
        return new MarkdownParser();
      case 'text/plain':
        return new TextParser();
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      case 'application/msword':
        return new WordParser();
      case 'application/pdf':
        return new PdfParser();
      case 'image/png':
      case 'image/jpeg':
      case 'image/webp':
      case 'image/gif':
        return new ImageParser();
      default:
        if (filename.endsWith('.md')) return new MarkdownParser();
        if (filename.endsWith('.txt')) return new TextParser();
        if (filename.endsWith('.docx') || filename.endsWith('.doc')) return new WordParser();
        return new TextParser();
    }
  }
}
