/**
 * messaging/types 单元测试：覆盖 isErrorEnvelope 类型守卫。
 */
import { describe, it, expect } from 'vitest';
import { isErrorEnvelope } from '@shared/messaging/types';

describe('isErrorEnvelope', () => {
  it('合法错误外壳识别为 true', () => {
    expect(
      isErrorEnvelope({ __error: { code: 'X', message: 'm' } }),
    ).toBe(true);
  });
  it('缺字段的对象返回 false', () => {
    expect(isErrorEnvelope({})).toBe(false);
    expect(isErrorEnvelope({ __error: {} })).toBe(false);
    expect(isErrorEnvelope({ __error: { code: 'X' } })).toBe(false);
    expect(isErrorEnvelope({ __error: { message: 'm' } })).toBe(false);
  });
  it('null / 原始类型返回 false', () => {
    expect(isErrorEnvelope(null)).toBe(false);
    expect(isErrorEnvelope(undefined)).toBe(false);
    expect(isErrorEnvelope('x')).toBe(false);
    expect(isErrorEnvelope(123)).toBe(false);
  });
});
