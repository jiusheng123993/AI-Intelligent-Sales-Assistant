/**
 * 扩展端 API 运行时配置。
 *
 * 设计要点：
 * - 通过 Vite `import.meta.env.MODE` 切换 dev/prod；
 * - `useMock` 默认在测试环境开启，便于在没有后端时仍可独立联调；
 * - 任何受保护接口的 baseUrl 都来自此处，杜绝硬编码。
 */

export interface ApiConfig {
  baseUrl: string;
  /** 请求默认超时毫秒。 */
  timeoutMs: number;
  /** true 时所有 HTTP 调用走内存 Mock，不发起真实网络请求。 */
  useMock: boolean;
}

const mode = import.meta.env?.MODE ?? 'development';
const isProd = mode === 'production';

export const apiConfig: ApiConfig = {
  baseUrl: isProd ? 'https://api.example.com' : 'http://localhost:3000',
  timeoutMs: 10000,
  useMock: mode === 'test',
};

/** 提供给单测/手动调试的覆写入口。 */
export function setApiConfig(patch: Partial<ApiConfig>): void {
  Object.assign(apiConfig, patch);
}
