import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ScriptCategory, UserRole } from '@prisma/client';
import { ScriptsService } from './scripts.service';

const now = new Date('2026-05-30T00:00:00.000Z');

const currentUser = {
  id: 'user-1',
  email: 'sales@example.com',
  name: '销售顾问',
  role: UserRole.SALES,
  teamId: null,
  createdAt: now,
  updatedAt: now,
};

const trainerUser = {
  ...currentUser,
  role: UserRole.TRAINER,
};

const baseScript = {
  id: 'script-1',
  title: '标准开场白',
  content: '您好，我是销智顾问，想和您交流一下销售提效方案。',
  category: ScriptCategory.INTRODUCTION,
  tags: ['开场', '新人'],
  isShared: false,
  isPreset: false,
  createdById: 'user-1',
  teamId: null,
  createdAt: now,
  updatedAt: now,
};

const createPrismaMock = () => ({
  script: {
    count: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
});

describe('ScriptsService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: ScriptsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new ScriptsService(prisma as any);
  });

  it('creates a private script for the current user', async () => {
    prisma.script.create.mockResolvedValue(baseScript);

    const result = await service.create(currentUser, {
      title: ' 标准开场白 ',
      content: ' 您好，我是销智顾问，想和您交流一下销售提效方案。 ',
      category: ScriptCategory.INTRODUCTION,
      tags: [' 开场 ', '新人', '开场'],
      isShared: false,
    });

    expect(prisma.script.create).toHaveBeenCalledWith({
      data: {
        title: '标准开场白',
        content: '您好，我是销智顾问，想和您交流一下销售提效方案。',
        category: ScriptCategory.INTRODUCTION,
        tags: ['开场', '新人'],
        isShared: false,
        createdById: 'user-1',
        teamId: null,
      },
    });
    expect(result).toEqual(baseScript);
  });

  it('rejects shared script creation from sales role', async () => {
    await expect(
      service.create(currentUser, {
        title: '团队共享话术',
        content: '这是一段团队共享话术内容。',
        category: ScriptCategory.CUSTOM,
        tags: [],
        isShared: true,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows trainer to create shared script', async () => {
    prisma.script.create.mockResolvedValue({ ...baseScript, isShared: true });

    await service.create(trainerUser, {
      title: '团队共享话术',
      content: '这是一段团队共享话术内容。',
      category: ScriptCategory.CUSTOM,
      tags: [],
      isShared: true,
    });

    expect(prisma.script.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ isShared: true, createdById: 'user-1' }),
    });
  });

  it('lists visible scripts with keyword, category and pagination', async () => {
    prisma.script.findMany.mockResolvedValue([baseScript]);
    prisma.script.count.mockResolvedValue(1);

    const result = await service.findAll(currentUser, {
      keyword: '开场',
      category: ScriptCategory.INTRODUCTION,
      page: 2,
      pageSize: 5,
    });

    expect(prisma.script.findMany).toHaveBeenCalledWith({
      where: {
        AND: [
          { OR: [{ createdById: 'user-1' }, { isPreset: true }] },
          { category: ScriptCategory.INTRODUCTION },
          {
            OR: [
              { title: { contains: '开场', mode: 'insensitive' } },
              { content: { contains: '开场', mode: 'insensitive' } },
            ],
          },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      skip: 5,
      take: 5,
    });
    expect(result).toEqual({ items: [baseScript], total: 1, page: 2, pageSize: 5 });
  });

  it('caps page size when listing scripts', async () => {
    prisma.script.findMany.mockResolvedValue([]);
    prisma.script.count.mockResolvedValue(0);

    const result = await service.findAll(currentUser, { page: 0, pageSize: 100 });

    expect(prisma.script.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 50 }),
    );
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(50);
  });

  it('returns a visible script detail', async () => {
    prisma.script.findFirst.mockResolvedValue(baseScript);

    const result = await service.findOne(currentUser, 'script-1');

    expect(prisma.script.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'script-1',
        OR: [{ createdById: 'user-1' }, { isPreset: true }],
      },
    });
    expect(result.id).toBe('script-1');
  });

  it('throws not found for invisible script detail', async () => {
    prisma.script.findFirst.mockResolvedValue(null);

    await expect(service.findOne(currentUser, 'missing-script')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates own non-preset script', async () => {
    prisma.script.findFirst.mockResolvedValue(baseScript);
    prisma.script.update.mockResolvedValue({ ...baseScript, title: '更新后标题' });

    const result = await service.update(currentUser, 'script-1', { title: ' 更新后标题 ' });

    expect(prisma.script.update).toHaveBeenCalledWith({
      where: { id: 'script-1' },
      data: { title: '更新后标题' },
    });
    expect(result.title).toBe('更新后标题');
  });

  it('rejects updating other users script', async () => {
    prisma.script.findFirst.mockResolvedValue({ ...baseScript, createdById: 'other-user' });

    await expect(
      service.update(currentUser, 'script-1', { title: '越权修改' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects deleting preset script', async () => {
    prisma.script.findFirst.mockResolvedValue({ ...baseScript, isPreset: true });

    await expect(service.remove(currentUser, 'script-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('deletes own non-preset script', async () => {
    prisma.script.findFirst.mockResolvedValue(baseScript);
    prisma.script.delete.mockResolvedValue(baseScript);

    await service.remove(currentUser, 'script-1');

    expect(prisma.script.delete).toHaveBeenCalledWith({ where: { id: 'script-1' } });
  });
});
