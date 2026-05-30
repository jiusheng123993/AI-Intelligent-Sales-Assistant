/**
 * 话术库本地优先服务。
 *
 * 设计要点：
 * - 使用 secureStorage 存储数组，key = phrasebook.cache；
 * - 读取时做运行时过滤，脏数据直接丢弃；
 * - CRUD 后异步触发远端 sync，占位失败不影响本地；
 * - 不依赖 React/Zustand，便于 background/sidepanel 复用。
 */
import { secureStorage } from '@shared/storage/secure-storage';
import { STORAGE_NS } from '@shared/storage/keys';
import { ExtensionError } from '@shared/utils/error';
import { isStringInRange, sanitizeTrim } from '@shared/utils/validator';
import { phrasebookApi } from './phrasebook.api';
import type { Phrase, PhraseInput } from './types';

function makeId(): string {
  return `ph_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function isPhrase(v: unknown): v is Phrase {
  if (typeof v !== 'object' || v === null) return false;
  const p = v as Phrase;
  return (
    typeof p.id === 'string' &&
    typeof p.title === 'string' &&
    typeof p.content === 'string' &&
    Array.isArray(p.tags) &&
    p.tags.every((t) => typeof t === 'string') &&
    typeof p.createdAt === 'number' &&
    typeof p.updatedAt === 'number'
  );
}

export function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const set = new Set<string>();
  for (const raw of tags) {
    const tag = sanitizeTrim(raw).slice(0, 20);
    if (tag) set.add(tag);
    if (set.size >= 5) break;
  }
  return Array.from(set);
}

export function validatePhraseInput(input: PhraseInput): PhraseInput {
  const title = sanitizeTrim(input.title);
  const content = sanitizeTrim(input.content);
  const titleCheck = isStringInRange(1, 30)(title);
  if (!titleCheck.valid) throw new ExtensionError('VALIDATION', titleCheck.message ?? '标题不合法');
  const contentCheck = isStringInRange(1, 500)(content);
  if (!contentCheck.valid) throw new ExtensionError('VALIDATION', contentCheck.message ?? '内容不合法');
  return { title, content, tags: normalizeTags(input.tags) };
}

async function persist(phrases: Phrase[]): Promise<void> {
  await secureStorage.setItem(STORAGE_NS.PHRASEBOOK_CACHE, phrases);
  void phrasebookApi
    .sync(phrases)
    .then((remote) => secureStorage.setItem(STORAGE_NS.PHRASEBOOK_CACHE, remote))
    .catch(() => undefined);
}

export const phrasebookService = {
  async list(): Promise<Phrase[]> {
    try {
      const remote = await phrasebookApi.list();
      await secureStorage.setItem(STORAGE_NS.PHRASEBOOK_CACHE, remote);
      return remote;
    } catch {
      try {
        const data = await secureStorage.getItem<unknown>(STORAGE_NS.PHRASEBOOK_CACHE);
        if (!Array.isArray(data)) return [];
        return data.filter(isPhrase).sort((a, b) => b.updatedAt - a.updatedAt);
      } catch {
        return [];
      }
    }
  },

  async create(input: PhraseInput): Promise<Phrase> {
    const safe = validatePhraseInput(input);
    const now = Date.now();
    const phrase: Phrase = {
      id: makeId(),
      title: safe.title,
      content: safe.content,
      tags: safe.tags ?? [],
      createdAt: now,
      updatedAt: now,
    };
    const phrases = await this.list();
    await persist([phrase, ...phrases]);
    return phrase;
  },

  async update(id: string, input: PhraseInput): Promise<Phrase> {
    const safe = validatePhraseInput(input);
    const phrases = await this.list();
    const idx = phrases.findIndex((p) => p.id === id);
    if (idx < 0) throw new ExtensionError('NOT_FOUND', '话术不存在');
    const updated: Phrase = {
      ...phrases[idx],
      title: safe.title,
      content: safe.content,
      tags: safe.tags ?? [],
      updatedAt: Date.now(),
    };
    phrases[idx] = updated;
    await persist(phrases);
    return updated;
  },

  async remove(id: string): Promise<void> {
    const phrases = await this.list();
    const next = phrases.filter((p) => p.id !== id);
    if (next.length !== phrases.length) {
      await secureStorage.setItem(STORAGE_NS.PHRASEBOOK_CACHE, next);
      await phrasebookApi.remove(id).catch(() => undefined);
    }
  },

  search(phrases: Phrase[], query: string, tag?: string | null): Phrase[] {
    const q = sanitizeTrim(query).toLowerCase();
    return phrases.filter((p) => {
      const matchQuery = !q || p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q);
      const matchTag = !tag || p.tags.includes(tag);
      return matchQuery && matchTag;
    });
  },
};
