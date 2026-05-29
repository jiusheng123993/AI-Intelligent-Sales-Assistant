import { UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const now = new Date('2026-05-30T00:00:00.000Z');

const createUsersServiceMock = () => ({
  createUser: jest.fn(),
  findByEmailWithPassword: jest.fn(),
  findSafeById: jest.fn(),
  toSafeUser: jest.fn(),
});

const createJwtServiceMock = () => ({
  signAsync: jest.fn(),
});

describe('AuthService', () => {
  let usersService: ReturnType<typeof createUsersServiceMock>;
  let jwtService: ReturnType<typeof createJwtServiceMock>;
  let service: AuthService;

  beforeEach(() => {
    usersService = createUsersServiceMock();
    jwtService = createJwtServiceMock();
    service = new AuthService(usersService as any, jwtService as any);
    jest.clearAllMocks();
  });

  it('registers a user with hashed password and returns token', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    usersService.createUser.mockResolvedValue({
      id: 'user-1',
      email: 'sales@example.com',
      name: '销售顾问',
      role: UserRole.SALES,
      teamId: null,
      createdAt: now,
      updatedAt: now,
    });
    jwtService.signAsync.mockResolvedValue('access-token');

    const result = await service.register({
      email: 'sales@example.com',
      password: 'Password123!',
      name: '销售顾问',
    });

    expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 12);
    expect(usersService.createUser).toHaveBeenCalledWith({
      email: 'sales@example.com',
      password: 'hashed-password',
      name: '销售顾问',
    });
    expect(result.accessToken).toBe('access-token');
    expect(result.user).not.toHaveProperty('password');
  });

  it('logs in a valid user and returns token', async () => {
    usersService.findByEmailWithPassword.mockResolvedValue({
      id: 'user-1',
      email: 'sales@example.com',
      password: 'hashed-password',
      name: '销售顾问',
      role: UserRole.SALES,
      teamId: null,
      createdAt: now,
      updatedAt: now,
    });
    usersService.toSafeUser.mockReturnValue({
      id: 'user-1',
      email: 'sales@example.com',
      name: '销售顾问',
      role: UserRole.SALES,
      teamId: null,
      createdAt: now,
      updatedAt: now,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    jwtService.signAsync.mockResolvedValue('access-token');

    const result = await service.login({
      email: 'sales@example.com',
      password: 'Password123!',
    });

    expect(result.accessToken).toBe('access-token');
    expect(result.user).not.toHaveProperty('password');
  });

  it('throws unauthorized when email does not exist', async () => {
    usersService.findByEmailWithPassword.mockResolvedValue(null);

    await expect(
      service.login({ email: 'missing@example.com', password: 'Password123!' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws unauthorized when password is invalid', async () => {
    usersService.findByEmailWithPassword.mockResolvedValue({
      id: 'user-1',
      email: 'sales@example.com',
      password: 'hashed-password',
      name: '销售顾问',
      role: UserRole.SALES,
      teamId: null,
      createdAt: now,
      updatedAt: now,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.login({ email: 'sales@example.com', password: 'Wrong123!' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns current safe user by id', async () => {
    usersService.findSafeById.mockResolvedValue({
      id: 'user-1',
      email: 'sales@example.com',
      name: '销售顾问',
      role: UserRole.SALES,
      teamId: null,
      createdAt: now,
      updatedAt: now,
    });

    const user = await service.getCurrentUser('user-1');

    expect(user.id).toBe('user-1');
  });
});
