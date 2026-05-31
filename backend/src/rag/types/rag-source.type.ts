/**
 * RAG 检索结果中的"来源条目"。
 * 既可能来自话术（SCRIPT），也可能来自知识文档切片（DOCUMENT）。
 */
export type RagSourceType = 'SCRIPT' | 'DOCUMENT';

export interface RagSource {
  id: string;
  sourceType: RagSourceType;
  sourceId: string;
  chunkId?: string;
  title: string;
  content: string;
  category?: string;
  score?: number;
}
