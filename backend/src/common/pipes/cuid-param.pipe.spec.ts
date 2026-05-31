import { BadRequestException } from '@nestjs/common';
import { CuidParamPipe } from './cuid-param.pipe';

/**
 * CuidParamPipe 单元测试：
 * - 合法 cuid 原样返回
 * - 空 / 非字符串 / 长度异常 / 含非法字符 → 抛 BadRequestException
 * - 异常信息含参数名，便于排错
 */
describe('CuidParamPipe', () => {
  let pipe: CuidParamPipe;

  beforeEach(() => {
    pipe = new CuidParamPipe();
  });

  const meta = (name: string) =>
    ({ type: 'param' as const, metatype: String, data: name }) as any;

  it('合法 cuid（c + 24 位 base36）原样返回', () => {
    const cuid = 'ckxw9z7yt0000abcd1234efgh';
    expect(pipe.transform(cuid, meta('teamId'))).toBe(cuid);
  });

  it('空字符串拒绝并提示参数名', () => {
    expect(() => pipe.transform('', meta('teamId'))).toThrow(BadRequestException);
    try {
      pipe.transform('', meta('teamId'));
    } catch (e: any) {
      expect(e.message).toContain('teamId');
    }
  });

  it('非字符串（undefined / null / 数字 / 对象）一律拒绝', () => {
    expect(() => pipe.transform(undefined as any, meta('id'))).toThrow(BadRequestException);
    expect(() => pipe.transform(null as any, meta('id'))).toThrow(BadRequestException);
    expect(() => pipe.transform(123 as any, meta('id'))).toThrow(BadRequestException);
    expect(() => pipe.transform({} as any, meta('id'))).toThrow(BadRequestException);
  });

  it('长度不足（25 字符以下）拒绝', () => {
    expect(() => pipe.transform('c123', meta('userId'))).toThrow(BadRequestException);
  });

  it('长度超出（25 字符以上）拒绝', () => {
    expect(() => pipe.transform('c'.padEnd(40, 'a'), meta('userId'))).toThrow(BadRequestException);
  });

  it('首字符不是 c 拒绝', () => {
    expect(() => pipe.transform('xkxw9z7yt0000abcd1234efgh', meta('id'))).toThrow(
      BadRequestException,
    );
  });

  it('含非法字符（大写/特殊符号/中文）拒绝', () => {
    expect(() => pipe.transform('cKXW9Z7YT0000ABCD1234EFGH', meta('id'))).toThrow(
      BadRequestException,
    );
    expect(() => pipe.transform('ckxw9z7yt-000abcd1234efgh', meta('id'))).toThrow(
      BadRequestException,
    );
    expect(() => pipe.transform('ckxw9z7yt团队abcd1234efgh', meta('id'))).toThrow(
      BadRequestException,
    );
  });

  it('SQL 注入特征字符串拒绝', () => {
    expect(() => pipe.transform("' OR 1=1 --", meta('id'))).toThrow(BadRequestException);
  });

  it('无 metadata.data 时仍能给出通用错误（不抛 internal）', () => {
    expect(() => pipe.transform('', { type: 'param' as const } as any)).toThrow(
      BadRequestException,
    );
  });
});
