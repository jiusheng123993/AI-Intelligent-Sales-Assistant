/**
 * SuggestionsTab UI 测试。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SuggestionsTab } from '@/sidepanel/tabs/SuggestionsTab';
import { useSuggestionsStore } from '@/sidepanel/stores/suggestions.store';

describe('SuggestionsTab', () => {
  beforeEach(() => {
    useSuggestionsStore.setState({ requestId: null, status: 'idle', text: '', error: null });
  });

  it('idle 显示空态', () => {
    render(<SuggestionsTab />);
    expect(screen.getByText('暂无推荐')).toBeInTheDocument();
  });

  it('streaming 显示生成中与文本', () => {
    useSuggestionsStore.setState({ requestId: 'r1', status: 'streaming', text: 'hello', error: null });
    render(<SuggestionsTab />);
    expect(screen.getByText('生成中…')).toBeInTheDocument();
    expect(screen.getByText(/hello/)).toBeInTheDocument();
  });

  it('error 显示错误与清空按钮', () => {
    useSuggestionsStore.setState({ requestId: 'r1', status: 'error', text: '', error: 'bad' });
    render(<SuggestionsTab />);
    expect(screen.getByText('推荐失败')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '清空' }));
    expect(useSuggestionsStore.getState().status).toBe('idle');
  });

  it('复制按钮调用 clipboard', async () => {
    useSuggestionsStore.setState({ requestId: 'r1', status: 'done', text: 'copy me', error: null });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    render(<SuggestionsTab />);
    fireEvent.click(screen.getByRole('button', { name: '复制' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('copy me'));
  });
});
