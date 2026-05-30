/**
 * auth.store 单元测试。
 * 通过 setTransport 注入消息层伪实现。
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useAuthStore } from '@/sidepanel/stores/auth.store';
import { setTransport, resetTransport, type MessageTransport } from '@shared/messaging/send';

function fakeTransport(impl: (req: { type: string; payload: unknown }) => Promise<unknown>): MessageTransport {
  return { send: (req) => impl(req as { type: string; payload: unknown }) };
}

describe('auth.store', () => {
  beforeEach(() => {
    useAuthStore.setState({ status: 'loading', user: null });
  });
  afterEach(() => resetTransport());

  it('refresh 命中已登录 → status=authed', async () => {
    const user = { id: 'u1', email: 'a@b.com', name: 'A', role: 'sales' as const };
    setTransport(fakeTransport(async () => ({ loggedIn: true, user })));
    await useAuthStore.getState().refresh();
    expect(useAuthStore.getState().status).toBe('authed');
    expect(useAuthStore.getState().user).toEqual(user);
  });

  it('refresh 命中未登录 → status=anon', async () => {
    setTransport(fakeTransport(async () => ({ loggedIn: false })));
    await useAuthStore.getState().refresh();
    expect(useAuthStore.getState().status).toBe('anon');
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('refresh 异常 → 降级 anon，不抛错', async () => {
    setTransport(fakeTransport(async () => { throw new Error('boom'); }));
    await useAuthStore.getState().refresh();
    expect(useAuthStore.getState().status).toBe('anon');
  });

  it('logout 后状态归零', async () => {
    useAuthStore.setState({
      status: 'authed',
      user: { id: 'u', email: 'e', name: 'n', role: 'sales' },
    });
    setTransport(fakeTransport(async () => ({ ok: true })));
    await useAuthStore.getState().logout();
    expect(useAuthStore.getState().status).toBe('anon');
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('logout 失败也强制本地清空', async () => {
    useAuthStore.setState({
      status: 'authed',
      user: { id: 'u', email: 'e', name: 'n', role: 'sales' },
    });
    setTransport(fakeTransport(async () => { throw new Error('boom'); }));
    await useAuthStore.getState().logout();
    expect(useAuthStore.getState().status).toBe('anon');
  });
});
