import { http } from './http';

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

export interface RagSearchResponse {
  degraded: boolean;
  sources: RagSource[];
}

export interface KnowledgeDocumentItem {
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
  createdAt: string;
  updatedAt: string;
}

export interface ListDocumentsParams {
  page?: number;
  pageSize?: number;
}

export interface ListDocumentsResponse {
  items: KnowledgeDocumentItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UploadDocumentRequest {
  file: File;
  title?: string;
  isShared?: boolean;
}

export interface SearchKnowledgeRequest {
  query: string;
  topK?: number;
}

export async function uploadDocument(payload: UploadDocumentRequest) {
  const formData = new FormData();
  formData.append('file', payload.file);

  if (payload.title) {
    formData.append('title', payload.title);
  }

  if (payload.isShared !== undefined) {
    formData.append('isShared', String(payload.isShared));
  }

  const response = await http.post<KnowledgeDocumentItem>('/rag/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data;
}

export async function listDocuments(params: ListDocumentsParams = {}) {
  const response = await http.get<ListDocumentsResponse>('/rag/documents', { params });

  return response.data;
}

export async function deleteDocument(id: string) {
  await http.delete(`/rag/documents/${id}`);
}

export async function searchKnowledge(payload: SearchKnowledgeRequest) {
  const response = await http.post<RagSearchResponse>('/rag/search', payload);

  return response.data;
}
