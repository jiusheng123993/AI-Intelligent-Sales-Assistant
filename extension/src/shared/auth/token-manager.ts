/**
 * Token 管理器：唯一持有 access/refresh/user 的"权威源"。
 *
 * 设计要点：
 * - 内存缓存 + secureStorage 持久化双层，SW 被回收后仍可恢复；
 * - refresh 单飞：并发 401 仅触发一次 refresh，复用同一 Promise；
 * - 提供 AuthProvider 接口供 http.ts 注入；
 * - 任何写入失败均归一化为 ExtensionError，调用方按需兜底。
 */
import { secureStorage } from '@shared/storage/secure-storage';
import { STORAGE_NS } from '@shared/storage/keys';
import { ExtensionError, toExtensionError } from '@shared/utils/error';
import type { AuthUserProjection } from '@shared/messaging/types';
import type { AuthProvider } from '@shared/api/http';
import { authApi } from '@shared/api/auth.api';

interface TokenState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUserProjection | null;
}

const EMPTY: TokenState = { accessToken: null, refreshToken: null, user: null };

export class TokenManager {
  private mem: TokenState = { ...EMPTY };
  private loaded = false;
  private refreshInFlight: Promise<string> | null = null;

  /** 从持久层恢复（懒加载；后续调用直接命中内存）。 */
  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    try {
      const [a, r, u] = await Promise.all([
        secureStorage.getItem<string>(STORAGE_NS.AUTH_TOKEN),
        secureStorage.getItem<string>(STORAGE_NS.AUTH_REFRESH),
        secureStorage.getItem<AuthUserProjection>(STORAGE_NS.AUTH_USER),
      ]);
      this.mem = { accessToken: a, refreshToken: r, user: u };
    } catch {
      // 解密失败等异常：清空，强制重新登录
      this.mem = { ...EMPTY };
    } finally {
      this.loaded = true;
    }
  }

  async getAccessToken(): Promise<string | null> {
    await this.ensureLoaded();
    return this.mem.accessToken;
  }

  async getUser(): Promise<AuthUserProjection | null> {
    await this.ensureLoaded();
    return this.mem.user;
  }

  async isLoggedIn(): Promise<boolean> {
    await this.ensureLoaded();
    return !!this.mem.accessToken && !!this.mem.user;
  }

  /** 登录成功后写入；任一持久化失败均回滚内存态。 */
  async setSession(payload: {
    accessToken: string;
    refreshToken: string;
    user: AuthUserProjection;
  }): Promise<void> {
    const prev = { ...this.mem };
    this.mem = { ...payload };
    this.loaded = true;
    try {
      await Promise.all([
        secureStorage.setItem(STORAGE_NS.AUTH_TOKEN, payload.accessToken),
        secureStorage.setItem(STORAGE_NS.AUTH_REFRESH, payload.refreshToken),
        secureStorage.setItem(STORAGE_NS.AUTH_USER, payload.user),
      ]);
    } catch (e) {
      this.mem = prev;
      throw toExtensionError(e, 'STORAGE');
    }
  }

  /** 清空登录态（登出 / refresh 失败）。 */
  async clear(): Promise<void> {
    this.mem = { ...EMPTY };
    this.loaded = true;
    try {
      await Promise.all([
        secureStorage.removeItem(STORAGE_NS.AUTH_TOKEN),
        secureStorage.removeItem(STORAGE_NS.AUTH_REFRESH),
        secureStorage.removeItem(STORAGE_NS.AUTH_USER),
      ]);
    } catch {
      // 持久层失败不阻断；下次启动恢复时若发现脏数据，仍可走重新登录路径
    }
  }

  /** 刷新 access token；单飞：并发调用复用同一个 in-flight promise。 */
  refresh(): Promise<string> {
    if (this.refreshInFlight) return this.refreshInFlight;
    this.refreshInFlight = (async () => {
      await this.ensureLoaded();
      const rt = this.mem.refreshToken;
      if (!rt) throw new ExtensionError('UNAUTHORIZED', '缺少 refresh token');
      const resp = await authApi.refresh(rt);
      // 部分后端 refresh 不返回新 user；保留旧 user
      const user = this.mem.user;
      if (!user) throw new ExtensionError('UNAUTHORIZED', '本地用户信息缺失');
      await this.setSession({
        accessToken: resp.accessToken,
        refreshToken: resp.refreshToken,
        user,
      });
      return resp.accessToken;
    })().finally(() => {
      this.refreshInFlight = null;
    });
    return this.refreshInFlight;
  }

  /** 实现 AuthProvider 接口，便于注入 http.ts。 */
  asAuthProvider(): AuthProvider {
    return {
      getAccessToken: () => this.getAccessToken(),
      refresh: () => this.refresh(),
      clear: () => this.clear(),
    };
  }
}

/** 全局单例（background 上下文唯一持有）。 */
export const tokenManager = new TokenManager();
