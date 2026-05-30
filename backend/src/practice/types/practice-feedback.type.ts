import { RagSource } from '../../rag/types/rag-source.type';

export interface PracticeFeedback {
  score: number;
  comments: string;
  sources: RagSource[];
}
