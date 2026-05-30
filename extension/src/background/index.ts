/**
 * Service Worker 入口（MV3 background）。
 *
 * A0 阶段职责（最小骨架）：
 * - 安装 / 启动事件日志
 * - 占位消息监听（统一路由层将在 A2 接入）
 *
 * 强约束：
 * - 仅在 background 发起网络请求与持有 Token（在后续模块实现）
 * - 任何异常必须捕获并通过 logger 输出，禁止裸抛导致 SW 崩溃
 */
import { createLogger } from '@shared/utils/logger';
import { toExtensionError } from '@shared/utils/error';

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

// A0 阶段占位：仅响应一个 ping，用于验证三大上下文通路
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  try {
    if (message && message.type === 'PING') {
      sendResponse({ type: 'PONG', ts: Date.now() });
      return true; // 保持通道开放
    }
    return false;
  } catch (e) {
    log.error('onMessage 处理失败', toExtensionError(e));
    return false;
  }
});

log.info('background 模块已加载');
