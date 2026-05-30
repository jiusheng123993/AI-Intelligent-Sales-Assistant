import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiConfig, setApiConfig } from '@shared/api/env';
import { phrasebookApi } from '@shared/phrasebook/phrasebook.api';

const originalFetch = globalThis.fetch;

describe('phrasebookApi', () => {
  const originalConfig = { ...apiConfig };

  beforeEach(() => {
    setApiConfig({ baseUrl: 'http://localhost:3000', useMock: false, timeoutMs: 10000 });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    setApiConfig(originalConfig);
    vi.restoreAllMocks();
  });

  it('sync 将本地话术创建到后端并返回远端标准格式', async () => {
    const remoteScript = {
      id: 'srv_1',
      title: '报价',
      content: '这是报价说明',
      category: 'CUSTOM',
      tags: ['报价'],
      isShared: false,
      isPreset: false,
      createdById: 'u1',
      teamId: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:01.000Z',
    };
    globalThis.fetch = vi.fn(async (input, init) => {
      const url = String(input);
      if (url === 'http://localhost:3000/scripts' && init?.method === 'POST') {
        expect(JSON.parse(String(init.body))).toMatchObject({
          title: '报价',
          content: '这是报价说明',
          category: 'CUSTOM',
          tags: ['报价'],
          isShared: false,
        });
        return new Response(JSON.stringify(remoteScript), { status: 200 });
      }
      if (url.startsWith('http://localhost:3000/scripts?') && init?.method === 'GET') {
        return new Response(JSON.stringify({ items: [remoteScript], total: 1, page: 1, pageSize: 50 }), { status: 200 });
      }
      throw new Error(`unexpected request ${url}`);
    });

    const synced = await phrasebookApi.sync([
      { id: 'ph_local', title: '报价', content: '这是报价说明', tags: ['报价'], createdAt: 1, updatedAt: 2 },
    ]);

    expect(synced).toEqual([
      { id: 'srv_1', title: '报价', content: '这是报价说明', tags: ['报价'], createdAt: 1767225600000, updatedAt: 1767225601000 },
    ]);
  });

  it('list 只返回个人自定义话术并过滤共享和预置话术', async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({
      items: [
        { id: 'a', title: '个人', content: '个人内容', category: 'CUSTOM', tags: [], isShared: false, isPreset: false, createdById: 'u1', teamId: null, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:01.000Z' },
        { id: 'b', title: '共享', content: '共享内容', category: 'CUSTOM', tags: [], isShared: true, isPreset: false, createdById: 'u1', teamId: 't1', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:01.000Z' },
        { id: 'c', title: '预置', content: '预置内容', category: 'CUSTOM', tags: [], isShared: false, isPreset: true, createdById: 'u1', teamId: null, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:01.000Z' },
      ],
      total: 3,
      page: 1,
      pageSize: 50,
    }), { status: 200 }));

    await expect(phrasebookApi.list()).resolves.toEqual([
      { id: 'a', title: '个人', content: '个人内容', tags: [], createdAt: 1767225600000, updatedAt: 1767225601000 },
    ]);
  });

  it('remove 只删除远端 id，本地临时 id 不请求后端', async () => {
    globalThis.fetch = vi.fn(async () => new Response(null, { status: 204 }));

    await phrasebookApi.remove('ph_local');
    await phrasebookApi.remove('srv_1');

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledWith('http://localhost:3000/scripts/srv_1', expect.objectContaining({ method: 'DELETE' }));
  });
});
