/**
 * phrasebook.service 单元测试。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { phrasebookService, normalizeTags, validatePhraseInput } from '@shared/phrasebook/phrasebook.service';
import { phrasebookApi } from '@shared/phrasebook/phrasebook.api';
import { secureStorage } from '@shared/storage/secure-storage';
import { STORAGE_NS } from '@shared/storage/keys';

describe('phrasebookService', () => {
  beforeEach(async () => {
    vi.spyOn(phrasebookApi, 'list').mockRejectedValue(new Error('offline'));
    vi.spyOn(phrasebookApi, 'sync').mockResolvedValue([]);
    vi.spyOn(phrasebookApi, 'remove').mockResolvedValue();
    await secureStorage.removeItem(STORAGE_NS.PHRASEBOOK_CACHE).catch(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('normalizeTags 去重、裁剪、最多5个', () => {
    expect(normalizeTags([' a ', 'a', 'b', 'c', 'd', 'e', 'f'])).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(normalizeTags('bad')).toEqual([]);
  });

  it('validatePhraseInput 校验标题和内容', () => {
    expect(validatePhraseInput({ title: ' t ', content: ' c ', tags: ['x'] })).toEqual({
      title: 't',
      content: 'c',
      tags: ['x'],
    });
    expect(() => validatePhraseInput({ title: '', content: 'c' })).toThrow();
    expect(() => validatePhraseInput({ title: 't', content: '' })).toThrow();
  });

  it('create/list 创建并按 updatedAt 倒序', async () => {
    const a = await phrasebookService.create({ title: 'A', content: 'aaa', tags: ['报价'] });
    const b = await phrasebookService.create({ title: 'B', content: 'bbb' });
    const list = await phrasebookService.list();
    expect(list[0].id).toBe(b.id);
    expect(list[1].id).toBe(a.id);
  });

  it('list 优先加载远端个人话术并写入本地缓存', async () => {
    const remote = [{ id: 'srv_1', title: '云端', content: '云端内容', tags: ['同步'], createdAt: 1, updatedAt: 3 }];
    vi.mocked(phrasebookApi.list).mockResolvedValue(remote);

    await expect(phrasebookService.list()).resolves.toEqual(remote);
    await expect(secureStorage.getItem(STORAGE_NS.PHRASEBOOK_CACHE)).resolves.toEqual(remote);
  });

  it('list 远端失败时回退本地缓存', async () => {
    vi.mocked(phrasebookApi.list).mockRejectedValue(new Error('offline'));
    const cached = [{ id: 'srv_1', title: '本地', content: '本地内容', tags: [], createdAt: 1, updatedAt: 2 }];
    await secureStorage.setItem(STORAGE_NS.PHRASEBOOK_CACHE, cached);

    await expect(phrasebookService.list()).resolves.toEqual(cached);
  });

  it('update 更新指定话术', async () => {
    const a = await phrasebookService.create({ title: 'A', content: 'aaa' });
    const u = await phrasebookService.update(a.id, { title: 'A2', content: 'bbb', tags: ['成交'] });
    expect(u.title).toBe('A2');
    expect((await phrasebookService.list())[0].content).toBe('bbb');
  });

  it('update 不存在 id 抛 NOT_FOUND', async () => {
    await expect(phrasebookService.update('missing', { title: 'A', content: 'B' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('remove 幂等', async () => {
    const a = await phrasebookService.create({ title: 'A', content: 'aaa' });
    await phrasebookService.remove(a.id);
    await phrasebookService.remove(a.id);
    expect(await phrasebookService.list()).toHaveLength(0);
  });

  it('remove 删除远端 id 时触发云端删除', async () => {
    await secureStorage.setItem(STORAGE_NS.PHRASEBOOK_CACHE, [
      { id: 'srv_1', title: 'A', content: 'aaa', tags: [], createdAt: 1, updatedAt: 2 },
    ]);

    await phrasebookService.remove('srv_1');

    expect(phrasebookApi.remove).toHaveBeenCalledWith('srv_1');
  });

  it('search 支持 query 和 tag', async () => {
    const phrases = [
      { id: '1', title: '报价', content: '价格说明', tags: ['报价'], createdAt: 1, updatedAt: 1 },
      { id: '2', title: '售后', content: '服务说明', tags: ['售后'], createdAt: 1, updatedAt: 1 },
    ];
    expect(phrasebookService.search(phrases, '价格')).toHaveLength(1);
    expect(phrasebookService.search(phrases, '', '售后')).toHaveLength(1);
    expect(phrasebookService.search(phrases, '不存在')).toHaveLength(0);
  });

  it('脏 storage 数据被过滤', async () => {
    await secureStorage.setItem(STORAGE_NS.PHRASEBOOK_CACHE, [{ bad: true }, { id: '1', title: 'T', content: 'C', tags: [], createdAt: 1, updatedAt: 1 }]);
    const list = await phrasebookService.list();
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe('T');
  });
});
