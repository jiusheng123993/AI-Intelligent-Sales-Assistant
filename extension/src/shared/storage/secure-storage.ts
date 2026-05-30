/**
 * 基于 WebCrypto (AES-GCM-256) 的透明加密存储层。
 *
 * 设计要点：
 * 1. 密钥种子在首次使用时随机生成（32 字节），存储到内部 key __ssk_seed__；
 *    种子本身明文落盘是可接受的——浏览器扩展沙箱已隔离同源页面访问；
 *    若未来需要更强保护，可改为基于用户口令的 PBKDF2 派生。
 * 2. 每次写入使用独立 12 字节随机 IV，杜绝相同明文产出相同密文。
 * 3. 密文格式：`v1:<base64(iv)>:<base64(ciphertext)>`，自描述、便于排错与版本升级。
 * 4. 解密失败统一抛 ExtensionError('CRYPTO', ...)，业务侧决定是否清空脏数据。
 * 5. per-key 简易锁，避免并发写同一 key 时密文被相互覆盖。
 */
import { ExtensionError, toExtensionError } from '@shared/utils/error';
import { STORAGE_INTERNAL } from './keys';
import { type StorageDriver, chromeStorageDriver } from './chrome-storage';

/** 密文版本前缀，方便未来升级算法时识别旧密文。 */
const CIPHER_VERSION = 'v1';

/** 默认 AES-GCM IV 长度（字节）。 */
const IV_LEN = 12;

/** 默认密钥种子长度（字节）。 */
const SEED_LEN = 32;

/** SubtleCrypto 在浏览器/Node20+ 都通过 globalThis.crypto.subtle 暴露。 */
function getSubtle(): SubtleCrypto {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (!c || !c.subtle) {
    throw new ExtensionError('CRYPTO', 'WebCrypto SubtleCrypto 不可用');
  }
  return c.subtle;
}

/** 安全的随机字节。 */
function randomBytes(len: number): Uint8Array {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (!c) throw new ExtensionError('CRYPTO', 'crypto API 不可用');
  const buf = new Uint8Array(len);
  c.getRandomValues(buf);
  return buf;
}

/** Uint8Array ↔ base64 互转（Node + 浏览器通用）。 */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return typeof btoa !== 'undefined'
    ? btoa(binary)
    : Buffer.from(bytes).toString('base64');
}

function base64ToBytes(b64: string): Uint8Array {
  if (typeof atob !== 'undefined') {
    const binary = atob(b64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

/** Per-key 写入锁，防止并发覆盖。 */
const writeLocks = new Map<string, Promise<void>>();

async function withKeyLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = writeLocks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>((r) => (release = r));
  // 串联：等待 prev 结束后再标记 next 完成，将链表化保存
  const chained = prev.then(() => next);
  writeLocks.set(key, chained);
  try {
    await prev;
    return await fn();
  } finally {
    release();
    // 仅当当前 key 上的锁仍指向本次链才清理，避免误删后续排队的任务
    if (writeLocks.get(key) === chained) writeLocks.delete(key);
  }
}

export interface SecureStorage {
  getItem<T = unknown>(key: string): Promise<T | null>;
  setItem<T = unknown>(key: string, value: T): Promise<void>;
  removeItem(key: string): Promise<void>;
  /** 清除业务数据，但保留密钥种子。 */
  clear(): Promise<void>;
}

/** 工厂方法：传入 driver 便于注入测试。 */
export function createSecureStorage(driver: StorageDriver = chromeStorageDriver): SecureStorage {
  let cachedKey: CryptoKey | null = null;

  /** 懒加载或生成密钥。 */
  async function getKey(): Promise<CryptoKey> {
    if (cachedKey) return cachedKey;
    const subtle = getSubtle();

    let seedB64 = (await driver.get(STORAGE_INTERNAL.SECURE_SEED)) as string | null;
    if (!seedB64 || typeof seedB64 !== 'string') {
      const seed = randomBytes(SEED_LEN);
      seedB64 = bytesToBase64(seed);
      await driver.set(STORAGE_INTERNAL.SECURE_SEED, seedB64);
    }

    const rawSeed = base64ToBytes(seedB64);
    if (rawSeed.length !== SEED_LEN) {
      throw new ExtensionError('CRYPTO', '密钥种子长度异常');
    }

    cachedKey = await subtle.importKey(
      'raw',
      rawSeed as BufferSource,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt'],
    );
    return cachedKey;
  }

  async function encrypt(plain: string): Promise<string> {
    const subtle = getSubtle();
    const key = await getKey();
    const iv = randomBytes(IV_LEN);
    const cipherBuf = await subtle.encrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      new TextEncoder().encode(plain) as BufferSource,
    );
    return `${CIPHER_VERSION}:${bytesToBase64(iv)}:${bytesToBase64(new Uint8Array(cipherBuf))}`;
  }

  async function decrypt(payload: string): Promise<string> {
    const parts = payload.split(':');
    if (parts.length !== 3 || parts[0] !== CIPHER_VERSION) {
      throw new ExtensionError('CRYPTO', '密文格式不合法或版本不匹配');
    }
    const iv = base64ToBytes(parts[1]);
    const data = base64ToBytes(parts[2]);
    const subtle = getSubtle();
    const key = await getKey();
    try {
      const plainBuf = await subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, data as BufferSource);
      return new TextDecoder().decode(plainBuf);
    } catch (e) {
      throw new ExtensionError('CRYPTO', '解密失败：密文损坏或密钥不匹配', e);
    }
  }

  return {
    async getItem<T = unknown>(key: string): Promise<T | null> {
      try {
        const raw = (await driver.get(key)) as string | null;
        if (raw === null || raw === undefined) return null;
        if (typeof raw !== 'string') {
          throw new ExtensionError('CRYPTO', `存储值类型异常 (${typeof raw})`);
        }
        const plain = await decrypt(raw);
        return JSON.parse(plain) as T;
      } catch (e) {
        throw toExtensionError(e, 'CRYPTO');
      }
    },

    async setItem<T = unknown>(key: string, value: T): Promise<void> {
      await withKeyLock(key, async () => {
        // 注意：不要在此处统一把异常归一化为 STORAGE，否则会掩盖 CRYPTO 真实错误码。
        // 各步骤已分别抛出对应 code 的 ExtensionError；这里仅做透传。
        const plain = JSON.stringify(value);
        const cipher = await encrypt(plain);
        try {
          await driver.set(key, cipher);
        } catch (e) {
          // driver 自身错误归一化为 STORAGE
          throw toExtensionError(e, 'STORAGE');
        }
      });
    },

    async removeItem(key: string): Promise<void> {
      await driver.remove(key);
    },

    async clear(): Promise<void> {
      // 备份种子，再 clear，再写回，避免密钥丢失导致历史数据全部不可解
      const seed = await driver.get(STORAGE_INTERNAL.SECURE_SEED);
      await driver.clear();
      if (typeof seed === 'string') {
        await driver.set(STORAGE_INTERNAL.SECURE_SEED, seed);
      }
    },
  };
}

/** 默认单例（生产代码使用）。 */
export const secureStorage = createSecureStorage();
