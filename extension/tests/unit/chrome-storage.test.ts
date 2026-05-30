/**
 * chrome-storage adapter 单元测试。
 * - 使用 createMemoryDriver 验证语义（chromeStorageDriver 在 happy-dom 下 chrome 是 mock，
 *   无法验证完整链路，已由集成手测兜底）。
 */
import { describe, it, expect } from 'vitest';
import { createMemoryDriver } from '@shared/storage/chrome-storage';
import { ExtensionError } from '@shared/utils/error';

describe('createMemoryDriver', () => {
  it('set/get 往返一致', async () => {
    const d = createMemoryDriver();
    await d.set('k', { a: 1 });
    expect(await d.get('k')).toEqual({ a: 1 });
  });

  it('get 不存在的 key 返回 null', async () => {
    const d = createMemoryDriver();
    expect(await d.get('missing')).toBeNull();
  });

  it('remove 后再读为 null', async () => {
    const d = createMemoryDriver();
    await d.set('k', 1);
    await d.remove('k');
    expect(await d.get('k')).toBeNull();
  });

  it('clear 全部', async () => {
    const d = createMemoryDriver();
    await d.set('a', 1);
    await d.set('b', 2);
    await d.clear();
    expect(await d.get('a')).toBeNull();
    expect(await d.get('b')).toBeNull();
  });

  it('clear(prefix) 仅清匹配前缀', async () => {
    const d = createMemoryDriver();
    await d.set('auth.token', 'x');
    await d.set('auth.user', 'y');
    await d.set('settings', 'z');
    await d.clear('auth.');
    expect(await d.get('auth.token')).toBeNull();
    expect(await d.get('auth.user')).toBeNull();
    expect(await d.get('settings')).toBe('z');
  });

  it.each([['', '空 key'], [null as unknown as string, 'null key']])(
    '非法 key 抛 VALIDATION 异常 (%s)',
    async (badKey) => {
      const d = createMemoryDriver();
      await expect(d.get(badKey)).rejects.toBeInstanceOf(ExtensionError);
      await expect(d.set(badKey, 1)).rejects.toBeInstanceOf(ExtensionError);
      await expect(d.remove(badKey)).rejects.toBeInstanceOf(ExtensionError);
    },
  );
});
