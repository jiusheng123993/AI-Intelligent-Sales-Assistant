/**
 * background 消息 handler 占位/真实注册中心。
 *
 * 设计目的：
 * - 把所有 handler 集中在此，便于 A3/A5/A6 等子任务逐个替换为真实实现；
 * - 入口文件 background/index.ts 仅负责生命周期与 attach，避免合并冲突。
 */
import { MessageType } from '@shared/messaging/types';
import { tokenManager } from '@shared/auth/token-manager';
import { setAuthProvider, setMockHandler } from '@shared/api/http';
import { apiConfig } from '@shared/api/env';
import { messageRouter } from './router';
import { mockBackend } from './mock-backend';
import { handleLogin, handleLogout, handleAuthStatus } from './handlers/auth.handler';
import { handleSuggestStart } from './handlers/ai.handler';

/** 仅一次性调用：初始化依赖注入 + 注册所有 handler。 */
export function registerHandlers(): void {
  // 1) 依赖注入：让 http.ts 知道 token 提供者，并按需挂载 Mock 后端
  setAuthProvider(tokenManager.asAuthProvider());
  if (apiConfig.useMock) setMockHandler(mockBackend);

  // 2) 通路探活：永远可用
  messageRouter.register(MessageType.PING, () => ({ pong: true, ts: Date.now() }));

  // 3) 鉴权（A3 真实实现）
  messageRouter.register(MessageType.AUTH_LOGIN, (payload) => handleLogin(payload));
  messageRouter.register(MessageType.AUTH_LOGOUT, () => handleLogout());
  messageRouter.register(MessageType.AUTH_STATUS, () => handleAuthStatus());

  // 4) AI 推荐（A6：Mock 流式实现）
  messageRouter.register(MessageType.AI_SUGGEST_START, (payload) => handleSuggestStart(payload));

  // 5) 占位（后续子任务替换）
  messageRouter.register(MessageType.INSERT_TEXT, () => ({
    ok: false as const,
    reason: 'not_implemented',
  }));
}
