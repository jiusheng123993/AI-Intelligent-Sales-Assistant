/**
 * 练习反馈类型。
 * score 为最终评分（0~95），comments 为评语文本，sources 为参考的 RAG 来源。
 */
import { RagSource } from '../../rag/types/rag-source.type';

export interface PracticeFeedback {
  score: number;
  comments: string;
  sources: RagSource[];
}
