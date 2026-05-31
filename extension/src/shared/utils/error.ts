/**
 * 统一错误类型。
 *
 * 设计目标：
 * - 通过 `code` 进行分类，前端可据此做差异化兜底；
 * - `cause` 字段保留原始异常，便于堆栈追踪而不丢失链路；
 * - 所有可预期的业务异常都应继承自 ExtensionError，禁止裸抛 Error。
 */

export type ErrorCode =
  | 'UNKNOWN'
  | 'VALIDATION'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'NETWORK'
  | 'STORAGE'
  | 'CRYPTO'
  | 'DOM_ADAPTER'
  | 'NOT_WHITELISTED';

export class ExtensionError extends Error {
  public readonly code: ErrorCode;
  public override readonly cause?: unknown;

  constructor(code: ErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'ExtensionError';
    this.code = code;
    this.cause = cause;
    // 修正 TS 中继承内置类 prototype 链断裂问题
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 将任意异常归一化为 ExtensionError，避免上层处理时类型混乱。 */
export function toExtensionError(err: unknown, fallbackCode: ErrorCode = 'UNKNOWN'): ExtensionError {
  if (err instanceof ExtensionError) return err;
  if (err instanceof Error) return new ExtensionError(fallbackCode, err.message, err);
  return new ExtensionError(fallbackCode, String(err), err);
}
