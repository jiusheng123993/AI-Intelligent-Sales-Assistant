/**
 * PhrasebookTab React 测试。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PhrasebookTab } from '@/sidepanel/tabs/PhrasebookTab';
import { usePhrasebookStore } from '@/sidepanel/stores/phrasebook.store';
import { phrasebookApi } from '@shared/phrasebook/phrasebook.api';
import { secureStorage } from '@shared/storage/secure-storage';
import { STORAGE_NS } from '@shared/storage/keys';

describe('PhrasebookTab', () => {
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

  it('初始显示空态', async () => {
    render(<PhrasebookTab />);
    await waitFor(() => expect(screen.getByText('话术库为空')).toBeInTheDocument());
  });

  it('新增话术并展示', async () => {
    render(<PhrasebookTab />);
    fireEvent.change(screen.getByLabelText('话术标题'), { target: { value: '报价' } });
    fireEvent.change(screen.getByLabelText('话术内容'), { target: { value: '价格说明' } });
    fireEvent.change(screen.getByLabelText('话术标签'), { target: { value: '报价,常用' } });
    fireEvent.submit(screen.getByLabelText('新增话术表单'));
    await waitFor(() => expect(usePhrasebookStore.getState().phrases).toHaveLength(1));
    expect(screen.getByText('价格说明')).toBeInTheDocument();
    expect(screen.getAllByText('报价').length).toBeGreaterThan(0);
    expect(screen.getAllByText('常用').length).toBeGreaterThan(0);
  });

  it('非法新增显示错误', async () => {
    render(<PhrasebookTab />);
    fireEvent.submit(screen.getByLabelText('新增话术表单'));
    await waitFor(() => expect(screen.getByText(/不可为空|长度/)).toBeInTheDocument());
  });

  it('搜索过滤', async () => {
    await usePhrasebookStore.getState().create({ title: '报价', content: '价格说明', tags: ['报价'] });
    await usePhrasebookStore.getState().create({ title: '售后', content: '服务说明', tags: ['售后'] });
    render(<PhrasebookTab />);
    await waitFor(() => expect(screen.getByText('价格说明')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('搜索话术'), { target: { value: '服务' } });
    expect(screen.queryByText('价格说明')).not.toBeInTheDocument();
    expect(screen.getByText('服务说明')).toBeInTheDocument();
  });

  it('复制调用 clipboard', async () => {
    await usePhrasebookStore.getState().create({ title: '报价', content: '复制内容' });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<PhrasebookTab />);
    await waitFor(() => expect(screen.getByText('报价')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '复制' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('复制内容'));
  });

  it('删除话术', async () => {
    await usePhrasebookStore.getState().create({ title: '报价', content: '价格说明' });
    render(<PhrasebookTab />);
    await waitFor(() => expect(screen.getByText('报价')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '删除' }));
    await waitFor(() => expect(screen.queryByText('报价')).not.toBeInTheDocument());
  });
});
