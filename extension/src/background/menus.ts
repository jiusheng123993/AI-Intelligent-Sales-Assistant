/**
 * 右键菜单注册与处理。
 */
import { createLogger } from '@shared/utils/logger';
import { type SuggestPayload } from '@shared/api/ai.api';
import { collectContextFromActiveTab } from './tab-actions';
import { handleSuggestStart } from './handlers/ai.handler';

const log = createLogger('[bg:menus]');

const MENU_ROOT = 'sales-coach-root';
const MENU_ACTIONS = [
  { id: 'sales-coach-suggest', title: 'AI 推荐回复', mode: 'suggest' as const },
  { id: 'sales-coach-polish', title: 'AI 润色', mode: 'polish' as const },
  { id: 'sales-coach-translate', title: 'AI 翻译', mode: 'translate' as const },
  { id: 'sales-coach-expand', title: 'AI 扩写', mode: 'expand' as const },
] as const;

export async function registerContextMenus(): Promise<void> {
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({ id: MENU_ROOT, title: '销冠话术宝', contexts: ['selection', 'editable', 'page'] });
  for (const item of MENU_ACTIONS) {
    chrome.contextMenus.create({ id: item.id, parentId: MENU_ROOT, title: item.title, contexts: ['selection', 'editable', 'page'] });
  }
}

export function attachContextMenuHandler(): void {
  chrome.contextMenus.onClicked.addListener((info) => {
    const action = MENU_ACTIONS.find((i) => i.id === info.menuItemId);
    if (!action) return;
    void runContextAction(action.mode, typeof info.selectionText === 'string' ? info.selectionText : '').catch((e) => {
      log.warn('context menu action failed', e);
    });
  });
}

export async function runContextAction(mode: SuggestPayload['mode'], selectedText = ''): Promise<string> {
  const context = await collectContextFromActiveTab({ mode, selectedText });
  const contextText = [selectedText, context.contextText, context.inputText ? `draft: ${context.inputText}` : '']
    .filter(Boolean)
    .join('\n');
  const { requestId } = await handleSuggestStart({ contextText: contextText || 'empty_context', mode });
  return requestId;
}
