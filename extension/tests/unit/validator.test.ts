/**
 * validator 单元测试：每个校验函数覆盖正常 / 边界 / 异常。
 */
import { describe, it, expect } from 'vitest';
import {
  isNonEmptyString,
  isStringInRange,
  isEmail,
  isUrl,
  isOneOf,
  sanitizeTrim,
  assertValid,
} from '@shared/utils/validator';
import { ExtensionError } from '@shared/utils/error';

describe('isNonEmptyString', () => {
  it('合法字符串通过', () => {
    expect(isNonEmptyString('hello').valid).toBe(true);
  });
  it('非字符串不通过', () => {
    expect(isNonEmptyString(123).valid).toBe(false);
    expect(isNonEmptyString(null).valid).toBe(false);
    expect(isNonEmptyString(undefined).valid).toBe(false);
  });
  it('空字符串与纯空白不通过', () => {
    expect(isNonEmptyString('').valid).toBe(false);
    expect(isNonEmptyString('   ').valid).toBe(false);
  });
});

describe('isStringInRange', () => {
  const v = isStringInRange(2, 5);
  it('范围内通过', () => {
    expect(v('ab').valid).toBe(true);
    expect(v('abcde').valid).toBe(true);
  });
  it('过短/过长不通过', () => {
    expect(v('a').valid).toBe(false);
    expect(v('abcdef').valid).toBe(false);
  });
  it('非法 range 构造抛错', () => {
    expect(() => isStringInRange(-1, 3)).toThrow(ExtensionError);
    expect(() => isStringInRange(5, 2)).toThrow(ExtensionError);
  });
});

describe('isEmail', () => {
  it.each([
    ['a@b.com', true],
    ['user.name+tag@sub.example.co', true],
    ['noatsymbol', false],
    ['a@b', false],
    ['', false],
    ['a@@b.com', false],
  ])('isEmail(%s) → valid=%s', (input, expected) => {
    expect(isEmail(input).valid).toBe(expected);
  });
});

describe('isUrl', () => {
  it('http/https 通过', () => {
    expect(isUrl('https://example.com').valid).toBe(true);
    expect(isUrl('http://localhost:8080/path').valid).toBe(true);
  });
  it('非 http/https 不通过', () => {
    expect(isUrl('ftp://example.com').valid).toBe(false);
    expect(isUrl('javascript:alert(1)').valid).toBe(false);
  });
  it('非法 URL 不通过', () => {
    expect(isUrl('not a url').valid).toBe(false);
    expect(isUrl('').valid).toBe(false);
  });
});

describe('isOneOf', () => {
  const v = isOneOf(['a', 'b', 'c'] as const);
  it('命中通过、未命中不通过', () => {
    expect(v('a').valid).toBe(true);
    expect(v('z').valid).toBe(false);
  });
  it('空候选项抛错', () => {
    expect(() => isOneOf([] as const)).toThrow(ExtensionError);
  });
});

describe('sanitizeTrim', () => {
  it('正常去空白', () => {
    expect(sanitizeTrim('  hi  ')).toBe('hi');
  });
  it('非字符串返回空串', () => {
    expect(sanitizeTrim(123)).toBe('');
    expect(sanitizeTrim(null)).toBe('');
  });
});

describe('assertValid', () => {
  it('valid=true 不抛错', () => {
    expect(() => assertValid({ valid: true })).not.toThrow();
  });
  it('valid=false 抛 ExtensionError(VALIDATION)', () => {
    try {
      assertValid({ valid: false, message: 'bad' }, 'email');
      throw new Error('should not reach');
    } catch (e) {
      expect(e).toBeInstanceOf(ExtensionError);
      expect((e as ExtensionError).code).toBe('VALIDATION');
      expect((e as Error).message).toContain('email');
      expect((e as Error).message).toContain('bad');
    }
  });
});
