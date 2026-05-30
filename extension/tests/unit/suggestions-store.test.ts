/**
 * suggestions.store 测试。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  _resetSuggestionRuntimeListenerForTest,
  attachSuggestionRuntimeListener,
  useSuggestionsStore,
} from '@/sidepanel/stores/suggestions.store';
import { MessageType } from '@shared/messaging/types';

describe('suggestions.store', () => {
  beforeEach(() => {
    useSuggestionsStore.setState({ requestId: null, status: 'idle', text: '', error: null });
    _resetSuggestionRuntimeListenerForTest();
  });

  it('start 初始化 streaming 状态', () => {
    useSuggestionsStore.getState().start('r1');
    expect(useSuggestionsStore.getState().status).toBe('streaming');
    expect(useSuggestionsStore.getState().requestId).toBe('r1');
  });

  it('appendChunk 拼接文本，done 完成', () => {
    const s = useSuggestionsStore.getState();
    s.appendChunk('r1', 'hello', 0);
    s.appendChunk('r1', ' world', 1);
    expect(useSuggestionsStore.getState().text).toBe('hello world');
    s.done('r1');
    expect(useSuggestionsStore.getState().status).toBe('done');
  });

  it('fail 设置错误态', () => {
    useSuggestionsStore.getState().fail('r1', 'bad');
    expect(useSuggestionsStore.getState().status).toBe('error');
    expect(useSuggestionsStore.getState().error).toBe('bad');
  });

  it('handleRuntimeMessage 处理 chunk/done/error', () => {
    const s = useSuggestionsStore.getState();
    s.handleRuntimeMessage({
      type: MessageType.AI_SUGGEST_CHUNK,
      payload: { requestId: 'r1', text: 'a', index: 0 },
    });
    expect(useSuggestionsStore.getState().text).toBe('a');
    s.handleRuntimeMessage({ type: MessageType.AI_SUGGEST_DONE, payload: { requestId: 'r1' } });
    expect(useSuggestionsStore.getState().status).toBe('done');
    s.handleRuntimeMessage({
      type: MessageType.AI_SUGGEST_ERROR,
      payload: { requestId: 'r2', message: 'bad' },
    });
    expect(useSuggestionsStore.getState().status).toBe('error');
  });

  it('非法消息被忽略', () => {
    useSuggestionsStore.getState().handleRuntimeMessage(null);
    useSuggestionsStore.getState().handleRuntimeMessage({ type: MessageType.AI_SUGGEST_CHUNK, payload: {} });
    expect(useSuggestionsStore.getState().status).toBe('idle');
  });

  it('clear 回到 idle', () => {
    useSuggestionsStore.getState().fail('r1', 'bad');
    useSuggestionsStore.getState().clear();
    expect(useSuggestionsStore.getState()).toMatchObject({
      requestId: null,
      status: 'idle',
      text: '',
      error: null,
    });
  });

  it('attachSuggestionRuntimeListener 重复调用幂等', () => {
    const addListener = vi.spyOn(chrome.runtime.onMessage, 'addListener');
    attachSuggestionRuntimeListener();
    attachSuggestionRuntimeListener();
    expect(addListener).toHaveBeenCalledTimes(1);
  });
});
