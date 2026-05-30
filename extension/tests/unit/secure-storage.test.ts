/**
 * secure-storage 单元测试：
 * - 覆盖加解密往返、密文 ≠ 明文、相同明文两次加密 IV 不同（不可链接性）、
 *   密钥种子缺失时自动生成、密文损坏解密失败、clear 后种子保留。
 */
import { describe, it, expect } from 'vitest';
import { createSecureStorage } from '@shared/storage/secure-storage';
import { createMemoryDriver } from '@shared/storage/chrome-storage';
import { STORAGE_INTERNAL } from '@shared/storage/keys';
import { ExtensionError } from '@shared/utils/error';

describe('secureStorage', () => {
  it('set/get 往返一致（对象）', async () => {
    const d = createMemoryDriver();
    const s = createSecureStorage(d);
    await s.setItem('user', { id: 1, name: '九笙' });
    expect(await s.getItem('user')).toEqual({ id: 1, name: '九笙' });
  });

  it('落盘密文不等于明文', async () => {
    const d = createMemoryDriver();
    const s = createSecureStorage(d);
    await s.setItem('token', 'plaintext-secret');
    const raw = (await d.get('token')) as string;
    expect(typeof raw).toBe('string');
    expect(raw).not.toContain('plaintext-secret');
    expect(raw.startsWith('v1:')).toBe(true);
    expect(raw.split(':').length).toBe(3);
  });

  it('相同明文两次加密密文不同（IV 随机性）', async () => {
    const d = createMemoryDriver();
    const s = createSecureStorage(d);
    await s.setItem('k1', 'same');
    const c1 = await d.get('k1');
    await s.setItem('k2', 'same');
    const c2 = await d.get('k2');
    expect(c1).not.toBe(c2);
  });

  it('首次使用自动生成密钥种子并落盘', async () => {
    const d = createMemoryDriver();
    const s = createSecureStorage(d);
    expect(await d.get(STORAGE_INTERNAL.SECURE_SEED)).toBeNull();
    await s.setItem('x', 1);
    const seed = await d.get(STORAGE_INTERNAL.SECURE_SEED);
    expect(typeof seed).toBe('string');
    expect((seed as string).length).toBeGreaterThan(0);
  });

  it('getItem 不存在的 key 返回 null', async () => {
    const d = createMemoryDriver();
    const s = createSecureStorage(d);
    expect(await s.getItem('missing')).toBeNull();
  });

  it('密文格式损坏解密失败抛 CRYPTO', async () => {
    const d = createMemoryDriver();
    const s = createSecureStorage(d);
    await s.setItem('x', 1); // 触发种子写入
    await d.set('bad', 'not-a-cipher');
    await expect(s.getItem('bad')).rejects.toBeInstanceOf(ExtensionError);
  });

  it('removeItem 后读取为 null', async () => {
    const d = createMemoryDriver();
    const s = createSecureStorage(d);
    await s.setItem('a', 'v');
    await s.removeItem('a');
    expect(await s.getItem('a')).toBeNull();
  });

  it('clear 后业务数据消失但种子保留', async () => {
    const d = createMemoryDriver();
    const s = createSecureStorage(d);
    await s.setItem('a', 1);
    const seedBefore = await d.get(STORAGE_INTERNAL.SECURE_SEED);
    await s.clear();
    expect(await s.getItem('a')).toBeNull();
    const seedAfter = await d.get(STORAGE_INTERNAL.SECURE_SEED);
    expect(seedAfter).toBe(seedBefore);
  });

  it('密钥种子长度异常抛 CRYPTO', async () => {
    const d = createMemoryDriver();
    await d.set(STORAGE_INTERNAL.SECURE_SEED, 'AAA'); // base64 解出仅 2 字节
    const s = createSecureStorage(d);
    await expect(s.setItem('x', 1)).rejects.toBeInstanceOf(ExtensionError);
  });

  it('并发对同一 key 写入：最终值为最后一次（per-key 锁正确串行）', async () => {
    const d = createMemoryDriver();
    const s = createSecureStorage(d);
    await Promise.all([
      s.setItem('race', 'a'),
      s.setItem('race', 'b'),
      s.setItem('race', 'c'),
    ]);
    expect(await s.getItem('race')).toBe('c');
  });
});
