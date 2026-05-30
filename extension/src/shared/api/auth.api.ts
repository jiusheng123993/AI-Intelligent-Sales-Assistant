/**
 * 鉴权相关 API 调用层。
 *
 * 仅做"请求-响应"形状定义，不持有任何状态。
 */
import { request } from './http';
import type { AuthUserProjection } from '@shared/messaging/types';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUserProjection;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export const authApi = {
  /** POST /auth/login */
  login(email: string, password: string): Promise<LoginResponse> {
    return request<LoginResponse>('/auth/login', {
      method: 'POST',
      auth: false,
      body: { email, password },
    });
  },

  /** POST /auth/refresh */
  refresh(refreshToken: string): Promise<RefreshResponse> {
    return request<RefreshResponse>('/auth/refresh', {
      method: 'POST',
      auth: false,
      body: { refreshToken },
    });
  },

  /** POST /auth/logout（无返回） */
  logout(): Promise<void> {
    return request<void>('/auth/logout', { method: 'POST' });
  },
};
