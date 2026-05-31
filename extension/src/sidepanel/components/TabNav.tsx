/**
 * 顶部 Tab 导航条。
 * - 纯展示组件；状态由 ui.store 持有
 */
import { clsx } from 'clsx';
import { useUiStore, type TabKey } from '../stores/ui.store';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'suggestions', label: '推荐' },
  { key: 'phrasebook', label: '话术库' },
  { key: 'settings', label: '设置' },
];

export function TabNav() {
  const current = useUiStore((s) => s.currentTab);
  const setTab = useUiStore((s) => s.setTab);
  return (
    <nav role="tablist" className="flex border-b bg-white">
      {TABS.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={current === t.key}
          onClick={() => setTab(t.key)}
          className={clsx(
            'flex-1 px-3 py-2 text-sm transition-colors',
            current === t.key
              ? 'border-b-2 border-brand text-brand'
              : 'text-gray-500 hover:text-gray-800',
          )}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}
