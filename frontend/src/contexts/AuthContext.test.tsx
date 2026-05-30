import { act, renderHook, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

vi.mock('@/api/auth', () => ({
  getCurrentUser: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
}));

vi.mock('@/auth/tokenStorage', () => ({
  clearAccessToken: vi.fn(),
  getAccessToken: vi.fn(),
  setAccessToken: vi.fn(),
}));

import { getCurrentUser, login, register } from '@/api/auth';
import { clearAccessToken, getAccessToken, setAccessToken } from '@/auth/tokenStorage';

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;
const user = {
  id: 'user-1',
  name: '销售顾问',
  email: 'sales@example.com',
  role: 'SALES' as const,
};

describe('AuthContext', () => {
  it('默认提供未登录状态', async () => {
    vi.mocked(getAccessToken).mockReturnValue(null);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isInitializing).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('登录成功后保存 token 并写入用户', async () => {
    vi.mocked(getAccessToken).mockReturnValue(null);
    vi.mocked(login).mockResolvedValueOnce({ accessToken: 'token-1', user });
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({ email: 'sales@example.com', password: 'password123' });
    });

    expect(setAccessToken).toHaveBeenCalledWith('token-1');
    expect(result.current.user).toEqual(user);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('注册成功后保存 token 并写入用户', async () => {
    vi.mocked(getAccessToken).mockReturnValue(null);
    vi.mocked(register).mockResolvedValueOnce({ accessToken: 'token-1', user });
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.register({
        name: '销售顾问',
        email: 'sales@example.com',
        password: 'password123',
      });
    });

    expect(setAccessToken).toHaveBeenCalledWith('token-1');
    expect(result.current.user).toEqual(user);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('登出后清理 token 和用户', async () => {
    vi.mocked(getAccessToken).mockReturnValue(null);
    vi.mocked(login).mockResolvedValueOnce({ accessToken: 'token-1', user });
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({ email: 'sales@example.com', password: 'password123' });
      result.current.logout();
    });

    expect(clearAccessToken).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('存在 token 时自动恢复当前用户', async () => {
    vi.mocked(getAccessToken).mockReturnValue('token-1');
    vi.mocked(getCurrentUser).mockResolvedValueOnce(user);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.user).toEqual(user));
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('恢复当前用户失败时清理 token', async () => {
    vi.mocked(getAccessToken).mockReturnValue('token-1');
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error('unauthorized'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isInitializing).toBe(false));
    expect(clearAccessToken).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
  });
});
