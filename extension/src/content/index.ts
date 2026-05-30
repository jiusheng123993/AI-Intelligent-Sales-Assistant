/**
 * Content Script 入口（注入到白名单站点）。
 *
 * A0 阶段职责：
 * - 仅做加载验证（控制台打印 + 向 background 发 PING）
 * - 真正的 DOM 适配器 / 悬浮按钮 / 上下文采集将在 A5 实现
 *
 * 强约束：
 * - 不直接接触 Token、不直接发起业务 API（一律通过消息走 background）
 * - 二次校验白名单，即使 manifest 已限制，运行期也要 fail-safe
 */
import { createLogger } from '@shared/utils/logger';
import { isWhitelisted } from '@shared/config/whitelist';
import { toExtensionError } from '@shared/utils/error';

const log = createLogger('[content]');

function bootstrap(): void {
  if (!isWhitelisted(location.href)) {
    log.warn('当前站点未在白名单内，content script 拒绝初始化', location.host);
    return;
  }

  log.info('content script 已注入', location.host);

  // 验证通路：与 background 互通 PING/PONG
  chrome.runtime
    .sendMessage({ type: 'PING' })
    .then((resp) => log.info('background 响应', resp))
    .catch((e) => log.error('与 background 通信失败', toExtensionError(e)));
}

try {
  bootstrap();
} catch (e) {
  log.error('content 初始化异常', toExtensionError(e));
}
