/**
 * whitelist 单元测试：覆盖正常 / 边界 / 异常三类场景。
 */
import { describe, it, expect } from 'vitest';
import { isWhitelisted, SITE_WHITELIST } from '@shared/config/whitelist';

describe('whitelist.isWhitelisted', () => {
  it('白名单内 URL 返回 true', () => {
    expect(isWhitelisted('https://work.weixin.qq.com/wework_admin/loginpage_wx')).toBe(true);
    expect(isWhitelisted('https://web.whatsapp.com/')).toBe(true);
  });

  it('非白名单域名返回 false', () => {
    expect(isWhitelisted('https://www.bing.com')).toBe(false);
    expect(isWhitelisted('https://evil.work.weixin.qq.com.attacker.com')).toBe(false);
  });

  it('非法输入不抛错，统一返回 false（边界与异常）', () => {
    expect(isWhitelisted('')).toBe(false);
    expect(isWhitelisted(null as unknown as string)).toBe(false);
    expect(isWhitelisted(undefined as unknown as string)).toBe(false);
    expect(isWhitelisted('not-a-url')).toBe(false);
    expect(isWhitelisted('javascript:alert(1)')).toBe(false);
  });

  it('白名单常量不可变（编译期 readonly，运行期可枚举）', () => {
    expect(SITE_WHITELIST.length).toBeGreaterThan(0);
    expect(SITE_WHITELIST).toContain('work.weixin.qq.com');
    expect(SITE_WHITELIST).toContain('web.whatsapp.com');
  });
});
