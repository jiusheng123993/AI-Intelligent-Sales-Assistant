/**
 * 鉴权相关 API 调用层。
 *
 * 仅做"请求-响应"形状定义，不持有任何状态。
 */
import { request } from './http';
import type { AuthUserProjection } from '@shared/messaging/types';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string | null;
  user: AuthUserProjection;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string | null;
}

type BackendRole = AuthUserProjection['role'] | 'SALES' | 'TRAINER' | 'MANAGER' | 'ADMIN';

interface BackendAuthUser {
  id: string;
  email: string;
  name: string;
  role: BackendRole;
}

interface BackendLoginResponse {
  accessToken: string;
  refreshToken?: string | null;
  user: BackendAuthUser;
}

interface BackendRefreshResponse {
  accessToken: string;
  refreshToken?: string | null;
}

function normalizeRole(role: BackendRole): AuthUserProjection['role'] {
  if (role === 'ADMIN' || role === 'admin') return 'admin';
  if (role === 'MANAGER' || role === 'TRAINER' || role === 'manager') return 'manager';
  return 'sales';
}

function normalizeUser(user: BackendAuthUser): AuthUserProjection {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: normalizeRole(user.role),
  };
}

export const authApi = {
  /** POST /auth/login */
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await request<BackendLoginResponse>('/auth/login', {
      method: 'POST',
      auth: false,
      body: { email, password },
    });

    return {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken ?? null,
      user: normalizeUser(response.user),
    };
  },

  /** POST /auth/refresh */
  async refresh(refreshToken: string): Promise<RefreshResponse> {
    const response = await request<BackendRefreshResponse>('/auth/refresh', {
      method: 'POST',
      auth: false,
      body: { refreshToken },
    });

    return {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken ?? null,
    };
  },

  /** POST /auth/logout（无返回） */
  logout(): Promise<void> {
    return request<void>('/auth/logout', { method: 'POST' });
  },
};
