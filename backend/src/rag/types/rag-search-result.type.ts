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
