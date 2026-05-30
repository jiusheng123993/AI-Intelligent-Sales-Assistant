/**
 * token-manager 单元测试。
 * - 由于使用全局 secureStorage 单例 + chrome.storage mock，
 *   每个用例需先 clear() 以隔离状态。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { tokenManager } from '@shared/auth/token-manager';
import { secureStorage } from '@shared/storage/secure-storage';
import * as authApi from '@shared/api/auth.api';

const user = { id: 'u1', email: 'a@b.com', name: 'A', role: 'sales' as const };

describe('TokenManager', () => {
  beforeEach(async () => {
    await secureStorage.clear().catch(() => {});
    await tokenManager.clear();
  });

  it('初始状态未登录', async () => {
    expect(await tokenManager.isLoggedIn()).toBe(false);
    expect(await tokenManager.getAccessToken()).toBeNull();
    expect(await tokenManager.getUser()).toBeNull();
  });

  it('setSession 后已登录，token/user 可读', async () => {
    await tokenManager.setSession({ accessToken: 'at', refreshToken: 'rt', user });
    expect(await tokenManager.isLoggedIn()).toBe(true);
    expect(await tokenManager.getAccessToken()).toBe('at');
    expect(await tokenManager.getUser()).toEqual(user);
  });

  it('clear 后状态归零', async () => {
    await tokenManager.setSession({ accessToken: 'at', refreshToken: 'rt', user });
    await tokenManager.clear();
    expect(await tokenManager.isLoggedIn()).toBe(false);
  });

  it('refresh 单飞：并发调用复用同一 promise', async () => {
    await tokenManager.setSession({ accessToken: 'at-old', refreshToken: 'rt', user });

    const spy = vi.spyOn(authApi.authApi, 'refresh').mockImplementation(async () => {
      // 模拟网络延迟
      await new Promise((r) => setTimeout(r, 20));
      return { accessToken: 'at-new', refreshToken: 'rt-new' };
    });

    const [a, b, c] = await Promise.all([
      tokenManager.refresh(),
      tokenManager.refresh(),
      tokenManager.refresh(),
    ]);

    expect(a).toBe('at-new');
    expect(b).toBe('at-new');
    expect(c).toBe('at-new');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(await tokenManager.getAccessToken()).toBe('at-new');
    spy.mockRestore();
  });

  it('refresh 失败时抛 ExtensionError', async () => {
    await tokenManager.setSession({ accessToken: 'at', refreshToken: 'rt', user });
    const spy = vi.spyOn(authApi.authApi, 'refresh').mockImplementation(async () => {
      throw new Error('boom');
    });
    await expect(tokenManager.refresh()).rejects.toBeInstanceOf(Error);
    spy.mockRestore();
  });

  it('缺少 refreshToken 时 refresh 抛 UNAUTHORIZED', async () => {
    await tokenManager.clear();
    await expect(tokenManager.refresh()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});
