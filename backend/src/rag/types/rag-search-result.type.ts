/**
 * RAG 检索结果与文档列表项类型定义。
 * - RagSearchResult.degraded=true 表示走的是关键字降级或带降级标记的向量检索；
 * - KnowledgeDocumentListItem 是文档列表的对外脱敏视图（不包含原始 chunk 内容）。
 */
import { RagSource } from './rag-source.type';

export interface RagSearchResult {
  degraded: boolean;
  sources: RagSource[];
}

export interface KnowledgeDocumentListItem {
  id: string;
  title: string;
  originalName: string;
  mimeType: string;
  size: number;
  status: string;
  errorMessage: string | null;
  isShared: boolean;
  uploadedById: string;
  teamId: string | null;
  chunkCount: number;
  createdAt: Date;
  updatedAt: Date;
}
