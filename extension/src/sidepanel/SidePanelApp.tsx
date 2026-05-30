/**
 * Side Panel 根组件（A0 占位）。
 * - 提供三 Tab 静态结构，验证 Tailwind 与 React 在 sidepanel 上下文中可用
 */
import { useState } from 'react';
import { clsx } from 'clsx';

type Tab = 'suggestions' | 'phrasebook' | 'settings';

const TABS: { key: Tab; label: string }[] = [
  { key: 'suggestions', label: '推荐' },
  { key: 'phrasebook', label: '话术库' },
  { key: 'settings', label: '设置' },
];

export function SidePanelApp() {
  const [active, setActive] = useState<Tab>('suggestions');

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b bg-white px-4 py-3">
        <h1 className="text-base font-semibold text-brand">销冠话术宝</h1>
      </header>
      <nav className="flex border-b bg-white">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(t.key)}
            className={clsx(
              'flex-1 px-3 py-2 text-sm transition-colors',
              active === t.key
                ? 'border-b-2 border-brand text-brand'
                : 'text-gray-500 hover:text-gray-800',
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <main className="flex-1 overflow-auto p-4 text-sm text-gray-700">
        {active === 'suggestions' && <p>暂无推荐（A6 子任务将接入流式 AI 推荐）。</p>}
        {active === 'phrasebook' && <p>话术库为空（A7 子任务将实现 CRUD）。</p>}
        {active === 'settings' && <p>设置项将于 A3/A8 子任务完善。</p>}
      </main>
    </div>
  );
}
