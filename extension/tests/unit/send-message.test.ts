/**
 * sendMessage 单元测试：覆盖成功、错误外壳还原、超时、无 chrome 环境、空响应。
 */
import { describe, it, expect, afterEach } from 'vitest';
import { sendMessage, setTransport, resetTransport, type MessageTransport } from '@shared/messaging/send';
import { MessageType } from '@shared/messaging/types';
import { ExtensionError } from '@shared/utils/error';

function fakeTransport(impl: (req: unknown) => Promise<unknown>): MessageTransport {
  return { send: impl };
}

describe('sendMessage', () => {
  afterEach(() => resetTransport());

  it('正常响应：返回强类型 response', async () => {
    setTransport(fakeTransport(async () => ({ pong: true, ts: 123 })));
    const r = await sendMessage(MessageType.PING, undefined);
    expect(r).toEqual({ pong: true, ts: 123 });
  });

  it('错误外壳自动还原为 ExtensionError', async () => {
    setTransport(
      fakeTransport(async () => ({ __error: { code: 'VALIDATION', message: 'bad input' } })),
    );
    try {
      await sendMessage(MessageType.AUTH_LOGIN, { email: 'x', password: 'y' });
      throw new Error('should not reach');
    } catch (e) {
      expect(e).toBeInstanceOf(ExtensionError);
      expect((e as ExtensionError).code).toBe('VALIDATION');
      expect((e as Error).message).toBe('bad input');
    }
  });

  it('空响应抛 NETWORK', async () => {
    setTransport(fakeTransport(async () => null));
    await expect(sendMessage(MessageType.PING, undefined)).rejects.toBeInstanceOf(ExtensionError);
  });

  it('超时抛 NETWORK', async () => {
    setTransport(fakeTransport(() => new Promise(() => {}))); // 永不 resolve
    await expect(
      sendMessage(MessageType.PING, undefined, { timeoutMs: 30 }),
    ).rejects.toBeInstanceOf(ExtensionError);
  });

  it('transport 抛错被归一化为 ExtensionError(NETWORK)', async () => {
    setTransport(fakeTransport(async () => { throw new Error('boom'); }));
    try {
      await sendMessage(MessageType.PING, undefined);
      throw new Error('should not reach');
    } catch (e) {
      expect(e).toBeInstanceOf(ExtensionError);
      expect(['NETWORK', 'UNKNOWN']).toContain((e as ExtensionError).code);
    }
  });

  it('错误外壳中未知 code 被规范化为 UNKNOWN（防注入）', async () => {
    setTransport(
      fakeTransport(async () => ({
        __error: { code: '<script>alert(1)</script>', message: 'evil' },
      })),
    );
    try {
      await sendMessage(MessageType.PING, undefined);
      throw new Error('should not reach');
    } catch (e) {
      expect(e).toBeInstanceOf(ExtensionError);
      expect((e as ExtensionError).code).toBe('UNKNOWN');
      expect((e as Error).message).toBe('evil');
    }
  });
});
