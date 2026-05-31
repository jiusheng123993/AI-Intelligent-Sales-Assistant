/**
 * ui.store 单元测试。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useUiStore } from '@/sidepanel/stores/ui.store';

describe('ui.store', () => {
  beforeEach(() => {
    useUiStore.setState({ currentTab: 'suggestions', toasts: [] });
  });

  it('默认 Tab 是 suggestions', () => {
    expect(useUiStore.getState().currentTab).toBe('suggestions');
  });

  it('setTab 切换', () => {
    useUiStore.getState().setTab('phrasebook');
    expect(useUiStore.getState().currentTab).toBe('phrasebook');
  });

  it('toast 入队 + dismiss 出队', () => {
    useUiStore.getState().toast('hello', 'success');
    const t = useUiStore.getState().toasts;
    expect(t).toHaveLength(1);
    expect(t[0].message).toBe('hello');
    expect(t[0].kind).toBe('success');

    useUiStore.getState().dismissToast(t[0].id);
    expect(useUiStore.getState().toasts).toHaveLength(0);
  });

  it('默认 toast kind 为 info', () => {
    useUiStore.getState().toast('hi');
    expect(useUiStore.getState().toasts[0].kind).toBe('info');
  });
});
