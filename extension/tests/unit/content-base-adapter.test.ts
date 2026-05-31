/**
 * content adapter 基础工具测试。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  queryFirst,
  queryAll,
  readText,
  insertTextIntoElement,
  inferRole,
} from '@/content/adapters/base.adapter';

describe('base.adapter utilities', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('queryFirst 按 selector 顺序返回首个命中', () => {
    document.body.innerHTML = '<div class="b"></div><div class="a"></div>';
    expect(queryFirst(['.a', '.b'])?.className).toBe('a');
  });

  it('queryAll 多 selector 去重', () => {
    document.body.innerHTML = '<div class="a b"></div><div class="b"></div>';
    expect(queryAll(['.a', '.b'])).toHaveLength(2);
  });

  it('readText 支持 input/textarea/content', () => {
    document.body.innerHTML = '<input id="i" value=" hi "><div id="d"> text </div>';
    expect(readText(document.getElementById('i') as HTMLElement)).toBe('hi');
    expect(readText(document.getElementById('d') as HTMLElement)).toBe('text');
  });

  it('insertTextIntoElement 支持 input 插入并触发 input 事件', () => {
    document.body.innerHTML = '<input id="i" value="hello">';
    const input = document.getElementById('i') as HTMLInputElement;
    input.setSelectionRange(5, 5);
    let fired = false;
    input.addEventListener('input', () => (fired = true));
    insertTextIntoElement(input, ' world');
    expect(input.value).toBe('hello world');
    expect(fired).toBe(true);
  });

  it('insertTextIntoElement 对非输入元素抛 DOM_ADAPTER', () => {
    const div = document.createElement('div');
    expect(() => insertTextIntoElement(div, 'x')).toThrow();
  });

  it('inferRole 根据 class 推断角色', () => {
    const out = document.createElement('div');
    out.className = 'message-out self';
    const inc = document.createElement('div');
    inc.className = 'message-in other';
    const unk = document.createElement('div');
    expect(inferRole(out)).toBe('sales');
    expect(inferRole(inc)).toBe('customer');
    expect(inferRole(unk)).toBe('unknown');
  });
});
