/**
 * 访问令牌（access token）本地存储工具。
 * 职责：统一封装 localStorage 读写，所有调用均做 try/catch 兜底，
 * 避免在隐私模式或受限环境下访问 storage 抛错导致应用崩溃。
 */
const ACCESS_TOKEN_KEY = 'ai_sales_assistant_access_token';

/**
 * 读取本地存储的访问令牌；失败或不存在时返回 null。
 */
export function getAccessToken() {
  try {
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    // 兜底：localStorage 不可用（如隐私模式）时返回 null，调用方按未登录处理
    return null;
  }
}

/**
 * 写入访问令牌到本地存储；失败时静默忽略，避免影响登录主流程。
 */
export function setAccessToken(token: string) {
  try {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } catch {
    // 兜底：写入失败时不抛错，保持调用链流畅
    return undefined;
  }
}

/**
 * 清除本地存储的访问令牌；失败时静默忽略，登出兜底逻辑仍可继续。
 */
export function clearAccessToken() {
  try {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch {
    // 兜底：清除失败不抛错，避免阻塞登出/401 处理流程
    return undefined;
  }
}
