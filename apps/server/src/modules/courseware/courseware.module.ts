import { Module } from '@nestjs/common';
import { AssetsModule } from '../assets/assets.module';
import { CoursewareController } from './courseware.controller';
import { CoursewareService } from './courseware.service';

@Module({
  imports: [AssetsModule],
  controllers: [CoursewareController],
  providers: [CoursewareService],
  exports: [CoursewareService],
})
export class CoursewareModule {}
