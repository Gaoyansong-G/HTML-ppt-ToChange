import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ArkClient } from './clients/ark.client';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { DocumentsModule } from '../documents/documents.module';

import { CoursewareModule } from '../courseware/courseware.module';

@Global()
@Module({
  imports: [DocumentsModule, CoursewareModule],
  controllers: [AIController],
  providers: [
    {
      provide: ArkClient,
      useFactory: (configService: ConfigService) => {
        return new ArkClient(configService);
      },
      inject: [ConfigService],
    },
    AIService,
  ],
  exports: [ArkClient, AIService],
})
export class AIModule {}
