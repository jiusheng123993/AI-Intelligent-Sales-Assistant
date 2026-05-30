import { http } from './http';

export type ScriptCategory = 'INTRODUCTION' | 'OBJECTION_HANDLING' | 'CLOSING' | 'FOLLOW_UP' | 'CUSTOM';

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

export interface ListScriptsParams {
  keyword?: string;
  category?: ScriptCategory;
  page?: number;
  pageSize?: number;
}

export interface ListScriptsResponse {
  items: ScriptItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateScriptRequest {
  title: string;
  content: string;
  category: ScriptCategory;
  tags?: string[];
  isShared?: boolean;
}

export interface UpdateScriptRequest {
  title?: string;
  content?: string;
  category?: ScriptCategory;
  tags?: string[];
  isShared?: boolean;
}

export async function listScripts(params: ListScriptsParams = {}) {
  const response = await http.get<ListScriptsResponse>('/scripts', { params });

  return response.data;
}

export async function createScript(payload: CreateScriptRequest) {
  const response = await http.post<ScriptItem>('/scripts', payload);

  return response.data;
}

export async function getScript(id: string) {
  const response = await http.get<ScriptItem>(`/scripts/${id}`);

  return response.data;
}

export async function updateScript(id: string, payload: UpdateScriptRequest) {
  const response = await http.patch<ScriptItem>(`/scripts/${id}`, payload);

  return response.data;
}

export async function deleteScript(id: string) {
  await http.delete(`/scripts/${id}`);
}
