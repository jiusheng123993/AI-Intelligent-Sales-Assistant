/**
 * background 消息 handler 占位注册中心。
 *
 * 设计目的：
 * - 把所有"暂未实现"的 handler 集中在此，便于后续子任务（A3/A5/A6）逐个替换为真实实现；
 * - 入口文件 background/index.ts 仅负责生命周期与 attach，不直接登记业务 handler，
 *   降低修改入口文件的频次，避免合并冲突。
 *
 * 升级路径：
 * - A3：替换 AUTH_LOGIN
 * - A5：替换 INSERT_TEXT
 * - A6：替换 AI_SUGGEST_START
 */
import { MessageType } from '@shared/messaging/types';
import { messageRouter } from './router';

/** 仅一次性调用：向 messageRouter 注册一期所有 handler（含占位）。 */
export function registerHandlers(): void {
  // 通路探活：永远可用
  messageRouter.register(MessageType.PING, () => ({ pong: true, ts: Date.now() }));

  // ---------------- 占位 handlers（后续子任务接管） ----------------

  // A3：真实登录
  messageRouter.register(MessageType.AUTH_LOGIN, () => ({
    ok: false as const,
    reason: 'not_implemented',
  }));

  // A6：触发流式 AI 推荐
  messageRouter.register(MessageType.AI_SUGGEST_START, () => ({
    requestId: `placeholder_${Date.now()}`,
  }));

  // A5：向当前 tab 的 content adapter 转发插入文本
  messageRouter.register(MessageType.INSERT_TEXT, () => ({
    ok: false as const,
    reason: 'not_implemented',
  }));
}
