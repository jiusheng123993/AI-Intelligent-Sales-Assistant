/**
 * background AI handler 测试。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleSuggestStart } from '@/background/handlers/ai.handler';
import { MessageType } from '@shared/messaging/types';
import * as aiApiModule from '@shared/api/ai.api';
import { analyticsApi } from '@shared/api/analytics.api';

describe('handleSuggestStart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(analyticsApi, 'recordExtensionUsageEvent').mockResolvedValue(null);
  });

  it('立即返回 requestId，并异步广播 chunk/done', async () => {
    const send = vi.spyOn(chrome.runtime, 'sendMessage').mockResolvedValue({ ok: true });
    const spy = vi.spyOn(aiApiModule.aiApi, 'suggest').mockImplementation(async (_payload, opts) => {
      await opts.onChunk('hello', 0);
      await opts.onChunk(' world', 1);
    });
    const resp = await handleSuggestStart({
      contextText: '客户问价',
      mode: 'suggest',
      source: 'FLOATING_BUTTON',
      pageHost: 'work.weixin.qq.com',
    });
    expect(resp.requestId).toMatch(/^ai_/);

    await new Promise((r) => setTimeout(r, 0));
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageType.AI_SUGGEST_CHUNK,
        payload: expect.objectContaining({ requestId: resp.requestId }),
      }),
    );
    expect(analyticsApi.recordExtensionUsageEvent).toHaveBeenCalledWith(expect.objectContaining({
      source: 'FLOATING_BUTTON',
      mode: 'suggest',
      status: 'SUCCESS',
      pageHost: 'work.weixin.qq.com',
    }));
    spy.mockRestore();
    send.mockRestore();
  });

  it('aiApi 抛错时广播 error', async () => {
    const send = vi.spyOn(chrome.runtime, 'sendMessage').mockResolvedValue({ ok: true });
    const spy = vi.spyOn(aiApiModule.aiApi, 'suggest').mockRejectedValue(new Error('boom'));
    const resp = await handleSuggestStart({ contextText: 'x', mode: 'suggest', source: 'SIDEPANEL' });
    await vi.waitFor(() => expect(send).toHaveBeenCalledWith({
      type: MessageType.AI_SUGGEST_ERROR,
      payload: { requestId: resp.requestId, message: 'AI 推荐生成失败，请稍后重试' },
    }));
    expect(analyticsApi.recordExtensionUsageEvent).toHaveBeenCalledWith(expect.objectContaining({
      source: 'SIDEPANEL',
      mode: 'suggest',
      status: 'FAILED',
      errorCode: 'UNKNOWN',
    }));
    spy.mockRestore();
    send.mockRestore();
  });
});
