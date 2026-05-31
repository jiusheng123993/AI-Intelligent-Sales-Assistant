/**
 * AI 推荐流式结果 store。
 *
 * 设计要点：
 * - Side Panel 本地状态，权威流来自 background runtime message；
 * - 支持 chunk/done/error 三类事件；
 * - 对 message 做运行时校验，避免恶意/异常消息污染状态；
 * - 保留最后一次请求结果，A9 可扩展为历史列表。
 */
import { create } from 'zustand';
import { MessageType } from '@shared/messaging/types';

export type SuggestionStatus = 'idle' | 'streaming' | 'done' | 'error';

export interface SuggestionState {
  requestId: string | null;
  status: SuggestionStatus;
  text: string;
  error: string | null;
  start: (requestId: string) => void;
  appendChunk: (requestId: string, chunk: string, index: number) => void;
  done: (requestId: string) => void;
  fail: (requestId: string, message: string) => void;
  clear: () => void;
  handleRuntimeMessage: (message: unknown) => void;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

export const useSuggestionsStore = create<SuggestionState>((set, get) => ({
  requestId: null,
  status: 'idle',
  text: '',
  error: null,

  start: (requestId) => set({ requestId, status: 'streaming', text: '', error: null }),

  appendChunk: (requestId, chunk) => {
    const s = get();
    if (s.requestId !== requestId) set({ requestId, status: 'streaming', text: '', error: null });
    set((cur) => ({ text: `${cur.text}${chunk}`, status: 'streaming' }));
  },

  done: (requestId) => {
    const s = get();
    if (s.requestId === requestId) set({ status: 'done' });
  },

  fail: (requestId, message) => {
    const s = get();
    if (s.requestId !== requestId) set({ requestId, text: '' });
    set({ status: 'error', error: message });
  },

  clear: () => set({ requestId: null, status: 'idle', text: '', error: null }),

  handleRuntimeMessage: (message) => {
    if (!isObject(message) || typeof message.type !== 'string' || !isObject(message.payload)) return;
    const payload = message.payload;
    if (message.type === MessageType.AI_SUGGEST_CHUNK) {
      if (
        typeof payload.requestId === 'string' &&
        typeof payload.text === 'string' &&
        typeof payload.index === 'number'
      ) {
        get().appendChunk(payload.requestId, payload.text, payload.index);
      }
      return;
    }
    if (message.type === MessageType.AI_SUGGEST_DONE) {
      if (typeof payload.requestId === 'string') get().done(payload.requestId);
      return;
    }
    if (message.type === MessageType.AI_SUGGEST_ERROR) {
      if (typeof payload.requestId === 'string' && typeof payload.message === 'string') {
        get().fail(payload.requestId, payload.message);
      }
    }
  },
}));

let runtimeListenerAttached = false;

/** 在 Side Panel 挂载时调用，订阅 background 推送；重复调用保持幂等。 */
export function attachSuggestionRuntimeListener(): void {
  if (runtimeListenerAttached) return;
  const runtime = (globalThis as { chrome?: typeof chrome }).chrome?.runtime;
  if (!runtime?.onMessage?.addListener) return;
  runtime.onMessage.addListener((message) => {
    useSuggestionsStore.getState().handleRuntimeMessage(message);
    return false;
  });
  runtimeListenerAttached = true;
}

/** 测试专用：重置模块级监听状态。 */
export function _resetSuggestionRuntimeListenerForTest(): void {
  runtimeListenerAttached = false;
}
