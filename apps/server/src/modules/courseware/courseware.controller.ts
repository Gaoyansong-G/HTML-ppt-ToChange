import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  NotFoundException,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { CoursewareService } from './courseware.service';
import type { Courseware } from '@courseware/shared';
import { Response } from 'express';

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

  @Get(':id')
  findOne(@Param('id') id: string) {
    const courseware = this.coursewareService.findById(id);
    if (!courseware) {
      throw new NotFoundException(`Courseware ${id} not found`);
    }
    return courseware;
  }

  @Post()
  create(@Body() body: Courseware) {
    const result = this.coursewareService.validate(body);
    if (!result.success) {
      throw new BadRequestException(`Invalid courseware: ${result.error.message}`);
    }
    return this.coursewareService.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Partial<Courseware>) {
    return this.coursewareService.update(id, body);
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
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  }
}
