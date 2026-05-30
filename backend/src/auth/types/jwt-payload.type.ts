/**
 * JWT Payload 类型。
 * sub 为用户 ID，email/role 用于在不查库的场景做基础鉴权判断。
 */
import { UserRole } from '@prisma/client';

export type JwtPayload = {
  sub: string;
  email: string;
  role: UserRole;
};
