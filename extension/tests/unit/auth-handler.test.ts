/**
 * auth.handler 单元测试：覆盖参数校验、登录成功、凭证错误、登出、状态查询。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { handleLogin, handleLogout, handleAuthStatus } from '@/background/handlers/auth.handler';
import { tokenManager } from '@shared/auth/token-manager';
import { secureStorage } from '@shared/storage/secure-storage';
import { setApiConfig } from '@shared/api/env';
import { setMockHandler } from '@shared/api/http';
import { mockBackend } from '@/background/mock-backend';

describe('auth.handler', () => {
  beforeEach(async () => {
    await secureStorage.clear().catch(() => {});
    await tokenManager.clear();
    setApiConfig({ useMock: true });
    setMockHandler(mockBackend);
  });

  it('非法 email 直接返回 ok:false', async () => {
    const r = await handleLogin({ email: 'not-email', password: 'demo1234' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('email');
  });

  it('密码过短直接返回 ok:false', async () => {
    const r = await handleLogin({ email: 'a@b.com', password: '123' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('password');
  });

  it('成功登录后写入 tokenManager 并返回 user', async () => {
    const r = await handleLogin({ email: 'a@b.com', password: 'demo1234' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.user.email).toBe('a@b.com');
      expect(['sales', 'manager', 'admin']).toContain(r.user.role);
    }
    expect(await tokenManager.isLoggedIn()).toBe(true);
  });

  it('错误密码返回 ok:false 且不写入 tokenManager', async () => {
    const r = await handleLogin({ email: 'a@b.com', password: 'wrongpass' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('邮箱或密码错误');
    expect(await tokenManager.isLoggedIn()).toBe(false);
  });

  it('handleLogout 后状态清零', async () => {
    await handleLogin({ email: 'a@b.com', password: 'demo1234' });
    expect(await tokenManager.isLoggedIn()).toBe(true);
    const r = await handleLogout();
    expect(r.ok).toBe(true);
    expect(await tokenManager.isLoggedIn()).toBe(false);
  });

  it('handleAuthStatus 反映登录态', async () => {
    expect((await handleAuthStatus()).loggedIn).toBe(false);
    await handleLogin({ email: 'a@b.com', password: 'demo1234' });
    const s = await handleAuthStatus();
    expect(s.loggedIn).toBe(true);
    if (s.loggedIn) expect(s.user.email).toBe('a@b.com');
  });

  it('admin@ 邮箱角色为 admin', async () => {
    const r = await handleLogin({ email: 'admin@x.com', password: 'demo1234' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.user.role).toBe('admin');
  });
});
