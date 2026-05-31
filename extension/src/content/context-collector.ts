/**
 * 对话上下文采集器。
 *
 * 仅负责调用 adapter.collectMessages 并做数量/文本长度边界裁剪。
 */
import type { ChatAdapter, ChatMessage } from './adapters/base.adapter';

export interface CollectOptions {
  limit?: number;
  maxTextLength?: number;
}

const DEFAULT_LIMIT = 20;
const DEFAULT_MAX_TEXT_LENGTH = 2000;

export function collectContext(adapter: ChatAdapter, opts: CollectOptions = {}): ChatMessage[] {
  const limit = Math.max(1, Math.min(opts.limit ?? DEFAULT_LIMIT, 100));
  const maxTextLength = Math.max(100, Math.min(opts.maxTextLength ?? DEFAULT_MAX_TEXT_LENGTH, 10000));
  return adapter
    .collectMessages(limit)
    .map((m) => ({ ...m, text: m.text.slice(0, maxTextLength).trim() }))
    .filter((m) => m.text.length > 0);
}
