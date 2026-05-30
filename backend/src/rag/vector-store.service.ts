/**
 * 向量存储服务。
 *
 * 封装 OpenAI Embeddings + Chroma 向量数据库的交互细节，对外提供
 * upsertSources（写入/更新）、search（语义检索）、deleteBySourceIds（清理）三个核心能力。
 *
 * 兜底策略：
 * - 未配置 OPENAI_API_KEY 时不抛错，upsert 直接跳过、search 抛错由上层兜底；
 * - Chroma URL 默认 http://localhost:8000，可由 CHROMA_URL 覆盖。
 */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ChromaClient } from 'chromadb';
import { RagSource } from './types/rag-source.type';
import { RagSearchResult } from './types/rag-search-result.type';

@Injectable()
export class VectorStoreService {
  private readonly collectionName = 'ai_sales_knowledge';
  private readonly openai: OpenAI | null;
  private readonly chroma: ChromaClient;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    // 仅当配置了 API Key 时才实例化 OpenAI 客户端，否则置 null 触发上游降级
    this.openai = apiKey
      ? new OpenAI({
          apiKey,
          baseURL: this.configService.get<string>('OPENAI_API_BASE') || undefined,
        })
      : null;
    this.chroma = new ChromaClient({
      path: this.configService.get<string>('CHROMA_URL') || 'http://localhost:8000',
    });
  }

  /**
   * 批量写入或更新向量。
   * 当未配置 OpenAI 或 sources 为空时直接返回，避免无效调用。
   */
  async upsertSources(sources: RagSource[]): Promise<void> {
    if (!this.openai || sources.length === 0) {
      return;
    }

    const embeddings = await this.embed(sources.map((source) => source.content));
    const collection = await this.chroma.getOrCreateCollection({ name: this.collectionName });

    await collection.upsert({
      ids: sources.map((source) => source.id),
      embeddings,
      documents: sources.map((source) => source.content),
      metadatas: sources.map((source) => ({
        sourceType: source.sourceType,
        sourceId: source.sourceId,
        chunkId: source.chunkId ?? '',
        title: source.title,
        category: source.category ?? '',
      })),
    });
  }

  /**
   * 语义检索。
   *
   * - 把 query 转为 embedding；
   * - 调用 Chroma 检索（实际取 2*topK，便于上层做权限过滤后仍能返回 topK）；
   * - 把 distance 转换为分数（1 - distance）作为相关度参考。
   */
  async search(query: string, topK: number): Promise<RagSearchResult> {
    if (!this.openai) {
      // 未配置 OpenAI 时直接抛错，由 RagService 捕获并降级到关键字检索
      throw new Error('OpenAI API key is not configured');
    }

    const [embedding] = await this.embed([query]);
    const collection = await this.chroma.getOrCreateCollection({ name: this.collectionName });
    const result = await collection.query({
      queryEmbeddings: [embedding],
      // 多取一些用于上层做可见性过滤后仍可保留 topK
      nResults: Math.max(topK * 2, topK),
    });

    const ids = result.ids[0] ?? [];
    const documents = result.documents[0] ?? [];
    const metadatas = result.metadatas[0] ?? [];
    const distances = result.distances?.[0] ?? [];

    return {
      degraded: false,
      sources: ids.map((id, index) => ({
        id,
        sourceType: metadatas[index]?.sourceType as RagSource['sourceType'],
        sourceId: String(metadatas[index]?.sourceId ?? ''),
        chunkId: metadatas[index]?.chunkId ? String(metadatas[index]?.chunkId) : undefined,
        title: String(metadatas[index]?.title ?? ''),
        content: String(documents[index] ?? ''),
        category: metadatas[index]?.category ? String(metadatas[index]?.category) : undefined,
        // distance 越小越相似，这里转成 [0,1] 区间的相似度分数
        score: distances[index] === undefined ? undefined : 1 - Number(distances[index]),
      })),
    };
  }

  /**
   * 根据来源 ID 批量删除向量。空数组直接跳过，避免无意义请求。
   */
  async deleteBySourceIds(sourceIds: string[]): Promise<void> {
    if (sourceIds.length === 0) {
      return;
    }

    const collection = await this.chroma.getOrCreateCollection({ name: this.collectionName });

    await collection.delete({
      where: {
        sourceId: { $in: sourceIds },
      },
    });
  }

  /**
   * 对输入文本批量生成 embedding。
   * 未配置 OpenAI 时抛错，由调用方处理（通常通过 try/catch 降级）。
   */
  private async embed(input: string[]): Promise<number[][]> {
    if (!this.openai) {
      throw new Error('OpenAI API key is not configured');
    }

    const result = await this.openai.embeddings.create({
      model: this.configService.get<string>('OPENAI_EMBEDDING_MODEL') || 'text-embedding-3-small',
      input,
    });

    return result.data.map((item) => item.embedding);
  }
}
