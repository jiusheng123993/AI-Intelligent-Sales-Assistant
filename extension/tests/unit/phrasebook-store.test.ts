/**
 * phrasebook UI store 单元测试。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { usePhrasebookStore } from '@/sidepanel/stores/phrasebook.store';
import { phrasebookApi } from '@shared/phrasebook/phrasebook.api';
import { secureStorage } from '@shared/storage/secure-storage';
import { STORAGE_NS } from '@shared/storage/keys';

describe('phrasebook.store', () => {
  beforeEach(async () => {
    vi.spyOn(phrasebookApi, 'list').mockRejectedValue(new Error('offline'));
    vi.spyOn(phrasebookApi, 'sync').mockResolvedValue([]);
    vi.spyOn(phrasebookApi, 'remove').mockResolvedValue();
    await secureStorage.removeItem(STORAGE_NS.PHRASEBOOK_CACHE).catch(() => {});
    usePhrasebookStore.setState({ loading: false, error: null, phrases: [], query: '', activeTag: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('load 空列表', async () => {
    await usePhrasebookStore.getState().load();
    expect(usePhrasebookStore.getState().phrases).toEqual([]);
  });

  it('create/update/remove', async () => {
    await usePhrasebookStore.getState().create({ title: 'A', content: 'aaa', tags: ['x'] });
    const id = usePhrasebookStore.getState().phrases[0].id;
    await usePhrasebookStore.getState().update(id, { title: 'B', content: 'bbb', tags: ['y'] });
    expect(usePhrasebookStore.getState().phrases[0].title).toBe('B');
    await usePhrasebookStore.getState().remove(id);
    expect(usePhrasebookStore.getState().phrases).toHaveLength(0);
  });

  it('setQuery/setActiveTag + filtered', async () => {
    await usePhrasebookStore.getState().create({ title: '报价', content: '价格', tags: ['报价'] });
    await usePhrasebookStore.getState().create({ title: '售后', content: '服务', tags: ['售后'] });
    usePhrasebookStore.getState().setQuery('价格');
    expect(usePhrasebookStore.getState().filtered()).toHaveLength(1);
    usePhrasebookStore.getState().setQuery('');
    usePhrasebookStore.getState().setActiveTag('售后');
    expect(usePhrasebookStore.getState().filtered()[0].title).toBe('售后');
  });

  it('tags 去重排序', async () => {
    await usePhrasebookStore.getState().create({ title: 'A', content: 'a', tags: ['b', 'a'] });
    await usePhrasebookStore.getState().create({ title: 'B', content: 'b', tags: ['a'] });
    expect(usePhrasebookStore.getState().tags()).toEqual(['a', 'b']);
  });
});
