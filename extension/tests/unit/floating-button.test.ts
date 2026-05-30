/**
 * floating-button 测试。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createFloatingButton } from '@/content/injector/floating-button';
import type { ChatAdapter } from '@/content/adapters/base.adapter';

function makeAdapter(input: HTMLElement | null): ChatAdapter {
  return {
    site: 'wecom',
    matches: () => true,
    findInput: () => input,
    getInputText: () => '',
    insertText: () => {},
    collectMessages: () => [],
  };
}

describe('createFloatingButton', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('start 时找到输入框则注入按钮', () => {
    const input = document.createElement('textarea');
    document.body.appendChild(input);
    const c = createFloatingButton(makeAdapter(input), vi.fn());
    c.start();
    expect(document.getElementById('sales-coach-floating-button')).toBeTruthy();
    c.stop();
  });

  it('找不到输入框则不注入', () => {
    const c = createFloatingButton(makeAdapter(null), vi.fn());
    c.start();
    expect(document.getElementById('sales-coach-floating-button')).toBeNull();
    c.stop();
  });

  it('点击按钮触发 onClick 并传入当前 input', async () => {
    const input = document.createElement('textarea');
    document.body.appendChild(input);
    const onClick = vi.fn();
    const c = createFloatingButton(makeAdapter(input), onClick);
    c.start();
    document.getElementById('sales-coach-floating-button')?.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(onClick).toHaveBeenCalledWith(input);
    c.stop();
  });

  it('stop 移除按钮', () => {
    const input = document.createElement('textarea');
    document.body.appendChild(input);
    const c = createFloatingButton(makeAdapter(input), vi.fn());
    c.start();
    c.stop();
    expect(document.getElementById('sales-coach-floating-button')).toBeNull();
  });
});
