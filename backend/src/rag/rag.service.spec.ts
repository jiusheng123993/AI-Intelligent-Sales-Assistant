import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ScriptCategory, UserRole } from '@prisma/client';
import { DocumentChunkerService } from './document-chunker.service';
import { DocumentParserService } from './document-parser.service';
import { RagService } from './rag.service';

const now = new Date('2026-05-30T00:00:00.000Z');

const salesUser = {
  id: 'user-1',
  email: 'sales@example.com',
  name: '销售顾问',
  role: UserRole.SALES,
  teamId: 'team-1',
  createdAt: now,
  updatedAt: now,
};

const trainerUser = {
  ...salesUser,
  role: UserRole.TRAINER,
};

const document = {
  id: 'doc-1',
  title: '产品白皮书',
  originalName: 'product.txt',
  mimeType: 'text/plain',
  size: 120,
  sourceType: 'UPLOAD',
  status: 'READY',
  errorMessage: null,
  uploadedById: 'user-1',
  teamId: 'team-1',
  isShared: false,
  createdAt: now,
  updatedAt: now,
  chunks: [
    {
      id: 'chunk-1',
      documentId: 'doc-1',
      content: '销智可以提升销售跟进效率，沉淀优秀话术。',
      chunkIndex: 0,
      tokenCount: 23,
      vectorId: 'document:chunk-1',
      createdAt: now,
    },
  ],
};

const script = {
  id: 'script-1',
  title: '效率价值话术',
  content: '我们可以帮助团队降低重复沟通成本，提高销售跟进效率。',
  category: ScriptCategory.CUSTOM,
  tags: ['效率'],
  isShared: true,
  isPreset: false,
  createdById: 'trainer-1',
  teamId: 'team-1',
  createdAt: now,
  updatedAt: now,
};

const createPrismaMock = () => ({
  knowledgeDocument: {
    count: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  knowledgeChunk: {
    findMany: jest.fn(),
  },
  script: {
    findMany: jest.fn(),
  },
});

const createVectorStoreMock = () => ({
  deleteBySourceIds: jest.fn(),
  search: jest.fn(),
  upsertSources: jest.fn(),
});

describe('DocumentChunkerService', () => {
  it('splits long text with overlap and removes blank chunks', () => {
    const chunker = new DocumentChunkerService();

    const chunks = chunker.chunk('第一段内容。\n\n第二段内容很长，用于验证切片能力。', 12, 4);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks.every((chunk) => chunk.content.trim().length > 0)).toBe(true);
  });
});

describe('DocumentParserService', () => {
  it('extracts text from txt upload buffers', async () => {
    const parser = new DocumentParserService();

    const text = await parser.parse({
      originalname: 'product.txt',
      mimetype: 'text/plain',
      size: 12,
      buffer: Buffer.from('产品知识'),
    } as Express.Multer.File);

    expect(text).toBe('产品知识');
  });

  it('rejects unsupported upload formats', async () => {
    const parser = new DocumentParserService();

    await expect(
      parser.parse({
        originalname: 'malware.exe',
        mimetype: 'application/octet-stream',
        size: 10,
        buffer: Buffer.from('x'),
      } as Express.Multer.File),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('RagService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let vectorStore: ReturnType<typeof createVectorStoreMock>;
  let service: RagService;

  beforeEach(() => {
    prisma = createPrismaMock();
    vectorStore = createVectorStoreMock();
    service = new RagService(
      prisma as any,
      new DocumentParserService(),
      new DocumentChunkerService(),
      vectorStore as any,
    );
    process.env.MAX_UPLOAD_SIZE_MB = '10';
    process.env.RAG_CHUNK_SIZE = '1000';
    process.env.RAG_CHUNK_OVERLAP = '150';
  });

  it('uploads txt documents, creates chunks and writes vectors', async () => {
    prisma.knowledgeDocument.create.mockResolvedValue({ ...document, status: 'PROCESSING' });
    prisma.knowledgeDocument.update.mockResolvedValue(document);

    const result = await service.uploadDocument(
      trainerUser,
      {
        originalname: 'product.txt',
        mimetype: 'text/plain',
        size: 120,
        buffer: Buffer.from('销智可以提升销售跟进效率，沉淀优秀话术。'),
      } as Express.Multer.File,
      { title: '产品白皮书', isShared: true },
    );

    expect(prisma.knowledgeDocument.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: '产品白皮书',
        originalName: 'product.txt',
        status: 'PROCESSING',
        uploadedById: 'user-1',
        teamId: 'team-1',
        isShared: true,
      }),
      include: { chunks: true },
    });
    expect(vectorStore.upsertSources).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ sourceType: 'DOCUMENT' })]),
    );
    expect(result.status).toBe('READY');
  });

  it('rejects shared document upload from sales role', async () => {
    await expect(
      service.uploadDocument(
        salesUser,
        {
          originalname: 'product.txt',
          mimetype: 'text/plain',
          size: 120,
          buffer: Buffer.from('产品知识'),
        } as Express.Multer.File,
        { isShared: true },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('falls back to database keyword search when vector search fails', async () => {
    vectorStore.search.mockRejectedValue(new Error('chroma down'));
    prisma.script.findMany.mockResolvedValue([script]);
    prisma.knowledgeChunk.findMany.mockResolvedValue([{ ...document.chunks[0], document }]);

    const result = await service.search(salesUser, { query: '如何提升跟进效率', topK: 5 });

    expect(result.degraded).toBe(true);
    expect(result.sources.map((source) => source.title)).toEqual(['效率价值话术', '产品白皮书']);
  });

  it('filters vector results through database visibility rules', async () => {
    vectorStore.search.mockResolvedValue({
      degraded: false,
      sources: [
        {
          id: 'script:script-1',
          sourceType: 'SCRIPT',
          sourceId: 'script-1',
          title: '效率价值话术',
          content: '效率',
          score: 0.9,
        },
        {
          id: 'document:chunk-1',
          sourceType: 'DOCUMENT',
          sourceId: 'doc-1',
          chunkId: 'chunk-1',
          title: '产品白皮书',
          content: '产品',
          score: 0.8,
        },
      ],
    });
    prisma.script.findMany.mockResolvedValue([script]);
    prisma.knowledgeChunk.findMany.mockResolvedValue([{ ...document.chunks[0], document }]);

    const result = await service.search(salesUser, { query: '效率', topK: 5 });

    expect(prisma.script.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: { in: ['script-1'] } }) }),
    );
    expect(result.degraded).toBe(false);
    expect(result.sources).toHaveLength(2);
  });

  it('deletes owned documents and corresponding vectors', async () => {
    prisma.knowledgeDocument.findFirst.mockResolvedValue(document);
    prisma.knowledgeDocument.delete.mockResolvedValue(document);

    await service.removeDocument(salesUser, 'doc-1');

    expect(vectorStore.deleteBySourceIds).toHaveBeenCalledWith(['doc-1']);
    expect(prisma.knowledgeDocument.delete).toHaveBeenCalledWith({ where: { id: 'doc-1' } });
  });

  it('rejects deleting invisible documents', async () => {
    prisma.knowledgeDocument.findFirst.mockResolvedValue(null);

    await expect(service.removeDocument(salesUser, 'missing-doc')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
