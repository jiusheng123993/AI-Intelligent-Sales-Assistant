# 后端用户认证模块 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 NestJS 后端新增最小可用 JWT 用户认证模块，支持注册、登录、当前用户识别与安全用户返回。

**Architecture:** 本模块采用 `auth` 与 `users` 双模块隔离设计，`users` 只负责用户持久化与安全用户裁剪，`auth` 只负责认证流程、密码校验、JWT 签发与鉴权入口。复用现有 `PrismaModule` 与 `ConfigModule`，不引入 Refresh Token、Redis 会话、团队邀请或完整 RBAC，避免跨模块污染。

**Tech Stack:** NestJS 10, TypeScript 5.3.3, Prisma 5, PostgreSQL, @nestjs/jwt, @nestjs/passport, passport-jwt, bcrypt, class-validator, Jest

---

## 模块边界

### 本模块包含

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `UsersService` 用户创建、邮箱查询、ID 查询、安全用户转换
- `JwtStrategy`、`JwtAuthGuard`、`CurrentUser` 装饰器
- DTO 参数校验
- 正常、边界、异常单元测试

### 本模块不包含

- 前端登录注册页面
- Refresh Token
- Redis 会话与 token 黑名单
- 邮箱验证码与找回密码
- 团队邀请与团队管理
- 完整 RBAC 权限矩阵
- 浏览器扩展登录态同步

---

## 文件结构

**Create:**

- `e:\AI Intelligent Sales Assistant\backend\src\users\types\safe-user.type.ts`
- `e:\AI Intelligent Sales Assistant\backend\src\users\users.service.ts`
- `e:\AI Intelligent Sales Assistant\backend\src\users\users.module.ts`
- `e:\AI Intelligent Sales Assistant\backend\src\users\users.service.spec.ts`
- `e:\AI Intelligent Sales Assistant\backend\src\auth\dto\register.dto.ts`
- `e:\AI Intelligent Sales Assistant\backend\src\auth\dto\login.dto.ts`
- `e:\AI Intelligent Sales Assistant\backend\src\auth\types\jwt-payload.type.ts`
- `e:\AI Intelligent Sales Assistant\backend\src\auth\types\auth-response.type.ts`
- `e:\AI Intelligent Sales Assistant\backend\src\auth\decorators\current-user.decorator.ts`
- `e:\AI Intelligent Sales Assistant\backend\src\auth\guards\jwt-auth.guard.ts`
- `e:\AI Intelligent Sales Assistant\backend\src\auth\strategies\jwt.strategy.ts`
- `e:\AI Intelligent Sales Assistant\backend\src\auth\auth.service.ts`
- `e:\AI Intelligent Sales Assistant\backend\src\auth\auth.controller.ts`
- `e:\AI Intelligent Sales Assistant\backend\src\auth\auth.module.ts`
- `e:\AI Intelligent Sales Assistant\backend\src\auth\auth.service.spec.ts`
- `e:\AI Intelligent Sales Assistant\backend\src\auth\jwt.strategy.spec.ts`
- `e:\AI Intelligent Sales Assistant\docs\modules\backend-auth-module.md`

**Modify:**

- `e:\AI Intelligent Sales Assistant\backend\src\app.module.ts`

---

## Task 1: UsersService 安全用户基础

**Files:**

- Create: `backend/src/users/types/safe-user.type.ts`
- Create: `backend/src/users/users.service.ts`
- Create: `backend/src/users/users.module.ts`
- Test: `backend/src/users/users.service.spec.ts`

- [ ] **Step 1: 编写 SafeUser 类型**

Create `backend/src/users/types/safe-user.type.ts`:

```typescript
import { User, UserRole } from '@prisma/client';

export type SafeUser = Omit<User, 'password'> & {
  role: UserRole;
};
```

- [ ] **Step 2: 编写 UsersService 失败优先测试**

Create `backend/src/users/users.service.spec.ts`:

```typescript
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
```

- [ ] **Step 3: 运行 UsersService 测试并确认失败**

Run:

```bash
cd backend
npm run test -- users.service.spec.ts
```

Expected: FAIL，原因是 `UsersService` 文件尚未实现。

- [ ] **Step 4: 实现 UsersService**

Create `backend/src/users/users.service.ts`:

```typescript
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SafeUser } from './types/safe-user.type';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(data: { email: string; password: string; name: string }): Promise<SafeUser> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const user = await this.prisma.user.create({
      data,
    });

    return this.toSafeUser(user);
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findSafeById(id: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toSafeUser(user);
  }

  toSafeUser(user: User): SafeUser {
    const { password, ...safeUser } = user;
    return safeUser;
  }
}
```

- [ ] **Step 5: 实现 UsersModule**

Create `backend/src/users/users.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';

@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

- [ ] **Step 6: 运行 UsersService 测试并确认通过**

Run:

```bash
cd backend
npm run test -- users.service.spec.ts
```

Expected: PASS。

---

## Task 2: Auth DTO 与类型契约

**Files:**

- Create: `backend/src/auth/dto/register.dto.ts`
- Create: `backend/src/auth/dto/login.dto.ts`
- Create: `backend/src/auth/types/jwt-payload.type.ts`
- Create: `backend/src/auth/types/auth-response.type.ts`

- [ ] **Step 1: 编写注册 DTO**

Create `backend/src/auth/dto/register.dto.ts`:

```typescript
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}
```

- [ ] **Step 2: 编写登录 DTO**

Create `backend/src/auth/dto/login.dto.ts`:

```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
```

- [ ] **Step 3: 编写 JWT payload 类型**

Create `backend/src/auth/types/jwt-payload.type.ts`:

```typescript
import { UserRole } from '@prisma/client';

export type JwtPayload = {
  sub: string;
  email: string;
  role: UserRole;
};
```

- [ ] **Step 4: 编写认证响应类型**

Create `backend/src/auth/types/auth-response.type.ts`:

```typescript
import { SafeUser } from '../../users/types/safe-user.type';

export type AuthResponse = {
  accessToken: string;
  user: SafeUser;
};
```

- [ ] **Step 5: 运行 TypeScript 构建检查**

Run:

```bash
cd backend
npm run build
```

Expected: PASS。

---

## Task 3: AuthService 注册与登录

**Files:**

- Create: `backend/src/auth/auth.service.ts`
- Test: `backend/src/auth/auth.service.spec.ts`

- [ ] **Step 1: 编写 AuthService 失败优先测试**

Create `backend/src/auth/auth.service.spec.ts`:

```typescript
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
```

- [ ] **Step 2: 运行 AuthService 测试并确认失败**

Run:

```bash
cd backend
npm run test -- auth.service.spec.ts
```

Expected: FAIL，原因是 `AuthService` 文件尚未实现。

- [ ] **Step 3: 实现 AuthService**

Create `backend/src/auth/auth.service.ts`:

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponse } from './types/auth-response.type';
import { JwtPayload } from './types/jwt-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const hashedPassword = await bcrypt.hash(registerDto.password, 12);
    const user = await this.usersService.createUser({
      email: registerDto.email,
      password: hashedPassword,
      name: registerDto.name,
    });

    return {
      accessToken: await this.signToken({ sub: user.id, email: user.email, role: user.role }),
      user,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmailWithPassword(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const safeUser = this.usersService.toSafeUser(user);

    return {
      accessToken: await this.signToken({ sub: safeUser.id, email: safeUser.email, role: safeUser.role }),
      user: safeUser,
    };
  }

  async getCurrentUser(userId: string) {
    return this.usersService.findSafeById(userId);
  }

  private async signToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload);
  }
}
```

- [ ] **Step 4: 运行 AuthService 测试并确认通过**

Run:

```bash
cd backend
npm run test -- auth.service.spec.ts
```

Expected: PASS。

---

## Task 4: JWT Strategy、Guard 与 CurrentUser

**Files:**

- Create: `backend/src/auth/strategies/jwt.strategy.ts`
- Create: `backend/src/auth/guards/jwt-auth.guard.ts`
- Create: `backend/src/auth/decorators/current-user.decorator.ts`
- Test: `backend/src/auth/jwt.strategy.spec.ts`

- [ ] **Step 1: 编写 JwtStrategy 测试**

Create `backend/src/auth/jwt.strategy.spec.ts`:

```typescript
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
```

- [ ] **Step 2: 运行 JwtStrategy 测试并确认失败**

Run:

```bash
cd backend
npm run test -- jwt.strategy.spec.ts
```

Expected: FAIL，原因是 `JwtStrategy` 尚未实现。

- [ ] **Step 3: 实现 JwtStrategy**

Create `backend/src/auth/strategies/jwt.strategy.ts`:

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../types/jwt-payload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'development-jwt-secret',
    });
  }

  async validate(payload: JwtPayload) {
    try {
      return await this.usersService.findSafeById(payload.sub);
    } catch (error) {
      throw new UnauthorizedException('Invalid token user');
    }
  }
}
```

- [ ] **Step 4: 实现 JwtAuthGuard**

Create `backend/src/auth/guards/jwt-auth.guard.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

- [ ] **Step 5: 实现 CurrentUser 装饰器**

Create `backend/src/auth/decorators/current-user.decorator.ts`:

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SafeUser } from '../../users/types/safe-user.type';

export const CurrentUser = createParamDecorator((data: keyof SafeUser | undefined, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<{ user: SafeUser }>();
  const user = request.user;

  return data ? user?.[data] : user;
});
```

- [ ] **Step 6: 运行 JwtStrategy 测试并确认通过**

Run:

```bash
cd backend
npm run test -- jwt.strategy.spec.ts
```

Expected: PASS。

---

## Task 5: AuthController 与 AuthModule 接入

**Files:**

- Create: `backend/src/auth/auth.controller.ts`
- Create: `backend/src/auth/auth.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: 实现 AuthController**

Create `backend/src/auth/auth.controller.ts`:

```typescript
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { SafeUser } from '../users/types/safe-user.type';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { AuthResponse } from './types/auth-response.type';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@CurrentUser() user: SafeUser): SafeUser {
    return user;
  }
}
```

- [ ] **Step 2: 实现 AuthModule**

Create `backend/src/auth/auth.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'development-jwt-secret',
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '7d',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
```

- [ ] **Step 3: 接入 AppModule**

Modify `backend/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

- [ ] **Step 4: 运行全量后端单元测试**

Run:

```bash
cd backend
npm run test
```

Expected: PASS。

---

## Task 6: 构建、Lint 与安全审查修复

**Files:**

- Review: `backend/src/auth/**/*.ts`
- Review: `backend/src/users/**/*.ts`
- Review: `backend/src/app.module.ts`

- [ ] **Step 1: 运行 Prisma 校验**

Run:

```bash
cd backend
npx prisma validate
```

Expected: PASS。

- [ ] **Step 2: 运行后端构建**

Run:

```bash
cd backend
npm run build
```

Expected: PASS。

- [ ] **Step 3: 运行后端 lint**

Run:

```bash
cd backend
npm run lint
```

Expected: PASS。若 lint 自动格式化文件，重新运行测试和构建。

- [ ] **Step 4: 运行后端测试**

Run:

```bash
cd backend
npm run test
```

Expected: PASS。

- [ ] **Step 5: 第三方安全架构师审查清单**

Review checklist:

```text
1. 注册与登录响应是否永不返回 password。
2. 登录失败是否统一 UnauthorizedException，避免邮箱枚举。
3. 密码是否使用 bcrypt hash，且盐轮数为 12。
4. JWT payload 是否只包含 sub、email、role，不包含敏感字段。
5. /auth/me 是否强制 JwtAuthGuard。
6. UsersService 是否保持单一职责，不承载认证流程。
7. AuthService 是否不直接访问 Prisma，避免跨层耦合。
8. CurrentUser 装饰器是否只读取 request.user，不做数据库查询。
9. 是否未引入 Refresh Token、Redis、团队管理等跨模块内容。
10. 测试是否覆盖正常、重复邮箱、邮箱不存在、密码错误、token 用户不存在场景。
```

- [ ] **Step 6: 修复审查发现的问题后重新验证**

Run:

```bash
cd backend
npm run test
npm run build
npm run lint
```

Expected: 全部 PASS。

---

## Task 7: 模块文档与 Git 操作说明

**Files:**

- Create: `docs/modules/backend-auth-module.md`

- [ ] **Step 1: 编写模块文档**

Create `docs/modules/backend-auth-module.md`:

```markdown
# 后端用户认证模块文档

## 模块职责

后端用户认证模块负责用户注册、登录、JWT 签发、JWT 鉴权、当前用户识别与安全用户信息返回，为前端认证、话术库、AI 演练场和浏览器扩展提供统一身份基础。

## 核心功能

- 用户注册：校验邮箱、密码和姓名，密码哈希后入库。
- 用户登录：校验邮箱和密码，认证成功后返回 JWT。
- 当前用户：通过 Bearer Token 获取当前登录用户。
- 安全用户：所有对外响应均移除 password 字段。

## 对外接口

### POST /auth/register

请求字段：`email`、`password`、`name`。

响应字段：`accessToken`、`user`。

### POST /auth/login

请求字段：`email`、`password`。

响应字段：`accessToken`、`user`。

### GET /auth/me

请求头：`Authorization: Bearer <accessToken>`。

响应字段：当前安全用户对象。

## 模块依赖

- `PrismaModule`：提供数据库访问能力。
- `ConfigModule`：提供 `JWT_SECRET` 与 `JWT_EXPIRES_IN` 配置。
- `@nestjs/jwt`：负责 JWT 签发。
- `@nestjs/passport` 与 `passport-jwt`：负责 Bearer Token 鉴权。
- `bcrypt`：负责密码哈希与密码比对。

## 安全设计

- 密码入库前使用 bcrypt 哈希。
- 登录失败统一返回认证失败，不暴露邮箱是否存在。
- JWT payload 不包含密码、token 或其他敏感信息。
- `/auth/me` 必须通过 JWT Guard。
- 统一 SafeUser 类型裁剪 password 字段。

## 验证命令

```bash
cd backend
npx prisma validate
npm run test
npm run build
npm run lint
```

## Git 操作建议

```bash
git status --short
git add backend/src/auth backend/src/users backend/src/app.module.ts docs/modules/backend-auth-module.md
git commit -m "feat(auth): add backend jwt authentication module"
git push origin feature/backend-auth-module
```
```

- [ ] **Step 2: 查看 Git 状态**

Run:

```bash
git status --short --branch
```

Expected: 只出现本模块相关文件变更。

- [ ] **Step 3: 输出提交命令，不自动提交**

Run only after explicit user approval:

```bash
git add backend/src/auth backend/src/users backend/src/app.module.ts docs/modules/backend-auth-module.md docs/superpowers/plans/2026-05-30-backend-auth-module.md
git commit -m "feat(auth): add backend jwt authentication module"
git push origin feature/backend-auth-module
```

---

## Self-Review

- Spec coverage: 本计划覆盖注册、登录、当前用户、JWT Guard、CurrentUser、UsersService、安全用户裁剪、测试、验证、文档与 Git 操作说明。
- Placeholder scan: 未包含 TBD、TODO、implement later 或未定义步骤。
- Type consistency: `SafeUser`、`JwtPayload`、`AuthResponse`、`RegisterDto`、`LoginDto` 在定义后被后续任务一致引用。
- Scope check: 当前计划只实现后端用户认证模块，不包含前端认证、Refresh Token、Redis、团队邀请或完整 RBAC。
