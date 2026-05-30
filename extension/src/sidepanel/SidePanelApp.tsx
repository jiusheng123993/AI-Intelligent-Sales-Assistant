/**
 * Side Panel 根组件：
 * - 初始化时拉取 AUTH_STATUS，依据三态切换 UI
 * - 已登录后渲染 TabNav + 当前 Tab 内容
 */
import { useEffect } from 'react';
import { useAuthStore } from './stores/auth.store';
import { useUiStore } from './stores/ui.store';
import { TabNav } from './components/TabNav';
import { LoadingState } from './components/LoadingState';
import { EmptyState } from './components/EmptyState';
import { SuggestionsTab } from './tabs/SuggestionsTab';
import { PhrasebookTab } from './tabs/PhrasebookTab';
import { SettingsTab } from './tabs/SettingsTab';

export function SidePanelApp() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const refresh = useAuthStore((s) => s.refresh);
  const currentTab = useUiStore((s) => s.currentTab);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b bg-white px-4 py-3">
        <h1 className="text-base font-semibold text-brand">销冠话术宝</h1>
        {user && <span className="text-xs text-gray-500">{user.name}</span>}
      </header>

      {status === 'loading' && <LoadingState />}

      {status === 'anon' && (
        <EmptyState
          title="未登录"
          hint="请点击右上角扩展图标，在 Popup 中登录后回到此处刷新。"
          action={
            <button
              type="button"
              onClick={() => refresh()}
              className="rounded bg-brand px-3 py-1.5 text-xs text-white hover:bg-brand-hover"
            >
              我已登录，刷新状态
            </button>
          }
        />
      )}

      {status === 'authed' && (
        <>
          <TabNav />
          <main role="tabpanel" className="flex-1 overflow-auto">
            {currentTab === 'suggestions' && <SuggestionsTab />}
            {currentTab === 'phrasebook' && <PhrasebookTab />}
            {currentTab === 'settings' && <SettingsTab />}
          </main>
        </>
      )}
    </div>
  );
}
