/**
 * background 端 AI 推荐 handler。
 *
 * 接收 AI_SUGGEST_START 后立即返回 requestId，并在后台异步推送 CHUNK/DONE/ERROR 消息。
 */
import { aiApi, type SuggestPayload } from '@shared/api/ai.api';
import { MessageType, type MessageMap } from '@shared/messaging/types';
import { createLogger } from '@shared/utils/logger';
import { toExtensionError } from '@shared/utils/error';

const log = createLogger('[bg:ai]');

type StartPayload = MessageMap['AI_SUGGEST_START']['payload'];

function makeRequestId(): string {
  return `ai_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeMode(mode: unknown): SuggestPayload['mode'] {
  return mode === 'suggest' || mode === 'polish' || mode === 'translate' || mode === 'expand'
    ? mode
    : 'suggest';
}

async function broadcast(type: typeof MessageType.AI_SUGGEST_CHUNK, payload: MessageMap['AI_SUGGEST_CHUNK']['payload']): Promise<void>;
async function broadcast(type: typeof MessageType.AI_SUGGEST_DONE, payload: MessageMap['AI_SUGGEST_DONE']['payload']): Promise<void>;
async function broadcast(type: typeof MessageType.AI_SUGGEST_ERROR, payload: MessageMap['AI_SUGGEST_ERROR']['payload']): Promise<void>;
async function broadcast(type: string, payload: unknown): Promise<void> {
  try {
    await chrome.runtime.sendMessage({ type, payload });
  } catch {
    // sidepanel 未打开时可能没有接收方，属于可接受场景
  }
}

export async function handleSuggestStart(payload: StartPayload): Promise<{ requestId: string }> {
  const requestId = makeRequestId();
  const safePayload: SuggestPayload = {
    contextText: typeof payload?.contextText === 'string' ? payload.contextText.slice(0, 10000) : '',
    mode: normalizeMode(payload?.mode),
  };

  void aiApi
    .suggest(safePayload, {
      onChunk: (text, index) =>
        broadcast(MessageType.AI_SUGGEST_CHUNK, { requestId, text, index }),
    })
    .then(() => broadcast(MessageType.AI_SUGGEST_DONE, { requestId }))
    .catch((e) => {
      const err = toExtensionError(e);
      log.error('AI suggest failed', { code: err.code, message: err.message });
      return broadcast(MessageType.AI_SUGGEST_ERROR, { requestId, message: 'AI 推荐生成失败，请稍后重试' });
    });

  return { requestId };
}
