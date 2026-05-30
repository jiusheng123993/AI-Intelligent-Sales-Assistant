/**
 * 话术库远端同步占位。
 *
 * A7 只做本地优先；后端接口就绪后在这里替换为真实 request() 调用。
 */
import type { Phrase } from './types';

export const phrasebookApi = {
  async sync(_phrases: Phrase[]): Promise<void> {
    // 本地优先：远端失败不阻塞 UI。A7 阶段保持 no-op。
  },
};
