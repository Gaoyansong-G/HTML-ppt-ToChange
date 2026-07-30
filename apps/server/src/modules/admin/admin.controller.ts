import { Controller, Get } from '@nestjs/common';
import {
  DatabaseService,
  type ModelUsageSummary,
  type UsageSummary,
} from '../persistence/database.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Get('usage')
  getUsage() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const sinceIso = todayStart.toISOString();

    const today = this.databaseService.summarizeUsage(sinceIso);
    const total = this.databaseService.summarizeUsage();
    const todayByModel = this.databaseService.summarizeUsageByModel(sinceIso);
    const totalByModel = this.databaseService.summarizeUsageByModel();

    const withHitRate = <T extends UsageSummary>(s: T) => ({
      ...s,
      totalTokens: s.promptTokens + s.completionTokens,
      // 缓存命中率 = 命中缓存的 prompt tokens / 全部 prompt tokens
      cacheHitRate:
        s.promptTokens > 0
          ? Math.round((s.cachedTokens / s.promptTokens) * 10000) / 10000
          : 0,
    });

    const formatModels = (rows: ModelUsageSummary[]) => rows.map(withHitRate);

    return {
      date: sinceIso.slice(0, 10),
      today: withHitRate(today),
      total: withHitRate(total),
      byModel: {
        today: formatModels(todayByModel),
        total: formatModels(totalByModel),
      },
    };
  }
}
