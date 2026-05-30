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

  async search(query: string, topK: number): Promise<RagSearchResult> {
    if (!this.openai) {
      throw new Error('OpenAI API key is not configured');
    }

    const [embedding] = await this.embed([query]);
    const collection = await this.chroma.getOrCreateCollection({ name: this.collectionName });
    const result = await collection.query({
      queryEmbeddings: [embedding],
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
        score: distances[index] === undefined ? undefined : 1 - Number(distances[index]),
      })),
    };
  }

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
