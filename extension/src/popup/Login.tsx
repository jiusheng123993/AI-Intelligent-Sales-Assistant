/**
 * 登录表单组件（Popup 内）。
 * - 入参校验：邮箱格式 + 密码长度
 * - 提交后通过 sendMessage('AUTH_LOGIN') 走 background
 */
import { useState, type FormEvent } from 'react';
import { sendMessage } from '@shared/messaging/send';
import { MessageType } from '@shared/messaging/types';
import { isEmail, isStringInRange } from '@shared/utils/validator';

export interface LoginProps {
  onLoggedIn: () => void | Promise<void>;
}

export function Login({ onLoggedIn }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);

    const emailCheck = isEmail(email);
    if (!emailCheck.valid) return setError(emailCheck.message ?? '邮箱格式不合法');
    const pwdCheck = isStringInRange(6, 64)(password);
    if (!pwdCheck.valid) return setError(pwdCheck.message ?? '密码长度 6~64');

    setLoading(true);
    try {
      const resp = await sendMessage(MessageType.AUTH_LOGIN, { email, password });
      if (resp.ok) {
        await onLoggedIn();
      } else {
        setError(resp.reason);
      }
    } catch (e) {
      setError((e as Error).message ?? '登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="p-4 text-sm">
      <h1 className="text-lg font-semibold text-brand">登录</h1>
      <p className="mt-1 text-xs text-gray-500">Demo: 任意邮箱 + 密码 demo1234</p>

      <label className="mt-4 block text-xs text-gray-600">邮箱</label>
      <input
        type="email"
        autoComplete="username"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 outline-none focus:border-brand"
      />

      <label className="mt-3 block text-xs text-gray-600">密码</label>
      <input
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 outline-none focus:border-brand"
      />

      {error && <div className="mt-3 rounded bg-red-50 px-2 py-1 text-xs text-red-600">{error}</div>}

      <button
        type="submit"
        disabled={loading}
        className="mt-4 w-full rounded bg-brand px-3 py-2 text-white hover:bg-brand-hover disabled:opacity-60"
      >
        {loading ? '登录中…' : '登录'}
      </button>
    </form>
  );
}
