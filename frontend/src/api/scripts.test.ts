import { describe, expect, it, vi } from 'vitest';
import { http } from './http';
import { createScript, deleteScript, getScript, listScripts, updateScript } from './scripts';

vi.mock('./http', () => ({
  http: {
    delete: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}));

const script = {
  id: 'script-1',
  title: '标准开场白',
  content: '您好，我是销智顾问，想和您交流一下销售提效方案。',
  category: 'INTRODUCTION' as const,
  tags: ['开场'],
  isShared: false,
  isPreset: false,
  createdById: 'user-1',
  teamId: null,
  createdAt: '2026-05-30T00:00:00.000Z',
  updatedAt: '2026-05-30T00:00:00.000Z',
};

describe('scripts api', () => {
  it('查询话术列表', async () => {
    vi.mocked(http.get).mockResolvedValueOnce({ data: { items: [script], total: 1, page: 1, pageSize: 10 } });

    const result = await listScripts({ keyword: '开场', category: 'INTRODUCTION', page: 1, pageSize: 10 });

    expect(http.get).toHaveBeenCalledWith('/scripts', {
      params: { keyword: '开场', category: 'INTRODUCTION', page: 1, pageSize: 10 },
    });
    expect(result.items).toEqual([script]);
  });

  it('创建话术', async () => {
    vi.mocked(http.post).mockResolvedValueOnce({ data: script });

    const result = await createScript({
      title: '标准开场白',
      content: '您好，我是销智顾问，想和您交流一下销售提效方案。',
      category: 'INTRODUCTION',
      tags: ['开场'],
      isShared: false,
    });

    expect(http.post).toHaveBeenCalledWith('/scripts', {
      title: '标准开场白',
      content: '您好，我是销智顾问，想和您交流一下销售提效方案。',
      category: 'INTRODUCTION',
      tags: ['开场'],
      isShared: false,
    });
    expect(result).toEqual(script);
  });

  it('获取话术详情', async () => {
    vi.mocked(http.get).mockResolvedValueOnce({ data: script });

    const result = await getScript('script-1');

    expect(http.get).toHaveBeenCalledWith('/scripts/script-1');
    expect(result).toEqual(script);
  });

  it('更新话术', async () => {
    vi.mocked(http.patch).mockResolvedValueOnce({ data: { ...script, title: '更新后标题' } });

    const result = await updateScript('script-1', { title: '更新后标题' });

    expect(http.patch).toHaveBeenCalledWith('/scripts/script-1', { title: '更新后标题' });
    expect(result.title).toBe('更新后标题');
  });

  it('删除话术', async () => {
    vi.mocked(http.delete).mockResolvedValueOnce({ data: undefined });

    await deleteScript('script-1');

    expect(http.delete).toHaveBeenCalledWith('/scripts/script-1');
  });
});
