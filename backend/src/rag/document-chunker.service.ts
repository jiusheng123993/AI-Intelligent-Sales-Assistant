/**
 * 文档切片服务。
 *
 * 将长文本按固定字符长度切分为多个有 overlap 的片段，以供向量化和检索。
 * 设计要点：
 * - 归一化换行与空白，避免不同来源的格式差异；
 * - chunkSize 至少 1，overlap 不超过 chunkSize/2，杜绝死循环或过度重复；
 * - 最多 200 个 chunk，防止极端长文撑爆 DB/向量库。
 */
import { Injectable } from '@nestjs/common';

/**
 * 单个文档切片结构。
 * tokenCount 仅做粗略估算（按字符数 / 2），用于上层 token 预算控制。
 */
export interface DocumentChunk {
  content: string;
  chunkIndex: number;
  tokenCount: number;
}

@Injectable()
export class DocumentChunkerService {
  /**
   * 把文本切分为带 overlap 的若干 chunk。
   *
   * @param text 原始文本
   * @param chunkSize 单 chunk 字符上限，默认 1000
   * @param overlap 相邻 chunk 重叠字符数，默认 150
   * @returns 切片数组（顺序与文本一致）
   */
  chunk(text: string, chunkSize = 1000, overlap = 150): DocumentChunk[] {
    // 归一化：统一换行符，压缩多余空白
    const normalizedText = text
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .trim();

    if (!normalizedText) {
      return [];
    }

    // 边界处理：chunkSize≥1；overlap 限制在 [0, chunkSize/2]，防止死循环
    const safeChunkSize = Math.max(chunkSize, 1);
    const safeOverlap = Math.min(Math.max(overlap, 0), Math.floor(safeChunkSize / 2));
    const chunks: DocumentChunk[] = [];
    let start = 0;

    // 最多 200 个 chunk，防止极端长文档
    while (start < normalizedText.length && chunks.length < 200) {
      const end = Math.min(start + safeChunkSize, normalizedText.length);
      const content = normalizedText.slice(start, end).trim();

      if (content) {
        chunks.push({
          content,
          chunkIndex: chunks.length,
          // 粗略估算 token：英文/中文混合场景下约为字符数的一半
          tokenCount: Math.ceil(content.length / 2),
        });
      }

      // 已到文本末尾，结束循环
      if (end >= normalizedText.length) {
        break;
      }

      // 下一轮起点回退 overlap，保证上下文连续
      start = end - safeOverlap;
    }

    return chunks;
  }
}
