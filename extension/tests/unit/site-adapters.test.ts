/**
 * 站点适配器测试：WeCom / WhatsApp。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { wecomAdapter } from '@/content/adapters/wecom.adapter';
import { whatsappAdapter } from '@/content/adapters/whatsapp.adapter';

describe('wecomAdapter', () => {
  beforeEach(() => (document.body.innerHTML = ''));

  it('matches 仅匹配 work.weixin.qq.com', () => {
    expect(wecomAdapter.matches(new URL('https://work.weixin.qq.com/') as unknown as Location)).toBe(true);
    expect(wecomAdapter.matches(new URL('https://web.whatsapp.com/') as unknown as Location)).toBe(false);
  });

  it('findInput 找到 contenteditable', () => {
    document.body.innerHTML = '<div contenteditable="true" data-placeholder="msg"></div>';
    expect(wecomAdapter.findInput()).toBeInstanceOf(HTMLElement);
  });

  it('collectMessages 采集最近 N 条并过滤空文本', () => {
    document.body.innerHTML = '<div class="message-item message-in">客户问价</div><div class="message-item message-out">销售回复</div><div class="message-item"></div>';
    const msgs = wecomAdapter.collectMessages(1);
    expect(msgs).toHaveLength(1);
    expect(msgs[0].text).toBe('销售回复');
  });
});

describe('whatsappAdapter', () => {
  beforeEach(() => (document.body.innerHTML = ''));

  it('matches 仅匹配 web.whatsapp.com', () => {
    expect(whatsappAdapter.matches(new URL('https://web.whatsapp.com/') as unknown as Location)).toBe(true);
    expect(whatsappAdapter.matches(new URL('https://work.weixin.qq.com/') as unknown as Location)).toBe(false);
  });

  it('findInput 找到 role=textbox contenteditable', () => {
    document.body.innerHTML = '<div role="textbox" contenteditable="true"></div>';
    expect(whatsappAdapter.findInput()).toBeInstanceOf(HTMLElement);
  });

  it('collectMessages 支持 message-in/out', () => {
    document.body.innerHTML = '<div class="message-in">hi</div><div class="message-out">hello</div>';
    const msgs = whatsappAdapter.collectMessages(10);
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe('customer');
    expect(msgs[1].role).toBe('sales');
  });
});
