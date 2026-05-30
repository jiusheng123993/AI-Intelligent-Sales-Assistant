/**
 * JWT 配置工具。
 *
 * 集中提供 JWT 密钥与过期时间的获取逻辑：
 * - 生产环境强制要求外部注入 JWT_SECRET，否则直接抛错，避免使用默认值带来的安全风险；
 * - 开发环境允许使用内置默认密钥以提升本地调试体验。
 */
import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * 获取 JWT 签名密钥。
 *
 * 优先从环境变量 `JWT_SECRET` 读取；
 * 当未配置且当前为生产环境时抛错，避免线上使用默认密钥；
 * 其他场景（开发/测试）返回 `development-jwt-secret`。
 *
 * @param configService NestJS 配置服务
 * @returns 用于签发 / 校验 JWT 的密钥字符串
 */
export function getJwtSecret(configService: ConfigService): string {
  const secret = configService.get<string>('JWT_SECRET');

  if (secret) {
    return secret;
  }

  // 安全兜底：生产环境必须显式配置密钥
  if (configService.get<string>('NODE_ENV') === 'production') {
    throw new InternalServerErrorException('JWT secret is not configured');
  }

  // 开发环境允许使用内置密钥，方便本地调试
  return 'development-jwt-secret';
}

/**
 * 获取 JWT 过期时间。
 * 未配置时默认 7 天（'7d'）。
 */
export function getJwtExpiresIn(configService: ConfigService): string {
  return configService.get<string>('JWT_EXPIRES_IN') || '7d';
}
