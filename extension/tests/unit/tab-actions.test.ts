/**
 * background tab-actions 测试。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { collectContextFromActiveTab, getActiveTab, insertTextToActiveTab } from '@/background/tab-actions';
import { MessageType } from '@shared/messaging/types';

describe('tab-actions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getActiveTab 返回当前活动 tab', async () => {
    const tab = await getActiveTab();
    expect(tab.id).toBe(1);
    expect(chrome.tabs.query).toHaveBeenCalledWith({ active: true, currentWindow: true });
  });

  it('getActiveTab 找不到 tab 抛 NOT_FOUND', async () => {
    vi.spyOn(chrome.tabs, 'query').mockResolvedValueOnce([]);
    await expect(getActiveTab()).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('collectContextFromActiveTab 发送 CONTENT_COLLECT_CONTEXT', async () => {
    vi.spyOn(chrome.tabs, 'sendMessage').mockResolvedValueOnce({ contextText: 'ctx', inputText: 'draft' });
    const r = await collectContextFromActiveTab({ mode: 'suggest', selectedText: 'sel' });
    expect(r.contextText).toBe('ctx');
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, {
      type: MessageType.CONTENT_COLLECT_CONTEXT,
      payload: { mode: 'suggest', selectedText: 'sel' },
    });
  });

  it('insertTextToActiveTab 发送 CONTENT_INSERT_TEXT', async () => {
    vi.spyOn(chrome.tabs, 'sendMessage').mockResolvedValueOnce({ ok: true });
    const r = await insertTextToActiveTab('hello');
    expect(r).toEqual({ ok: true });
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, {
      type: MessageType.CONTENT_INSERT_TEXT,
      payload: { text: 'hello' },
    });
  });
});
