/**
 * 跨上下文消息协议（强类型 discriminated union）。
 *
 * 设计原则：
 * 1. 每条消息必有 `type` 判别字段；payload 与 response 由 type 唯一决定；
 * 2. 新增消息必须在此登记到 MessageMap，禁止散落字符串 type；
 * 3. 仅做协议声明，不含运行时逻辑；任何 handler 实现都在各上下文模块内。
 *
 * 一期消息一览（A2 仅做协议占位，真实业务在后续子任务接入）：
 * - PING               通路探活（A0 已用）
 * - AUTH_LOGIN         登录（A3 实现）
 * - AI_SUGGEST_START   触发流式推荐（A6 实现）
 * - INSERT_TEXT        把文本插入到目标输入框（A5 实现）
 */

/** 所有消息类型常量。 */
export const MessageType = {
  PING: 'PING',
  AUTH_LOGIN: 'AUTH_LOGIN',
  AUTH_LOGOUT: 'AUTH_LOGOUT',
  AUTH_STATUS: 'AUTH_STATUS',
  AI_SUGGEST_START: 'AI_SUGGEST_START',
  AI_SUGGEST_CHUNK: 'AI_SUGGEST_CHUNK',
  AI_SUGGEST_DONE: 'AI_SUGGEST_DONE',
  AI_SUGGEST_ERROR: 'AI_SUGGEST_ERROR',
  INSERT_TEXT: 'INSERT_TEXT',
  CONTENT_COLLECT_CONTEXT: 'CONTENT_COLLECT_CONTEXT',
  CONTENT_INSERT_TEXT: 'CONTENT_INSERT_TEXT',
} as const;

export type MessageTypeKey = (typeof MessageType)[keyof typeof MessageType];

/** 已登录用户的最小投影（仅展示用，不含敏感字段）。 */
export interface AuthUserProjection {
  id: string;
  email: string;
  name: string;
  role: 'sales' | 'manager' | 'admin';
}

/** 消息协议表：type → { payload, response } */
export interface MessageMap {
  [MessageType.PING]: {
    payload: undefined;
    response: { pong: true; ts: number };
  };
  [MessageType.AUTH_LOGIN]: {
    payload: { email: string; password: string };
    response: { ok: true; user: AuthUserProjection } | { ok: false; reason: string };
  };
  [MessageType.AUTH_LOGOUT]: {
    payload: undefined;
    response: { ok: true };
  };
  [MessageType.AUTH_STATUS]: {
    payload: undefined;
    response: { loggedIn: false } | { loggedIn: true; user: AuthUserProjection };
  };
  [MessageType.AI_SUGGEST_START]: {
    payload: {
      contextText: string;
      mode: 'suggest' | 'polish' | 'translate' | 'expand';
      source?: 'SIDEPANEL' | 'FLOATING_BUTTON' | 'CONTEXT_MENU' | 'COMMAND';
      pageHost?: string;
    };
    response: { requestId: string };
  };
  [MessageType.AI_SUGGEST_CHUNK]: {
    payload: { requestId: string; text: string; index: number };
    response: { ok: true };
  };
  [MessageType.AI_SUGGEST_DONE]: {
    payload: { requestId: string };
    response: { ok: true };
  };
  [MessageType.AI_SUGGEST_ERROR]: {
    payload: { requestId: string; message: string };
    response: { ok: true };
  };
  [MessageType.INSERT_TEXT]: {
    payload: { text: string };
    response: { ok: true } | { ok: false; reason: string };
  };
  [MessageType.CONTENT_COLLECT_CONTEXT]: {
    payload: { mode: 'suggest' | 'polish' | 'translate' | 'expand'; selectedText?: string };
    response: { contextText: string; inputText: string };
  };
  [MessageType.CONTENT_INSERT_TEXT]: {
    payload: { text: string };
    response: { ok: true } | { ok: false; reason: string };
  };
}

/** 完整请求结构（runtime 实际传输的对象）。 */
export type MessageRequest<K extends MessageTypeKey = MessageTypeKey> = K extends MessageTypeKey
  ? {
      type: K;
      payload: MessageMap[K]['payload'];
    }
  : never;

/** 路由层返回给调用方的错误外壳。 */
export interface MessageErrorEnvelope {
  __error: {
    code: string;
    message: string;
  };
}

/** 完整响应：成功载荷 或 错误外壳。 */
export type MessageResponse<K extends MessageTypeKey> = MessageMap[K]['response'] | MessageErrorEnvelope;

/** 类型守卫：判断响应是否为错误外壳。 */
export function isErrorEnvelope(v: unknown): v is MessageErrorEnvelope {
  return (
    typeof v === 'object' &&
    v !== null &&
    '__error' in v &&
    typeof (v as MessageErrorEnvelope).__error?.code === 'string' &&
    typeof (v as MessageErrorEnvelope).__error?.message === 'string'
  );
}
