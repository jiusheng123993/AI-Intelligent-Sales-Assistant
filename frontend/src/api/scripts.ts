/**
 * 话术库模块 API 封装。
 * 职责：提供话术条目的增删改查（含分页/检索/分类筛选）调用，
 * 并导出话术分类、条目实体、分页响应等类型定义。
 */
import { http } from './http';

/** 话术分类枚举：开场介绍 / 异议处理 / 成交促单 / 跟进复盘 / 自定义 */
export type ScriptCategory = 'INTRODUCTION' | 'OBJECTION_HANDLING' | 'CLOSING' | 'FOLLOW_UP' | 'CUSTOM';

/** 话术条目实体 */
export interface ScriptItem {
  id: string;
  title: string;
  content: string;
  category: ScriptCategory;
  tags: string[];
  isShared: boolean;
  isPreset: boolean;
  createdById: string;
  teamId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 话术列表查询参数（关键词/分类/分页） */
export interface ListScriptsParams {
  keyword?: string;
  category?: ScriptCategory;
  page?: number;
  pageSize?: number;
}

/** 话术列表分页响应 */
export interface ListScriptsResponse {
  items: ScriptItem[];
  total: number;
  page: number;
  pageSize: number;
}

/** 创建话术请求体 */
export interface CreateScriptRequest {
  title: string;
  content: string;
  category: ScriptCategory;
  tags?: string[];
  isShared?: boolean;
}

/** 更新话术请求体（所有字段可选，仅传需修改字段） */
export interface UpdateScriptRequest {
  title?: string;
  content?: string;
  category?: ScriptCategory;
  tags?: string[];
  isShared?: boolean;
}

/**
 * 获取话术列表，支持关键词、分类与分页参数。
 */
export async function listScripts(params: ListScriptsParams = {}) {
  const response = await http.get<ListScriptsResponse>('/scripts', { params });

  return response.data;
}

/**
 * 新建一条话术，返回创建后的完整实体。
 */
export async function createScript(payload: CreateScriptRequest) {
  const response = await http.post<ScriptItem>('/scripts', payload);

  return response.data;
}

/**
 * 按 ID 获取单条话术详情。
 */
export async function getScript(id: string) {
  const response = await http.get<ScriptItem>(`/scripts/${id}`);

  return response.data;
}

/**
 * 按 ID 局部更新话术内容，返回更新后的完整实体。
 */
export async function updateScript(id: string, payload: UpdateScriptRequest) {
  const response = await http.patch<ScriptItem>(`/scripts/${id}`, payload);

  return response.data;
}

/**
 * 按 ID 删除话术，无返回内容。
 */
export async function deleteScript(id: string) {
  await http.delete(`/scripts/${id}`);
}
