/**
 * MessageRouter 单元测试：
 * - 正常分发 / 未注册 type / handler 抛错 / 非法消息结构 / 重复注册抛错 / list / attach.
 */
import { describe, it, expect, vi } from 'vitest';
import { MessageRouter, type OnMessageBus } from '@/background/router';
import { MessageType, isErrorEnvelope } from '@shared/messaging/types';
import { ExtensionError } from '@shared/utils/error';

const fakeSender = {} as chrome.runtime.MessageSender;

describe('MessageRouter.dispatch', () => {
  it('命中 handler 返回 response', async () => {
    const r = new MessageRouter();
    r.register(MessageType.PING, () => ({ pong: true, ts: 1 }));
    const resp = await r.dispatch({ type: MessageType.PING, payload: undefined }, fakeSender);
    expect(resp).toEqual({ pong: true, ts: 1 });
  });

  it('支持 async handler', async () => {
    const r = new MessageRouter();
    r.register(MessageType.PING, async () => ({ pong: true, ts: 2 }));
    const resp = await r.dispatch({ type: MessageType.PING, payload: undefined }, fakeSender);
    expect(resp).toEqual({ pong: true, ts: 2 });
  });

  it('未注册的 type 返回 NOT_FOUND 错误外壳', async () => {
    const r = new MessageRouter();
    const resp = await r.dispatch({ type: 'NO_SUCH', payload: null }, fakeSender);
    expect(isErrorEnvelope(resp)).toBe(true);
    expect((resp as { __error: { code: string } }).__error.code).toBe('NOT_FOUND');
  });

  it('handler 抛错被转为错误外壳', async () => {
    const r = new MessageRouter();
    r.register(MessageType.PING, () => {
      throw new ExtensionError('FORBIDDEN', '禁止访问');
    });
    // 抑制预期 error 日志输出
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const resp = await r.dispatch({ type: MessageType.PING, payload: undefined }, fakeSender);
      expect(isErrorEnvelope(resp)).toBe(true);
      expect((resp as { __error: { code: string } }).__error.code).toBe('FORBIDDEN');
    } finally {
      spy.mockRestore();
    }
  });

  it('非法消息结构返回 VALIDATION 错误外壳', async () => {
    const r = new MessageRouter();
    expect(isErrorEnvelope(await r.dispatch(null, fakeSender))).toBe(true);
    expect(isErrorEnvelope(await r.dispatch('string', fakeSender))).toBe(true);
    expect(isErrorEnvelope(await r.dispatch({ no_type: 1 }, fakeSender))).toBe(true);
  });

  it('重复注册同一 type 抛 VALIDATION', () => {
    const r = new MessageRouter();
    r.register(MessageType.PING, () => ({ pong: true, ts: 1 }));
    expect(() => r.register(MessageType.PING, () => ({ pong: true, ts: 2 }))).toThrow(ExtensionError);
  });

  it('list 返回已注册 type；unregister 生效', () => {
    const r = new MessageRouter();
    r.register(MessageType.PING, () => ({ pong: true, ts: 1 }));
    expect(r.list()).toContain(MessageType.PING);
    r.unregister(MessageType.PING);
    expect(r.list()).not.toContain(MessageType.PING);
  });
});

describe('MessageRouter.attach', () => {
  it('attach 后能转发消息并经 sendResponse 回执', async () => {
    let captured: unknown;
    const bus: OnMessageBus = {
      addListener: (listener) => {
        // 模拟 chrome 调用 listener
        listener({ type: MessageType.PING, payload: undefined }, fakeSender, (resp) => {
          captured = resp;
        });
      },
    };
    const r = new MessageRouter();
    r.register(MessageType.PING, () => ({ pong: true, ts: 99 }));
    r.attach(bus);
    // 等微任务队列冲刷
    await new Promise((res) => setTimeout(res, 0));
    expect(captured).toEqual({ pong: true, ts: 99 });
  });

  it('attach 重复调用幂等（仅绑定一次）', () => {
    const addListener = vi.fn();
    const bus: OnMessageBus = { addListener };
    const r = new MessageRouter();
    r.attach(bus);
    r.attach(bus);
    expect(addListener).toHaveBeenCalledTimes(1);
  });
});
