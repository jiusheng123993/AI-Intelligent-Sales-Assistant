/**
 * RAG 知识库模块 API 封装。
 * 职责：封装知识文档的上传、列表查询、删除，以及基于向量检索的知识搜索接口，
 * 同时导出 RAG 来源、文档实体、上传/搜索请求等类型定义。
 */
import { http } from './http';

/** RAG 来源类型：来自话术库 / 来自上传的知识文档 */
export type RagSourceType = 'SCRIPT' | 'DOCUMENT';

/** RAG 检索结果中的单条来源结构 */
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

/** RAG 搜索响应；degraded 表示是否进入降级（如向量服务不可用时的兜底返回） */
export interface RagSearchResponse {
  degraded: boolean;
  sources: RagSource[];
}

/** 知识文档实体 */
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

/** 文档列表分页查询参数 */
export interface ListDocumentsParams {
  page?: number;
  pageSize?: number;
}

/** 文档列表分页响应 */
export interface ListDocumentsResponse {
  items: KnowledgeDocumentItem[];
  total: number;
  page: number;
  pageSize: number;
}

/** 文档上传请求结构（包含文件、可选标题、是否团队共享） */
export interface UploadDocumentRequest {
  file: File;
  title?: string;
  isShared?: boolean;
}

/** RAG 搜索请求结构 */
export interface SearchKnowledgeRequest {
  query: string;
  topK?: number;
}

/**
 * 上传知识文档（含文件、可选标题与共享标识），底层使用 multipart/form-data。
 */
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

/**
 * 分页获取知识文档列表。
 */
export async function listDocuments(params: ListDocumentsParams = {}) {
  const response = await http.get<ListDocumentsResponse>('/rag/documents', { params });

  return response.data;
}

/**
 * 按 ID 删除一条知识文档，无返回内容。
 */
export async function deleteDocument(id: string) {
  await http.delete(`/rag/documents/${id}`);
}

/**
 * 对话术库与知识文档进行混合 RAG 检索，返回 topK 条来源。
 */
export async function searchKnowledge(payload: SearchKnowledgeRequest) {
  const response = await http.post<RagSearchResponse>('/rag/search', payload);

  return response.data;
}
