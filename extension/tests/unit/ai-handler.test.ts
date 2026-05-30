/**
 * background AI handler 测试。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleSuggestStart } from '@/background/handlers/ai.handler';
import { MessageType } from '@shared/messaging/types';
import * as aiApiModule from '@shared/api/ai.api';

describe('handleSuggestStart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('立即返回 requestId，并异步广播 chunk/done', async () => {
    const send = vi.spyOn(chrome.runtime, 'sendMessage').mockResolvedValue({ ok: true });
    const spy = vi.spyOn(aiApiModule.aiApi, 'suggest').mockImplementation(async (_payload, opts) => {
      await opts.onChunk('hello', 0);
      await opts.onChunk(' world', 1);
    });
    const resp = await handleSuggestStart({ contextText: '客户问价', mode: 'suggest' });
    expect(resp.requestId).toMatch(/^ai_/);

    await new Promise((r) => setTimeout(r, 0));
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageType.AI_SUGGEST_CHUNK,
        payload: expect.objectContaining({ requestId: resp.requestId }),
      }),
    );
    expect(send).toHaveBeenCalledWith({
      type: MessageType.AI_SUGGEST_DONE,
      payload: { requestId: resp.requestId },
    });
    spy.mockRestore();
    send.mockRestore();
  });

  it('aiApi 抛错时广播 error', async () => {
    const send = vi.spyOn(chrome.runtime, 'sendMessage').mockResolvedValue({ ok: true });
    const spy = vi.spyOn(aiApiModule.aiApi, 'suggest').mockRejectedValue(new Error('boom'));
    const resp = await handleSuggestStart({ contextText: 'x', mode: 'suggest' });
    await new Promise((r) => setTimeout(r, 0));
    expect(send).toHaveBeenCalledWith({
      type: MessageType.AI_SUGGEST_ERROR,
      payload: { requestId: resp.requestId, message: 'boom' },
    });
    spy.mockRestore();
    send.mockRestore();
  });
});
