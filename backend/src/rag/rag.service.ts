/**
 * RAG 知识检索服务。
 *
 * 提供：
 * - 文档上传：解析（pdf/docx/txt/md） → 切片 → 落库 → 向量化；
 * - 文档列表 / 删除；
 * - 检索：优先调用向量库，失败或无结果时降级到关键字检索；
 * - 话术同步：将话术正文同步进向量库，便于跨知识源召回。
 *
 * 设计要点：
 * - 任何向量库调用失败均不影响主业务，统一降级返回；
 * - 所有可见性条件集中在 visibleScriptConditions / visibleDocumentConditions；
 * - 共享文档需要角色白名单（TRAINER / MANAGER / ADMIN）。
 */
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

// 允许发布共享知识文档的角色集合
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

  /**
   * 上传知识文档。
   *
   * 主要步骤：
   * 1. 校验文件存在、大小未超 MAX_UPLOAD_SIZE_MB；
   * 2. 共享权限校验；
   * 3. 解析文本并按 RAG_CHUNK_SIZE / RAG_CHUNK_OVERLAP 切片；
   * 4. 将文档与切片落库（status=PROCESSING）；
   * 5. 调向量库写入索引，成功置 READY，失败置 FAILED 并记录错误。
   *
   * @throws BadRequestException 文件缺失 / 过大 / 无可读文本
   */
  async uploadDocument(user: SafeUser, file: Express.Multer.File, dto: UploadDocumentDto) {
    if (!file) {
      throw new BadRequestException('Document file is required');
    }

    // 文件体积兜底，避免大文件耗尽进程内存
    const maxUploadSize = Number(process.env.MAX_UPLOAD_SIZE_MB ?? 10) * 1024 * 1024;

    if (file.size > maxUploadSize) {
      throw new BadRequestException('Document file is too large');
    }

    const isShared = dto.isShared ?? false;
    // 权限校验：共享文档需角色白名单
    this.assertSharedPermission(user, isShared);

    const text = await this.parser.parse(file);
    // 按配置进行切片，便于后续向量化与检索召回
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
        teamId: isShared ? user.teamId : null,
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
      // 写入向量库：每个 chunk 一条向量，便于按 chunk 粒度命中
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

      // 索引成功，将状态置为 READY
      return this.prisma.knowledgeDocument.update({
        where: { id: document.id },
        data: { status: 'READY' },
        include: { chunks: true },
      });
    } catch (error) {
      // 错误兜底：向量化失败时仍保留文档元数据，状态置 FAILED 便于排查与重试
      return this.prisma.knowledgeDocument.update({
        where: { id: document.id },
        data: { status: 'FAILED', errorMessage: 'Vector indexing failed' },
        include: { chunks: true },
      });
    }
  }

  /**
   * 分页获取当前用户可见的知识文档列表。
   * 仅返回 KnowledgeDocumentListItem（不携带原始 chunks 内容，节省带宽）。
   */
  async listDocuments(user: SafeUser, page = 1, pageSize = 10) {
    // 边界处理：page≥1，pageSize 限制在 [1, 50]
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

  /**
   * 检索知识。
   *
   * 优先策略：向量库检索 → 过滤可见来源 → 若结果为空则降级到关键字检索；
   * 异常兜底：向量库调用失败时直接降级到关键字检索，并标记 degraded=true。
   */
  async search(user: SafeUser, dto: SearchRagDto): Promise<RagSearchResult> {
    // topK 边界约束在 [1, 10]，避免一次召回过多
    const topK = Math.min(Math.max(dto.topK ?? Number(process.env.RAG_TOP_K ?? 5), 1), 10);

    try {
      const vectorResult = await this.vectorStore.search(dto.query, topK);
      // 二次过滤：剔除当前用户无权访问的来源
      const sources = await this.filterVisibleSources(user, vectorResult.sources, topK);

      if (sources.length > 0) {
        return { degraded: false, sources };
      }
    } catch (error) {
      // 错误兜底：向量库异常时降级到关键字检索
      return this.keywordSearch(user, dto.query, topK, true);
    }

    // 向量库无命中也走关键字检索补救
    return this.keywordSearch(user, dto.query, topK, true);
  }

  /**
   * 同步话术到向量库。失败不抛错，避免阻塞主业务（话术增改）。
   */
  async syncScript(script: Script): Promise<void> {
    try {
      await this.vectorStore.upsertSources([
        {
          id: `script:${script.id}`,
          sourceType: 'SCRIPT',
          sourceId: script.id,
          title: script.title,
          // 合并标题、正文、标签构造检索语料，提升召回率
          content: `${script.title}\n${script.content}\n标签：${script.tags.join(',')}`,
          category: script.category,
        },
      ]);
    } catch (error) {
      // 错误兜底：向量同步失败不影响话术主流程
    }
  }

  /**
   * 删除指定话术在向量库的索引。失败静默处理。
   */
  async deleteScript(scriptId: string): Promise<void> {
    try {
      await this.vectorStore.deleteBySourceIds([scriptId]);
    } catch (error) {
      // 错误兜底：删除失败由后续清理任务处理
    }
  }

  /**
   * 删除知识文档。
   * 仅允许文档上传者本人删除；先尝试清理向量索引，再删 DB。
   */
  async removeDocument(user: SafeUser, id: string): Promise<void> {
    const document = await this.prisma.knowledgeDocument.findFirst({
      where: {
        id,
        uploadedById: user.id,
      },
    });

    if (!document) {
      // 未找到或非本人上传，统一返回 404
      throw new NotFoundException('Document not found');
    }

    try {
      await this.vectorStore.deleteBySourceIds([id]);
    } catch (error) {
      // 错误兜底：向量索引清理失败不阻塞 DB 删除
    }

    await this.prisma.knowledgeDocument.delete({ where: { id } });
  }

  /**
   * 关键字检索降级实现。
   * 同时从话术与知识切片中匹配，并合并截取 topK 条返回，degraded 由调用方传入。
   */
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

  /**
   * 对向量库返回的来源做权限过滤，并补齐数据库内最新的 title/content。
   * 避免向量库中缓存的旧数据被泄露或展示。
   */
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

  /**
   * 构造话术可见性条件：本人创建 / 预置 / 同团队共享。
   */
  private visibleScriptConditions(user: SafeUser): Prisma.ScriptWhereInput[] {
    const conditions: Prisma.ScriptWhereInput[] = [{ createdById: user.id }, { isPreset: true }];

    if (user.teamId) {
      conditions.push({ isShared: true, teamId: user.teamId });
    }

    return conditions;
  }

  /**
   * 构造知识文档可见性条件：本人上传 / 同团队共享。
   */
  private visibleDocumentConditions(user: SafeUser): Prisma.KnowledgeDocumentWhereInput[] {
    const conditions: Prisma.KnowledgeDocumentWhereInput[] = [{ uploadedById: user.id }];

    if (user.teamId) {
      conditions.push({ isShared: true, teamId: user.teamId });
    }

    return conditions;
  }

  /**
   * 共享权限断言：仅当 isShared=true 且角色不在白名单时抛 403。
   */
  private assertSharedPermission(user: SafeUser, isShared: boolean): void {
    if (isShared && !sharedKnowledgeRoles.has(user.role)) {
      throw new ForbiddenException('No permission to share knowledge documents');
    }
  }
}
