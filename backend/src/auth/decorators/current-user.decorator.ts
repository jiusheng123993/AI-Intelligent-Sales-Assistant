/**
 * 当前用户装饰器。
 *
 * 用法：在路由处理器的参数上使用 `@CurrentUser()` 直接拿到
 * 经过 JwtStrategy 注入到 request.user 的脱敏用户对象；
 * 也可以传入 SafeUser 的某个字段名（如 `@CurrentUser('id')`）只获取单个属性。
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SafeUser } from '../../users/types/safe-user.type';

export const CurrentUser = createParamDecorator(
  (data: keyof SafeUser | undefined, ctx: ExecutionContext) => {
    // 从 HTTP 请求上下文中取出 user，JwtStrategy.validate 的返回值会被 Passport 注入到此处
    const request = ctx.switchToHttp().getRequest<{ user: SafeUser }>();
    const user = request.user;

    // 若指定了字段名则只返回该字段，否则返回完整 SafeUser
    return data ? user?.[data] : user;
  },
);
