/**
 * 团队邀请管理面板。
 * 嵌入 TeamPage 中，仅在用户具备邀请管理权限（owner / MANAGER / TRAINER / ADMIN）时渲染。
 * - 列出当前团队所有邀请，含派生 status Tag
 * - 生成邀请 Modal（可选角色 + 过期天数）
 * - 撤销邀请（仅 PENDING 邀请允许）
 * - 复制邀请码到剪贴板
 */
import { Alert, Button, Card, Form, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useState } from 'react';
import { createInvitation, listInvitations, revokeInvitation, type InvitationDetail, type InvitationStatus, type UserRole } from '@/api/teams';

interface InvitationsPanelProps {
  /** 当前团队 ID */
  teamId: string;
  /** 是否允许管理邀请；false 时整个组件不渲染，避免无权用户看到空表 */
  canManage: boolean;
}

/** 派生状态文案与颜色 */
const statusMeta: Record<InvitationStatus, { label: string; color: string }> = {
  PENDING: { label: '待 使 用', color: 'green' },
  USED: { label: '已 使 用', color: 'default' },
  EXPIRED: { label: '已 过 期', color: 'orange' },
  REVOKED: { label: '已 撤 销', color: 'red' },
};

/** 可选邀请角色（ADMIN 由 service 拒绝，故前端不暴露） */
const roleOptions: { value: UserRole; label: string }[] = [
  { value: 'SALES', label: '销售（SALES）' },
  { value: 'TRAINER', label: '培训师（TRAINER）' },
  { value: 'MANAGER', label: '经理（MANAGER）' },
];

interface CreateInvitationFormValues {
  role: UserRole;
  expiresInDays: number;
}

export function InvitationsPanel({ teamId, canManage }: InvitationsPanelProps) {
  const [invitations, setInvitations] = useState<InvitationDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createForm] = Form.useForm<CreateInvitationFormValues>();

  // 仅在有管理权限时拉取邀请列表，避免无权用户徒劳触发 403
  const reload = useCallback(async () => {
    if (!canManage) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await listInvitations(teamId);
      setInvitations(data);
    } catch {
      setError('邀请列表加载失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  }, [canManage, teamId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function handleCreate(values: CreateInvitationFormValues) {
    setIsSubmitting(true);
    try {
      await createInvitation(teamId, { role: values.role, expiresInDays: values.expiresInDays });
      setIsCreateOpen(false);
      createForm.resetFields();
      message.success('邀请已生成');
      await reload();
    } catch (err) {
      message.error(extractErrorMessage(err, '生成失败'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRevoke(invitationId: string) {
    try {
      await revokeInvitation(teamId, invitationId);
      message.success('邀请已撤销');
      await reload();
    } catch (err) {
      message.error(extractErrorMessage(err, '撤销失败'));
    }
  }

  async function handleCopy(code: string) {
    try {
      await navigator.clipboard?.writeText(code);
      message.success('邀请码已复制');
    } catch {
      message.warning('复制失败，请手动复制');
    }
  }

  // 无管理权限时整组件不渲染（含数据加载），避免无意义的 fetch 噪声
  if (!canManage) return null;

  const columns: ColumnsType<InvitationDetail> = [
    {
      title: '邀请码',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => <Typography.Text code copyable={false}>{code}</Typography.Text>,
    },
    {
      title: '目标角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: UserRole) => <Tag>{role}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: InvitationStatus) => <Tag color={statusMeta[status].color}>{statusMeta[status].label}</Tag>,
    },
    {
      title: '过期时间',
      dataIndex: 'expiresAt',
      key: 'expiresAt',
      render: (value: string) => new Date(value).toLocaleString(),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => void handleCopy(record.code)}>
            复 制
          </Button>
          {record.status === 'PENDING' ? (
            <Popconfirm title="确认撤销该邀请？" okText="确 定" cancelText="取 消" onConfirm={() => void handleRevoke(record.id)}>
              <Button size="small" danger>撤 销</Button>
            </Popconfirm>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="团队邀请"
      style={{ marginTop: 16 }}
      extra={<Button type="primary" onClick={() => setIsCreateOpen(true)}>生成邀请</Button>}
    >
      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} /> : null}
      <Table<InvitationDetail>
        rowKey="id"
        columns={columns}
        dataSource={invitations}
        loading={isLoading}
        pagination={false}
        locale={{ emptyText: '暂无邀请，点击右上「生成邀请」创建一个' }}
      />

      <Modal
        title="生成邀请"
        open={isCreateOpen}
        onCancel={() => setIsCreateOpen(false)}
        onOk={() => createForm.submit()}
        okText="确 认 生 成"
        cancelText="取 消"
        confirmLoading={isSubmitting}
      >
        <Form
          form={createForm}
          layout="vertical"
          requiredMark={false}
          initialValues={{ role: 'SALES', expiresInDays: 7 }}
          onFinish={handleCreate}
        >
          <Form.Item label="目标角色" name="role" rules={[{ required: true, message: '请选择目标角色' }]}>
            <Select options={roleOptions} />
          </Form.Item>
          <Form.Item label="有效天数" name="expiresInDays" rules={[{ required: true, message: '请填写有效天数' }, { type: 'integer', min: 1, max: 30, message: '范围 1~30 天' }]}>
            <InputNumber min={1} max={30} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

/**
 * 与 TeamPage 同样的错误信息提取助手。复制是因为面板可独立用于其他场景，
 * 后续若有第三处使用再统一抽到 utils。
 */
function extractErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === 'object' && err !== null) {
    const anyErr = err as { response?: { data?: { message?: string } } };
    if (anyErr.response?.data?.message) return anyErr.response.data.message;
  }
  return fallback;
}

