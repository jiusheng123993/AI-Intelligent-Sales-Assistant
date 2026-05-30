/**
 * content runtime-actions 测试。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { attachContentRuntimeActions } from '@/content/runtime-actions';
import { MessageType } from '@shared/messaging/types';
import type { ChatAdapter } from '@/content/adapters/base.adapter';

function makeAdapter(input: HTMLElement | null): ChatAdapter {
  return {
    site: 'wecom',
    matches: () => true,
    findInput: () => input,
    getInputText: () => 'draft',
    insertText: vi.fn(),
    collectMessages: () => [{ role: 'customer', text: 'ctx' }],
  };
}

describe('attachContentRuntimeActions', () => {
  beforeEach(() => vi.clearAllMocks());

  function captureListener() {
    attachContentRuntimeActions(makeAdapter(document.createElement('textarea')));
    return vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0][0];
  }

  it('CONTENT_COLLECT_CONTEXT 返回上下文和输入草稿', () => {
    const listener = captureListener();
    const sendResponse = vi.fn();
    const keep = listener(
      { type: MessageType.CONTENT_COLLECT_CONTEXT, payload: { mode: 'suggest', selectedText: 'sel' } },
      {} as chrome.runtime.MessageSender,
      sendResponse,
    );
    expect(keep).toBe(true);
    expect(sendResponse).toHaveBeenCalledWith({ contextText: 'sel\ncustomer: ctx', inputText: 'draft' });
  });

  it('CONTENT_INSERT_TEXT 找不到输入框返回失败', () => {
    vi.clearAllMocks();
    attachContentRuntimeActions(makeAdapter(null));
    const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0][0];
    const sendResponse = vi.fn();
    listener({ type: MessageType.CONTENT_INSERT_TEXT, payload: { text: 'x' } }, {} as chrome.runtime.MessageSender, sendResponse);
    expect(sendResponse).toHaveBeenCalledWith({ ok: false, reason: 'input_not_found' });
  });

  it('CONTENT_INSERT_TEXT 成功插入', () => {
    const input = document.createElement('textarea');
    const adapter = makeAdapter(input);
    attachContentRuntimeActions(adapter);
    const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0][0];
    const sendResponse = vi.fn();
    listener({ type: MessageType.CONTENT_INSERT_TEXT, payload: { text: 'x' } }, {} as chrome.runtime.MessageSender, sendResponse);
    expect(adapter.insertText).toHaveBeenCalledWith(input, 'x');
    expect(sendResponse).toHaveBeenCalledWith({ ok: true });
  });
});
