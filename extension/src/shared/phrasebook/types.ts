/**
 * 个人话术库数据模型。
 */

export interface Phrase {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface PhraseInput {
  title: string;
  content: string;
  tags?: string[];
}
