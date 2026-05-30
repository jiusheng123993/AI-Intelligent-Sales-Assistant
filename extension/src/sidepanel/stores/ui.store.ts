/**
 * Side Panel UI 状态 store。
 *
 * 仅承载本地 UI 状态：当前 Tab、轻量 toast 队列。
 * 不持有业务数据；不与跨上下文通信。
 */
import { create } from 'zustand';

export type TabKey = 'suggestions' | 'phrasebook' | 'settings';

export interface Toast {
  id: number;
  message: string;
  kind: 'info' | 'success' | 'warn' | 'error';
}

export interface UiState {
  currentTab: TabKey;
  setTab: (t: TabKey) => void;
  toasts: Toast[];
  toast: (message: string, kind?: Toast['kind']) => void;
  dismissToast: (id: number) => void;
}

let toastId = 0;

export const useUiStore = create<UiState>((set) => ({
  currentTab: 'suggestions',
  toasts: [],
  setTab: (t) => set({ currentTab: t }),
  toast: (message, kind = 'info') =>
    set((s) => ({
      toasts: [...s.toasts, { id: ++toastId, message, kind }],
    })),
  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
