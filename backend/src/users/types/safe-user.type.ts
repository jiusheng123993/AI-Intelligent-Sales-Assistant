/**
 * 脱敏用户类型。
 * 在 Prisma 自动生成的 User 类型上剔除 password 字段，确保不外泄密码哈希。
 */
import { User, UserRole } from '@prisma/client';

export type SafeUser = Omit<User, 'password'> & {
  role: UserRole;
};
