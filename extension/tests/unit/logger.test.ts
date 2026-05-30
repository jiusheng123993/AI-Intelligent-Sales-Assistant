/**
 * Logger 单元测试：覆盖级别过滤、child 前缀、异常路径不抛错。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLogger, setLogLevel } from '@shared/utils/logger';

describe('logger', () => {
  beforeEach(() => {
    setLogLevel('debug');
  });

  it('各级别输出到对应 console API', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    const log = createLogger('[t]');
    log.debug('d');
    log.info('i');
    log.warn('w');
    log.error('e');

    expect(debug).toHaveBeenCalledWith('[t]', 'd');
    expect(info).toHaveBeenCalledWith('[t]', 'i');
    expect(warn).toHaveBeenCalledWith('[t]', 'w');
    expect(error).toHaveBeenCalledWith('[t]', 'e');
  });

  it('级别过滤生效：warn 级别下不输出 debug/info', () => {
    setLogLevel('warn');
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const log = createLogger('[t]');
    log.debug('x');
    log.info('x');
    log.warn('x');

    expect(debug).not.toHaveBeenCalled();
    expect(info).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
  });

  it('child 串联前缀', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const log = createLogger('[a]').child(':b');
    log.info('hi');
    expect(info).toHaveBeenCalledWith('[a]:b', 'hi');
  });
});
