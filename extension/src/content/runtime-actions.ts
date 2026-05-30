/**
 * Content 侧 runtime action 监听。
 *
 * 响应 background 发来的采集上下文 / 插入文本请求。
 */
import { MessageType, type MessageMap } from '@shared/messaging/types';
import type { ChatAdapter } from './adapters/base.adapter';
import { collectContext } from './context-collector';

export function attachContentRuntimeActions(adapter: ChatAdapter): void {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message !== 'object' || typeof message.type !== 'string') return false;

    if (message.type === MessageType.CONTENT_COLLECT_CONTEXT) {
      const payload = message.payload as MessageMap['CONTENT_COLLECT_CONTEXT']['payload'];
      const input = adapter.findInput();
      const context = collectContext(adapter, { limit: 20 });
      const contextText = [payload?.selectedText ?? '', ...context.map((m) => `${m.role}: ${m.text}`)]
        .filter(Boolean)
        .join('\n');
      sendResponse({ contextText, inputText: input ? adapter.getInputText(input) : '' });
      return true;
    }

    if (message.type === MessageType.CONTENT_INSERT_TEXT) {
      const payload = message.payload as MessageMap['CONTENT_INSERT_TEXT']['payload'];
      const input = adapter.findInput();
      if (!input) {
        sendResponse({ ok: false, reason: 'input_not_found' });
        return true;
      }
      try {
        adapter.insertText(input, payload.text);
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, reason: (e as Error).message });
      }
      return true;
    }

    return false;
  });
}
