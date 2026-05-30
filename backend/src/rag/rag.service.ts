import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Script, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SafeUser } from '../users/types/safe-user.type';
import { DocumentChunkerService } from './document-chunker.service';
import { DocumentParserService } from './document-parser.service';
import { SearchRagDto } from './dto/search-rag.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { RagSearchResult, KnowledgeDocumentListItem } from './types/rag-search-result.type';
import { RagSource } from './types/rag-source.type';
import { VectorStoreService } from './vector-store.service';

const sharedKnowledgeRoles = new Set<UserRole>([
  UserRole.TRAINER,
  UserRole.MANAGER,
  UserRole.ADMIN,
]);

@Injectable()
export class RagService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parser: DocumentParserService,
    private readonly chunker: DocumentChunkerService,
    private readonly vectorStore: VectorStoreService,
  ) {}

  async uploadDocument(user: SafeUser, file: Express.Multer.File, dto: UploadDocumentDto) {
    if (!file) {
      throw new BadRequestException('Document file is required');
    }

    const maxUploadSize = Number(process.env.MAX_UPLOAD_SIZE_MB ?? 10) * 1024 * 1024;

    if (file.size > maxUploadSize) {
      throw new BadRequestException('Document file is too large');
    }

    const isShared = dto.isShared ?? false;
    this.assertSharedPermission(user, isShared);

    const text = await this.parser.parse(file);
    const chunks = this.chunker.chunk(
      text,
      Number(process.env.RAG_CHUNK_SIZE ?? 1000),
      Number(process.env.RAG_CHUNK_OVERLAP ?? 150),
    );

    if (chunks.length === 0) {
      throw new BadRequestException('Document has no readable text');
    }

    const title = dto.title?.trim() || file.originalname.replace(/\.[^.]+$/, '');
    const document = await this.prisma.knowledgeDocument.create({
      data: {
        title,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        status: 'PROCESSING',
        uploadedById: user.id,
        teamId: isShared ? user.teamId : user.teamId,
        isShared,
        chunks: {
          create: chunks.map((chunk) => ({
            content: chunk.content,
            chunkIndex: chunk.chunkIndex,
            tokenCount: chunk.tokenCount,
            vectorId: `document:${chunk.chunkIndex}`,
          })),
        },
      },
      include: { chunks: true },
    });

    try {
      await this.vectorStore.upsertSources(
        document.chunks.map((chunk) => ({
          id: `document:${chunk.id}`,
          sourceType: 'DOCUMENT',
          sourceId: document.id,
          chunkId: chunk.id,
          title: document.title,
          content: chunk.content,
        })),
      );

      return this.prisma.knowledgeDocument.update({
        where: { id: document.id },
        data: { status: 'READY' },
        include: { chunks: true },
      });
    } catch (error) {
      return this.prisma.knowledgeDocument.update({
        where: { id: document.id },
        data: { status: 'FAILED', errorMessage: 'Vector indexing failed' },
        include: { chunks: true },
      });
    }
  }

  async listDocuments(user: SafeUser, page = 1, pageSize = 10) {
    const safePage = Math.max(page, 1);
    const safePageSize = Math.min(Math.max(pageSize, 1), 50);
    const where = { OR: this.visibleDocumentConditions(user) };
    const [items, total] = await Promise.all([
      this.prisma.knowledgeDocument.findMany({
        where,
        include: { chunks: true },
        orderBy: { updatedAt: 'desc' },
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
      }),
      this.prisma.knowledgeDocument.count({ where }),
    ]);

    return {
      items: items.map(
        (item): KnowledgeDocumentListItem => ({
          id: item.id,
          title: item.title,
          originalName: item.originalName,
          mimeType: item.mimeType,
          size: item.size,
          status: item.status,
          errorMessage: item.errorMessage,
          isShared: item.isShared,
          uploadedById: item.uploadedById,
          teamId: item.teamId,
          chunkCount: item.chunks.length,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        }),
      ),
      total,
      page: safePage,
      pageSize: safePageSize,
    };
  }

  async search(user: SafeUser, dto: SearchRagDto): Promise<RagSearchResult> {
    const topK = Math.min(Math.max(dto.topK ?? Number(process.env.RAG_TOP_K ?? 5), 1), 10);

    try {
      const vectorResult = await this.vectorStore.search(dto.query, topK);
      const sources = await this.filterVisibleSources(user, vectorResult.sources, topK);

      if (sources.length > 0) {
        return { degraded: false, sources };
      }
    } catch (error) {
      return this.keywordSearch(user, dto.query, topK, true);
    }

    return this.keywordSearch(user, dto.query, topK, true);
  }

  async syncScript(script: Script): Promise<void> {
    try {
      await this.vectorStore.upsertSources([
        {
          id: `script:${script.id}`,
          sourceType: 'SCRIPT',
          sourceId: script.id,
          title: script.title,
          content: `${script.title}\n${script.content}\n标签：${script.tags.join(',')}`,
          category: script.category,
        },
      ]);
    } catch (error) {}
  }

  async deleteScript(scriptId: string): Promise<void> {
    try {
      await this.vectorStore.deleteBySourceIds([scriptId]);
    } catch (error) {}
  }

  async removeDocument(user: SafeUser, id: string): Promise<void> {
    const document = await this.prisma.knowledgeDocument.findFirst({
      where: {
        id,
        uploadedById: user.id,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    try {
      await this.vectorStore.deleteBySourceIds([id]);
    } catch (error) {}

    await this.prisma.knowledgeDocument.delete({ where: { id } });
  }

  private async keywordSearch(
    user: SafeUser,
    query: string,
    topK: number,
    degraded: boolean,
  ): Promise<RagSearchResult> {
    const keyword = query.trim();
    const [scripts, chunks] = await Promise.all([
      this.prisma.script.findMany({
        where: {
          AND: [
            { OR: this.visibleScriptConditions(user) },
            {
              OR: [
                { title: { contains: keyword, mode: 'insensitive' } },
                { content: { contains: keyword, mode: 'insensitive' } },
                { tags: { has: keyword } },
              ],
            },
          ],
        },
        take: topK,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.knowledgeChunk.findMany({
        where: {
          content: { contains: keyword, mode: 'insensitive' },
          document: { OR: this.visibleDocumentConditions(user), status: 'READY' },
        },
        include: { document: true },
        take: topK,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const scriptSources: RagSource[] = scripts.map((item) => ({
      id: `script:${item.id}`,
      sourceType: 'SCRIPT',
      sourceId: item.id,
      title: item.title,
      content: item.content,
      category: item.category,
    }));
    const chunkSources: RagSource[] = chunks.map((item) => ({
      id: `document:${item.id}`,
      sourceType: 'DOCUMENT',
      sourceId: item.documentId,
      chunkId: item.id,
      title: item.document.title,
      content: item.content,
    }));

    return { degraded, sources: [...scriptSources, ...chunkSources].slice(0, topK) };
  }

  private async filterVisibleSources(
    user: SafeUser,
    sources: RagSource[],
    topK: number,
  ): Promise<RagSource[]> {
    const scriptIds = sources
      .filter((source) => source.sourceType === 'SCRIPT')
      .map((source) => source.sourceId);
    const chunkIds = sources
      .filter((source) => source.sourceType === 'DOCUMENT' && source.chunkId)
      .map((source) => source.chunkId as string);
    const [scripts, chunks] = await Promise.all([
      scriptIds.length
        ? this.prisma.script.findMany({
            where: { id: { in: scriptIds }, OR: this.visibleScriptConditions(user) },
          })
        : Promise.resolve([]),
      chunkIds.length
        ? this.prisma.knowledgeChunk.findMany({
            where: {
              id: { in: chunkIds },
              document: { OR: this.visibleDocumentConditions(user), status: 'READY' },
            },
            include: { document: true },
          })
        : Promise.resolve([]),
    ]);
    const visibleScripts = new Map(scripts.map((item) => [item.id, item]));
    const visibleChunks = new Map(chunks.map((item) => [item.id, item]));

    return sources
      .filter((source) => {
        if (source.sourceType === 'SCRIPT') {
          return visibleScripts.has(source.sourceId);
        }

        return Boolean(source.chunkId && visibleChunks.has(source.chunkId));
      })
      .map((source) => {
        if (source.sourceType === 'SCRIPT') {
          const item = visibleScripts.get(source.sourceId);

          return item
            ? { ...source, title: item.title, content: item.content, category: item.category }
            : source;
        }

        const item = source.chunkId ? visibleChunks.get(source.chunkId) : undefined;

        return item ? { ...source, title: item.document.title, content: item.content } : source;
      })
      .slice(0, topK);
  }

  private visibleScriptConditions(user: SafeUser): Prisma.ScriptWhereInput[] {
    const conditions: Prisma.ScriptWhereInput[] = [{ createdById: user.id }, { isPreset: true }];

    if (user.teamId) {
      conditions.push({ isShared: true, teamId: user.teamId });
    }

    return conditions;
  }

  private visibleDocumentConditions(user: SafeUser): Prisma.KnowledgeDocumentWhereInput[] {
    const conditions: Prisma.KnowledgeDocumentWhereInput[] = [{ uploadedById: user.id }];

    if (user.teamId) {
      conditions.push({ isShared: true, teamId: user.teamId });
    }

    return conditions;
  }

  private assertSharedPermission(user: SafeUser, isShared: boolean): void {
    if (isShared && !sharedKnowledgeRoles.has(user.role)) {
      throw new ForbiddenException('No permission to share knowledge documents');
    }
  }
}
