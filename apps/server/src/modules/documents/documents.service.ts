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
} from './parsers';
import { DatabaseService, type DocumentRow } from '../persistence/database.service';

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
  constructor(private readonly databaseService: DatabaseService) {}

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

    this.databaseService.insertDocument({
      id: document.id,
      filename: document.filename,
      mimeType: document.mimeType,
      size: document.size,
      extractedText: document.extractedText,
      structure: JSON.stringify(document.structure),
      path: document.path,
      createdAt: new Date().toISOString(),
    });

    return document;
  }

  findById(id: string): UploadedDocument | undefined {
    const row = this.databaseService.getDocument(id);
    return row ? this.toUploadedDocument(row) : undefined;
  }

  getDocumentStructure(id: string): DocumentNode[] {
    const row = this.databaseService.getDocument(id);
    if (!row) return [];
    try {
      return row.structure ? (JSON.parse(row.structure) as DocumentNode[]) : [];
    } catch {
      return [];
    }
  }

  private toUploadedDocument(row: DocumentRow): UploadedDocument {
    let structure: DocumentNode[] = [];
    try {
      structure = row.structure ? (JSON.parse(row.structure) as DocumentNode[]) : [];
    } catch {
      structure = [];
    }
    const filename = row.filename ?? '';
    return {
      id: row.id,
      filename,
      originalName: filename,
      mimeType: row.mime_type ?? '',
      size: row.size ?? 0,
      structure,
      extractedText: row.extracted_text ?? '',
      path: row.path ?? '',
    };
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
