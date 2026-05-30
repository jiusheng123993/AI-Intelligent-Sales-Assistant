/**
 * menus / commands 测试。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { attachContextMenuHandler, registerContextMenus, runContextAction } from '@/background/menus';
import { attachCommandHandler } from '@/background/commands';
import * as tabActions from '@/background/tab-actions';
import * as aiHandler from '@/background/handlers/ai.handler';

describe('context menus', () => {
  beforeEach(() => vi.clearAllMocks());

  it('registerContextMenus 先 removeAll 再创建根菜单和 4 个子菜单', async () => {
    await registerContextMenus();
    expect(chrome.contextMenus.removeAll).toHaveBeenCalledTimes(1);
    expect(chrome.contextMenus.create).toHaveBeenCalledTimes(5);
  });

  it('attachContextMenuHandler 注册点击监听', () => {
    attachContextMenuHandler();
    expect(chrome.contextMenus.onClicked.addListener).toHaveBeenCalledTimes(1);
  });

  it('runContextAction 采集 active tab 上下文并触发 AI', async () => {
    vi.spyOn(tabActions, 'collectContextFromActiveTab').mockResolvedValue({ contextText: 'ctx', inputText: 'draft' });
    const spy = vi.spyOn(aiHandler, 'handleSuggestStart').mockResolvedValue({ requestId: 'r1' });
    const id = await runContextAction('polish', 'selected');
    expect(id).toBe('r1');
    expect(spy).toHaveBeenCalledWith({ contextText: 'selected\nctx\ndraft: draft', mode: 'polish' });
  });
});

describe('commands', () => {
  beforeEach(() => vi.clearAllMocks());

  it('attachCommandHandler 注册快捷键监听', () => {
    attachCommandHandler();
    expect(chrome.commands.onCommand.addListener).toHaveBeenCalledTimes(1);
  });
});
