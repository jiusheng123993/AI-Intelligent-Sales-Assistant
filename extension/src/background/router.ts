/**
 * 中心化消息路由（仅在 background Service Worker 中使用）。
 *
 * 职责：
 * - 维护 type → handler 映射；
 * - 统一异常捕获：handler 抛错 → 转 { __error } 外壳返回；
 * - 未注册的 type → 返回 { __error: NOT_FOUND }；
 * - 兼容异步 handler：始终 return true 保持 sendResponse 通道开放。
 */
import { ExtensionError, toExtensionError } from '@shared/utils/error';
import { createLogger } from '@shared/utils/logger';
import {
  type MessageMap,
  type MessageRequest,
  type MessageTypeKey,
  type MessageErrorEnvelope,
} from '@shared/messaging/types';

const log = createLogger('[bg:router]');

export type MessageHandler<K extends MessageTypeKey> = (
  payload: MessageMap[K]['payload'],
  sender: chrome.runtime.MessageSender,
) => Promise<MessageMap[K]['response']> | MessageMap[K]['response'];

/** 抽象的 onMessage 监听器接口，便于测试替换。 */
export interface OnMessageBus {
  addListener: (
    listener: (
      message: unknown,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: unknown) => void,
    ) => boolean | void,
  ) => void;
}

function getDefaultBus(): OnMessageBus {
  const runtime = (globalThis as { chrome?: typeof chrome }).chrome?.runtime;
  if (!runtime || !runtime.onMessage) {
    throw new ExtensionError('UNKNOWN', 'chrome.runtime.onMessage 不可用');
  }
  return runtime.onMessage as unknown as OnMessageBus;
}

function toErrorEnvelope(e: unknown): MessageErrorEnvelope {
  const ext = toExtensionError(e);
  return { __error: { code: ext.code, message: ext.message } };
}

export class MessageRouter {
  private handlers = new Map<MessageTypeKey, MessageHandler<MessageTypeKey>>();
  private attached = false;

  /** 注册 handler；同一 type 重复注册抛 VALIDATION 异常。 */
  register<K extends MessageTypeKey>(type: K, handler: MessageHandler<K>): void {
    if (this.handlers.has(type)) {
      throw new ExtensionError('VALIDATION', `Duplicate handler for message type: ${type}`);
    }
    this.handlers.set(type, handler as unknown as MessageHandler<MessageTypeKey>);
  }

  /** 反注册（一般无需调用，留作热重载与测试用）。 */
  unregister(type: MessageTypeKey): void {
    this.handlers.delete(type);
  }

  /** 已注册的 type 列表（只读快照）。 */
  list(): MessageTypeKey[] {
    return Array.from(this.handlers.keys());
  }

  /** 内部分发：返回 Promise<response | errorEnvelope>。 */
  async dispatch(
    message: unknown,
    sender: chrome.runtime.MessageSender,
  ): Promise<unknown> {
    // 严格结构校验：必须是 { type: string, payload: any } 对象；payload 可为 undefined 但 key 必须存在
    if (
      typeof message !== 'object' ||
      message === null ||
      typeof (message as MessageRequest).type !== 'string' ||
      !('payload' in (message as object))
    ) {
      return toErrorEnvelope(
        new ExtensionError('VALIDATION', 'message 必须是 {type,payload} 结构'),
      );
    }
    const req = message as MessageRequest;
    const handler = this.handlers.get(req.type);
    if (!handler) {
      return toErrorEnvelope(
        new ExtensionError('NOT_FOUND', `unknown message type: ${req.type}`),
      );
    }
    try {
      return await handler(req.payload, sender);
    } catch (e) {
      log.error('handler 执行抛错', req.type, e);
      return toErrorEnvelope(e);
    }
  }

  /**
   * 绑定到 chrome.runtime.onMessage；重复绑定无副作用。
   * @param bus 可选传入；未传入时尝试使用 chrome.runtime.onMessage，
   *            若 chrome 不可用则抛 UNKNOWN（生产环境必有，测试请显式传 bus）。
   */
  attach(bus?: OnMessageBus): void {
    if (this.attached) return;
    const resolvedBus = bus ?? getDefaultBus();
    this.attached = true;
    resolvedBus.addListener((message, sender, sendResponse) => {
      // 必须 return true 保持异步通道
      this.dispatch(message, sender)
        .then((resp) => sendResponse(resp))
        .catch((e) => sendResponse(toErrorEnvelope(e)));
      return true;
    });
  }
}

/** 全局单例（background 入口使用）。 */
export const messageRouter = new MessageRouter();
