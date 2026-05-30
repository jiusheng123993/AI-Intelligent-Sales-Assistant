/**
 * RAG 知识库页面组件文件。
 * 职责：上传销售/产品/培训文档至知识库；对当前知识进行检索测试；
 * 展示文档列表并支持删除；所有错误统一以 Alert 中文提示。
 */
import { Alert, Button, Card, Form, Input, List, Popconfirm, Space, Switch, Table, Tag, Typography } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { deleteDocument, KnowledgeDocumentItem, listDocuments, RagSource, searchKnowledge, uploadDocument } from '@/api/rag';

interface UploadFormValues {
  title?: string;
  file?: File;
  isShared?: boolean;
}

/**
 * KnowledgePage：知识库页面，集成文档上传、列表、删除与 RAG 检索测试。
 */
export function KnowledgePage() {
  const [form] = Form.useForm<UploadFormValues>();
  const [documents, setDocuments] = useState<KnowledgeDocumentItem[]>([]);
  const [sources, setSources] = useState<RagSource[]>([]);
  const [query, setQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 防止 StrictMode 下首屏重复加载文档的“一次性”闸门
  const hasLoadedInitialDocuments = useRef(false);

  // useCallback 缓存文档列表加载逻辑，便于上传/删除后复用刷新
  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await listDocuments({ page: 1, pageSize: 10 });
      setDocuments(result.items);
    } catch {
      // 错误兜底：加载失败时仅提示，不破坏已有 UI
      setError('知识文档加载失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 副作用：首次挂载时加载文档列表；ref 闸门保证只执行一次
  useEffect(() => {
    if (hasLoadedInitialDocuments.current) {
      return;
    }

    hasLoadedInitialDocuments.current = true;
    void loadDocuments();
  }, [loadDocuments]);

  // 表单提交处理：必须先选择文件，否则给出提示；上传成功后清空表单并刷新列表
  async function handleUpload(values: UploadFormValues) {
    if (!selectedFile) {
      setError('请选择要上传的文档');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await uploadDocument({ file: selectedFile, title: values.title, isShared: values.isShared ?? false });
      setSelectedFile(null);
      form.resetFields();
      await loadDocuments();
    } catch {
      // 错误兜底：上传失败可能因格式/大小限制，给出明确提示
      setError('文档上传失败，请检查格式和大小');
    } finally {
      setIsSubmitting(false);
    }
  }

  // 检索测试：空查询提前拦截，调用搜索接口后更新来源列表
  async function handleSearch() {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setError('请输入检索问题');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const result = await searchKnowledge({ query: trimmedQuery, topK: 5 });
      setSources(result.sources);
    } catch {
      // 错误兜底：检索失败统一提示
      setError('知识检索失败，请稍后重试');
    } finally {
      setIsSearching(false);
    }
  }

  // 删除处理：删除完成后刷新列表，避免数据陈旧
  async function handleDelete(id: string) {
    await deleteDocument(id);
    await loadDocuments();
  }

  const columns: ColumnsType<KnowledgeDocumentItem> = [
    {
      title: '文档标题',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Tag color={status === 'READY' ? 'green' : status === 'FAILED' ? 'red' : 'blue'}>{status}</Tag>,
    },
    {
      title: '切片数',
      dataIndex: 'chunkCount',
      key: 'chunkCount',
    },
    {
      title: '范围',
      dataIndex: 'isShared',
      key: 'isShared',
      render: (isShared: boolean) => (isShared ? '团队共享' : '个人知识'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Popconfirm title="确认删除该文档？" okText="确定" cancelText="取消" onConfirm={() => handleDelete(record.id)}>
          <Button danger size="small">
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <main className="knowledge-page">
      <section className="knowledge-toolbar">
        <div>
          <Typography.Title level={2}>RAG 知识库</Typography.Title>
          <Typography.Paragraph className="knowledge-subtitle">上传销售资料、产品说明和培训文档，供 AI 演练检索引用。</Typography.Paragraph>
        </div>
      </section>

      {error ? <Alert type="error" showIcon message={error} className="knowledge-alert" /> : null}

      <Card className="knowledge-card" title="上传文档">
        <Form form={form} layout="vertical" onFinish={handleUpload} requiredMark={false}>
          <Space align="end" wrap>
            <Form.Item label="文档标题" name="title">
              <Input placeholder="例如：产品白皮书" />
            </Form.Item>
            <Form.Item label="选择文件">
              <Input aria-label="选择文件" type="file" accept=".txt,.md,.pdf,.docx" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} />
            </Form.Item>
            <Form.Item label="团队共享" name="isShared" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={isSubmitting}>
                上传文档
              </Button>
            </Form.Item>
          </Space>
        </Form>
      </Card>

      <Card className="knowledge-card" title="检索测试">
        <Space.Compact className="knowledge-search">
          <Input placeholder="输入问题测试 RAG 检索" value={query} onChange={(event) => setQuery(event.target.value)} />
          <Button type="primary" loading={isSearching} onClick={() => void handleSearch()}>
            测试检索
          </Button>
        </Space.Compact>
        <List
          className="knowledge-sources"
          dataSource={sources}
          renderItem={(source) => (
            <List.Item>
              <List.Item.Meta title={source.title} description={`${source.sourceType} · ${source.content}`} />
            </List.Item>
          )}
        />
      </Card>

      <Table rowKey="id" columns={columns} dataSource={documents} loading={isLoading} pagination={false} />
    </main>
  );
}
