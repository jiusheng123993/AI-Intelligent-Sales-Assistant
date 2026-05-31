/**
 * background 端的鉴权消息 handler 实现。
 */
import { ExtensionError, toExtensionError } from '@shared/utils/error';
import { tokenManager } from '@shared/auth/token-manager';
import { authApi } from '@shared/api/auth.api';
import {
  isEmail,
  isStringInRange,
  assertValid,
} from '@shared/utils/validator';
import type { MessageMap } from '@shared/messaging/types';

type LoginPayload = MessageMap['AUTH_LOGIN']['payload'];
type LoginResponse = MessageMap['AUTH_LOGIN']['response'];

/** AUTH_LOGIN handler */
export async function handleLogin(payload: LoginPayload): Promise<LoginResponse> {
  // 防御性校验（popup 已校验过，但 handler 不信任入参）
  try {
    assertValid(isEmail(payload?.email), 'email');
    assertValid(isStringInRange(6, 64)(payload?.password), 'password');
  } catch (e) {
    return { ok: false, reason: (e as Error).message };
  }

  try {
    const resp = await authApi.login(payload.email, payload.password);
    await tokenManager.setSession({
      accessToken: resp.accessToken,
      refreshToken: resp.refreshToken,
      user: resp.user,
    });
    return { ok: true, user: resp.user };
  } catch (e) {
    const ext = toExtensionError(e);
    // 凭证错误统一友好提示，避免泄漏后端细节
    if (ext.code === 'UNAUTHORIZED') return { ok: false, reason: '邮箱或密码错误' };
    return { ok: false, reason: ext.message };
  }
}

/** AUTH_LOGOUT handler */
export async function handleLogout(): Promise<{ ok: true }> {
  try {
    if (await tokenManager.isLoggedIn()) {
      try {
        await authApi.logout();
      } catch {
        /* 后端不可用也强制本地登出 */
      }
    }
  } finally {
    await tokenManager.clear();
  }
  return { ok: true };
}

/** AUTH_STATUS handler */
export async function handleAuthStatus(): Promise<
  MessageMap['AUTH_STATUS']['response']
> {
  const user = await tokenManager.getUser();
  if (user && (await tokenManager.isLoggedIn())) {
    return { loggedIn: true, user };
  }
  return { loggedIn: false };
}

/** A3 暴露的小工具：用于自检/测试场景重置内部状态。 */
export async function _resetAuthForTest(): Promise<void> {
  await tokenManager.clear();
  // 触发空判断也属于 valid，避免 lint unused
  void ExtensionError;
}
