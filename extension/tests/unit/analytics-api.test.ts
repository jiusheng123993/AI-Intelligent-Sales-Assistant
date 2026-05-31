import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { analyticsApi } from '@shared/api/analytics.api';
import { apiConfig, setApiConfig } from '@shared/api/env';

const originalFetch = globalThis.fetch;

describe('analyticsApi', () => {
  const originalConfig = { ...apiConfig };

  beforeEach(() => {
    setApiConfig({ baseUrl: 'http://localhost:3000', useMock: false, timeoutMs: 10000 });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    setApiConfig(originalConfig);
    vi.restoreAllMocks();
  });

  it('recordExtensionUsageEvent 上报扩展 AI 推荐触发事件', async () => {
    globalThis.fetch = vi.fn(async (input, init) => {
      expect(input).toBe('http://localhost:3000/analytics/extension-events');
      expect(init).toMatchObject({ method: 'POST' });
      expect(JSON.parse(String(init?.body))).toEqual({
        source: 'SIDEPANEL',
        mode: 'suggest',
        status: 'SUCCESS',
        durationMs: 1200,
        pageHost: 'work.weixin.qq.com',
      });
      return new Response(JSON.stringify({ id: 'event-1', createdAt: '2026-05-31T08:00:00.000Z' }), { status: 200 });
    });

    await expect(analyticsApi.recordExtensionUsageEvent({
      source: 'SIDEPANEL',
      mode: 'suggest',
      status: 'SUCCESS',
      durationMs: 1200,
      pageHost: 'work.weixin.qq.com',
    })).resolves.toEqual({ id: 'event-1', createdAt: '2026-05-31T08:00:00.000Z' });
  });

  it('recordExtensionUsageEvent 省略未提供的可选字段', async () => {
    globalThis.fetch = vi.fn(async (_input, init) => {
      expect(JSON.parse(String(init?.body))).toEqual({
        source: 'COMMAND',
        mode: 'translate',
        status: 'FAILED',
        errorCode: 'AI_TIMEOUT',
      });
      return new Response(JSON.stringify({ id: 'event-2', createdAt: '2026-05-31T08:01:00.000Z' }), { status: 200 });
    });

    await analyticsApi.recordExtensionUsageEvent({
      source: 'COMMAND',
      mode: 'translate',
      status: 'FAILED',
      errorCode: 'AI_TIMEOUT',
    });
  });

  it('recordExtensionUsageEvent 失败时静默吞掉异常', async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ message: 'bad request' }), { status: 400 }));

    await expect(analyticsApi.recordExtensionUsageEvent({
      source: 'CONTEXT_MENU',
      mode: 'polish',
      status: 'SUCCESS',
    })).resolves.toBeNull();
  });
});
