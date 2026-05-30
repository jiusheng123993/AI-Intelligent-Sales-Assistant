/**
 * Vitest 全局 setup：
 * - 注入 @testing-library/jest-dom 自定义断言
 * - mock 必要的 chrome.* API，避免 happy-dom 环境下访问 undefined
 */
import '@testing-library/jest-dom/vitest';
import { vi, beforeEach } from 'vitest';

// 最小 chrome API mock，便于 logger / 配置等模块在测试环境运行
const chromeMock = {
  runtime: {
    onInstalled: { addListener: vi.fn() },
    onStartup: { addListener: vi.fn() },
    onMessage: { addListener: vi.fn() },
    sendMessage: vi.fn().mockResolvedValue({ type: 'PONG', ts: 0 }),
  },
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    },
  },
};

// 仅在未定义时挂载，避免覆盖 happy-dom 自带能力
if (typeof (globalThis as { chrome?: unknown }).chrome === 'undefined') {
  (globalThis as unknown as { chrome: typeof chromeMock }).chrome = chromeMock;
}

beforeEach(() => {
  vi.clearAllMocks();
});
