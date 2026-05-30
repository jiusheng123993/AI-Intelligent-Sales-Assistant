import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ScriptsPage } from './ScriptsPage';

vi.mock('@/api/scripts', () => ({
  createScript: vi.fn(),
  deleteScript: vi.fn(),
  listScripts: vi.fn(),
  updateScript: vi.fn(),
}));

import { createScript, deleteScript, listScripts, updateScript } from '@/api/scripts';

const script = {
  id: 'script-1',
  title: '标准开场白',
  content: '您好，我是销智顾问，想和您交流一下销售提效方案。',
  category: 'INTRODUCTION' as const,
  tags: ['开场', '新人'],
  isShared: false,
  isPreset: false,
  createdById: 'user-1',
  teamId: null,
  createdAt: '2026-05-30T00:00:00.000Z',
  updatedAt: '2026-05-30T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listScripts).mockResolvedValue({ items: [script], total: 1, page: 1, pageSize: 10 });
});

describe('ScriptsPage', () => {
  it('加载并展示话术列表', async () => {
    render(<ScriptsPage />);

    expect(await screen.findByText('标准开场白')).toBeInTheDocument();
    expect(screen.getByText('开场介绍')).toBeInTheDocument();
    expect(screen.getByText('开场')).toBeInTheDocument();
  });

  it('按关键词搜索话术', async () => {
    render(<ScriptsPage />);

    fireEvent.change(await screen.findByPlaceholderText('搜索标题或内容'), { target: { value: '异议' } });
    fireEvent.click(screen.getByRole('button', { name: /搜\s*索/ }));

    await waitFor(() => expect(listScripts).toHaveBeenLastCalledWith({ keyword: '异议', page: 1, pageSize: 10 }));
  });

  it('提交新建话术表单后刷新列表', async () => {
    vi.mocked(createScript).mockResolvedValue(script);
    render(<ScriptsPage />);

    fireEvent.click(await screen.findByRole('button', { name: '新建话术' }));
    fireEvent.change(screen.getByLabelText('标题'), { target: { value: '标准开场白' } });
    fireEvent.change(screen.getByLabelText('内容'), { target: { value: '您好，我是销智顾问，想和您交流一下销售提效方案。' } });
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() =>
      expect(createScript).toHaveBeenCalledWith({
        title: '标准开场白',
        content: '您好，我是销智顾问，想和您交流一下销售提效方案。',
        category: 'CUSTOM',
        tags: [],
        isShared: false,
      }),
    );
    expect(listScripts).toHaveBeenCalledTimes(2);
  });

  it('编辑话术后刷新列表', async () => {
    vi.mocked(updateScript).mockResolvedValue({ ...script, title: '更新后标题' });
    render(<ScriptsPage />);

    const row = await screen.findByText('标准开场白');
    fireEvent.click(within(row.closest('tr') as HTMLElement).getByRole('button', { name: /编\s*辑/ }));
    fireEvent.change(screen.getByLabelText('标题'), { target: { value: '更新后标题' } });
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => expect(updateScript).toHaveBeenCalledWith('script-1', expect.objectContaining({ title: '更新后标题' })));
    expect(listScripts).toHaveBeenCalledTimes(2);
  });

  it('删除话术前展示确认框，确认后刷新列表', async () => {
    vi.mocked(deleteScript).mockResolvedValue(undefined);
    render(<ScriptsPage />);

    fireEvent.click(await screen.findByRole('button', { name: /删\s*除/ }));
    fireEvent.click(await screen.findByRole('button', { name: /确\s*定/ }));

    await waitFor(() => expect(deleteScript).toHaveBeenCalledWith('script-1'));
    expect(listScripts).toHaveBeenCalledTimes(2);
  });

  it('加载失败时展示错误提示', async () => {
    vi.mocked(listScripts).mockRejectedValue(new Error('network error'));

    render(<ScriptsPage />);

    expect(await screen.findByText('话术列表加载失败，请稍后重试')).toBeInTheDocument();
  });
});
