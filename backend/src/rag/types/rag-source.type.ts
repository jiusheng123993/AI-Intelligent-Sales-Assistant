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
