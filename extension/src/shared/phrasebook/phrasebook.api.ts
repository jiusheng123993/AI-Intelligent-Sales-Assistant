import { request } from '@shared/api/http';
import type { Phrase } from './types';

type ScriptCategory = 'INTRODUCTION' | 'OBJECTION_HANDLING' | 'CLOSING' | 'FOLLOW_UP' | 'CUSTOM';

interface ScriptItem {
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

interface ListScriptsResponse {
  items: ScriptItem[];
  total: number;
  page: number;
  pageSize: number;
}

interface CreateScriptRequest {
  title: string;
  content: string;
  category: ScriptCategory;
  tags: string[];
  isShared: boolean;
}

interface UpdateScriptRequest {
  title: string;
  content: string;
  category: ScriptCategory;
  tags: string[];
  isShared: boolean;
}

function isRemoteId(id: string): boolean {
  return !id.startsWith('ph_');
}

function toPhrase(script: ScriptItem): Phrase {
  return {
    id: script.id,
    title: script.title,
    content: script.content,
    tags: Array.isArray(script.tags) ? script.tags : [],
    createdAt: Date.parse(script.createdAt),
    updatedAt: Date.parse(script.updatedAt),
  };
}

function toRequestBody(phrase: Phrase): CreateScriptRequest {
  return {
    title: phrase.title,
    content: phrase.content,
    category: 'CUSTOM',
    tags: phrase.tags,
    isShared: false,
  };
}

function isPersonalScript(script: ScriptItem): boolean {
  return script.category === 'CUSTOM' && !script.isShared && !script.isPreset;
}

async function listRemote(): Promise<Phrase[]> {
  const response = await request<ListScriptsResponse>('/scripts?category=CUSTOM&page=1&pageSize=50', { method: 'GET' });
  return response.items.filter(isPersonalScript).map(toPhrase).sort((a, b) => b.updatedAt - a.updatedAt);
}

export const phrasebookApi = {
  async list(): Promise<Phrase[]> {
    return listRemote();
  },

  async sync(phrases: Phrase[]): Promise<Phrase[]> {
    const remote = await listRemote();
    const remoteIds = new Set(remote.map((phrase) => phrase.id));

    for (const phrase of phrases) {
      const body = toRequestBody(phrase);
      if (isRemoteId(phrase.id) && remoteIds.has(phrase.id)) {
        await request<ScriptItem>(`/scripts/${phrase.id}`, { method: 'PATCH', body: body satisfies UpdateScriptRequest });
      } else {
        await request<ScriptItem>('/scripts', { method: 'POST', body });
      }
    }

    return listRemote();
  },

  async remove(id: string): Promise<void> {
    if (!isRemoteId(id)) return;
    await request<null>(`/scripts/${id}`, { method: 'DELETE' });
  },
};
