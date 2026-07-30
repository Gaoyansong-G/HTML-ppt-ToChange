import { Logger } from '@nestjs/common';
import { ArkClient } from '../clients/ark.client';

export interface AgentContext {
  documentId: string;
  description: string;
  documentStructure: unknown;
  extractedText: string;
  subject: string;
  previousResults?: Record<string, unknown>;
  options?: {
    pageCount?: number;
    style?: string;
    includeQuiz?: boolean;
    gradeLevel?: 'primary' | 'middle' | 'high' | 'unknown';
  };
}

export interface AgentResult <T = unknown> {
  data: T;
  rawResponse?: string;
}

export interface CallLLMOptions {
  /** 最大输出 token */
  maxTokens?: number;
  temperature?: number;
  /**
   * 深度思考开关：true=显式开启，false=显式关闭。
   * 注意：seed-2-1-pro / deepseek-v4 默认开启 thinking，长任务可能超过 10 分钟，
   * 生产环境建议显式 false（质量损失小，延迟降一个数量级）。
   */
  thinking?: boolean;
  /**
   * 续写模式：messages 末尾追加 assistant 预填内容，模型续写。
   * 用于强制 JSON 起手（如预填 '{'），输出解析前会自动拼回预填内容。
   * 注意：seed-2-1-pro 支持续写；与 response_format 不同时使用。
   */
  prefill?: string;
  /** 是否禁用 json_object 响应格式（默认启用；prefill 时自动禁用） */
  noJsonFormat?: boolean;
}

export abstract class BaseAgent <T = unknown> {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly arkClient: ArkClient,
    protected readonly endpointId: string,
  ) {}

  abstract execute(context: AgentContext): Promise<AgentResult<T>>;

  protected async callLLM(
    systemPrompt: string,
    userPrompt: string,
    options: CallLLMOptions = {},
  ): Promise<string> {
    const maxRetries = 3;
    let lastError: unknown;
    const usePrefill = !!options.prefill;

    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];
    if (usePrefill) {
      messages.push({ role: 'assistant', content: options.prefill! });
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(`Calling LLM (attempt ${attempt}/${maxRetries})...`);
        const response = await this.arkClient.chat(
          this.endpointId,
          messages,
          {
            temperature: options.temperature ?? 0.7,
            ...(!usePrefill && !options.noJsonFormat
              ? { response_format: { type: 'json_object' } }
              : {}),
            stream: false,
            max_tokens: options.maxTokens ?? 12000,
            ...(options.thinking !== undefined
              ? { extra_body: { thinking: { type: options.thinking ? 'enabled' : 'disabled' } } }
              : {}),
          } as Parameters<ArkClient['chat']>[2],
        );
        let content = (response.choices[0]?.message?.content as string) || '';
        // 记录缓存命中情况（隐式上下文缓存降本观测）
        const usage = (response as { usage?: { prompt_tokens?: number; completion_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } } }).usage;
        if (usage) {
          this.logger.log(
            `Tokens: prompt=${usage.prompt_tokens} completion=${usage.completion_tokens} cached=${usage.prompt_tokens_details?.cached_tokens ?? 0}`,
          );
        }
        if (usePrefill) {
          content = options.prefill! + content;
        }
        this.logger.log(`LLM responded (attempt ${attempt}), content length ${content.length}`);
        return content;
      } catch (err) {
        lastError = err;
        this.logger.warn(`LLM call failed (attempt ${attempt}/${maxRetries}): ${err instanceof Error ? err.message : String(err)}`);
        if (attempt < maxRetries) {
          const delay = 1000 * Math.pow(2, attempt - 1);
          this.logger.log(`Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  protected fillPrompt(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => variables[key] || match);
  }

  protected safeJsonParse(text: string): unknown {
    try {
      return JSON.parse(text);
    } catch {
      // Try to extract JSON from markdown code block
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        try {
          return JSON.parse(match[1]);
        } catch {
          return {};
        }
      }
      return {};
    }
  }

  protected async callLLMWithRepair<T>(
    systemPrompt: string,
    userPrompt: string,
    parser: (raw: string) => { success: true; data: T } | { success: false; error: string },
    options: CallLLMOptions = {},
  ): Promise<AgentResult<T>> {
    let raw = await this.callLLM(systemPrompt, userPrompt, options);
    const firstAttempt = parser(raw);

    if ('data' in firstAttempt) {
      return { data: firstAttempt.data, rawResponse: raw };
    }

    const repairPrompt = `你之前的输出不符合要求的 JSON Schema，错误如下：${firstAttempt.error}。请直接输出修正后的完整 JSON，不要任何解释、markdown 代码块或额外文本。原始输出：${raw}`;
    raw = await this.callLLM(systemPrompt, repairPrompt, { ...options, prefill: undefined });
    const repairAttempt = parser(raw);

    if ('data' in repairAttempt) {
      return { data: repairAttempt.data, rawResponse: raw };
    }

    throw new Error(
      `LLM structured output failed after repair. Error: ${repairAttempt.error}\nRaw: ${raw}`,
    );
  }
}
