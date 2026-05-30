import { describe, expect, it, vi } from 'vitest';
import { http } from './http';
import { deleteDocument, listDocuments, searchKnowledge, uploadDocument } from './rag';

vi.mock('./http', () => ({
  http: {
    delete: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const document = {
  id: 'doc-1',
  title: '产品白皮书',
  originalName: 'product.txt',
  mimeType: 'text/plain',
  size: 120,
  status: 'READY',
  errorMessage: null,
  isShared: false,
  uploadedById: 'user-1',
  teamId: 'team-1',
  chunkCount: 1,
  createdAt: '2026-05-30T00:00:00.000Z',
  updatedAt: '2026-05-30T00:00:00.000Z',
};

describe('rag api', () => {
  it('上传知识文档', async () => {
    vi.mocked(http.post).mockResolvedValueOnce({ data: document });
    const file = new File(['产品知识'], 'product.txt', { type: 'text/plain' });

    const result = await uploadDocument({ file, title: '产品白皮书', isShared: true });

    expect(http.post).toHaveBeenCalledWith('/rag/documents', expect.any(FormData), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    expect(result).toEqual(document);
  });

  it('查询知识文档列表', async () => {
    vi.mocked(http.get).mockResolvedValueOnce({ data: { items: [document], total: 1, page: 1, pageSize: 10 } });

    const result = await listDocuments({ page: 1, pageSize: 10 });

    expect(http.get).toHaveBeenCalledWith('/rag/documents', { params: { page: 1, pageSize: 10 } });
    expect(result.items).toEqual([document]);
  });

  it('删除知识文档', async () => {
    vi.mocked(http.delete).mockResolvedValueOnce({ data: undefined });

    await deleteDocument('doc-1');

    expect(http.delete).toHaveBeenCalledWith('/rag/documents/doc-1');
  });

  it('检索知识来源', async () => {
    const response = { degraded: false, sources: [{ id: 'script:1', sourceType: 'SCRIPT' as const, sourceId: '1', title: '效率话术', content: '提升效率' }] };
    vi.mocked(http.post).mockResolvedValueOnce({ data: response });

    const result = await searchKnowledge({ query: '如何提升效率', topK: 3 });

    expect(http.post).toHaveBeenCalledWith('/rag/search', { query: '如何提升效率', topK: 3 });
    expect(result).toEqual(response);
  });
});
