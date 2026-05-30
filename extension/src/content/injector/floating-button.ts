/**
 * 悬浮按钮注入器。
 *
 * 职责：
 * - 监听 DOM 变化与输入框 focus，确保页面上最多存在一个按钮；
 * - 按钮点击后调用 onClick(input)，具体业务由调用方决定；
 * - 不依赖任何站点 DOM 细节，只依赖 ChatAdapter.findInput。
 */
import { createLogger } from '@shared/utils/logger';
import type { ChatAdapter } from '../adapters/base.adapter';

const log = createLogger('[content:floating]');
const BUTTON_ID = 'sales-coach-floating-button';

export interface FloatingButtonController {
  start(): void;
  stop(): void;
  refresh(): void;
}

export function createFloatingButton(
  adapter: ChatAdapter,
  onClick: (input: HTMLElement) => void | Promise<void>,
): FloatingButtonController {
  let observer: MutationObserver | null = null;
  let disposed = false;
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;

  function remove(): void {
    document.getElementById(BUTTON_ID)?.remove();
  }

  function placeNear(input: HTMLElement, btn: HTMLElement): void {
    const rect = input.getBoundingClientRect();
    btn.style.position = 'fixed';
    btn.style.zIndex = '2147483647';
    btn.style.left = `${Math.max(8, rect.right - 36)}px`;
    btn.style.top = `${Math.max(8, rect.bottom - 36)}px`;
  }

  function ensure(): void {
    if (disposed) return;
    const input = adapter.findInput();
    if (!input) {
      remove();
      return;
    }

    let btn = document.getElementById(BUTTON_ID) as HTMLButtonElement | null;
    if (!btn) {
      btn = document.createElement('button');
      btn.id = BUTTON_ID;
      btn.type = 'button';
      btn.textContent = '✨';
      btn.title = '销冠话术宝：生成推荐话术';
      btn.setAttribute('aria-label', '销冠话术宝');
      btn.style.width = '30px';
      btn.style.height = '30px';
      btn.style.borderRadius = '999px';
      btn.style.border = '1px solid rgba(79,70,229,.35)';
      btn.style.background = '#4f46e5';
      btn.style.color = '#fff';
      btn.style.boxShadow = '0 8px 20px rgba(0,0,0,.18)';
      btn.style.cursor = 'pointer';
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const current = adapter.findInput();
        if (!current) return;
        try {
          await onClick(current);
        } catch (err) {
          log.error('floating button click failed', err);
        }
      });
      document.body.appendChild(btn);
    }
    placeNear(input, btn);
  }

  function schedule(): void {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(ensure, 120);
  }

  return {
    start() {
      disposed = false;
      ensure();
      observer = new MutationObserver(schedule);
      observer.observe(document.body, { childList: true, subtree: true });
      window.addEventListener('resize', schedule);
      document.addEventListener('focusin', schedule);
    },
    stop() {
      disposed = true;
      observer?.disconnect();
      observer = null;
      if (refreshTimer) clearTimeout(refreshTimer);
      window.removeEventListener('resize', schedule);
      document.removeEventListener('focusin', schedule);
      remove();
    },
    refresh: ensure,
  };
}
