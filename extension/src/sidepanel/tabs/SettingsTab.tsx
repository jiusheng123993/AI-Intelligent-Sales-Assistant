/**
 * 设置 Tab — 显示当前账号信息 + 退出登录。
 */
import { useAuthStore } from '../stores/auth.store';
import { useUiStore } from '../stores/ui.store';

export function SettingsTab() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const toast = useUiStore((s) => s.toast);

  async function onLogout(): Promise<void> {
    await logout();
    toast('已退出登录', 'success');
  }

  return (
    <div className="p-4 text-sm">
      <h2 className="text-base font-semibold text-gray-800">账户</h2>
      {user ? (
        <div className="mt-2 rounded border border-gray-200 p-3">
          <div className="font-medium text-gray-800">{user.name}</div>
          <div className="text-xs text-gray-500">{user.email}</div>
          <div className="mt-1 text-xs text-brand">角色：{user.role}</div>
        </div>
      ) : (
        <div className="mt-2 text-xs text-gray-500">未登录</div>
      )}

      <button
        type="button"
        onClick={onLogout}
        className="mt-4 w-full rounded bg-gray-100 px-3 py-2 hover:bg-gray-200"
      >
        退出登录
      </button>
    </div>
  );
}
