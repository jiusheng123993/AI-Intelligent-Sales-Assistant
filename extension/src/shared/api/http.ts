/**
 * HTTP 客户端：基于 fetch 的薄封装。
 *
 * 设计要点：
 * - 统一超时（AbortController）、JSON 序列化、错误归一化为 ExtensionError；
 * - 请求拦截器：可注入 token；响应拦截器：401 时调用注入的 refreshHook 后重试一次；
 * - 支持 useMock 路径：路由到注入的 Mock handler，便于无后端时联调；
 * - 仅 background 上下文调用，content/popup 永远不直接 fetch。
 */
import { ExtensionError, toExtensionError } from '@shared/utils/error';
import { apiConfig } from './env';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
  /** 是否携带 Authorization。默认 true。 */
  auth?: boolean;
  /** 仅在尚未刷新过 token 的请求上设置；内部递归调用会置 false，避免无限重试。 */
  _retried?: boolean;
}

/** 注入式 token 提供器：由 token-manager 在初始化时调用 setAuthProvider。 */
export interface AuthProvider {
  /** 当前 access token；未登录返回 null。 */
  getAccessToken: () => Promise<string | null>;
  /** 401 时调用：尝试刷新；成功返回新 token，失败抛错（调用方会清登录态）。 */
  refresh: () => Promise<string>;
  /** 强制清空登录态（refresh 也失败时调用）。 */
  clear: () => Promise<void>;
}

let authProvider: AuthProvider | null = null;
export function setAuthProvider(p: AuthProvider | null): void {
  authProvider = p;
}

/** 注入式 Mock 路由：path+method → 返回值。 */
export type MockHandler = (path: string, init: RequestOptions) => Promise<unknown>;
let mockHandler: MockHandler | null = null;
export function setMockHandler(h: MockHandler | null): void {
  mockHandler = h;
}

async function buildHeaders(opts: RequestOptions): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
    ...(opts.headers ?? {}),
  };
  if (opts.auth !== false && authProvider) {
    const token = await authProvider.getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function parseJsonSafe(resp: Response): Promise<unknown> {
  const text = await resp.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new ExtensionError('NETWORK', `响应非 JSON: ${text.slice(0, 100)}`);
  }
}

/** 通用 HTTP 请求；T 为响应 body 类型。 */
export async function request<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  // Mock 路径
  if (apiConfig.useMock && mockHandler) {
    try {
      return (await mockHandler(path, opts)) as T;
    } catch (e) {
      throw toExtensionError(e, 'NETWORK');
    }
  }

  const url = path.startsWith('http') ? path : `${apiConfig.baseUrl}${path}`;
  const timeoutMs = opts.timeoutMs ?? apiConfig.timeoutMs;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: opts.method ?? 'GET',
      headers: await buildHeaders(opts),
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    throw toExtensionError(e, 'NETWORK');
  } finally {
    clearTimeout(timer);
  }

  // 401：尝试 refresh 一次（防无限循环用 _retried 标记）
  if (resp.status === 401 && opts.auth !== false && authProvider && !opts._retried) {
    try {
      await authProvider.refresh();
      return request<T>(path, { ...opts, _retried: true });
    } catch (e) {
      // refresh 失败 → 清登录态，向上抛 UNAUTHORIZED
      try {
        await authProvider.clear();
      } catch {
        /* swallow */
      }
      throw new ExtensionError('UNAUTHORIZED', '会话已过期，请重新登录', e);
    }
  }

  if (resp.status === 401) throw new ExtensionError('UNAUTHORIZED', '未授权');
  if (resp.status === 403) throw new ExtensionError('FORBIDDEN', '无权访问');
  if (resp.status === 404) throw new ExtensionError('NOT_FOUND', '资源不存在');
  if (resp.status >= 500) throw new ExtensionError('NETWORK', `服务端错误 ${resp.status}`);
  if (!resp.ok) {
    const body = await parseJsonSafe(resp);
    let msg = `请求失败 ${resp.status}`;
    if (body && typeof body === 'object' && 'message' in body) {
      const m = (body as { message: unknown }).message;
      if (typeof m === 'string' && m.length > 0) msg = m;
    }
    throw new ExtensionError('NETWORK', msg);
  }
  return (await parseJsonSafe(resp)) as T;
}
