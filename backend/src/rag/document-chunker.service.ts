import { Injectable } from '@nestjs/common';

export interface DocumentChunk {
  content: string;
  chunkIndex: number;
  tokenCount: number;
}

@Injectable()
export class DocumentChunkerService {
  chunk(text: string, chunkSize = 1000, overlap = 150): DocumentChunk[] {
    const normalizedText = text
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .trim();

    if (!normalizedText) {
      return [];
    }

    const safeChunkSize = Math.max(chunkSize, 1);
    const safeOverlap = Math.min(Math.max(overlap, 0), Math.floor(safeChunkSize / 2));
    const chunks: DocumentChunk[] = [];
    let start = 0;

    while (start < normalizedText.length && chunks.length < 200) {
      const end = Math.min(start + safeChunkSize, normalizedText.length);
      const content = normalizedText.slice(start, end).trim();

      if (content) {
        chunks.push({
          content,
          chunkIndex: chunks.length,
          tokenCount: Math.ceil(content.length / 2),
        });
      }

      if (end >= normalizedText.length) {
        break;
      }

      start = end - safeOverlap;
    }

    return chunks;
  }
}
