/**
 * context-collector 测试。
 */
import { describe, it, expect } from 'vitest';
import { collectContext } from '@/content/context-collector';
import type { ChatAdapter } from '@/content/adapters/base.adapter';

const adapter: ChatAdapter = {
  site: 'wecom',
  matches: () => true,
  findInput: () => null,
  getInputText: () => '',
  insertText: () => {},
  collectMessages: (limit) => [
    { role: 'customer' as const, text: ' a ' },
    { role: 'sales' as const, text: '' },
    { role: 'customer' as const, text: 'x'.repeat(5000) },
  ].slice(0, limit),
};

describe('collectContext', () => {
  it('裁剪文本并过滤空消息', () => {
    const r = collectContext(adapter, { limit: 10, maxTextLength: 100 });
    expect(r).toHaveLength(2);
    expect(r[0].text).toBe('a');
    expect(r[1].text).toHaveLength(100);
  });

  it('limit 被限制在 1~100', () => {
    expect(collectContext(adapter, { limit: -1 })).toHaveLength(1);
    expect(collectContext(adapter, { limit: 999 })).toHaveLength(2);
  });
});
