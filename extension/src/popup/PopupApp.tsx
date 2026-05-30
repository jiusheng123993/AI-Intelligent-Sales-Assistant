/**
 * Popup 根组件：根据登录态切换 Login / 已登录态。
 */
import { useEffect, useState } from 'react';
import { sendMessage } from '@shared/messaging/send';
import { MessageType, type AuthUserProjection } from '@shared/messaging/types';
import { Login } from './Login';

type Status =
  | { kind: 'loading' }
  | { kind: 'anon' }
  | { kind: 'authed'; user: AuthUserProjection };

export function PopupApp() {
  const [status, setStatus] = useState<Status>({ kind: 'loading' });

  async function refresh(): Promise<void> {
    try {
      const r = await sendMessage(MessageType.AUTH_STATUS, undefined);
      if (r.loggedIn) setStatus({ kind: 'authed', user: r.user });
      else setStatus({ kind: 'anon' });
    } catch {
      setStatus({ kind: 'anon' });
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function onLogout(): Promise<void> {
    await sendMessage(MessageType.AUTH_LOGOUT, undefined);
    await refresh();
  }

  if (status.kind === 'loading') {
    return <div className="p-4 text-sm text-gray-500">加载中…</div>;
  }
  if (status.kind === 'anon') {
    return <Login onLoggedIn={refresh} />;
  }
  return (
    <div className="p-4 text-sm">
      <h1 className="text-lg font-semibold text-brand">销冠话术宝</h1>
      <div className="mt-3 rounded border border-gray-200 p-3">
        <div className="font-medium text-gray-800">{status.user.name}</div>
        <div className="text-xs text-gray-500">{status.user.email}</div>
        <div className="mt-1 text-xs text-brand">角色：{status.user.role}</div>
      </div>
      <button
        type="button"
        onClick={onLogout}
        className="mt-4 w-full rounded bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200"
      >
        退出登录
      </button>
    </div>
  );
}
