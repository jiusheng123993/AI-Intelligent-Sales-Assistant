/**
 * Vitest 全局 setup：
 * - 注入 @testing-library/jest-dom 自定义断言
 * - mock 必要的 chrome.* API，避免 happy-dom 环境下访问 undefined
 * - 默认把 logger 降为 'error' 之上才输出，避免测试期噪声；
 *   需要验证 logger 行为的测试自行 setLogLevel('debug')
 */
import '@testing-library/jest-dom/vitest';
import { vi, beforeEach } from 'vitest';
import { setLogLevel } from '../src/shared/utils/logger';

// 内存版 chrome.storage.local mock：保证 secureStorage / tokenManager 等模块
// 在测试期可以真实运转，不依赖真实浏览器环境。
function createChromeMock() {
  const store = new Map<string, unknown>();
  return {
    runtime: {
      onInstalled: { addListener: vi.fn() },
      onStartup: { addListener: vi.fn() },
      onMessage: { addListener: vi.fn() },
      sendMessage: vi.fn().mockResolvedValue({ type: 'PONG', ts: 0 }),
    },
    tabs: {
      query: vi.fn().mockResolvedValue([{ id: 1, url: 'https://work.weixin.qq.com/' }]),
      sendMessage: vi.fn().mockResolvedValue({ contextText: '', inputText: '' }),
    },
    contextMenus: {
      removeAll: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
      create: vi.fn(),
      onClicked: { addListener: vi.fn() },
    },
    sidePanel: {
      open: vi.fn().mockResolvedValue(undefined),
    },
    commands: {
      onCommand: { addListener: vi.fn() },
    },
    storage: {
      local: {
        async get(keyOrKeys: string | string[] | null | undefined) {
          if (keyOrKeys === null || keyOrKeys === undefined) {
            const all: Record<string, unknown> = {};
            store.forEach((v, k) => (all[k] = v));
            return all;
          }
          if (Array.isArray(keyOrKeys)) {
            const out: Record<string, unknown> = {};
            keyOrKeys.forEach((k) => {
              if (store.has(k)) out[k] = store.get(k);
            });
            return out;
          }
          const k = String(keyOrKeys);
          return store.has(k) ? { [k]: store.get(k) } : {};
        },
        async set(obj: Record<string, unknown>) {
          for (const [k, v] of Object.entries(obj)) store.set(k, v);
        },
        async remove(keys: string | string[]) {
          (Array.isArray(keys) ? keys : [keys]).forEach((k) => store.delete(k));
        },
        async clear() {
          store.clear();
        },
        __resetForTest() {
          store.clear();
        },
      },
    },
  };
}

const chromeMock = createChromeMock();

// 仅在未定义时挂载，避免覆盖 happy-dom 自带能力
if (typeof (globalThis as { chrome?: unknown }).chrome === 'undefined') {
  (globalThis as unknown as { chrome: typeof chromeMock }).chrome = chromeMock;
}

beforeEach(() => {
  vi.clearAllMocks();
  // 静默 logger，避免被测试中"预期抛错"的 handler 触发的 error log 污染控制台；
  // 需要验证 logger 行为的测试自行 setLogLevel('debug')。
  setLogLevel('silent');
});
