/**
 * 内置 Mock 后端（A3 阶段使用，B 模块完成后可下线）。
 *
 * 行为：
 * - /auth/login: 任意 password === 'demo1234' 视为成功；email 即用户名
 * - /auth/refresh: refreshToken 必须以 'mock_rt_' 开头；返回新 token
 * - /auth/logout: 永远成功
 */
import type { MockHandler } from '@shared/api/http';
import { ExtensionError } from '@shared/utils/error';
import type { AuthUserProjection } from '@shared/messaging/types';

const DEMO_PASSWORD = 'demo1234';

function pickRole(email: string): AuthUserProjection['role'] {
  if (email.startsWith('admin@')) return 'admin';
  if (email.startsWith('manager@')) return 'manager';
  return 'sales';
}

export const mockBackend: MockHandler = async (path, init) => {
  const body = (init.body ?? {}) as Record<string, unknown>;

  if (path === '/auth/login' && init.method === 'POST') {
    const email = typeof body.email === 'string' ? body.email : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!email || password !== DEMO_PASSWORD) {
      throw new ExtensionError('UNAUTHORIZED', 'invalid_credentials');
    }
    const ts = Date.now();
    return {
      accessToken: `mock_at_${ts}`,
      refreshToken: `mock_rt_${ts}`,
      user: {
        id: `u_${ts}`,
        email,
        name: email.split('@')[0],
        role: pickRole(email),
      },
    };
  }

  if (path === '/auth/refresh' && init.method === 'POST') {
    const rt = typeof body.refreshToken === 'string' ? body.refreshToken : '';
    if (!rt.startsWith('mock_rt_')) {
      throw new ExtensionError('UNAUTHORIZED', 'invalid_refresh');
    }
    const ts = Date.now();
    return {
      accessToken: `mock_at_${ts}`,
      refreshToken: `mock_rt_${ts}`,
    };
  }

  if (path === '/auth/logout' && init.method === 'POST') {
    return null;
  }

  throw new ExtensionError('NOT_FOUND', `mock 未实现: ${init.method ?? 'GET'} ${path}`);
};
