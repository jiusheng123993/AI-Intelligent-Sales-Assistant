import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_METADATA_KEY } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

function buildContext(user: unknown): ExecutionContext {
  const request = { user };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

function buildReflector(roles: UserRole[] | undefined): Reflector {
  return {
    getAllAndOverride: jest.fn().mockReturnValue(roles),
  } as unknown as Reflector;
}

describe('RolesGuard', () => {
  it('未声明 @Roles 时放行，避免误锁住公共接口', () => {
    const guard = new RolesGuard(buildReflector(undefined));
    const ctx = buildContext({ id: 'u1', role: UserRole.SALES });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('声明角色为空数组时放行，等价于无限制', () => {
    const guard = new RolesGuard(buildReflector([]));
    const ctx = buildContext({ id: 'u1', role: UserRole.SALES });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('request.user 缺失时拒绝，防止漏配 JwtAuthGuard 导致越权', () => {
    const guard = new RolesGuard(buildReflector([UserRole.MANAGER]));
    const ctx = buildContext(undefined);

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('当前角色匹配任一允许角色时放行', () => {
    const guard = new RolesGuard(buildReflector([UserRole.MANAGER, UserRole.ADMIN]));
    const ctx = buildContext({ id: 'u1', role: UserRole.MANAGER });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('当前角色不匹配时抛 ForbiddenException', () => {
    const guard = new RolesGuard(buildReflector([UserRole.MANAGER]));
    const ctx = buildContext({ id: 'u1', role: UserRole.SALES });

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('ADMIN 始终具备最高权限，可访问任何角色限定接口', () => {
    const guard = new RolesGuard(buildReflector([UserRole.MANAGER]));
    const ctx = buildContext({ id: 'u1', role: UserRole.ADMIN });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('正确通过 Reflector 读取 handler 与 class 两个层级的元数据', () => {
    const reflector = buildReflector([UserRole.MANAGER]);
    const guard = new RolesGuard(reflector);
    const ctx = buildContext({ id: 'u1', role: UserRole.MANAGER });

    guard.canActivate(ctx);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_METADATA_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
  });
});
