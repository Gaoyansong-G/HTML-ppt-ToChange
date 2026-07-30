import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

const logger = new Logger('SeedreamClient');

/**
 * Seedream 图像生成客户端（火山方舟 images/generations，OpenAI 兼容）。
 * 关键参数（官方文档）：
 * - size: '2K'（或具体宽x高）
 * - response_format: 'b64_json'（直接落盘，避免 24h URL 过期）
 * - watermark: false
 * - sequential_image_generation: 'auto' + max_images（组图，风格统一）
 */
export class SeedreamClient {
  private client: OpenAI;
  private endpoint: string;

  constructor(configService: ConfigService) {
    this.client = new OpenAI({
      apiKey: configService.get('ARK_API_KEY') || 'dummy-key',
      baseURL: configService.get('ARK_API_BASE'),
      timeout: 300_000,
      maxRetries: 0,
    });
    this.endpoint = configService.get('ARK_IMAGE_ENDPOINT') || 'doubao-seedream-5-0-260128';
  }

  /**
   * 生成单张配图，返回 PNG Buffer。
   */
  async generateImage(prompt: string, options?: { size?: string }): Promise<Buffer> {
    logger.log(`Seedream 生成配图：${prompt.slice(0, 60)}…`);
    const response = await this.client.images.generate({
      model: this.endpoint,
      prompt,
      size: (options?.size || '2K') as unknown as OpenAI.Images.ImageGenerateParams['size'],
      response_format: 'b64_json',
      watermark: false,
    } as Parameters<OpenAI['images']['generate']>[0]);

    const b64 = response.data?.[0]?.b64_json;
    if (!b64) {
      throw new Error('Seedream 未返回 b64_json 图像');
    }
    return Buffer.from(b64, 'base64');
  }

  /**
   * 组图生成（风格统一的多张插图）：一次调用产出 N 张。
   * 返回 Buffer 数组。
   */
  async generateImageSet(prompt: string, maxImages: number): Promise<Buffer[]> {
    logger.log(`Seedream 组图生成（${maxImages} 张）：${prompt.slice(0, 60)}…`);
    const response = await this.client.images.generate({
      model: this.endpoint,
      prompt,
      size: '2K' as unknown as OpenAI.Images.ImageGenerateParams['size'],
      response_format: 'b64_json',
      watermark: false,
      sequential_image_generation: 'auto',
      sequential_image_generation_options: { max_images: maxImages },
    } as unknown as Parameters<OpenAI['images']['generate']>[0]);

    const items = (response.data || []) as { b64_json?: string }[];
    const buffers = items.filter((i) => i.b64_json).map((i) => Buffer.from(i.b64_json!, 'base64'));
    if (!buffers.length) {
      throw new Error('Seedream 组图未返回图像');
    }
    return buffers;
  }
}
