/**
 * Side Panel 话术库 UI store。
 */
import { create } from 'zustand';
import { phrasebookService } from '@shared/phrasebook/phrasebook.service';
import type { Phrase, PhraseInput } from '@shared/phrasebook/types';

export interface PhrasebookState {
  loading: boolean;
  error: string | null;
  phrases: Phrase[];
  query: string;
  activeTag: string | null;
  load: () => Promise<void>;
  create: (input: PhraseInput) => Promise<void>;
  update: (id: string, input: PhraseInput) => Promise<void>;
  remove: (id: string) => Promise<void>;
  setQuery: (q: string) => void;
  setActiveTag: (tag: string | null) => void;
  filtered: () => Phrase[];
  tags: () => string[];
}

let mutationRevision = 0;

export const usePhrasebookStore = create<PhrasebookState>((set, get) => ({
  loading: false,
  error: null,
  phrases: [],
  query: '',
  activeTag: null,

  load: async () => {
    const revisionAtStart = mutationRevision;
    set({ loading: true, error: null });
    try {
      const phrases = await phrasebookService.list();
      // 若加载过程中发生 create/update/remove，则丢弃过期 load 结果，避免覆盖用户刚刚做的本地变更。
      if (revisionAtStart === mutationRevision) set({ phrases, loading: false });
      else set({ loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  create: async (input) => {
    mutationRevision++;
    const phrase = await phrasebookService.create(input);
    mutationRevision++;
    set((s) => ({ phrases: [phrase, ...s.phrases], error: null }));
  },

  update: async (id, input) => {
    mutationRevision++;
    const updated = await phrasebookService.update(id, input);
    mutationRevision++;
    set((s) => ({
      phrases: s.phrases.map((p) => (p.id === id ? updated : p)),
      error: null,
    }));
  },

  remove: async (id) => {
    mutationRevision++;
    await phrasebookService.remove(id);
    mutationRevision++;
    set((s) => ({ phrases: s.phrases.filter((p) => p.id !== id), error: null }));
  },

  setQuery: (q) => set({ query: q }),
  setActiveTag: (tag) => set({ activeTag: tag }),

  filtered: () => phrasebookService.search(get().phrases, get().query, get().activeTag),
  tags: () => Array.from(new Set(get().phrases.flatMap((p) => p.tags))).sort(),
}));
