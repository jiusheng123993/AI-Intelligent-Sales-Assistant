/**
 * 快捷键处理。
 */
import { createLogger } from '@shared/utils/logger';
import { runContextAction } from './menus';

const log = createLogger('[bg:commands]');

export function attachCommandHandler(): void {
  chrome.commands.onCommand.addListener((command) => {
    const mode = command === 'polish-input' ? 'polish' : command === 'suggest-replies' ? 'suggest' : null;
    if (!mode) return;
    void runContextAction(mode).catch((e) => log.warn('command failed', command, e));
  });
}
