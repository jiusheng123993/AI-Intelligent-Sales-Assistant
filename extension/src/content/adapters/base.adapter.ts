/**
 * 内容脚本站点适配器基础协议。
 *
 * 设计原则：
 * - Adapter 仅处理当前站点 DOM 发现/读写/采集；不做 UI 注入、不发消息、不持业务状态；
 * - Injector 只依赖此接口，因此新增站点仅需新增 adapter；
 * - 所有 DOM 查询失败都返回 null/[]，禁止抛错导致 content script 崩溃。
 */
import { ExtensionError } from '@shared/utils/error';

/** 聊天消息的最小投影。 */
export interface ChatMessage {
  role: 'customer' | 'sales' | 'unknown';
  text: string;
  ts?: number;
}

export interface ChatAdapter {
  /** 站点标识。 */
  readonly site: 'wecom' | 'whatsapp';
  /** 当前页面是否匹配此适配器。 */
  matches(url: Location): boolean;
  /** 查找当前可输入区域。 */
  findInput(): HTMLElement | null;
  /** 获取输入框当前文本。 */
  getInputText(input: HTMLElement): string;
  /** 向输入框插入文本。 */
  insertText(input: HTMLElement, text: string): void;
  /** 采集最近 N 条消息。 */
  collectMessages(limit: number): ChatMessage[];
}

/** 多选择器兜底查询：按顺序返回第一个命中的 HTMLElement。 */
export function queryFirst(selectors: readonly string[], root: ParentNode = document): HTMLElement | null {
  for (const selector of selectors) {
    const el = root.querySelector(selector);
    if (el instanceof HTMLElement) return el;
  }
  return null;
}

/** 多选择器查询所有命中元素，并去重。 */
export function queryAll(selectors: readonly string[], root: ParentNode = document): HTMLElement[] {
  const set = new Set<HTMLElement>();
  for (const selector of selectors) {
    root.querySelectorAll(selector).forEach((el) => {
      if (el instanceof HTMLElement) set.add(el);
    });
  }
  return Array.from(set);
}

/** 读取 HTMLElement 文本，自动 trim；空白返回空串。 */
export function readText(el: HTMLElement | null | undefined): string {
  if (!el) return '';
  const v = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? el.value : el.innerText || el.textContent || '';
  return v.trim();
}

/** 以浏览器友好的方式插入文本，兼容 input/textarea/contenteditable。 */
export function insertTextIntoElement(input: HTMLElement, text: string): void {
  if (!text) return;
  input.focus();

  if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    input.value = `${input.value.slice(0, start)}${text}${input.value.slice(end)}`;
    const cursor = start + text.length;
    input.setSelectionRange(cursor, cursor);
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }

  if (input.isContentEditable) {
    const ok = document.execCommand?.('insertText', false, text);
    if (!ok) {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        input.textContent = `${input.textContent ?? ''}${text}`;
      } else {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
        range.collapse(false);
      }
    }
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
    return;
  }

  throw new ExtensionError('DOM_ADAPTER', '目标元素不是可输入区域');
}

/** 简单判断消息归属：按 class 名关键字尽量推断，失败 unknown。 */
export function inferRole(el: HTMLElement): ChatMessage['role'] {
  const cls = ` ${el.className.toString().toLowerCase().replace(/[_-]+/g, ' ')} `;
  const has = (token: string) => cls.includes(` ${token} `);
  if (has('message out') || has('out') || has('self') || has('send') || has('sent')) return 'sales';
  if (has('message in') || has('in') || has('other') || has('recv') || has('receive')) return 'customer';
  return 'unknown';
}
