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

async function removeMenuIfExists(id: string): Promise<void> {
  try {
    await chrome.contextMenus.remove(id);
  } catch {
    // 菜单不存在时 Chrome 会报错，忽略即可，避免影响启动。
  }
}

async function openSidePanelForActiveTab(): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id && chrome.sidePanel?.open) {
      await chrome.sidePanel.open({ tabId: tab.id });
    }
  } catch {
    // sidePanel.open 失败不应阻断 AI 推荐流程。
  }
}

export async function registerContextMenus(): Promise<void> {
  // 精细化删除本扩展菜单，避免 removeAll 误删未来其他模块菜单。
  for (const item of [...MENU_ACTIONS].reverse()) await removeMenuIfExists(item.id);
  await removeMenuIfExists(MENU_ROOT);

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
  await openSidePanelForActiveTab();
  return requestId;
}
