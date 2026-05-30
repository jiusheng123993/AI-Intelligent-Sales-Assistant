/**
 * type-safe 跨上下文消息发送封装。
 *
 * 设计要点：
 * - 通过 MessageMap 实现 payload 与 response 的强类型推导；
 * - 默认 8s 超时，超时抛 ExtensionError('NETWORK', 'timeout')；
 * - chrome.runtime 不可用时抛 ExtensionError('UNKNOWN', ...)；
 * - 路由层错误外壳 ({__error}) 自动还原为 ExtensionError，调用方只需 try-catch；
 * - transport 抽象便于单测注入内存实现。
 */
import { ExtensionError, toExtensionError, type ErrorCode } from '@shared/utils/error';
import {
  type MessageMap,
  type MessageRequest,
  type MessageResponse,
  type MessageTypeKey,
  isErrorEnvelope,
} from './types';

/** 抽象传输层：屏蔽 chrome.runtime / 测试内存实现的差异。 */
export interface MessageTransport {
  send: (request: MessageRequest) => Promise<unknown>;
}

/** 默认传输：基于 chrome.runtime.sendMessage。 */
export const chromeTransport: MessageTransport = {
  async send(request) {
    const runtime = (globalThis as { chrome?: typeof chrome }).chrome?.runtime;
    if (!runtime || typeof runtime.sendMessage !== 'function') {
      throw new ExtensionError('UNKNOWN', 'chrome.runtime.sendMessage 不可用');
    }
    try {
      return await runtime.sendMessage(request);
    } catch (e) {
      throw toExtensionError(e, 'NETWORK');
    }
  },
};

/** 当前默认 transport，可由调用方在测试时覆写。 */
let currentTransport: MessageTransport = chromeTransport;

export function setTransport(t: MessageTransport): void {
  currentTransport = t;
}

export function resetTransport(): void {
  currentTransport = chromeTransport;
}

export interface SendOptions {
  /** 超时毫秒数；默认 8000ms。设置为 0 表示永不超时（不推荐）。 */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 8000;

/**
 * 发送类型安全的消息并等待响应。
 *
 * @example
 *   const r = await sendMessage('PING', undefined);
 *   r.pong === true;
 */
export async function sendMessage<K extends MessageTypeKey>(
  type: K,
  payload: MessageMap[K]['payload'],
  options: SendOptions = {},
): Promise<MessageMap[K]['response']> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const request = { type, payload } as MessageRequest<K>;

  const sendPromise = currentTransport.send(request);

  const racing: Promise<unknown> =
    timeoutMs > 0
      ? Promise.race([
          sendPromise,
          new Promise<never>((_resolve, reject) =>
            setTimeout(() => reject(new ExtensionError('NETWORK', `消息超时: ${type}`)), timeoutMs),
          ),
        ])
      : sendPromise;

  let raw: unknown;
  try {
    raw = await racing;
  } catch (e) {
    throw toExtensionError(e, 'NETWORK');
  }

  // 响应可能是错误外壳，需要还原为异常
  const resp = raw as MessageResponse<K> | undefined | null;
  if (resp == null) {
    throw new ExtensionError('NETWORK', `消息无响应: ${type}`);
  }
  if (isErrorEnvelope(resp)) {
    const { code, message } = resp.__error;
    throw new ExtensionError(code as ErrorCode, message);
  }
  return resp;
}
