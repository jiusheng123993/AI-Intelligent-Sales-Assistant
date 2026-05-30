import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { apiConfig, setApiConfig } from '@shared/api/env';
import { request, setAuthProvider, setMockHandler } from '@shared/api/http';
import { authApi } from '@shared/api/auth.api';
import { tokenManager } from '@shared/auth/token-manager';
import { secureStorage } from '@shared/storage/secure-storage';
import { aiApi } from '@shared/api/ai.api';
import { collectSseEvents, parseSseLines } from '@shared/api/sse';
import { handleSuggestStart } from '@/background/handlers/ai.handler';
import { MessageType } from '@shared/messaging/types';

const originalFetch = globalThis.fetch;

function makeStream(text: string) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });
}

describe('B2 real backend integration contracts', () => {
  beforeEach(async () => {
    await secureStorage.clear().catch(() => {});
    await tokenManager.clear();
    setAuthProvider(tokenManager.asAuthProvider());
    setMockHandler(null);
    setApiConfig({ baseUrl: 'http://localhost:3000', useMock: false, timeoutMs: 10000 });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    setApiConfig({ useMock: true });
    setAuthProvider(null);
    setMockHandler(null);
  });

  it('defaults to real backend outside explicit test mock mode', () => {
    setApiConfig({ useMock: false });

    expect(apiConfig.useMock).toBe(false);
    expect(apiConfig.baseUrl).toBe('http://localhost:3000');
  });

  it('sends requests to the configured real backend when mock is disabled', async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));

    await request('/health', { auth: false });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/health',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('normalizes backend auth login response when refresh token is absent', async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({
      accessToken: 'real-at',
      user: { id: 'u1', email: 'a@b.com', name: 'A', role: 'SALES' },
    }), { status: 200 }));

    const response = await authApi.login('a@b.com', 'password123');

    expect(response.refreshToken).toBeNull();
    expect(response.user.role).toBe('sales');
  });

  it('stores sessions without refresh token and treats refresh as unauthorized', async () => {
    await tokenManager.setSession({
      accessToken: 'real-at',
      refreshToken: null,
      user: { id: 'u1', email: 'a@b.com', name: 'A', role: 'sales' },
    });

    expect(await tokenManager.isLoggedIn()).toBe(true);
    await expect(tokenManager.refresh()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('parses SSE events split across network chunks', async () => {
    const stream = makeStream('event: chunk\ndata: {"text":"你"}\n\nevent: chunk\ndata: {"text":"好"}\n\nevent: done\ndata: {"requestId":"ai_1"}\n\n');

    const events = await collectSseEvents(stream);

    expect(events).toEqual([
      { event: 'chunk', data: '{"text":"你"}' },
      { event: 'chunk', data: '{"text":"好"}' },
      { event: 'done', data: '{"requestId":"ai_1"}' },
    ]);
    expect(parseSseLines('event: chunk\ndata: hello\n\n')).toEqual(['hello']);
  });

  it('streams AI suggestion from real /ai/suggest SSE endpoint', async () => {
    await tokenManager.setSession({
      accessToken: 'real-at',
      refreshToken: null,
      user: { id: 'u1', email: 'a@b.com', name: 'A', role: 'sales' },
    });
    globalThis.fetch = vi.fn(async () => new Response(makeStream('event: chunk\ndata: {"text":"推荐","index":0}\n\nevent: chunk\ndata: {"text":"回复","index":1}\n\nevent: done\ndata: {"requestId":"ai_1"}\n\n'), {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    }));
    const chunks: string[] = [];

    await aiApi.suggest(
      { contextText: '客户问价格', inputText: '', mode: 'suggest', locale: 'zh-CN', platform: 'extension' },
      { onChunk: (chunk) => { chunks.push(chunk); } },
    );

    expect(chunks.join('')).toBe('推荐回复');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/ai/suggest',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer real-at', Accept: 'text/event-stream' }),
      }),
    );
  });

  it('emits AI chunks before the SSE stream closes', async () => {
    await tokenManager.setSession({
      accessToken: 'real-at',
      refreshToken: null,
      user: { id: 'u1', email: 'a@b.com', name: 'A', role: 'sales' },
    });
    let finishStream: () => void = () => {
      throw new Error('stream controller not initialized');
    };
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        finishStream = () => {
          controller.enqueue(new TextEncoder().encode('event: done\ndata: {"requestId":"ai_1"}\n\n'));
          controller.close();
        };
        controller.enqueue(new TextEncoder().encode('event: chunk\ndata: {"text":"即时","index":0}\n\n'));
      },
    });
    globalThis.fetch = vi.fn(async () => new Response(stream, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    }));
    const chunks: string[] = [];
    const pending = aiApi.suggest(
      { contextText: '客户问价格', inputText: '', mode: 'suggest', locale: 'zh-CN', platform: 'extension' },
      { onChunk: (chunk) => { chunks.push(chunk); } },
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(chunks).toEqual(['即时']);
    finishStream();
    await pending;
  });

  it('converts backend SSE error event to safe extension error broadcast', async () => {
    const send = vi.spyOn(chrome.runtime, 'sendMessage').mockResolvedValue({ ok: true });
    vi.spyOn(aiApi, 'suggest').mockRejectedValue(new Error('upstream secret stack'));

    const response = await handleSuggestStart({ contextText: 'x', mode: 'suggest' });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(send).toHaveBeenCalledWith({
      type: MessageType.AI_SUGGEST_ERROR,
      payload: { requestId: response.requestId, message: 'AI 推荐生成失败，请稍后重试' },
    });
  });
});
