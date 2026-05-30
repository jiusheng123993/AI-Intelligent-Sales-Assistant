/**
 * 企微网页版 DOM 适配器。
 *
 * 注意：企微 DOM 会随版本变化，本适配器采用多 selector 兜底；
 * 找不到时返回 null/[]，不抛错，以保证扩展不会破坏原页面。
 */
import {
  type ChatAdapter,
  type ChatMessage,
  queryFirst,
  queryAll,
  readText,
  insertTextIntoElement,
  inferRole,
} from './base.adapter';

const INPUT_SELECTORS = [
  '[contenteditable="true"][data-placeholder]',
  '.msg-input[contenteditable="true"]',
  '.input_area [contenteditable="true"]',
  'div[contenteditable="true"]',
  'textarea',
] as const;

const MESSAGE_SELECTORS = [
  '.message-item',
  '.msg-item',
  '.chat-item',
  '.bubble',
  '[class*="message"]',
] as const;

export const wecomAdapter: ChatAdapter = {
  site: 'wecom',

  matches(url) {
    return url.hostname === 'work.weixin.qq.com';
  },

  findInput() {
    return queryFirst(INPUT_SELECTORS);
  },

  getInputText(input) {
    return readText(input);
  },

  insertText(input, text) {
    insertTextIntoElement(input, text);
  },

  collectMessages(limit) {
    return queryAll(MESSAGE_SELECTORS)
      .map<ChatMessage>((el) => ({ role: inferRole(el), text: readText(el), ts: Date.now() }))
      .filter((m) => m.text.length > 0)
      .slice(-Math.max(0, limit));
  },
};
