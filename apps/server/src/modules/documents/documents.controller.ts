import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Get,
  Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { readFileSync } from 'fs';
import { DocumentsService } from './documents.service';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const buffer = readFileSync(file.path);
    const document = await this.documentsService.processFile(
      buffer,
      file.originalname,
      file.mimetype,
      file.path,
      file.size,
    );

    return {
      id: document.id,
      filename: document.filename,
      mimeType: document.mimeType,
      size: document.size,
      structure: document.structure,
      extractedText: document.extractedText.slice(0, 2000),
    };
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    const document = this.documentsService.findById(id);
    if (!document) {
      throw new BadRequestException('Document not found');
    }
    return {
      id: document.id,
      filename: document.filename,
      structure: document.structure,
      extractedText: document.extractedText.slice(0, 2000),
    };
  }
}
