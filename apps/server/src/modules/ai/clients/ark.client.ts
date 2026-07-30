import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { DatabaseService } from '../../persistence/database.service';

interface ChatUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  prompt_tokens_details?: { cached_tokens?: number };
}

@Injectable()
export class ArkClient {
  private readonly logger = new Logger(ArkClient.name);
  private client: OpenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {
    this.client = new OpenAI({
      apiKey: this.configService.get('ARK_API_KEY') || 'dummy-key',
      baseURL: this.configService.get('ARK_API_BASE'),
      timeout: 600_000, // 教学脚本等 thinking 大任务可能超过 3 分钟
      maxRetries: 0,
    });
  }

  getClient(): OpenAI {
    return this.client;
  }

  async chat(
    endpointId: string,
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    options?: Partial<OpenAI.Chat.ChatCompletionCreateParams>,
    caller = 'unknown',
  ): Promise<OpenAI.Chat.ChatCompletion> {
    try {
      const response = (await this.client.chat.completions.create({
        model: endpointId,
        messages,
        stream: false,
        ...options,
      })) as OpenAI.Chat.ChatCompletion;

      const usage = (response.usage ?? {}) as ChatUsage;
      this.logUsage(endpointId, caller, {
        promptTokens: usage.prompt_tokens ?? 0,
        completionTokens: usage.completion_tokens ?? 0,
        cachedTokens: usage.prompt_tokens_details?.cached_tokens ?? 0,
      });

      return response;
    } catch (err) {
      // 失败调用也记录一行（tokens 为 0，caller 带 error 前缀）
      this.logUsage(endpointId, `error:${caller}`, {
        promptTokens: 0,
        completionTokens: 0,
        cachedTokens: 0,
      });
      throw err;
    }
  }

  private logUsage(
    endpointId: string,
    caller: string,
    tokens: { promptTokens: number; completionTokens: number; cachedTokens: number },
  ) {
    try {
      this.databaseService.insertUsageLog({
        ts: new Date().toISOString(),
        endpoint: endpointId,
        model: endpointId,
        promptTokens: tokens.promptTokens,
        completionTokens: tokens.completionTokens,
        cachedTokens: tokens.cachedTokens,
        caller,
      });
    } catch (err) {
      // 用量记录失败不应影响主流程
      this.logger.warn(`Failed to log usage: ${(err as Error).message}`);
    }
  }
}
