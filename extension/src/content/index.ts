/**
 * Content Script 入口（注入到白名单站点）。
 *
 * A5 阶段职责：
 * - 根据 hostname 选择站点 adapter；
 * - 启动悬浮按钮；
 * - 点击按钮时采集上下文并通过 background 触发 AI_SUGGEST_START 占位消息；
 * - content 不持 token、不直接发业务 API。
 */
import { createLogger } from '@shared/utils/logger';
import { isWhitelisted } from '@shared/config/whitelist';
import { toExtensionError } from '@shared/utils/error';
import { sendMessage } from '@shared/messaging/send';
import { MessageType } from '@shared/messaging/types';
import type { ChatAdapter } from './adapters/base.adapter';
import { wecomAdapter } from './adapters/wecom.adapter';
import { whatsappAdapter } from './adapters/whatsapp.adapter';
import { collectContext } from './context-collector';
import { createFloatingButton } from './injector/floating-button';
import { attachContentRuntimeActions } from './runtime-actions';

const log = createLogger('[content]');

function pickAdapter(): ChatAdapter | null {
  const adapters: ChatAdapter[] = [wecomAdapter, whatsappAdapter];
  return adapters.find((a) => a.matches(location)) ?? null;
}

async function onSuggest(adapter: ChatAdapter, input: HTMLElement): Promise<void> {
  const context = collectContext(adapter, { limit: 20 });
  const inputText = adapter.getInputText(input);
  const contextText = [...context.map((m) => `${m.role}: ${m.text}`), inputText ? `draft: ${inputText}` : '']
    .filter(Boolean)
    .join('\n');

  const resp = await sendMessage(MessageType.AI_SUGGEST_START, {
    contextText: contextText || 'empty_context',
    mode: 'suggest',
  });
  log.info('AI_SUGGEST_START placeholder requestId', resp.requestId);
}

async function bootstrap(): Promise<void> {
  if (!isWhitelisted(location.href)) {
    log.warn('当前站点未在白名单内，content script 拒绝初始化', location.host);
    return;
  }

  const adapter = pickAdapter();
  if (!adapter) {
    log.warn('未找到匹配 adapter', location.host);
    return;
  }

  log.info('content script 已注入', adapter.site, location.host);

  try {
    const resp = await sendMessage(MessageType.PING, undefined);
    log.info('background 响应', resp);
  } catch (e) {
    log.error('与 background 通信失败', toExtensionError(e));
  }

  attachContentRuntimeActions(adapter);
  createFloatingButton(adapter, (input) => onSuggest(adapter, input)).start();
}

bootstrap().catch((e) => log.error('content 初始化异常', toExtensionError(e)));
