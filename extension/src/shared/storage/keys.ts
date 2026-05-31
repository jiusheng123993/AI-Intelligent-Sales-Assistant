/**
 * Storage Key 常量集中托管。
 *
 * 设计目标：
 * - 杜绝业务代码散落 magic string；
 * - 通过命名空间前缀，便于未来批量清理 / 迁移；
 * - 任何新增的 key 必须先登记到此处。
 */

/** 业务侧（加密落地）使用的 key 命名空间。 */
export const STORAGE_NS = {
  AUTH_TOKEN: 'auth.token',
  AUTH_REFRESH: 'auth.refresh',
  AUTH_USER: 'auth.user',
  SETTINGS: 'settings',
  PHRASEBOOK_CACHE: 'phrasebook.cache',
} as const;

/** 内部使用的 key（不应被业务直接访问）。 */
export const STORAGE_INTERNAL = {
  /** secure-storage 的密钥种子。 */
  SECURE_SEED: '__ssk_seed__',
} as const;

export type BusinessStorageKey = (typeof STORAGE_NS)[keyof typeof STORAGE_NS];
