/**
 * 通用参数校验工具。
 *
 * 设计原则：
 * - 函数式 API：返回 ValidationResult，便于 UI 直接渲染错误提示；
 * - 与抛错解耦：业务侧自行决定何时调用 assertValid 转换为异常；
 * - 严控副作用：仅做读判断 + 纯函数 sanitize，不修改入参。
 */
import { ExtensionError } from './error';

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

const ok: ValidationResult = { valid: true };
const fail = (message: string): ValidationResult => ({ valid: false, message });

/** 非空字符串（去掉首尾空白后仍有内容）。 */
export function isNonEmptyString(v: unknown): ValidationResult {
  if (typeof v !== 'string') return fail('必须为字符串');
  if (v.trim().length === 0) return fail('不可为空');
  return ok;
}

/** 字符串长度在 [min, max] 之间（按 trim 后长度计）。 */
export function isStringInRange(min: number, max: number) {
  if (min < 0 || max < min) {
    throw new ExtensionError('VALIDATION', `Invalid range: [${min}, ${max}]`);
  }
  return (v: unknown): ValidationResult => {
    const base = isNonEmptyString(v);
    if (!base.valid) return base;
    const len = (v as string).trim().length;
    if (len < min) return fail(`长度不可小于 ${min}`);
    if (len > max) return fail(`长度不可超过 ${max}`);
    return ok;
  };
}

/**
 * 邮箱格式（保守正则，覆盖绝大多数日常邮箱）。
 * 注意：邮箱完整规范极复杂（RFC 5321/5322），此处仅做前端友好校验，最终以后端为准。
 */
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
export function isEmail(v: unknown): ValidationResult {
  const base = isNonEmptyString(v);
  if (!base.valid) return base;
  return EMAIL_RE.test(v as string) ? ok : fail('邮箱格式不合法');
}

/** 合法 HTTP/HTTPS URL。 */
export function isUrl(v: unknown): ValidationResult {
  const base = isNonEmptyString(v);
  if (!base.valid) return base;
  try {
    const u = new URL(v as string);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return fail('仅支持 http/https');
    return ok;
  } catch {
    return fail('URL 格式不合法');
  }
}

/** 值必须在枚举范围内。 */
export function isOneOf<T extends string | number>(allowed: ReadonlyArray<T>) {
  if (!Array.isArray(allowed) || allowed.length === 0) {
    throw new ExtensionError('VALIDATION', 'isOneOf 至少需要一个候选项');
  }
  return (v: unknown): ValidationResult =>
    (allowed as ReadonlyArray<unknown>).includes(v)
      ? ok
      : fail(`必须为以下之一: ${allowed.join(', ')}`);
}

/** 去掉首尾空白；非字符串返回空串。 */
export function sanitizeTrim(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** 不通过则抛 ExtensionError('VALIDATION')。 */
export function assertValid(result: ValidationResult, field?: string): void {
  if (result.valid) return;
  const prefix = field ? `[${field}] ` : '';
  throw new ExtensionError('VALIDATION', `${prefix}${result.message ?? '校验失败'}`);
}
