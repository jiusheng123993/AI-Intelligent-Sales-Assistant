import { describe, expect, it, vi } from 'vitest';
import { http } from './http';
import {
  acceptInvitation,
  createInvitation,
  createTeam,
  disbandTeam,
  findMyTeam,
  leaveTeam,
  listInvitations,
  removeMember,
  renameTeam,
  revokeInvitation,
  transferOwnership,
  updateMemberRole,
} from './teams';

vi.mock('./http', () => ({
  http: {
    delete: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}));

const baseTeam = {
  id: 'team-1',
  name: '智胜小队',
  ownerId: 'user-1',
  createdAt: '2026-05-30T00:00:00.000Z',
  updatedAt: '2026-05-30T00:00:00.000Z',
};

const teamDetail = {
  ...baseTeam,
  isOwner: true,
  members: [
    { id: 'user-1', name: '张三', email: 'a@b.com', role: 'MANAGER' as const },
  ],
};

const invitation = {
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

describe('teams api', () => {
  it('创建团队', async () => {
    vi.mocked(http.post).mockResolvedValueOnce({ data: baseTeam });

    const result = await createTeam({ name: '智胜小队' });

    expect(http.post).toHaveBeenCalledWith('/teams', { name: '智胜小队' });
    expect(result).toEqual(baseTeam);
  });

  it('查询当前用户团队详情', async () => {
    vi.mocked(http.get).mockResolvedValueOnce({ data: teamDetail });

    const result = await findMyTeam();

    expect(http.get).toHaveBeenCalledWith('/teams/me');
    expect(result).toEqual(teamDetail);
  });

  it('查询团队不存在时返回 null', async () => {
    vi.mocked(http.get).mockResolvedValueOnce({ data: null });

    const result = await findMyTeam();

    expect(result).toBeNull();
  });

  it('改团队名', async () => {
    vi.mocked(http.patch).mockResolvedValueOnce({ data: { ...baseTeam, name: '新名字' } });

    const result = await renameTeam('team-1', { name: '新名字' });

    expect(http.patch).toHaveBeenCalledWith('/teams/team-1', { name: '新名字' });
    expect(result.name).toBe('新名字');
  });

  it('解散团队', async () => {
    vi.mocked(http.delete).mockResolvedValueOnce({ data: undefined });

    await disbandTeam('team-1');

    expect(http.delete).toHaveBeenCalledWith('/teams/team-1');
  });

  it('转让所有权', async () => {
    vi.mocked(http.post).mockResolvedValueOnce({ data: undefined });

    await transferOwnership('team-1', { targetUserId: 'user-2' });

    expect(http.post).toHaveBeenCalledWith('/teams/team-1/transfer', { targetUserId: 'user-2' });
  });

  it('退出团队', async () => {
    vi.mocked(http.post).mockResolvedValueOnce({ data: undefined });

    await leaveTeam();

    expect(http.post).toHaveBeenCalledWith('/teams/leave');
  });

  it('移除成员', async () => {
    vi.mocked(http.delete).mockResolvedValueOnce({ data: undefined });

    await removeMember('team-1', 'user-2');

    expect(http.delete).toHaveBeenCalledWith('/teams/team-1/members/user-2');
  });

  it('调整成员角色', async () => {
    vi.mocked(http.patch).mockResolvedValueOnce({ data: undefined });

    await updateMemberRole('team-1', 'user-2', { role: 'TRAINER' });

    expect(http.patch).toHaveBeenCalledWith('/teams/team-1/members/user-2/role', { role: 'TRAINER' });
  });

  it('生成邀请', async () => {
    vi.mocked(http.post).mockResolvedValueOnce({ data: invitation });

    const result = await createInvitation('team-1', { role: 'SALES', expiresInDays: 7 });

    expect(http.post).toHaveBeenCalledWith('/teams/team-1/invitations', { role: 'SALES', expiresInDays: 7 });
    expect(result).toEqual(invitation);
  });

  it('列出邀请', async () => {
    vi.mocked(http.get).mockResolvedValueOnce({ data: [invitation] });

    const result = await listInvitations('team-1');

    expect(http.get).toHaveBeenCalledWith('/teams/team-1/invitations');
    expect(result).toEqual([invitation]);
  });

  it('撤销邀请', async () => {
    vi.mocked(http.delete).mockResolvedValueOnce({ data: undefined });

    await revokeInvitation('team-1', 'inv-1');

    expect(http.delete).toHaveBeenCalledWith('/teams/team-1/invitations/inv-1');
  });

  it('接受邀请', async () => {
    vi.mocked(http.post).mockResolvedValueOnce({ data: undefined });

    await acceptInvitation({ code: 'AAAAAAAAAAAAAAAA' });

    expect(http.post).toHaveBeenCalledWith('/invitations/accept', { code: 'AAAAAAAAAAAAAAAA' });
  });
});

