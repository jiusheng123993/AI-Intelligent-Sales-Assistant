import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';

const now = new Date('2026-05-30T00:00:00.000Z');

const createPrismaMock = () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
});

describe('UsersService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: UsersService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new UsersService(prisma as any);
  });

  it('creates a user when email is unused', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'user-1',
      email: 'sales@example.com',
      password: 'hashed-password',
      name: '销售顾问',
      role: UserRole.SALES,
      teamId: null,
      createdAt: now,
      updatedAt: now,
    });

    const user = await service.createUser({
      email: 'sales@example.com',
      password: 'hashed-password',
      name: '销售顾问',
    });

    expect(user).toEqual({
      id: 'user-1',
      email: 'sales@example.com',
      name: '销售顾问',
      role: UserRole.SALES,
      teamId: null,
      createdAt: now,
      updatedAt: now,
    });
    expect(user).not.toHaveProperty('password');
  });

  it('throws conflict when email already exists', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });

    await expect(
      service.createUser({
        email: 'sales@example.com',
        password: 'hashed-password',
        name: '销售顾问',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('finds a user by email with password for authentication', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'sales@example.com',
      password: 'hashed-password',
      name: '销售顾问',
      role: UserRole.SALES,
      teamId: null,
      createdAt: now,
      updatedAt: now,
    });

    const user = await service.findByEmailWithPassword('sales@example.com');

    expect(user?.password).toBe('hashed-password');
  });

  it('returns safe user by id', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'sales@example.com',
      password: 'hashed-password',
      name: '销售顾问',
      role: UserRole.SALES,
      teamId: null,
      createdAt: now,
      updatedAt: now,
    });

    const user = await service.findSafeById('user-1');

    expect(user).not.toHaveProperty('password');
    expect(user.id).toBe('user-1');
  });

  it('throws not found when safe user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.findSafeById('missing-user')).rejects.toBeInstanceOf(NotFoundException);
  });
});
