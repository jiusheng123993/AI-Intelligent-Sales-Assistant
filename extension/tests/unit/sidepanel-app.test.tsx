/**
 * Side Panel 组件 React 测试。
 * - 仅覆盖根组件三态切换 + TabNav 点击切换；
 * - 详细业务测试留给后续 A6/A7 子任务。
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SidePanelApp } from '@/sidepanel/SidePanelApp';
import { useAuthStore } from '@/sidepanel/stores/auth.store';
import { useUiStore } from '@/sidepanel/stores/ui.store';
import { setTransport, resetTransport, type MessageTransport } from '@shared/messaging/send';

function fakeTransport(impl: (req: { type: string }) => Promise<unknown>): MessageTransport {
  return { send: (req) => impl(req as { type: string }) };
}

describe('SidePanelApp', () => {
  beforeEach(() => {
    useAuthStore.setState({ status: 'loading', user: null });
    useUiStore.setState({ currentTab: 'suggestions', toasts: [] });
  });
  afterEach(() => resetTransport());

  it('anon 状态显示登录引导', async () => {
    setTransport(fakeTransport(async () => ({ loggedIn: false })));
    render(<SidePanelApp />);
    await waitFor(() => expect(screen.getByText('未登录')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /我已登录/ })).toBeInTheDocument();
  });

  it('authed 状态显示 TabNav 与默认 Tab', async () => {
    setTransport(
      fakeTransport(async () => ({
        loggedIn: true,
        user: { id: 'u1', email: 'a@b.com', name: 'Alice', role: 'sales' },
      })),
    );
    render(<SidePanelApp />);
    await waitFor(() => expect(screen.getByRole('tablist')).toBeInTheDocument());
    expect(screen.getByText('暂无推荐')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('点击 Tab 切换内容', async () => {
    setTransport(
      fakeTransport(async () => ({
        loggedIn: true,
        user: { id: 'u1', email: 'a@b.com', name: 'A', role: 'sales' },
      })),
    );
    render(<SidePanelApp />);
    await waitFor(() => expect(screen.getByRole('tablist')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('tab', { name: '话术库' }));
    expect(screen.getByText('话术库为空')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: '设置' }));
    expect(screen.getByText('账户')).toBeInTheDocument();
  });
});
