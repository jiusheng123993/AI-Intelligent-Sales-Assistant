import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InvitationsPanel } from './InvitationsPanel';

vi.mock('@/api/teams', () => ({
  createInvitation: vi.fn(),
  listInvitations: vi.fn(),
  revokeInvitation: vi.fn(),
}));

import { createInvitation, listInvitations, revokeInvitation } from '@/api/teams';

const invitationPending = {
  id: 'inv-1',
  code: 'AAAAAAAAAAAAAAAA',
  teamId: 'team-1',
  role: 'SALES' as const,
  invitedBy: 'user-1',
  expiresAt: '2026-06-06T00:00:00.000Z',
  usedAt: null,
  usedById: null,
  revokedAt: null,
  createdAt: '2026-05-30T00:00:00.000Z',
  status: 'PENDING' as const,
};

const invitationUsed = { ...invitationPending, id: 'inv-2', code: 'BBBBBBBBBBBBBBBB', status: 'USED' as const, usedAt: '2026-05-30T01:00:00.000Z', usedById: 'user-x' };

beforeEach(() => {
  vi.resetAllMocks();
});

describe('InvitationsPanel', () => {
  it('canManage=false 时不渲染任何内容', () => {
    const { container } = render(<InvitationsPanel teamId="team-1" canManage={false} />);

    expect(container).toBeEmptyDOMElement();
    expect(listInvitations).not.toHaveBeenCalled();
  });

  it('canManage=true 时加载并展示邀请列表', async () => {
    vi.mocked(listInvitations).mockResolvedValue([invitationPending, invitationUsed]);

    render(<InvitationsPanel teamId="team-1" canManage />);

    expect(await screen.findByText('AAAAAAAAAAAAAAAA')).toBeInTheDocument();
    expect(screen.getByText('BBBBBBBBBBBBBBBB')).toBeInTheDocument();
    expect(screen.getByText('待 使 用')).toBeInTheDocument();
    expect(screen.getByText('已 使 用')).toBeInTheDocument();
  });

  it('点击「生成邀请」并提交，调用 createInvitation 后刷新', async () => {
    vi.mocked(listInvitations)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([invitationPending]);
    vi.mocked(createInvitation).mockResolvedValue(invitationPending);

    render(<InvitationsPanel teamId="team-1" canManage />);

    await waitFor(() => expect(listInvitations).toHaveBeenCalledTimes(1));
    const createBtn = screen.getAllByText(/生\s*成\s*邀\s*请/).map((el) => el.closest('button')).find(Boolean);
    if (!createBtn) throw new Error('找不到生成邀请按钮');
    fireEvent.click(createBtn);

    // Modal 中直接提交（使用默认 SALES + 默认 7 天）
    const submitBtn = (await screen.findAllByText(/确\s*认\s*生\s*成/)).map((el) => el.closest('button')).find(Boolean);
    if (!submitBtn) throw new Error('找不到确认生成按钮');
    fireEvent.click(submitBtn);

    await waitFor(() => expect(createInvitation).toHaveBeenCalledWith('team-1', { role: 'SALES', expiresInDays: 7 }));
    await waitFor(() => expect(listInvitations).toHaveBeenCalledTimes(2));
  });

  it('PENDING 邀请显示「撤销」按钮，USED/EXPIRED/REVOKED 不显示', async () => {
    vi.mocked(listInvitations).mockResolvedValue([invitationPending, invitationUsed]);

    render(<InvitationsPanel teamId="team-1" canManage />);

    expect(await screen.findByText('AAAAAAAAAAAAAAAA')).toBeInTheDocument();
    const revokeBtns = screen.getAllByText(/撤\s*销/).map((el) => el.closest('button')).filter(Boolean);
    // 只有 PENDING 那一行有撤销按钮
    expect(revokeBtns).toHaveLength(1);
  });

  it('点击撤销并确认，调用 revokeInvitation 后刷新', async () => {
    vi.mocked(listInvitations)
      .mockResolvedValueOnce([invitationPending])
      .mockResolvedValueOnce([{ ...invitationPending, status: 'REVOKED', revokedAt: '2026-05-30T02:00:00.000Z' }]);
    vi.mocked(revokeInvitation).mockResolvedValue(undefined);

    render(<InvitationsPanel teamId="team-1" canManage />);

    expect(await screen.findByText('AAAAAAAAAAAAAAAA')).toBeInTheDocument();
    const revokeBtn = screen.getAllByText(/撤\s*销/).map((el) => el.closest('button')).find(Boolean);
    if (!revokeBtn) throw new Error('找不到撤销按钮');
    fireEvent.click(revokeBtn);
    const confirmBtn = await screen.findByRole('button', { name: '确 定' });
    fireEvent.click(confirmBtn);

    await waitFor(() => expect(revokeInvitation).toHaveBeenCalledWith('team-1', 'inv-1'));
  });

  it('加载失败展示错误提示', async () => {
    vi.mocked(listInvitations).mockRejectedValue(new Error('boom'));

    render(<InvitationsPanel teamId="team-1" canManage />);

    expect(await screen.findByText(/邀请列表加载失败/)).toBeInTheDocument();
  });
});

