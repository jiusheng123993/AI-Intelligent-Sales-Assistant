import { Alert, Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Spin, Table, Tag, Typography, message } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { useAuth } from '@/contexts/AuthContext';
import {
  acceptInvitation,
  createTeam,
  disbandTeam,
  findMyTeam,
  leaveTeam,
  removeMember,
  renameTeam,
  transferOwnership,
  updateMemberRole,
  type TeamDetail,
  type TeamMemberSummary,
  type UserRole,
} from '@/api/teams';

const roleLabels: Record<UserRole, string> = {
  SALES: '销售',
  TRAINER: '培训师',
  MANAGER: '经理',
  ADMIN: '管理员',
};

const editableRoles: UserRole[] = ['SALES', 'TRAINER', 'MANAGER'];

interface CreateTeamFormValues { name: string }
interface JoinTeamFormValues { code: string }
interface RenameFormValues { name: string }
interface UpdateRoleFormValues { role: UserRole }
interface TransferFormValues { targetUserId: string }

/**
 * 团队管理页面。
 * 根据当前用户是否归属团队展示两态：无团队引导 / 团队详情卡 + 成员表。
 * 角色权限：owner 看到「转让/解散」、普通成员看到「退出」、不能操作其他人。
 */
export function TeamPage() {
  const { user } = useAuth();
  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createForm] = Form.useForm<CreateTeamFormValues>();
  const [joinForm] = Form.useForm<JoinTeamFormValues>();
  const [renameForm] = Form.useForm<RenameFormValues>();
  const [updateRoleForm] = Form.useForm<UpdateRoleFormValues>();
  const [transferForm] = Form.useForm<TransferFormValues>();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMemberSummary | null>(null);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 加载团队详情；任何 4xx/5xx 都以友好提示展示，不弹白屏
  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const detail = await findMyTeam();
      setTeam(detail);
    } catch {
      setError('团队信息加载失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function handleCreate(values: CreateTeamFormValues) {
    setIsSubmitting(true);
    try {
      await createTeam({ name: values.name });
      setIsCreateOpen(false);
      createForm.resetFields();
      message.success('团队创建成功');
      await reload();
    } catch (err) {
      message.error(extractErrorMessage(err, '创建失败'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleJoin(values: JoinTeamFormValues) {
    setIsSubmitting(true);
    try {
      await acceptInvitation({ code: values.code.trim().toUpperCase() });
      setIsJoinOpen(false);
      joinForm.resetFields();
      message.success('已成功加入团队');
      await reload();
    } catch (err) {
      message.error(extractErrorMessage(err, '加入失败，请检查邀请码'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRename(values: RenameFormValues) {
    if (!team) return;
    setIsSubmitting(true);
    try {
      await renameTeam(team.id, { name: values.name });
      setIsRenameOpen(false);
      message.success('团队改名成功');
      await reload();
    } catch (err) {
      message.error(extractErrorMessage(err, '改名失败'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDisband() {
    if (!team) return;
    try {
      await disbandTeam(team.id);
      message.success('团队已解散');
      await reload();
    } catch (err) {
      message.error(extractErrorMessage(err, '解散失败'));
    }
  }

  async function handleLeave() {
    if (!team) return;
    try {
      await leaveTeam(team.id);
      message.success('已退出团队');
      await reload();
    } catch (err) {
      message.error(extractErrorMessage(err, '退出失败'));
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!team) return;
    try {
      await removeMember(team.id, memberId);
      message.success('成员已移除');
      await reload();
    } catch (err) {
      message.error(extractErrorMessage(err, '移除失败'));
    }
  }

  async function handleUpdateRole(values: UpdateRoleFormValues) {
    if (!team || !editingMember) return;
    setIsSubmitting(true);
    try {
      await updateMemberRole(team.id, editingMember.id, { role: values.role });
      setEditingMember(null);
      updateRoleForm.resetFields();
      message.success('角色已更新');
      await reload();
    } catch (err) {
      message.error(extractErrorMessage(err, '角色更新失败'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleTransfer(values: TransferFormValues) {
    if (!team) return;
    setIsSubmitting(true);
    try {
      await transferOwnership(team.id, { targetUserId: values.targetUserId });
      setIsTransferOpen(false);
      transferForm.resetFields();
      message.success('所有权已转让');
      await reload();
    } catch (err) {
      message.error(extractErrorMessage(err, '转让失败'));
    } finally {
      setIsSubmitting(false);
    }
  }

  const columns: ColumnsType<TeamMemberSummary> = [
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '邮箱', dataIndex: 'email', key: 'email' },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (value: UserRole, record) => (
        <Space>
          <Tag color={record.id === team?.ownerId ? 'gold' : 'blue'}>{roleLabels[value]}</Tag>
          {record.id === team?.ownerId ? <Tag color="purple">Owner</Tag> : null}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => {
        if (!team?.isOwner) return <Typography.Text type="secondary">-</Typography.Text>;
        if (record.id === team.ownerId || record.id === user?.id) return <Typography.Text type="secondary">-</Typography.Text>;
        return (
          <Space>
            <Button size="small" onClick={() => { setEditingMember(record); updateRoleForm.setFieldsValue({ role: record.role }); }}>
              改角色
            </Button>
            <Popconfirm title="确认移除该成员？" okText="确 定" cancelText="取 消" onConfirm={() => void handleRemoveMember(record.id)}>
              <Button size="small" danger>移除</Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  if (isLoading) {
    return (
      <main className="team-page">
        <Spin tip="加载团队信息…" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="team-page">
        <Alert type="error" showIcon message={error} />
        <Button onClick={() => void reload()} className="team-retry">重试</Button>
      </main>
    );
  }

  if (!team) {
    return (
      <main className="team-page">
        <Card>
          <Typography.Title level={2}>团队</Typography.Title>
          <Typography.Paragraph>您尚未加入任何团队，可以创建一个新团队，或使用邀请码加入已有团队。</Typography.Paragraph>
          <Space>
            <Button type="primary" onClick={() => setIsCreateOpen(true)}>创建团队</Button>
            <Button onClick={() => setIsJoinOpen(true)}>使用邀请码加入</Button>
          </Space>
        </Card>

        <Modal
          title="创建团队"
          open={isCreateOpen}
          onCancel={() => setIsCreateOpen(false)}
          onOk={() => createForm.submit()}
          okText="确 认 创 建"
          cancelText="取 消"
          confirmLoading={isSubmitting}
        >
          <Form form={createForm} layout="vertical" requiredMark={false} onFinish={handleCreate}>
            <Form.Item
              label="团队名称"
              name="name"
              rules={[{ required: true, message: '请输入团队名' }, { min: 2, max: 30, message: '长度需在 2~30 个字符' }]}
            >
              <Input placeholder="例如：销冠突击队" />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title="使用邀请码加入团队"
          open={isJoinOpen}
          onCancel={() => setIsJoinOpen(false)}
          onOk={() => joinForm.submit()}
          okText="确 认 加 入"
          cancelText="取 消"
          confirmLoading={isSubmitting}
        >
          <Form form={joinForm} layout="vertical" requiredMark={false} onFinish={handleJoin}>
            <Form.Item
              label="邀请码"
              name="code"
              rules={[{ required: true, message: '请输入邀请码' }, { pattern: /^[A-Za-z2-7]{16}$/, message: '邀请码为 16 位字母数字（不含 0/1/8/9）' }]}
            >
              <Input placeholder="16 位邀请码" maxLength={16} />
            </Form.Item>
          </Form>
        </Modal>
      </main>
    );
  }

  // 有团队态：详情卡 + 成员表 + 角色化操作
  return (
    <main className="team-page">
      <Card>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Space size="middle">
            <Typography.Title level={2} style={{ margin: 0 }}>{team.name}</Typography.Title>
            {team.isOwner ? <Tag color="purple">Owner</Tag> : null}
          </Space>
          <Typography.Text type="secondary">团队 ID：{team.id}</Typography.Text>
          <Space wrap>
            {team.isOwner ? (
              <>
                <Button onClick={() => { renameForm.setFieldsValue({ name: team.name }); setIsRenameOpen(true); }}>改名</Button>
                <Button onClick={() => setIsTransferOpen(true)}>转让所有权</Button>
                <Popconfirm
                  title={'确认解散团队？解散后成员将脱离，话术/文档将变回个人私有'}
                  okText="确认解散"
                  cancelText="取 消"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => void handleDisband()}
                >
                  <Button danger>解散团队</Button>
                </Popconfirm>
              </>
            ) : (
              <Popconfirm title="确认退出团队？" okText="确 定" cancelText="取 消" onConfirm={() => void handleLeave()}>
                <Button danger>退出团队</Button>
              </Popconfirm>
            )}
          </Space>
        </Space>
      </Card>

      <Card title="团队成员" style={{ marginTop: 16 }}>
        <Table<TeamMemberSummary> rowKey="id" columns={columns} dataSource={team.members} pagination={false} />
      </Card>

      <Modal
        title="改团队名"
        open={isRenameOpen}
        onCancel={() => setIsRenameOpen(false)}
        onOk={() => renameForm.submit()}
        okText="保 存"
        cancelText="取 消"
        confirmLoading={isSubmitting}
      >
        <Form form={renameForm} layout="vertical" requiredMark={false} onFinish={handleRename}>
          <Form.Item
            label="新团队名"
            name="name"
            rules={[{ required: true, message: '请输入团队名' }, { min: 2, max: 30, message: '长度需在 2~30 个字符' }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={'调整成员角色：' + (editingMember?.name ?? '')}
        open={!!editingMember}
        onCancel={() => setEditingMember(null)}
        onOk={() => updateRoleForm.submit()}
        okText="保 存"
        cancelText="取 消"
        confirmLoading={isSubmitting}
      >
        <Form form={updateRoleForm} layout="vertical" requiredMark={false} onFinish={handleUpdateRole}>
          <Form.Item label="角色" name="role" rules={[{ required: true, message: '请选择角色' }]}>
            <Select options={editableRoles.map((r) => ({ value: r, label: r }))} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="转让所有权"
        open={isTransferOpen}
        onCancel={() => setIsTransferOpen(false)}
        onOk={() => transferForm.submit()}
        okText="确 认 转 让"
        cancelText="取 消"
        confirmLoading={isSubmitting}
        okButtonProps={{ danger: true }}
      >
        <Alert type="warning" showIcon message="转让后您将不再是团队 owner，但保留 MANAGER 身份。" style={{ marginBottom: 12 }} />
        <Form form={transferForm} layout="vertical" requiredMark={false} onFinish={handleTransfer}>
          <Form.Item label="目标成员" name="targetUserId" rules={[{ required: true, message: '请选择目标成员' }]}>
            <Select
              options={(team.members || []).filter((m) => m.id !== team.ownerId).map((m) => ({ value: m.id, label: m.name + ' (' + m.email + ')' }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </main>
  );
}

/**
 * 从 axios 错误对象里提取后端 message。
 * 解耦 UI 层与 http 错误结构，避免页面到处写 err?.response?.data?.message 链式取值。
 */
function extractErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === 'object' && err !== null) {
    const anyErr = err as { response?: { data?: { message?: string } } };
    if (anyErr.response?.data?.message) return anyErr.response.data.message;
  }
  return fallback;
}
