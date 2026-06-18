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

export abstract class BaseAgent <T = unknown> {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly arkClient: ArkClient,
    protected readonly endpointId: string,
  ) {}

  abstract execute(context: AgentContext): Promise<AgentResult<T>>;

  protected async callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
    const maxRetries = 3;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(`Calling LLM (attempt ${attempt}/${maxRetries})...`);
        const response = await this.arkClient.chat(
          this.endpointId,
          [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          {
            temperature: 0.7,
            response_format: { type: 'json_object' },
            stream: false,
            max_tokens: 12000,
          },
        );
        const content = (response.choices[0]?.message?.content as string) || '{}';
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
  ): Promise<AgentResult<T>> {
    let raw = await this.callLLM(systemPrompt, userPrompt);
    const firstAttempt = parser(raw);

    if ('data' in firstAttempt) {
      return { data: firstAttempt.data, rawResponse: raw };
    }

    const repairPrompt = `你之前的输出不符合要求的 JSON Schema，错误如下：${firstAttempt.error}。请直接输出修正后的完整 JSON，不要任何解释、markdown 代码块或额外文本。原始输出：${raw}`;
    raw = await this.callLLM(systemPrompt, repairPrompt);
    const repairAttempt = parser(raw);

    if ('data' in repairAttempt) {
      return { data: repairAttempt.data, rawResponse: raw };
    }

    throw new Error(
      `LLM structured output failed after repair. Error: ${repairAttempt.error}\nRaw: ${raw}`,
    );
  }
}
