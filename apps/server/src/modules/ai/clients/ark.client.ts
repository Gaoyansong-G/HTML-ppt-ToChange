import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class ArkClient {
  private client: OpenAI;

  constructor(private readonly configService: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.configService.get('ARK_API_KEY') || 'dummy-key',
      baseURL: this.configService.get('ARK_API_BASE'),
      timeout: 180_000,
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
  ): Promise<OpenAI.Chat.ChatCompletion> {
    return this.client.chat.completions.create({
      model: endpointId,
      messages,
      stream: false,
      ...options,
    }) as Promise<OpenAI.Chat.ChatCompletion>;
  }
}
