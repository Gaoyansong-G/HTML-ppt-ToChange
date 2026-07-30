import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Headers,
  NotFoundException,
  Res,
} from '@nestjs/common';
import { CoursewareService } from './courseware.service';
import type { Courseware } from '@courseware/shared';
import { Response } from 'express';

function encodeContentDispositionFilename(filename: string): string {
  return encodeURIComponent(filename).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

@Controller('courseware')
export class CoursewareController {
  constructor(private readonly coursewareService: CoursewareService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'courseware' };
  }

  @Get('example')
  getExample() {
    return this.coursewareService.getExampleCourseware();
  }

  @Get()
  findAll() {
    return this.coursewareService.findAll();
  }

  @Get('summaries')
  findSummaries() {
    return this.coursewareService.findSummaries();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const courseware = this.coursewareService.findById(id);
    if (!courseware) {
      throw new NotFoundException(`Courseware ${id} not found`);
    }
    return courseware;
  }

  @Post()
  create(
    @Body()
    body: Omit<Courseware, 'id' | 'createdAt' | 'updatedAt'> & {
      id?: string;
      createdAt?: string;
      updatedAt?: string;
    },
  ) {
    return this.coursewareService.create(body);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() body: Partial<Courseware>,
    @Headers('if-match') ifMatch?: string,
  ) {
    const rawRevision = ifMatch?.replace(/^W\//, '').replaceAll('"', '').trim();
    const expectedRevision =
      rawRevision && /^\d+$/.test(rawRevision) ? Number(rawRevision) : undefined;
    return this.coursewareService.update(id, body, expectedRevision);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.coursewareService.remove(id);
  }

  @Get(':id/export/package')
  async exportPackage(@Param('id') id: string, @Res() res: Response) {
    const { filename, buffer } = await this.coursewareService.exportPackage(id);
    res.set({
      'Content-Type': 'application/zip',
      // `filename` must remain ASCII-safe for Node's response-header rules.
      // RFC 5987's filename* carries the original Chinese/user-facing title.
      'Content-Disposition': `attachment; filename="courseware.zip"; filename*=UTF-8''${encodeContentDispositionFilename(filename)}`,
    });
    res.send(buffer);
  }
}
