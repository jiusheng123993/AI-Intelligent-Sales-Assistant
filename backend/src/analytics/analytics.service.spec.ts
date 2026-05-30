import { BadRequestException } from '@nestjs/common';
import { ScriptCategory, UserRole } from '@prisma/client';
import { AnalyticsService } from './analytics.service';

const now = new Date('2026-05-30T00:00:00.000Z');

const salesUser = {
  id: 'user-1',
  email: 'sales@example.com',
  name: '销售顾问',
  role: UserRole.SALES,
  teamId: 'team-1',
  createdAt: now,
  updatedAt: now,
};

const managerUser = {
  ...salesUser,
  id: 'manager-1',
  email: 'manager@example.com',
  name: '销售经理',
  role: UserRole.MANAGER,
};

const adminUser = {
  ...salesUser,
  id: 'admin-1',
  email: 'admin@example.com',
  name: '系统管理员',
  role: UserRole.ADMIN,
  teamId: null,
};

const createPrismaMock = () => ({
  knowledgeDocument: {
    count: jest.fn(),
  },
  practiceSession: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
  script: {
    count: jest.fn(),
    groupBy: jest.fn(),
  },
});

describe('AnalyticsService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: AnalyticsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new AnalyticsService(prisma as any);
  });

  it('builds personal analytics summary for sales users', async () => {
    prisma.script.count.mockResolvedValue(3);
    prisma.practiceSession.count.mockResolvedValue(2);
    prisma.knowledgeDocument.count.mockResolvedValue(1);
    prisma.practiceSession.findMany
      .mockResolvedValueOnce([
        {
          id: 'session-1',
          userId: 'user-1',
          status: 'FINISHED',
          score: 80,
          createdAt: new Date('2026-05-29T08:00:00.000Z'),
          user: { id: 'user-1', name: '销售顾问', email: 'sales@example.com' },
          scenario: { title: '价格异议处理' },
        },
        {
          id: 'session-2',
          userId: 'user-1',
          status: 'FINISHED',
          score: 100,
          createdAt: new Date('2026-05-30T08:00:00.000Z'),
          user: { id: 'user-1', name: '销售顾问', email: 'sales@example.com' },
          scenario: { title: '产品演示' },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'session-2',
          userId: 'user-1',
          status: 'FINISHED',
          score: 100,
          createdAt: new Date('2026-05-30T08:00:00.000Z'),
          user: { id: 'user-1', name: '销售顾问', email: 'sales@example.com' },
          scenario: { title: '产品演示' },
        },
      ]);
    prisma.script.groupBy.mockResolvedValue([
      { category: ScriptCategory.INTRODUCTION, _count: { _all: 2 } },
    ]);

    const result = await service.getSummary(salesUser, {
      from: '2026-05-01',
      to: '2026-05-30',
    });

    expect(prisma.script.count).toHaveBeenCalledWith({
      where: {
        createdAt: expect.any(Object),
        OR: [{ createdById: 'user-1' }, { isPreset: true }, { isShared: true, teamId: 'team-1' }],
      },
    });
    expect(prisma.practiceSession.count).toHaveBeenCalledWith({
      where: { createdAt: expect.any(Object), userId: 'user-1' },
    });
    expect(result.overview).toEqual({
      scriptCount: 3,
      practiceSessionCount: 2,
      averageScore: 90,
      knowledgeDocumentCount: 1,
    });
    expect(result.practiceTrend).toEqual([
      { date: '2026-05-29', sessionCount: 1, averageScore: 80 },
      { date: '2026-05-30', sessionCount: 1, averageScore: 100 },
    ]);
    expect(result.memberRanking).toEqual([
      { userId: 'user-1', userName: '销售顾问', sessionCount: 2, averageScore: 90 },
    ]);
  });

  it('builds team-scoped analytics summary for managers', async () => {
    prisma.script.count.mockResolvedValue(8);
    prisma.practiceSession.count.mockResolvedValue(3);
    prisma.knowledgeDocument.count.mockResolvedValue(4);
    prisma.practiceSession.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    prisma.script.groupBy.mockResolvedValue([]);

    await service.getSummary(managerUser, {});

    expect(prisma.practiceSession.count).toHaveBeenCalledWith({
      where: { createdAt: expect.any(Object), user: { teamId: 'team-1' } },
    });
    expect(prisma.knowledgeDocument.count).toHaveBeenCalledWith({
      where: {
        createdAt: expect.any(Object),
        OR: [{ uploadedById: 'manager-1' }, { isShared: true, teamId: 'team-1' }],
      },
    });
  });

  it('builds global analytics summary for admins', async () => {
    prisma.script.count.mockResolvedValue(12);
    prisma.practiceSession.count.mockResolvedValue(5);
    prisma.knowledgeDocument.count.mockResolvedValue(6);
    prisma.practiceSession.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    prisma.script.groupBy.mockResolvedValue([]);

    await service.getSummary(adminUser, {});

    expect(prisma.script.count).toHaveBeenCalledWith({ where: { createdAt: expect.any(Object) } });
    expect(prisma.practiceSession.count).toHaveBeenCalledWith({
      where: { createdAt: expect.any(Object) },
    });
    expect(prisma.knowledgeDocument.count).toHaveBeenCalledWith({
      where: { createdAt: expect.any(Object) },
    });
  });

  it('rejects analytics date ranges longer than 180 days', async () => {
    await expect(
      service.getSummary(salesUser, { from: '2026-01-01', to: '2026-12-31' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects inverted analytics date ranges', async () => {
    await expect(
      service.getSummary(salesUser, { from: '2026-05-30', to: '2026-05-01' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
