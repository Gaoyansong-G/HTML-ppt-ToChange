import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as path from 'path';
import { CoursewareModule } from './modules/courseware/courseware.module';
import { AIModule } from './modules/ai/ai.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { AssetsModule } from './modules/assets/assets.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        path.resolve(process.cwd(), '.env'),
        path.resolve(__dirname, '../../.env'),
        path.resolve(__dirname, '../../../.env'),
      ],
    }),
    CoursewareModule,
    AIModule,
    DocumentsModule,
    AssetsModule,
  ],
})
export class AppModule {}
