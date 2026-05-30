/**
 * chrome.storage.local 的 Promise 化薄封装。
 *
 * 设计目标：
 * - 屏蔽 callback 与 Promise 混用的 API 差异；
 * - 提供易于在单测中替换的接口（StorageDriver）；
 * - 强参数校验、统一异常归一化为 ExtensionError('STORAGE', ...)。
 */
import { ExtensionError, toExtensionError } from '@shared/utils/error';

/** 抽象的存储驱动接口，便于测试时注入内存实现。 */
export interface StorageDriver {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
  /** 仅清除给定前缀的 key（带前缀全清；不传则清全部，慎用）。 */
  clear(prefix?: string): Promise<void>;
}

/** 校验 key 合法性：非空字符串、长度 ≤ 200，避免 chrome.storage 配额异常。 */
function assertValidKey(key: string): void {
  if (typeof key !== 'string' || key.length === 0 || key.length > 200) {
    // 归类为 STORAGE：调用方期望存储层语义统一，便于上层 catch 时做兜底
    throw new ExtensionError('STORAGE', `Invalid storage key: ${String(key)}`);
  }
}

/** 基于 chrome.storage.local 的默认实现。 */
export const chromeStorageDriver: StorageDriver = {
  async get(key: string): Promise<unknown> {
    assertValidKey(key);
    try {
      const result = (await chrome.storage.local.get(key)) as Record<string, unknown>;
      return result[key] ?? null;
    } catch (e) {
      throw toExtensionError(e, 'STORAGE');
    }
  },

  async set(key: string, value: unknown): Promise<void> {
    assertValidKey(key);
    try {
      await chrome.storage.local.set({ [key]: value });
    } catch (e) {
      throw toExtensionError(e, 'STORAGE');
    }
  },

  async remove(key: string): Promise<void> {
    assertValidKey(key);
    try {
      await chrome.storage.local.remove(key);
    } catch (e) {
      throw toExtensionError(e, 'STORAGE');
    }
  },

  async clear(prefix?: string): Promise<void> {
    try {
      if (!prefix) {
        await chrome.storage.local.clear();
        return;
      }
      const all = (await chrome.storage.local.get(null)) as Record<string, unknown>;
      const matched = Object.keys(all).filter((k) => k.startsWith(prefix));
      if (matched.length > 0) {
        await chrome.storage.local.remove(matched);
      }
    } catch (e) {
      throw toExtensionError(e, 'STORAGE');
    }
  },
};

/**
 * 内存版驱动（仅供单测使用）。
 */
export function createMemoryDriver(): StorageDriver {
  const map = new Map<string, unknown>();
  return {
    async get(key) {
      assertValidKey(key);
      return map.has(key) ? map.get(key) : null;
    },
    async set(key, value) {
      assertValidKey(key);
      map.set(key, value);
    },
    async remove(key) {
      assertValidKey(key);
      map.delete(key);
    },
    async clear(prefix) {
      if (!prefix) {
        map.clear();
        return;
      }
      for (const k of Array.from(map.keys())) {
        if (k.startsWith(prefix)) map.delete(k);
      }
    },
  };
}
