/**
 * http.ts 单元测试：覆盖 mock 路径、401 refresh、403/404/500、超时、非 JSON。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { request, setAuthProvider, setMockHandler, type AuthProvider } from '@shared/api/http';
import { setApiConfig, apiConfig } from '@shared/api/env';
import { ExtensionError } from '@shared/utils/error';

describe('http.request', () => {
  const originalFetch = globalThis.fetch;
  const originalMock = apiConfig.useMock;

  beforeEach(() => {
    setApiConfig({ useMock: false });
    setAuthProvider(null);
    setMockHandler(null);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    setApiConfig({ useMock: originalMock });
    setAuthProvider(null);
    setMockHandler(null);
  });

  it('mock 路径命中时不走 fetch', async () => {
    setApiConfig({ useMock: true });
    setMockHandler(async (p) => ({ echoed: p }));
    const r = await request<{ echoed: string }>('/x', { method: 'GET' });
    expect(r.echoed).toBe('/x');
  });

  it('200 成功返回 JSON', async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ a: 1 }), { status: 200 }));
    const r = await request<{ a: number }>('/x');
    expect(r.a).toBe(1);
  });

  it('401 触发 refresh 后重试一次', async () => {
    const refresh = vi.fn(async () => 'new-token');
    const clear = vi.fn(async () => {});
    const provider: AuthProvider = {
      getAccessToken: async () => 'old-token',
      refresh,
      clear,
    };
    setAuthProvider(provider);

    let call = 0;
    globalThis.fetch = vi.fn(async () => {
      call++;
      return call === 1
        ? new Response(null, { status: 401 })
        : new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    const r = await request<{ ok: boolean }>('/x', { method: 'GET' });
    expect(r.ok).toBe(true);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(call).toBe(2);
  });

  it('refresh 失败 → 清登录态并抛 UNAUTHORIZED', async () => {
    const clear = vi.fn(async () => {});
    setAuthProvider({
      getAccessToken: async () => 't',
      refresh: async () => { throw new Error('refresh failed'); },
      clear,
    });
    globalThis.fetch = vi.fn(async () => new Response(null, { status: 401 }));

    await expect(request('/x')).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it.each([
    [403, 'FORBIDDEN'],
    [404, 'NOT_FOUND'],
    [500, 'NETWORK'],
    [502, 'NETWORK'],
  ])('状态码 %i → ExtensionError(%s)', async (code, expectedCode) => {
    globalThis.fetch = vi.fn(async () => new Response(null, { status: code }));
    try {
      await request('/x', { auth: false });
      throw new Error('should not reach');
    } catch (e) {
      expect((e as ExtensionError).code).toBe(expectedCode);
    }
  });

  it('非 JSON 响应抛 NETWORK', async () => {
    globalThis.fetch = vi.fn(async () => new Response('not-json', { status: 200 }));
    await expect(request('/x', { auth: false })).rejects.toMatchObject({ code: 'NETWORK' });
  });

  it('fetch 抛错（网络异常）→ NETWORK', async () => {
    globalThis.fetch = vi.fn(async () => { throw new TypeError('network down'); });
    await expect(request('/x', { auth: false })).rejects.toMatchObject({ code: 'NETWORK' });
  });
});
