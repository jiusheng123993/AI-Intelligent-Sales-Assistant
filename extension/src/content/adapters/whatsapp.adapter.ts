/**
 * WhatsApp Web DOM 适配器。
 *
 * A5 阶段提供基础 selector 与插入/采集能力；后续可根据真实 DOM 继续细化。
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
  'div[contenteditable="true"][data-tab]',
  'footer div[contenteditable="true"]',
  '[role="textbox"][contenteditable="true"]',
  'textarea',
] as const;

const MESSAGE_SELECTORS = [
  '[data-testid="msg-container"]',
  'div.message-in, div.message-out',
  '[class*="message-in"], [class*="message-out"]',
  '[role="row"]',
] as const;

export const whatsappAdapter: ChatAdapter = {
  site: 'whatsapp',

  matches(url) {
    return url.hostname === 'web.whatsapp.com';
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
