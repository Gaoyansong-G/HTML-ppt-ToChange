import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  NotFoundException,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AssetsService } from './assets.service';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new NotFoundException('No file uploaded');
    }
    return this.assetsService.upload(file);
  }

  @Get(':id')
  get(@Param('id') id: string, @Res() res: Response) {
    const result = this.assetsService.findFileById(id);
    if (!result) {
      throw new NotFoundException(`Asset ${id} not found`);
    }

    res.set('Content-Type', result.asset.mimeType);
    res.send(result.buffer);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.assetsService.remove(id);
  }
}
