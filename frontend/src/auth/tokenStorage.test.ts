import { describe, expect, it, vi } from 'vitest';
import { clearAccessToken, getAccessToken, setAccessToken } from './tokenStorage';

describe('tokenStorage', () => {
  it('保存并读取 access token', () => {
    setAccessToken('token-1');

    expect(getAccessToken()).toBe('token-1');
  });

  it('清理 access token', () => {
    setAccessToken('token-1');

    clearAccessToken();

    expect(getAccessToken()).toBeNull();
  });

  it('localStorage 异常时返回空 token 且不抛错', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });

    expect(getAccessToken()).toBeNull();

    getItemSpy.mockRestore();
  });

  it('localStorage 写入异常时不抛错', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });

    expect(() => setAccessToken('token-1')).not.toThrow();

    setItemSpy.mockRestore();
  });
});
