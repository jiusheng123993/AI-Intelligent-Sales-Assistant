/**
 * Background 与当前活动 tab 的通信封装。
 *
 * 仅 background 使用；content 仍不持 token、不直接请求业务 API。
 */
import { ExtensionError, toExtensionError } from '@shared/utils/error';
import { MessageType, type MessageMap } from '@shared/messaging/types';

export async function getActiveTab(): Promise<chrome.tabs.Tab> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.id) throw new ExtensionError('NOT_FOUND', '未找到当前活动标签页');
  return tab;
}

async function sendToTab<K extends typeof MessageType.CONTENT_COLLECT_CONTEXT | typeof MessageType.CONTENT_INSERT_TEXT>(
  tabId: number,
  type: K,
  payload: MessageMap[K]['payload'],
): Promise<MessageMap[K]['response']> {
  try {
    return (await chrome.tabs.sendMessage(tabId, { type, payload })) as MessageMap[K]['response'];
  } catch (e) {
    throw toExtensionError(e, 'NETWORK');
  }
}

export async function collectContextFromActiveTab(
  payload: MessageMap['CONTENT_COLLECT_CONTEXT']['payload'],
): Promise<MessageMap['CONTENT_COLLECT_CONTEXT']['response']> {
  const tab = await getActiveTab();
  return sendToTab(tab.id as number, MessageType.CONTENT_COLLECT_CONTEXT, payload);
}

export async function insertTextToActiveTab(text: string): Promise<MessageMap['CONTENT_INSERT_TEXT']['response']> {
  const tab = await getActiveTab();
  return sendToTab(tab.id as number, MessageType.CONTENT_INSERT_TEXT, { text });
}
