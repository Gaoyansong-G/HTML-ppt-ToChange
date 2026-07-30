import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ArkClient } from './clients/ark.client';
import { SeedreamClient } from './clients/seedream.client';
import { AIController } from './ai.controller';
import { AIEditController } from './ai-edit.controller';
import { AIService } from './ai.service';
import { AIV2Service } from './ai-v2.service';
import { DocumentsModule } from '../documents/documents.module';
import { DatabaseService } from '../persistence/database.service';

import { CoursewareModule } from '../courseware/courseware.module';
import { AssetsModule } from '../assets/assets.module';

@Global()
@Module({
  imports: [DocumentsModule, CoursewareModule, AssetsModule],
  controllers: [AIController, AIEditController],
  providers: [
    {
      provide: ArkClient,
      useFactory: (configService: ConfigService, databaseService: DatabaseService) => {
        return new ArkClient(configService, databaseService);
      },
      inject: [ConfigService, DatabaseService],
    },
    {
      provide: SeedreamClient,
      useFactory: (configService: ConfigService) => {
        return new SeedreamClient(configService);
      },
      inject: [ConfigService],
    },
    AIService,
    AIV2Service,
  ],
  exports: [ArkClient, SeedreamClient, AIService, AIV2Service],
})
export class AIModule {}
