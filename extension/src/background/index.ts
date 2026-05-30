/**
 * Service Worker 入口（MV3 background）。
 *
 * 职责：
 * - 注册扩展生命周期监听
 * - 通过 MessageRouter 集中分发跨上下文消息
 *
 * 强约束：
 * - 仅在 background 发起网络请求与持有 Token（在后续模块实现）
 * - 任何异常必须捕获并通过 logger 输出，禁止裸抛导致 SW 崩溃
 */
import { createLogger } from '@shared/utils/logger';
import { toExtensionError } from '@shared/utils/error';
import { MessageType } from '@shared/messaging/types';
import { messageRouter } from './router';

const log = createLogger('[bg]');

chrome.runtime.onInstalled.addListener((details) => {
  try {
    log.info('扩展已安装/更新', details.reason);
  } catch (e) {
    log.error('onInstalled 处理失败', toExtensionError(e));
  }
});

chrome.runtime.onStartup.addListener(() => {
  log.info('Service Worker 启动');
});

// 注册一期所有消息 handler（业务实现将在后续子任务接入；此处保留通路占位）
messageRouter.register(MessageType.PING, () => ({ pong: true, ts: Date.now() }));

messageRouter.register(MessageType.AUTH_LOGIN, () => {
  // A3 子任务将接入真实登录逻辑
  return { ok: false, reason: 'not_implemented' };
});

messageRouter.register(MessageType.AI_SUGGEST_START, () => {
  // A6 子任务将接入真实 SSE 流
  return { requestId: `placeholder_${Date.now()}` };
});

messageRouter.register(MessageType.INSERT_TEXT, () => {
  // A5 子任务将通过 content script adapter 实现
  return { ok: false, reason: 'not_implemented' };
});

messageRouter.attach();

log.info('background 模块已加载，已注册消息类型:', messageRouter.list());
