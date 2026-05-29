import { UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtStrategy } from './strategies/jwt.strategy';

const createConfigServiceMock = () => ({
  get: jest.fn((key: string) => {
    if (key === 'JWT_SECRET') return 'test-secret';
    return undefined;
  }),
});

const createUsersServiceMock = () => ({
  findSafeById: jest.fn(),
});

describe('JwtStrategy', () => {
  it('validates payload and returns safe user', async () => {
    const usersService = createUsersServiceMock();
    usersService.findSafeById.mockResolvedValue({
      id: 'user-1',
      email: 'sales@example.com',
      name: '销售顾问',
      role: UserRole.SALES,
      teamId: null,
      createdAt: new Date('2026-05-30T00:00:00.000Z'),
      updatedAt: new Date('2026-05-30T00:00:00.000Z'),
    });
    const strategy = new JwtStrategy(createConfigServiceMock() as any, usersService as any);

    const user = await strategy.validate({
      sub: 'user-1',
      email: 'sales@example.com',
      role: UserRole.SALES,
    });

    expect(user.id).toBe('user-1');
    expect(user).not.toHaveProperty('password');
  });

  it('throws unauthorized when user no longer exists', async () => {
    const usersService = createUsersServiceMock();
    usersService.findSafeById.mockRejectedValue(new Error('User not found'));
    const strategy = new JwtStrategy(createConfigServiceMock() as any, usersService as any);

    await expect(
      strategy.validate({ sub: 'missing-user', email: 'sales@example.com', role: UserRole.SALES }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
