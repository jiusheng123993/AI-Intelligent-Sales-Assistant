import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SafeUser } from '../../users/types/safe-user.type';

export const CurrentUser = createParamDecorator(
  (data: keyof SafeUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user: SafeUser }>();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
