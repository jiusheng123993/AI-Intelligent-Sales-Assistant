import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KnowledgePage } from './KnowledgePage';

vi.mock('@/api/rag', () => ({
  deleteDocument: vi.fn(),
  listDocuments: vi.fn(),
  searchKnowledge: vi.fn(),
  uploadDocument: vi.fn(),
}));

import { deleteDocument, listDocuments, searchKnowledge, uploadDocument } from '@/api/rag';

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

describe('KnowledgePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listDocuments).mockResolvedValue({ items: [document], total: 1, page: 1, pageSize: 10 });
  });

  it('加载并展示知识文档列表', async () => {
    render(<KnowledgePage />);

    expect(await screen.findByText('产品白皮书')).toBeInTheDocument();
    expect(screen.getByText('READY')).toBeInTheDocument();
  });

  it('上传文档后刷新列表', async () => {
    vi.mocked(uploadDocument).mockResolvedValue(document);
    render(<KnowledgePage />);

    fireEvent.change(await screen.findByLabelText('文档标题'), { target: { value: '产品白皮书' } });
    fireEvent.change(screen.getByLabelText('选择文件'), {
      target: { files: [new File(['产品知识'], 'product.txt', { type: 'text/plain' })] },
    });
    fireEvent.click(screen.getByRole('button', { name: '上传文档' }));

    await waitFor(() => expect(uploadDocument).toHaveBeenCalledWith(expect.objectContaining({ title: '产品白皮书' })));
    expect(listDocuments).toHaveBeenCalledTimes(2);
  });

  it('检索知识并展示来源', async () => {
    vi.mocked(searchKnowledge).mockResolvedValue({
      degraded: false,
      sources: [{ id: 'script:1', sourceType: 'SCRIPT', sourceId: '1', title: '效率话术', content: '提升效率' }],
    });
    render(<KnowledgePage />);

    fireEvent.change(await screen.findByPlaceholderText('输入问题测试 RAG 检索'), { target: { value: '如何提升效率' } });
    fireEvent.click(screen.getByRole('button', { name: '测试检索' }));

    expect(await screen.findByText('效率话术')).toBeInTheDocument();
  });

  it('删除文档后刷新列表', async () => {
    vi.mocked(deleteDocument).mockResolvedValue(undefined);
    render(<KnowledgePage />);

    fireEvent.click(await screen.findByRole('button', { name: /删\s*除/ }));
    fireEvent.click(await screen.findByRole('button', { name: /确\s*定/ }));

    await waitFor(() => expect(deleteDocument).toHaveBeenCalledWith('doc-1'));
    expect(listDocuments).toHaveBeenCalledTimes(2);
  });
});
