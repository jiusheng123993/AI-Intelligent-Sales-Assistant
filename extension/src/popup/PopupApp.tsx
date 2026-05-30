/**
 * Popup 根组件（A0/A2 占位）。
 * - 通过强类型 sendMessage 调 PING 验证通路
 * - A3 子任务将替换为登录表单
 */
import { useEffect, useState } from 'react';
import { sendMessage } from '@shared/messaging/send';
import { MessageType } from '@shared/messaging/types';

export function PopupApp() {
  const [pong, setPong] = useState<string>('未测试');

  useEffect(() => {
    let cancelled = false;
    sendMessage(MessageType.PING, undefined)
      .then((resp) => {
        if (!cancelled) setPong(JSON.stringify(resp));
      })
      .catch((e) => !cancelled && setPong(`错误: ${String(e?.message ?? e)}`));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="p-4 text-sm">
      <h1 className="text-lg font-semibold text-brand">销冠话术宝</h1>
      <p className="mt-2 text-gray-600">扩展骨架已就绪。</p>
      <div className="mt-4 rounded border border-gray-200 p-2 text-xs">
        <div className="text-gray-500">background 通路:</div>
        <code className="break-all text-gray-800">{pong}</code>
      </div>
    </div>
  );
}
