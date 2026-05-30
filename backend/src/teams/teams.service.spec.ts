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
    team: { create: jest.fn(), update: jest.fn(), delete: jest.fn(), findUnique: jest.fn() },
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
      prisma._tx.team.create.mockResolvedValue({ id: 'team-new', name: '智胜小队', ownerId: baseSales.id });
      prisma._tx.user.update.mockResolvedValue({ ...baseSales, teamId: 'team-new', role: UserRole.MANAGER });

      const team = await service.createTeam(baseSales, { name: ' 智胜小队 ' });

      expect(team.id).toBe('team-new');
      expect(prisma._tx.team.create).toHaveBeenCalledWith({
        data: { name: '智胜小队', ownerId: baseSales.id },
      });
      expect(prisma._tx.user.update).toHaveBeenCalledWith({
        where: { id: baseSales.id },
        data: { teamId: 'team-new', role: UserRole.MANAGER },
      });
    });

    it('已属团队的用户禁止再次创建', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...baseManager, ownedTeam: null });

      await expect(service.createTeam(baseManager, { name: '另一个团队' })).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('已经拥有团队的 owner 禁止再建', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...baseManager, teamId: null, ownedTeam: { id: 'team-x' } });

      await expect(service.createTeam({ ...baseManager, teamId: null }, { name: '再建一个' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('团队名为空或仅空白时拒绝', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...baseSales, ownedTeam: null });
      await expect(service.createTeam(baseSales, { name: '   ' })).rejects.toThrow(BadRequestException);
    });

    it('创建团队时角色为 TRAINER 不被强行降级为 MANAGER', async () => {
      const trainer = { ...baseSales, role: UserRole.TRAINER };
      prisma.user.findUnique.mockResolvedValue({ ...trainer, ownedTeam: null });
      prisma._tx.team.create.mockResolvedValue({ id: 't', name: 'n', ownerId: trainer.id });

      await service.createTeam(trainer, { name: 'n' });

      expect(prisma._tx.user.update).toHaveBeenCalledWith({
        where: { id: trainer.id },
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
          { id: baseManager.id, name: baseManager.name, email: baseManager.email, role: UserRole.MANAGER },
          { id: baseTrainer.id, name: baseTrainer.name, email: baseTrainer.email, role: UserRole.TRAINER },
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
      await expect(service.renameTeam(baseTrainer, 'team-1', { name: '新名字' })).rejects.toThrow(ForbiddenException);
    });

    it('团队不存在时抛 NotFound', async () => {
      prisma.team.findUnique.mockResolvedValue(null);
      await expect(service.renameTeam(baseAdmin, 'no', { name: 'n' })).rejects.toThrow(NotFoundException);
    });
  });
});

