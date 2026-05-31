import { tokenManager } from '@shared/auth/token-manager';
import { ExtensionError, toExtensionError } from '@shared/utils/error';
import { apiConfig } from './env';
import { mockTextStream, streamSseEvents } from './sse';

export interface SuggestPayload {
  contextText: string;
  inputText?: string;
  mode: 'suggest' | 'polish' | 'translate' | 'expand';
  locale?: string;
  platform?: string;
}

export interface SuggestOptions {
  onChunk: (chunk: string, index: number) => void | Promise<void>;
}

interface AiChunkEventData {
  text?: string;
  index?: number;
}

interface AiErrorEventData {
  message?: string;
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

function parseJson<T>(raw: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    throw new ExtensionError('NETWORK', 'AI 推荐响应格式异常', error);
  }
}

export const aiApi = {
  async suggest(payload: SuggestPayload, opts: SuggestOptions): Promise<void> {
    if (apiConfig.useMock) {
      const text = buildMockSuggestion(payload);
      let index = 0;
      for await (const chunk of mockTextStream(text, 10)) {
        await opts.onChunk(chunk, index++);
      }
      return;
    }

    const token = await tokenManager.getAccessToken();
    if (!token) throw new ExtensionError('UNAUTHORIZED', '请先登录后再使用 AI 推荐');

    let response: Response;
    try {
      response = await fetch(`${apiConfig.baseUrl}/ai/suggest`, {
        method: 'POST',
        headers: {
          Accept: 'text/event-stream',
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contextText: payload.contextText,
          inputText: payload.inputText ?? '',
          mode: payload.mode,
          locale: payload.locale ?? 'zh-CN',
          platform: payload.platform ?? 'extension',
        }),
      });
    } catch (error) {
      throw toExtensionError(error, 'NETWORK');
    }

    if (response.status === 401) throw new ExtensionError('UNAUTHORIZED', '会话已过期，请重新登录');
    if (!response.ok) throw new ExtensionError('NETWORK', `AI 推荐请求失败 ${response.status}`);
    if (!response.body) throw new ExtensionError('NETWORK', 'AI 推荐响应为空');

    let chunkIndex = 0;

    for await (const event of streamSseEvents(response.body)) {
      if (event.event === 'chunk') {
        const data = parseJson<AiChunkEventData>(event.data);
        if (typeof data.text === 'string') {
          await opts.onChunk(data.text, typeof data.index === 'number' ? data.index : chunkIndex++);
        }
      }

      if (event.event === 'error') {
        const data = parseJson<AiErrorEventData>(event.data);
        throw new ExtensionError('NETWORK', data.message || 'AI 推荐生成失败，请稍后重试');
      }
    }
  },
};
