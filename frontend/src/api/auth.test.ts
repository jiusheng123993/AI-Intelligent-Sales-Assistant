import { describe, expect, it, vi } from 'vitest';
import { http } from './http';
import { getCurrentUser, login, register } from './auth';

vi.mock('./http', () => ({
  http: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

const authResponse = {
  accessToken: 'token-1',
  user: {
    id: 'user-1',
    name: '销售顾问',
    email: 'sales@example.com',
    role: 'SALES' as const,
  },
};

describe('auth api', () => {
  it('调用登录接口并返回认证响应', async () => {
    vi.mocked(http.post).mockResolvedValueOnce({ data: authResponse });

    const result = await login({ email: 'sales@example.com', password: 'password123' });

    expect(http.post).toHaveBeenCalledWith('/auth/login', {
      email: 'sales@example.com',
      password: 'password123',
    });
    expect(result).toEqual(authResponse);
  });

  it('调用注册接口并返回认证响应', async () => {
    vi.mocked(http.post).mockResolvedValueOnce({ data: authResponse });

    const result = await register({
      name: '销售顾问',
      email: 'sales@example.com',
      password: 'password123',
    });

    expect(http.post).toHaveBeenCalledWith('/auth/register', {
      name: '销售顾问',
      email: 'sales@example.com',
      password: 'password123',
    });
    expect(result).toEqual(authResponse);
  });

  it('调用当前用户接口', async () => {
    vi.mocked(http.get).mockResolvedValueOnce({ data: authResponse.user });

    const result = await getCurrentUser();

    expect(http.get).toHaveBeenCalledWith('/auth/me');
    expect(result).toEqual(authResponse.user);
  });
});
