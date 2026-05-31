/**
 * 统一日志封装。
 *
 * 设计要点：
 * - 通过统一 prefix 区分扩展不同上下文（background / content / sidepanel / popup）。
 * - 生产环境默认仅输出 warn 以上级别，避免污染控制台与泄漏内部细节。
 * - 提供 child(prefix) 便于模块级别二次细化。
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

/** 当前最低输出级别（可在运行时调用 setLogLevel 调整）。 */
let currentLevel: LogLevel = (import.meta.env?.MODE === 'production' ? 'warn' : 'debug') as LogLevel;

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

export interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  child: (subPrefix: string) => Logger;
}

/**
 * 创建带前缀的 Logger。
 * @param prefix 例如 "[bg]" / "[content:wecom]"
 */
export function createLogger(prefix: string): Logger {
  const out = (level: Exclude<LogLevel, 'silent'>, args: unknown[]): void => {
    if (LEVEL_RANK[level] < LEVEL_RANK[currentLevel]) return;
    const tag = `${prefix}`;
    // 使用对应级别 API，方便在 DevTools 过滤
    switch (level) {
      case 'debug':
        // eslint-disable-next-line no-console
        console.debug(tag, ...args);
        break;
      case 'info':
        console.info(tag, ...args);
        break;
      case 'warn':
        console.warn(tag, ...args);
        break;
      case 'error':
        console.error(tag, ...args);
        break;
    }
  };

  return {
    debug: (...args) => out('debug', args),
    info: (...args) => out('info', args),
    warn: (...args) => out('warn', args),
    error: (...args) => out('error', args),
    child: (subPrefix: string) => createLogger(`${prefix}${subPrefix}`),
  };
}
