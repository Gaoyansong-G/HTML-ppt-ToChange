import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  NotFoundException,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { extname } from 'path';
import { createReadStream } from 'fs';
import { AssetsService } from './assets.service';

const MAX_ASSET_SIZE = 100 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.mp3',
  '.wav',
  '.ogg',
  '.mp4',
  '.webm',
  '.mov',
]);

@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_ASSET_SIZE, files: 1 },
      fileFilter: (_request, file, callback) => {
        const ext = extname(file.originalname).toLowerCase();
        const supportedMime = /^(image|audio|video)\//i.test(file.mimetype);
        if (!supportedMime || !ALLOWED_EXTENSIONS.has(ext)) {
          callback(
            new BadRequestException(
              '仅支持 PNG、JPG、GIF、WebP、SVG、MP3、WAV、OGG、MP4、WebM 和 MOV 素材',
            ),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('请选择要上传的素材文件');
    }
    return this.assetsService.upload(file);
  }

  @Get()
  list() {
    return this.assetsService.list();
  }

  @Get(':id')
  get(@Param('id') id: string, @Req() request: Request, @Res() res: Response) {
    const result = this.assetsService.findStoredFileById(id);
    if (!result) {
      throw new NotFoundException(`Asset ${id} not found`);
    }

    res.set('Content-Type', result.asset.mimeType);
    res.set('Cache-Control', 'private, max-age=31536000, immutable');
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Accept-Ranges', 'bytes');
    if (result.asset.mimeType === 'image/svg+xml') {
      res.set('Content-Security-Policy', "sandbox; default-src 'none'; style-src 'unsafe-inline'");
    }

    const range = request.headers.range;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/i.exec(range.trim());
      if (!match) {
        res.status(416).set('Content-Range', `bytes */${result.size}`).end();
        return;
      }

      const suffixLength = match[1] === '' && match[2] !== '' ? Number(match[2]) : null;
      const start =
        suffixLength !== null
          ? Math.max(0, result.size - suffixLength)
          : Number(match[1] || 0);
      const requestedEnd = suffixLength !== null ? result.size - 1 : Number(match[2] || result.size - 1);
      const end = Math.min(requestedEnd, result.size - 1);

      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start > end || start >= result.size) {
        res.status(416).set('Content-Range', `bytes */${result.size}`).end();
        return;
      }

      res.status(206);
      res.set('Content-Range', `bytes ${start}-${end}/${result.size}`);
      res.set('Content-Length', String(end - start + 1));
      createReadStream(result.filepath, { start, end }).pipe(res);
      return;
    }

    res.set('Content-Length', String(result.size));
    createReadStream(result.filepath).pipe(res);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('coursewareId') coursewareId?: string) {
    return this.assetsService.remove(id, coursewareId);
  }
}
