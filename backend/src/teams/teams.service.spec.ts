import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { TeamsService } from './teams.service';

const now = new Date('2026-05-30T00:00:00.000Z');

const baseSales = {
  id: 'user-sales',
  email: 'sales@example.com',
  name: '销售小张',
  role: UserRole.SALES,
  teamId: null as string | null,
  createdAt: now,
  updatedAt: now,
};

const baseManager = { ...baseSales, id: 'user-mgr', role: UserRole.MANAGER, teamId: 'team-1' };
const baseTrainer = { ...baseSales, id: 'user-trn', role: UserRole.TRAINER, teamId: 'team-1' };
const baseAdmin = { ...baseSales, id: 'user-admin', role: UserRole.ADMIN, teamId: null };

const createPrismaMock = () => {
  const tx = {
    user: { update: jest.fn(), updateMany: jest.fn(), findUnique: jest.fn(), count: jest.fn() },
    team: {
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
    },
    teamInvitation: { updateMany: jest.fn() },
    script: { updateMany: jest.fn() },
    scenario: { updateMany: jest.fn() },
    knowledgeDocument: { updateMany: jest.fn() },
  };
  return {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    team: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    teamInvitation: {
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(async (cb: any) => cb(tx)),
    _tx: tx,
  };
};

describe('TeamsService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: TeamsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new TeamsService(prisma as any);
  });

  describe('createTeam', () => {
    it('SALES 创建团队后，自动晋升为 MANAGER 并绑定 teamId', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...baseSales, ownedTeam: null });
      prisma._tx.team.create.mockResolvedValue({
        id: 'team-new',
        name: '智胜小队',
        ownerId: baseSales.id,
      });
      prisma._tx.user.updateMany.mockResolvedValue({ count: 1 });

      const team = await service.createTeam(baseSales, { name: ' 智胜小队 ' });

      expect(team.id).toBe('team-new');
      expect(prisma._tx.team.create).toHaveBeenCalledWith({
        data: { name: '智胜小队', ownerId: baseSales.id },
      });
      expect(prisma._tx.user.updateMany).toHaveBeenCalledWith({
        where: { id: baseSales.id, teamId: null },
        data: { teamId: 'team-new', role: UserRole.MANAGER },
      });
    });

    it('已属团队的用户禁止再次创建', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...baseManager, ownedTeam: null });

      await expect(service.createTeam(baseManager, { name: '另一个团队' })).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('已经拥有团队的 owner 禁止再建', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...baseManager,
        teamId: null,
        ownedTeam: { id: 'team-x' },
      });

      await expect(
        service.createTeam({ ...baseManager, teamId: null }, { name: '再建一个' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('团队名为空或仅空白时拒绝', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...baseSales, ownedTeam: null });
      await expect(service.createTeam(baseSales, { name: '   ' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('创建团队时角色为 TRAINER 不被强行降级为 MANAGER', async () => {
      const trainer = { ...baseSales, role: UserRole.TRAINER };
      prisma.user.findUnique.mockResolvedValue({ ...trainer, ownedTeam: null });
      prisma._tx.team.create.mockResolvedValue({ id: 't', name: 'n', ownerId: trainer.id });
      prisma._tx.user.updateMany.mockResolvedValue({ count: 1 });

      await service.createTeam(trainer, { name: 'n' });

      expect(prisma._tx.user.updateMany).toHaveBeenCalledWith({
        where: { id: trainer.id, teamId: null },
        data: { teamId: 't', role: UserRole.MANAGER },
      });
    });
  });

  describe('findMyTeam', () => {
    it('返回当前用户团队详情，含成员清单与 owner 标记', async () => {
      prisma.team.findUnique.mockResolvedValue({
        id: 'team-1',
        name: '王牌小队',
        ownerId: baseManager.id,
        createdAt: now,
        updatedAt: now,
        members: [
          {
            id: baseManager.id,
            name: baseManager.name,
            email: baseManager.email,
            role: UserRole.MANAGER,
          },
          {
            id: baseTrainer.id,
            name: baseTrainer.name,
            email: baseTrainer.email,
            role: UserRole.TRAINER,
          },
        ],
      });

      const detail = await service.findMyTeam(baseManager);

      expect(detail).not.toBeNull();
      expect(detail!.id).toBe('team-1');
      expect(detail!.members).toHaveLength(2);
      expect(detail!.isOwner).toBe(true);
    });

    it('未归属任何团队的用户返回 null', async () => {
      const detail = await service.findMyTeam(baseSales);
      expect(detail).toBeNull();
      expect(prisma.team.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('renameTeam', () => {
    it('owner 可以改名', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: 'team-1', ownerId: baseManager.id });
      prisma.team.update.mockResolvedValue({ id: 'team-1', name: '新名字' });

      await service.renameTeam(baseManager, 'team-1', { name: '新名字' });

      expect(prisma.team.update).toHaveBeenCalledWith({
        where: { id: 'team-1' },
        data: { name: '新名字' },
      });
    });

    it('非 owner 且非 ADMIN 改名时拒绝', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: 'team-1', ownerId: 'other' });
      await expect(service.renameTeam(baseTrainer, 'team-1', { name: '新名字' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('团队不存在时抛 NotFound', async () => {
      prisma.team.findUnique.mockResolvedValue(null);
      await expect(service.renameTeam(baseAdmin, 'no', { name: 'n' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('transferOwnership', () => {
    it('owner 成功将所有权转给同团队成员', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: 'team-1', ownerId: baseManager.id });
      prisma.user.findUnique.mockResolvedValue({ ...baseTrainer, teamId: 'team-1' });
      prisma._tx.team.updateMany.mockResolvedValue({ count: 1 });
      prisma._tx.user.updateMany.mockResolvedValue({ count: 1 });

      await service.transferOwnership(baseManager, 'team-1', { targetUserId: baseTrainer.id });

      expect(prisma._tx.team.updateMany).toHaveBeenCalledWith({
        where: { id: 'team-1', ownerId: baseManager.id },
        data: { ownerId: baseTrainer.id },
      });
      expect(prisma._tx.user.updateMany).toHaveBeenCalledWith({
        where: { id: baseTrainer.id, teamId: 'team-1' },
        data: { role: UserRole.MANAGER },
      });
    });

    it('目标成员在事务中离队时拒绝转让所有权', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: 'team-1', ownerId: baseManager.id });
      prisma.user.findUnique.mockResolvedValue({ ...baseTrainer, teamId: 'team-1' });
      prisma._tx.team.updateMany.mockResolvedValue({ count: 1 });
      prisma._tx.user.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.transferOwnership(baseManager, 'team-1', { targetUserId: baseTrainer.id }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma._tx.user.updateMany).toHaveBeenCalledWith({
        where: { id: baseTrainer.id, teamId: 'team-1' },
        data: { role: UserRole.MANAGER },
      });
    });

    it('非 owner 转让被拒绝', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: 'team-1', ownerId: 'someone-else' });
      await expect(
        service.transferOwnership(baseTrainer, 'team-1', { targetUserId: baseManager.id }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('转给自己被拒绝', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: 'team-1', ownerId: baseManager.id });
      await expect(
        service.transferOwnership(baseManager, 'team-1', { targetUserId: baseManager.id }),
      ).rejects.toThrow(BadRequestException);
    });

    it('目标不是同团队成员时拒绝', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: 'team-1', ownerId: baseManager.id });
      prisma.user.findUnique.mockResolvedValue({ ...baseTrainer, teamId: 'team-other' });
      await expect(
        service.transferOwnership(baseManager, 'team-1', { targetUserId: baseTrainer.id }),
      ).rejects.toThrow(BadRequestException);
    });

    it('目标用户不存在时抛 NotFound', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: 'team-1', ownerId: baseManager.id });
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.transferOwnership(baseManager, 'team-1', { targetUserId: 'ghost' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('leaveTeam', () => {
    it('普通成员可以退出团队，teamId 置 null 且 role 降为 SALES', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...baseTrainer, ownedTeam: null });
      prisma.team.findUnique.mockResolvedValue({ id: 'team-1', ownerId: baseManager.id });
      prisma.user.update.mockResolvedValue({ ...baseTrainer, teamId: null, role: UserRole.SALES });

      await service.leaveTeam(baseTrainer);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: baseTrainer.id },
        data: { teamId: null, role: UserRole.SALES },
      });
    });

    it('owner 不能直接退出，必须先转让或解散', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...baseManager, ownedTeam: { id: 'team-1' } });
      prisma.team.findUnique.mockResolvedValue({ id: 'team-1', ownerId: baseManager.id });
      await expect(service.leaveTeam(baseManager)).rejects.toThrow(BadRequestException);
    });

    it('未归属团队的用户调用时拒绝', async () => {
      await expect(service.leaveTeam(baseSales)).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeMember', () => {
    it('MANAGER 可移除本团队普通成员', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: 'team-1', ownerId: baseManager.id });
      prisma.user.findUnique.mockResolvedValue({ ...baseTrainer, teamId: 'team-1' });
      prisma.user.update.mockResolvedValue({ ...baseTrainer, teamId: null, role: UserRole.SALES });

      await service.removeMember(baseManager, 'team-1', baseTrainer.id);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: baseTrainer.id },
        data: { teamId: null, role: UserRole.SALES },
      });
    });

    it('禁止移除自己', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: 'team-1', ownerId: baseManager.id });
      await expect(service.removeMember(baseManager, 'team-1', baseManager.id)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('禁止移除 owner', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: 'team-1', ownerId: baseManager.id });
      prisma.user.findUnique.mockResolvedValue({ ...baseManager, teamId: 'team-1' });
      await expect(service.removeMember(baseAdmin, 'team-1', baseManager.id)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('SALES / TRAINER 无权移除其他人', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: 'team-1', ownerId: baseManager.id });
      await expect(service.removeMember(baseTrainer, 'team-1', 'someone')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('目标不属于该团队时拒绝', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: 'team-1', ownerId: baseManager.id });
      prisma.user.findUnique.mockResolvedValue({ ...baseTrainer, teamId: 'team-other' });
      await expect(service.removeMember(baseManager, 'team-1', baseTrainer.id)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateMemberRole', () => {
    it('MANAGER 可将本团队成员角色从 SALES 调为 TRAINER', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: 'team-1', ownerId: baseManager.id });
      prisma.user.findUnique.mockResolvedValue({
        ...baseSales,
        teamId: 'team-1',
        role: UserRole.SALES,
      });
      prisma.user.update.mockResolvedValue({ ...baseSales, role: UserRole.TRAINER });

      await service.updateMemberRole(baseManager, 'team-1', baseSales.id, {
        role: UserRole.TRAINER,
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: baseSales.id },
        data: { role: UserRole.TRAINER },
      });
    });

    it('禁止将角色改为 ADMIN', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: 'team-1', ownerId: baseManager.id });
      await expect(
        service.updateMemberRole(baseManager, 'team-1', baseSales.id, { role: UserRole.ADMIN }),
      ).rejects.toThrow(BadRequestException);
    });

    it('禁止修改 owner 的角色', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: 'team-1', ownerId: baseManager.id });
      await expect(
        service.updateMemberRole(baseAdmin, 'team-1', baseManager.id, { role: UserRole.SALES }),
      ).rejects.toThrow(BadRequestException);
    });

    it('禁止修改自己的角色', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: 'team-1', ownerId: baseManager.id });
      await expect(
        service.updateMemberRole(baseManager, 'team-1', baseManager.id, { role: UserRole.SALES }),
      ).rejects.toThrow(BadRequestException);
    });

    it('SALES / TRAINER 无权调整他人角色', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: 'team-1', ownerId: baseManager.id });
      await expect(
        service.updateMemberRole(baseTrainer, 'team-1', 'someone', { role: UserRole.SALES }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('disbandTeam', () => {
    it('owner 解散团队：成员脱离 + 关联资源 teamId 置 null + 撤销未用邀请 + 删除团队', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: 'team-1', ownerId: baseManager.id });

      await service.disbandTeam(baseManager, 'team-1');

      expect(prisma._tx.user.updateMany).toHaveBeenCalledWith({
        where: { teamId: 'team-1' },
        data: { teamId: null, role: UserRole.SALES },
      });
      expect(prisma._tx.script.updateMany).toHaveBeenCalledWith({
        where: { teamId: 'team-1' },
        data: { teamId: null, isShared: false },
      });
      expect(prisma._tx.scenario.updateMany).toHaveBeenCalledWith({
        where: { teamId: 'team-1' },
        data: { teamId: null },
      });
      expect(prisma._tx.knowledgeDocument.updateMany).toHaveBeenCalledWith({
        where: { teamId: 'team-1' },
        data: { teamId: null, isShared: false },
      });
      expect(prisma._tx.teamInvitation.updateMany).toHaveBeenCalledWith({
        where: { teamId: 'team-1', usedAt: null, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(prisma._tx.team.delete).toHaveBeenCalledWith({ where: { id: 'team-1' } });
    });

    it('非 owner 且非 ADMIN 解散被拒绝', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: 'team-1', ownerId: 'someone-else' });
      await expect(service.disbandTeam(baseTrainer, 'team-1')).rejects.toThrow(ForbiddenException);
    });

    it('ADMIN 可解散任意团队', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: 'team-1', ownerId: 'someone-else' });
      await service.disbandTeam(baseAdmin, 'team-1');
      expect(prisma._tx.team.delete).toHaveBeenCalled();
    });

    it('团队不存在时抛 NotFound', async () => {
      prisma.team.findUnique.mockResolvedValue(null);
      await expect(service.disbandTeam(baseAdmin, 'nope')).rejects.toThrow(NotFoundException);
    });
  });
});
