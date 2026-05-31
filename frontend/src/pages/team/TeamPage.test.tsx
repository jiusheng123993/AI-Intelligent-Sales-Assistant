import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TeamPage } from './TeamPage';

vi.mock('@/api/teams', () => ({
  createTeam: vi.fn(),
  findMyTeam: vi.fn(),
  renameTeam: vi.fn(),
  disbandTeam: vi.fn(),
  transferOwnership: vi.fn(),
  leaveTeam: vi.fn(),
  removeMember: vi.fn(),
  updateMemberRole: vi.fn(),
  acceptInvitation: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// 隔离子组件，避免子组件自身的副作用污染本页用例
vi.mock('./InvitationsPanel', () => ({
  InvitationsPanel: () => null,
}));

import { acceptInvitation, createTeam, findMyTeam, removeMember } from '@/api/teams';
import { useAuth } from '@/contexts/AuthContext';

const ownerUser = { id: 'user-1', name: '张三', email: 'a@b.com', role: 'MANAGER' as const };
const memberUser = { id: 'user-2', name: '李四', email: 'b@b.com', role: 'TRAINER' as const };
const guestUser = { id: 'user-3', name: '王五', email: 'c@b.com', role: 'SALES' as const };

const teamDetail = {
  id: 'team-1',
  name: '智胜小队',
  ownerId: 'user-1',
  createdAt: '2026-05-30T00:00:00.000Z',
  updatedAt: '2026-05-30T00:00:00.000Z',
  isOwner: true,
  members: [ownerUser, memberUser],
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(useAuth).mockReturnValue({
    user: ownerUser,
    isAuthenticated: true,
    isInitializing: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  });
});

describe('TeamPage', () => {
  it('未归属团队时展示创建/加入引导', async () => {
    vi.mocked(findMyTeam).mockResolvedValue(null);
    vi.mocked(useAuth).mockReturnValue({
      user: guestUser,
      isAuthenticated: true,
      isInitializing: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    render(<TeamPage />);

    expect(await screen.findByRole('button', { name: '创建团队' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '使用邀请码加入' })).toBeInTheDocument();
  });

  it('owner 看到团队详情与成员列表，含「转让/解散」按钮', async () => {
    vi.mocked(findMyTeam).mockResolvedValue(teamDetail);

    render(<TeamPage />);

    expect(await screen.findByText('智胜小队')).toBeInTheDocument();
    expect(screen.getByText('张三')).toBeInTheDocument();
    expect(screen.getByText('李四')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '转让所有权' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '解散团队' })).toBeInTheDocument();
  });

  it('非 owner 看到「退出团队」而非「解散/转让」', async () => {
    vi.mocked(findMyTeam).mockResolvedValue({ ...teamDetail, isOwner: false });
    vi.mocked(useAuth).mockReturnValue({
      user: memberUser,
      isAuthenticated: true,
      isInitializing: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    render(<TeamPage />);

    expect(await screen.findByText('智胜小队')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '退出团队' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '解散团队' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '转让所有权' })).not.toBeInTheDocument();
  });

  it('点击创建团队并提交，调用 createTeam 后刷新', async () => {
    vi.mocked(findMyTeam).mockResolvedValueOnce(null).mockResolvedValueOnce(teamDetail);
    vi.mocked(createTeam).mockResolvedValue({ id: 'team-1', name: '智胜小队', ownerId: 'user-1', createdAt: '', updatedAt: '' });

    render(<TeamPage />);

    fireEvent.click(await screen.findByRole('button', { name: '创建团队' }));
    fireEvent.change(screen.getByLabelText('团队名称'), { target: { value: '智胜小队' } });
    fireEvent.click(screen.getByRole('button', { name: /确\s*认\s*创\s*建/ }));

    await waitFor(() => expect(createTeam).toHaveBeenCalledWith({ name: '智胜小队' }));
    await waitFor(() => expect(findMyTeam).toHaveBeenCalledTimes(2));
  });

  it('点击使用邀请码加入并提交，调用 acceptInvitation', async () => {
    vi.mocked(findMyTeam).mockResolvedValueOnce(null).mockResolvedValueOnce(teamDetail);
    vi.mocked(acceptInvitation).mockResolvedValue(undefined);

    render(<TeamPage />);

    fireEvent.click(await screen.findByRole('button', { name: '使用邀请码加入' }));
    fireEvent.change(screen.getByLabelText('邀请码'), { target: { value: 'ABCDEFGHIJKLMNOP' } });
    fireEvent.click(screen.getByRole('button', { name: /确\s*认\s*加\s*入/ }));

    await waitFor(() => expect(acceptInvitation).toHaveBeenCalledWith({ code: 'ABCDEFGHIJKLMNOP' }));
  });

  it('加载失败时展示错误提示', async () => {
    vi.mocked(findMyTeam).mockRejectedValue(new Error('boom'));

    render(<TeamPage />);

    expect(await screen.findByText(/团队信息加载失败/)).toBeInTheDocument();
  });

  it('owner 移除成员后刷新列表', async () => {
    vi.mocked(findMyTeam)
      .mockResolvedValueOnce(teamDetail)
      .mockResolvedValueOnce({ ...teamDetail, members: [ownerUser] });
    vi.mocked(removeMember).mockResolvedValue(undefined);

    render(<TeamPage />);

    expect(await screen.findByText('李四')).toBeInTheDocument();
    // antd Button 会在「两字按钮」中间自动插入空格，改用模糊匹配
    const removeBtn = screen.getAllByText(/移\s*除/).map((el) => el.closest('button')).find(Boolean);
    if (!removeBtn) throw new Error('找不到移除按钮');
    fireEvent.click(removeBtn);
    const confirmBtn = await screen.findByRole('button', { name: '确 定' });
    fireEvent.click(confirmBtn);

    await waitFor(() => expect(removeMember).toHaveBeenCalledWith('team-1', 'user-2'));
  });

  it('owner 点击改角色弹出 Modal', async () => {
    vi.mocked(findMyTeam).mockResolvedValue(teamDetail);

    render(<TeamPage />);

    expect(await screen.findByText('李四')).toBeInTheDocument();
    const changeRoleBtn = screen.getAllByText(/改\s*角\s*色/).map((el) => el.closest('button')).find(Boolean);
    if (!changeRoleBtn) throw new Error('找不到改角色按钮');
    fireEvent.click(changeRoleBtn);

    expect(await screen.findByText(/调整成员角色：李四/)).toBeInTheDocument();
  });
});

