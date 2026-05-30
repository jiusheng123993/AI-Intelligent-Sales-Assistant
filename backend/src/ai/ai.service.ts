import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { RagService } from '../rag/rag.service';
import { RagSearchResult } from '../rag/types/rag-search-result.type';
import { RagSource } from '../rag/types/rag-source.type';
import { SafeUser } from '../users/types/safe-user.type';
import { SuggestDto } from './dto/suggest.dto';
import { AiSuggestMode } from './types/ai-suggest-mode.type';

export interface AiSuggestionResult {
  requestId: string;
  text: string;
  chunks: string[];
  sources: RagSource[];
  degraded: boolean;
}

const modeLabels: Record<AiSuggestMode, string> = {
  suggest: '推荐回复',
  polish: '润色表达',
  translate: '翻译优化',
  expand: '扩写话术',
};

@Injectable()
export class AiService {
  constructor(
    private readonly ragService: RagService,
    private readonly configService: ConfigService,
  ) {}

  async generateSuggestion(user: SafeUser, dto: SuggestDto): Promise<AiSuggestionResult> {
    const requestId = this.createRequestId();
    const query = this.buildSearchQuery(dto);
    const rag = await this.searchSafely(user, query);
    const fallbackText = this.buildFallbackText(dto, rag.sources, rag.degraded);
    const modelText = await this.generateWithOpenAi(dto, rag.sources);
    const text = modelText ?? fallbackText;

    return {
      requestId,
      text,
      chunks: this.chunkText(text),
      sources: rag.sources,
      degraded: rag.degraded || !modelText,
    };
  }

  toSseEvents(result: AiSuggestionResult): string[] {
    const events = result.chunks.map((text, index) =>
      this.formatSseEvent('chunk', {
        requestId: result.requestId,
        text,
        index,
      }),
    );
    events.push(
      this.formatSseEvent('done', {
        requestId: result.requestId,
        sources: result.sources,
        degraded: result.degraded,
      }),
    );

    return events;
  }

  toSseErrorEvent(requestId = this.createRequestId()): string {
    return this.formatSseEvent('error', {
      requestId,
      message: 'AI 推荐生成失败，请稍后重试',
    });
  }

  private async searchSafely(user: SafeUser, query: string): Promise<RagSearchResult> {
    try {
      return await this.ragService.search(user, { query, topK: 5 });
    } catch {
      return { degraded: true, sources: [] };
    }
  }

  private async generateWithOpenAi(dto: SuggestDto, sources: RagSource[]): Promise<string | null> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      return null;
    }

    try {
      const client = this.createOpenAiClient(apiKey);
      const response = await client.chat.completions.create({
        model: this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: this.buildSystemPrompt(dto.mode) },
          { role: 'user', content: this.buildUserPrompt(dto, sources) },
        ],
        temperature: 0.4,
      });
      const text = response.choices[0]?.message?.content?.trim();

      return text || null;
    } catch {
      return null;
    }
  }

  private createOpenAiClient(apiKey: string): OpenAI {
    const baseURL = this.configService.get<string>('OPENAI_API_BASE');

    return new OpenAI({ apiKey, baseURL });
  }

  private buildSearchQuery(dto: SuggestDto): string {
    const contextText = dto.contextText?.trim() ?? '';
    const inputText = dto.inputText?.trim() ?? '';

    return [contextText, inputText].filter(Boolean).join('\n').slice(0, 1000) || '销售沟通话术推荐';
  }

  private buildSystemPrompt(mode: AiSuggestMode): string {
    return `你是一个资深销售沟通助手。请根据模式「${modeLabels[mode]}」生成中文销售话术，要求专业、克制、具体，不编造事实，不输出敏感信息。`;
  }

  private buildUserPrompt(dto: SuggestDto, sources: RagSource[]): string {
    const sourceText = sources.length
      ? sources
          .slice(0, 5)
          .map(
            (source, index) => `${index + 1}. ${source.title}: ${this.clip(source.content, 300)}`,
          )
          .join('\n')
      : '无可用知识来源';

    return [
      `模式：${modeLabels[dto.mode]}`,
      `语言：${dto.locale || 'zh-CN'}`,
      `平台：${dto.platform || 'unknown'}`,
      `客户上下文：${this.clip(dto.contextText, 2000) || '无'}`,
      `用户草稿：${this.clip(dto.inputText ?? '', 1000) || '无'}`,
      `可参考资料：\n${sourceText}`,
    ].join('\n');
  }

  private buildFallbackText(dto: SuggestDto, sources: RagSource[], degraded: boolean): string {
    const label = modeLabels[dto.mode];
    const contextText = this.clip(dto.contextText, 160) || '暂无客户上下文';
    const inputText = this.clip(dto.inputText ?? '', 120);
    const sourceText = sources.length
      ? `参考「${sources
          .slice(0, 3)
          .map((source) => source.title)
          .join('、')}」中的经验，`
      : '';
    const degradedText = degraded ? '当前知识检索使用降级结果，' : '';

    if (dto.mode === 'polish') {
      return `【${label}】${degradedText}${sourceText}建议将「${inputText || contextText}」优化为：您好，理解您的关注点。我们可以结合您的具体目标，进一步说明方案价值、实施步骤和预期收益，让沟通更专业也更有说服力。`;
    }

    if (dto.mode === 'translate') {
      return `【${label}】${degradedText}${sourceText}针对「${inputText || contextText}」，建议表达为：您好，感谢您的说明。我会尽快整理完整方案，并用清晰、礼貌、便于客户理解的方式与您确认下一步安排。`;
    }

    if (dto.mode === 'expand') {
      return `【${label}】${degradedText}${sourceText}可将「${inputText || contextText}」扩展为：我们可以先从一个小范围场景开始验证效果，快速看到实际收益；如果符合您的预期，再逐步扩大使用范围，这样风险更低、决策也更稳妥。`;
    }

    return `【${label}】${degradedText}${sourceText}基于当前对话「${contextText}」，建议回复：我理解您现在主要关注投入产出和实际效果。我们可以先围绕您的业务目标拆解价值点，再结合真实案例说明落地路径，帮助您更清楚地判断这套方案是否适合当前阶段。`;
  }

  private chunkText(text: string): string[] {
    const chunks: string[] = [];
    const size = 24;

    for (let index = 0; index < text.length; index += size) {
      chunks.push(text.slice(index, index + size));
    }

    return chunks.length ? chunks : [''];
  }

  private clip(value: string, max: number): string {
    return value.trim().replace(/\s+/g, ' ').slice(0, max);
  }

  private createRequestId(): string {
    return `ai_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }

  private formatSseEvent(event: string, data: unknown): string {
    return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  }
}
