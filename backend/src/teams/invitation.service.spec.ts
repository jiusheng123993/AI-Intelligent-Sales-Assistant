import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { InvitationService } from './invitation.service';

const now = new Date('2026-05-30T00:00:00.000Z');
const baseSales = {
  id: 'u-sales',
  email: 's@e.com',
  name: 'S',
  role: UserRole.SALES,
  teamId: null,
  createdAt: now,
  updatedAt: now,
};
const baseManager = { ...baseSales, id: 'u-mgr', role: UserRole.MANAGER, teamId: 'team-1' };
const baseTrainer = { ...baseSales, id: 'u-trn', role: UserRole.TRAINER, teamId: 'team-1' };
const baseAdmin = { ...baseSales, id: 'u-admin', role: UserRole.ADMIN, teamId: null };

const createPrismaMock = () => {
  const tx = {
    user: { update: jest.fn(), updateMany: jest.fn(), findUnique: jest.fn() },
    teamInvitation: {
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };
  return {
    user: { findUnique: jest.fn() },
    team: { findUnique: jest.fn() },
    teamInvitation: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(async (cb: any) => cb(tx)),
    _tx: tx,
  };
};

describe('InvitationService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: InvitationService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new InvitationService(prisma as any);
    jest.useFakeTimers().setSystemTime(now);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('createInvitation', () => {
    it('owner 创建邀请：生成 16 位 base32 邀请码，默认 7 天过期，默认 SALES 角色', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: 'team-1', ownerId: baseManager.id });
      prisma.teamInvitation.create.mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'inv-1',
          ...data,
          usedAt: null,
          usedById: null,
          revokedAt: null,
          createdAt: now,
        }),
      );

      const inv = await service.createInvitation(baseManager, 'team-1', {});

      expect(inv.code).toMatch(/^[A-Z2-7]{16}$/);
      expect(inv.role).toBe(UserRole.SALES);
      const expectedExpires = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
      expect(inv.expiresAt.getTime()).toBe(expectedExpires.getTime());
    });

    it('指定 expiresInDays 与 role 时按入参创建', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: 'team-1', ownerId: baseManager.id });
      prisma.teamInvitation.create.mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'inv-2',
          ...data,
          usedAt: null,
          usedById: null,
          revokedAt: null,
          createdAt: now,
        }),
      );

      const inv = await service.createInvitation(baseManager, 'team-1', {
        role: UserRole.TRAINER,
        expiresInDays: 14,
      });

      expect(inv.role).toBe(UserRole.TRAINER);
      expect(inv.expiresAt.getTime()).toBe(now.getTime() + 14 * 24 * 3600 * 1000);
    });

    it('禁止生成角色为 ADMIN 的邀请', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: 'team-1', ownerId: baseManager.id });
      await expect(
        service.createInvitation(baseManager, 'team-1', { role: UserRole.ADMIN }),
      ).rejects.toThrow(BadRequestException);
    });

    it('SALES 无权创建邀请', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: 'team-1', ownerId: 'someone' });
      const salesInTeam = { ...baseSales, teamId: 'team-1' };
      await expect(service.createInvitation(salesInTeam, 'team-1', {})).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('团队不存在抛 NotFound', async () => {
      prisma.team.findUnique.mockResolvedValue(null);
      await expect(service.createInvitation(baseAdmin, 'nope', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listInvitations', () => {
    it('owner 可列出本团队所有邀请，按 createdAt desc 排序，并附带派生 status', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: 'team-1', ownerId: baseManager.id });
      const pending = {
        id: 'i1',
        code: 'AAAAAAAAAAAAAAAA',
        teamId: 'team-1',
        role: UserRole.SALES,
        invitedBy: baseManager.id,
        expiresAt: new Date(now.getTime() + 3600_000),
        usedAt: null,
        usedById: null,
        revokedAt: null,
        createdAt: now,
      };
      const expired = {
        ...pending,
        id: 'i2',
        code: 'BBBBBBBBBBBBBBBB',
        expiresAt: new Date(now.getTime() - 1),
      };
      const used = {
        ...pending,
        id: 'i3',
        code: 'CCCCCCCCCCCCCCCC',
        usedAt: now,
        usedById: 'someone',
      };
      const revoked = { ...pending, id: 'i4', code: 'DDDDDDDDDDDDDDDD', revokedAt: now };
      prisma.teamInvitation.findMany.mockResolvedValue([pending, expired, used, revoked]);

      const list = await service.listInvitations(baseManager, 'team-1');

      expect(list.map((i) => i.status)).toEqual(['PENDING', 'EXPIRED', 'USED', 'REVOKED']);
    });

    it('SALES 无权列出邀请', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: 'team-1', ownerId: 'other' });
      const salesInTeam = { ...baseSales, teamId: 'team-1' };
      await expect(service.listInvitations(salesInTeam, 'team-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('revokeInvitation', () => {
    it('owner 撤销未用邀请：写入 revokedAt', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: 'team-1', ownerId: baseManager.id });
      prisma.teamInvitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        teamId: 'team-1',
        usedAt: null,
        revokedAt: null,
      });

      await service.revokeInvitation(baseManager, 'team-1', 'inv-1');

      expect(prisma.teamInvitation.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('已使用邀请不可撤销', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: 'team-1', ownerId: baseManager.id });
      prisma.teamInvitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        teamId: 'team-1',
        usedAt: now,
        revokedAt: null,
      });
      await expect(service.revokeInvitation(baseManager, 'team-1', 'inv-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('已撤销邀请重复撤销被拒', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: 'team-1', ownerId: baseManager.id });
      prisma.teamInvitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        teamId: 'team-1',
        usedAt: null,
        revokedAt: now,
      });
      await expect(service.revokeInvitation(baseManager, 'team-1', 'inv-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('邀请属于其他团队时拒绝', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: 'team-1', ownerId: baseManager.id });
      prisma.teamInvitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        teamId: 'team-other',
        usedAt: null,
        revokedAt: null,
      });
      await expect(service.revokeInvitation(baseManager, 'team-1', 'inv-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('acceptInvitation', () => {
    const code = 'EEEEEEEEEEEEEEEE';

    it('未归属团队的用户凭有效邀请码加入，更新 teamId 与 role，并标记邀请已用', async () => {
      prisma.teamInvitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        code,
        teamId: 'team-1',
        role: UserRole.TRAINER,
        invitedBy: baseManager.id,
        expiresAt: new Date(now.getTime() + 3600_000),
        usedAt: null,
        revokedAt: null,
        createdAt: now,
      });
      prisma.user.findUnique.mockResolvedValue({ ...baseSales, ownedTeam: null });
      prisma._tx.user.updateMany.mockResolvedValue({ count: 1 });
      prisma._tx.teamInvitation.updateMany.mockResolvedValue({ count: 1 });

      await service.acceptInvitation(baseSales, { code });

      expect(prisma._tx.user.updateMany).toHaveBeenCalledWith({
        where: { id: baseSales.id, teamId: null },
        data: { teamId: 'team-1', role: UserRole.TRAINER },
      });
      expect(prisma._tx.teamInvitation.updateMany).toHaveBeenCalledWith({
        where: { id: 'inv-1', usedAt: null, revokedAt: null, expiresAt: { gt: now } },
        data: { usedAt: expect.any(Date), usedById: baseSales.id },
      });
    });

    it('rejects concurrent reuse of the same invitation', async () => {
      prisma.teamInvitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        code,
        teamId: 'team-1',
        role: UserRole.SALES,
        expiresAt: new Date(now.getTime() + 3600_000),
        usedAt: null,
        revokedAt: null,
      });
      prisma.user.findUnique.mockResolvedValue({ ...baseSales, ownedTeam: null });
      prisma._tx.user.updateMany.mockResolvedValue({ count: 1 });
      prisma._tx.teamInvitation.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.acceptInvitation(baseSales, { code })).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma._tx.teamInvitation.updateMany).toHaveBeenCalledWith({
        where: { id: 'inv-1', usedAt: null, revokedAt: null, expiresAt: { gt: now } },
        data: { usedAt: expect.any(Date), usedById: baseSales.id },
      });
    });

    it('已属团队的用户拒绝接受', async () => {
      prisma.teamInvitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        code,
        teamId: 'team-1',
        role: UserRole.SALES,
        expiresAt: new Date(now.getTime() + 3600_000),
        usedAt: null,
        revokedAt: null,
      });
      prisma.user.findUnique.mockResolvedValue({ ...baseTrainer, ownedTeam: null });
      await expect(service.acceptInvitation(baseTrainer, { code })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('已是 owner 的用户拒绝接受', async () => {
      prisma.teamInvitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        code,
        teamId: 'team-2',
        role: UserRole.SALES,
        expiresAt: new Date(now.getTime() + 3600_000),
        usedAt: null,
        revokedAt: null,
      });
      prisma.user.findUnique.mockResolvedValue({ ...baseSales, ownedTeam: { id: 'team-mine' } });
      await expect(service.acceptInvitation(baseSales, { code })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('邀请不存在抛 NotFound', async () => {
      prisma.teamInvitation.findUnique.mockResolvedValue(null);
      await expect(service.acceptInvitation(baseSales, { code })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('邀请已过期被拒', async () => {
      prisma.teamInvitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        code,
        teamId: 'team-1',
        role: UserRole.SALES,
        expiresAt: new Date(now.getTime() - 1),
        usedAt: null,
        revokedAt: null,
      });
      prisma.user.findUnique.mockResolvedValue({ ...baseSales, ownedTeam: null });
      await expect(service.acceptInvitation(baseSales, { code })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('邀请已使用被拒', async () => {
      prisma.teamInvitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        code,
        teamId: 'team-1',
        role: UserRole.SALES,
        expiresAt: new Date(now.getTime() + 3600_000),
        usedAt: now,
        revokedAt: null,
      });
      prisma.user.findUnique.mockResolvedValue({ ...baseSales, ownedTeam: null });
      await expect(service.acceptInvitation(baseSales, { code })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('邀请已撤销被拒', async () => {
      prisma.teamInvitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        code,
        teamId: 'team-1',
        role: UserRole.SALES,
        expiresAt: new Date(now.getTime() + 3600_000),
        usedAt: null,
        revokedAt: now,
      });
      prisma.user.findUnique.mockResolvedValue({ ...baseSales, ownedTeam: null });
      await expect(service.acceptInvitation(baseSales, { code })).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
