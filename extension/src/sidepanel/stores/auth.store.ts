/**
 * 鉴权状态 store（仅 sidepanel 上下文使用）。
 *
 * 设计要点：
 * - 数据权威源仍是 background 的 tokenManager；本 store 仅做"快照缓存"；
 * - 通过 sendMessage(AUTH_STATUS) 拉取；提供 refresh/logout；
 * - status 三态：loading | anon | authed，便于 UI 直接 switch；
 * - 任何异常均归一化：拉取失败一律视为 anon，避免阻塞 UI。
 */
import { create } from 'zustand';
import { sendMessage } from '@shared/messaging/send';
import { MessageType, type AuthUserProjection } from '@shared/messaging/types';

export type AuthStatus = 'loading' | 'anon' | 'authed';

export interface AuthState {
  status: AuthStatus;
  user: AuthUserProjection | null;
  /** 主动拉取最新登录态。失败时降级为 anon，不抛错。 */
  refresh: () => Promise<void>;
  /** 触发登出，并刷新本地状态。 */
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  user: null,

  refresh: async () => {
    set({ status: 'loading' });
    try {
      const r = await sendMessage(MessageType.AUTH_STATUS, undefined);
      if (r.loggedIn) set({ status: 'authed', user: r.user });
      else set({ status: 'anon', user: null });
    } catch {
      set({ status: 'anon', user: null });
    }
  },

  logout: async () => {
    try {
      await sendMessage(MessageType.AUTH_LOGOUT, undefined);
    } catch {
      // 即使失败也强制本地降级
    }
    set({ status: 'anon', user: null });
  },
}));
