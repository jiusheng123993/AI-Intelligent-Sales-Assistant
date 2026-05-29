import { Alert, Button, Form, Input, Modal, Popconfirm, Select, Space, Switch, Table, Tag, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { createScript, deleteScript, listScripts, ScriptCategory, ScriptItem, updateScript } from '@/api/scripts';

const categoryLabels: Record<ScriptCategory, string> = {
  INTRODUCTION: '开场介绍',
  OBJECTION_HANDLING: '异议处理',
  CLOSING: '成交促单',
  FOLLOW_UP: '跟进复盘',
  CUSTOM: '自定义',
};

const categoryOptions = Object.entries(categoryLabels).map(([value, label]) => ({ value, label }));

interface ScriptFormValues {
  title: string;
  content: string;
  category: ScriptCategory;
  tags?: string[];
  isShared?: boolean;
}

export function ScriptsPage() {
  const [form] = Form.useForm<ScriptFormValues>();
  const [scripts, setScripts] = useState<ScriptItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<ScriptCategory | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<ScriptItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadScripts(nextPage = page, nextPageSize = pageSize) {
    setIsLoading(true);
    setError(null);

    try {
      const trimmedKeyword = keyword.trim();
      const result = await listScripts({
        ...(trimmedKeyword ? { keyword: trimmedKeyword } : {}),
        ...(category ? { category } : {}),
        page: nextPage,
        pageSize: nextPageSize,
      });
      setScripts(result.items);
      setTotal(result.total);
      setPage(result.page);
      setPageSize(result.pageSize);
    } catch {
      setError('话术列表加载失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadScripts(1, pageSize);
  }, []);

  useEffect(() => {
    if (isModalOpen && editingScript) {
      form.setFieldsValue({
        title: editingScript.title,
        content: editingScript.content,
        category: editingScript.category,
        tags: editingScript.tags,
        isShared: editingScript.isShared,
      });
    }
  }, [editingScript, form, isModalOpen]);

  function openCreateModal() {
    setEditingScript(null);
    form.setFieldsValue({ title: '', content: '', category: 'CUSTOM', tags: [], isShared: false });
    setIsModalOpen(true);
  }

  function openEditModal(script: ScriptItem) {
    setEditingScript(script);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingScript(null);
    form.resetFields();
  }

  async function handleSubmit(values: ScriptFormValues) {
    setIsSubmitting(true);

    try {
      const payload = {
        title: values.title,
        content: values.content,
        category: values.category,
        tags: values.tags ?? [],
        isShared: values.isShared ?? false,
      };

      if (editingScript) {
        await updateScript(editingScript.id, payload);
      } else {
        await createScript(payload);
      }

      closeModal();
      await loadScripts(page, pageSize);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteScript(id);
    await loadScripts(page, pageSize);
  }

  const columns = useMemo<ColumnsType<ScriptItem>>(
    () => [
      {
        title: '标题',
        dataIndex: 'title',
        key: 'title',
      },
      {
        title: '分类',
        dataIndex: 'category',
        key: 'category',
        render: (value: ScriptCategory) => categoryLabels[value],
      },
      {
        title: '标签',
        dataIndex: 'tags',
        key: 'tags',
        render: (tags: string[]) => (
          <Space size={[4, 4]} wrap>
            {tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </Space>
        ),
      },
      {
        title: '范围',
        dataIndex: 'isShared',
        key: 'isShared',
        render: (isShared: boolean, record) => (record.isPreset ? '系统预设' : isShared ? '团队共享' : '个人话术'),
      },
      {
        title: '操作',
        key: 'actions',
        render: (_, record) => (
          <Space>
            <Button size="small" onClick={() => openEditModal(record)} disabled={record.isPreset}>
              编辑
            </Button>
            <Popconfirm title="确认删除该话术？" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消" disabled={record.isPreset}>
              <Button size="small" danger disabled={record.isPreset}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [page, pageSize],
  );

  return (
    <main className="scripts-page">
      <section className="scripts-toolbar">
        <div>
          <Typography.Title level={2}>话术库</Typography.Title>
          <Typography.Paragraph className="scripts-subtitle">沉淀销售标准表达，支持后续 AI 演练与实时推荐。</Typography.Paragraph>
        </div>
        <Button type="primary" onClick={openCreateModal}>
          新建话术
        </Button>
      </section>

      <Space className="scripts-filters" wrap>
        <Input.Search
          placeholder="搜索标题或内容"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          onSearch={() => void loadScripts(1, pageSize)}
          enterButton="搜索"
          allowClear
        />
        <Select
          placeholder="选择分类"
          value={category}
          onChange={(value) => setCategory(value)}
          options={categoryOptions}
          allowClear
          className="scripts-category-filter"
        />
        <Button onClick={() => void loadScripts(1, pageSize)}>筛选</Button>
      </Space>

      {error ? <Alert type="error" showIcon message={error} className="scripts-alert" /> : null}

      <Table
        rowKey="id"
        columns={columns}
        dataSource={scripts}
        loading={isLoading}
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: (nextPage, nextPageSize) => void loadScripts(nextPage, nextPageSize),
        }}
      />

      <Modal title={editingScript ? '编辑话术' : '新建话术'} open={isModalOpen} onCancel={closeModal} onOk={() => form.submit()} confirmLoading={isSubmitting} okText="保存" cancelText="取消">
        <Form form={form} layout="vertical" requiredMark={false} initialValues={{ category: 'CUSTOM', tags: [], isShared: false }} onFinish={handleSubmit}>
          <Form.Item label="标题" name="title" rules={[{ required: true, message: '请输入标题' }, { min: 2, message: '标题至少 2 个字' }, { max: 80, message: '标题最多 80 个字' }]}>
            <Input placeholder="例如：标准开场白" />
          </Form.Item>
          <Form.Item label="内容" name="content" rules={[{ required: true, message: '请输入内容' }, { min: 5, message: '内容至少 5 个字' }, { max: 5000, message: '内容最多 5000 个字' }]}>
            <Input.TextArea rows={5} placeholder="请输入完整销售话术" />
          </Form.Item>
          <Form.Item label="分类" name="category" rules={[{ required: true, message: '请选择分类' }]}>
            <Select options={categoryOptions} />
          </Form.Item>
          <Form.Item label="标签" name="tags">
            <Select mode="tags" maxTagCount={5} placeholder="输入标签后回车" />
          </Form.Item>
          <Form.Item label="团队共享" name="isShared" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </main>
  );
}
