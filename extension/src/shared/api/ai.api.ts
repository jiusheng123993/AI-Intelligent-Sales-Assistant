/**
 * AI API 调用层。
 *
 * A6 阶段使用本地 Mock 流式生成；后端 B 模块完成后替换为真实 /ai/suggest SSE。
 */
import { mockTextStream } from './sse';

export interface SuggestPayload {
  contextText: string;
  mode: 'suggest' | 'polish' | 'translate' | 'expand';
}

export interface SuggestOptions {
  onChunk: (chunk: string, index: number) => void | Promise<void>;
}

function buildMockSuggestion(payload: SuggestPayload): string {
  const clipped = payload.contextText.slice(0, 120).replace(/\s+/g, ' ').trim();
  const modeLabel: Record<SuggestPayload['mode'], string> = {
    suggest: '推荐回复',
    polish: '润色表达',
    translate: '翻译优化',
    expand: '扩写话术',
  };
  return `【${modeLabel[payload.mode]}】您好，我理解您的关注点。基于当前对话「${clipped || '暂无上下文'}」，建议这样回复：感谢您的反馈，我这边可以进一步为您梳理方案，并结合您的实际需求给出更合适的建议。`;
}

export const aiApi = {
  async suggest(payload: SuggestPayload, opts: SuggestOptions): Promise<void> {
    const text = buildMockSuggestion(payload);
    let index = 0;
    for await (const chunk of mockTextStream(text, 10)) {
      await opts.onChunk(chunk, index++);
    }
  },
};
