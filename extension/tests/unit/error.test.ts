/**
 * ExtensionError 与 toExtensionError 单元测试。
 */
import { describe, it, expect } from 'vitest';
import { ExtensionError, toExtensionError } from '@shared/utils/error';

describe('ExtensionError', () => {
  it('正常构造保留 code / message / cause', () => {
    const cause = new Error('原始错误');
    const err = new ExtensionError('NETWORK', '网络异常', cause);
    expect(err).toBeInstanceOf(ExtensionError);
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe('NETWORK');
    expect(err.message).toBe('网络异常');
    expect(err.cause).toBe(cause);
    expect(err.name).toBe('ExtensionError');
  });
});

describe('toExtensionError', () => {
  it('已是 ExtensionError 时原样返回', () => {
    const original = new ExtensionError('VALIDATION', 'bad');
    expect(toExtensionError(original)).toBe(original);
  });

  it('Error 实例转换并默认 code 为 UNKNOWN', () => {
    const e = toExtensionError(new Error('boom'));
    expect(e.code).toBe('UNKNOWN');
    expect(e.message).toBe('boom');
  });

  it('可指定 fallbackCode', () => {
    const e = toExtensionError(new Error('boom'), 'STORAGE');
    expect(e.code).toBe('STORAGE');
  });

  it('非 Error 值（字符串/数字/null）安全转换，不抛错', () => {
    expect(toExtensionError('plain').message).toBe('plain');
    expect(toExtensionError(404).message).toBe('404');
    expect(toExtensionError(null).message).toBe('null');
  });
});
