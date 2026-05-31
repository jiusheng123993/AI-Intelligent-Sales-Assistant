/**
 * 认证响应类型。
 * accessToken 为 JWT 字符串，user 为脱敏后的用户对象。
 */
import { SafeUser } from '../../users/types/safe-user.type';

export type AuthResponse = {
  accessToken: string;
  user: SafeUser;
};
