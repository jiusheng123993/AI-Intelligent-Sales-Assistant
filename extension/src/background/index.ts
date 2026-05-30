/**
 * Service Worker 入口（MV3 background）。
 *
 * 职责：
 * - 注册扩展生命周期监听（onInstalled / onStartup）
 * - 调用 registerHandlers 集中注册业务 handler
 * - 通过 messageRouter.attach 绑定 chrome.runtime.onMessage
 *
 * 强约束：
 * - 仅在 background 发起网络请求与持有 Token（在后续模块实现）
 * - 任何异常必须捕获并通过 logger 输出，禁止裸抛导致 SW 崩溃
 */
import { createLogger } from '@shared/utils/logger';
import { toExtensionError } from '@shared/utils/error';
import { messageRouter } from './router';
import { registerHandlers } from './handlers';

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

try {
  registerHandlers();
  messageRouter.attach();
  log.info('background 已就绪，已注册消息类型:', messageRouter.list());
} catch (e) {
  // 即使初始化失败也不能让 SW 崩溃，保证后续重试机会
  log.error('background 初始化失败', toExtensionError(e));
}
