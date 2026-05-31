/**
 * 扩展运行环境常量与一期白名单。
 *
 * 注意：
 * - 白名单必须与 manifest.config.ts 中 host_permissions / content_scripts.matches 保持一致；
 * - 任何上下文采集前都必须命中此白名单，否则一律拒绝（防止越权采集）。
 */

/** 一期支持的销售对话站点。 */
export const SITE_WHITELIST: ReadonlyArray<string> = [
  'work.weixin.qq.com',
  'web.whatsapp.com',
] as const;

/**
 * 判断给定 URL 是否在白名单内。
 * @param url 任意合法 URL 字符串；非法时返回 false（兜底，不抛错）
 */
export function isWhitelisted(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const host = new URL(url).hostname;
    return SITE_WHITELIST.includes(host);
  } catch {
    return false;
  }
}
