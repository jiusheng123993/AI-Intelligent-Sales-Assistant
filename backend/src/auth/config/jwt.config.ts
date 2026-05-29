import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export function getJwtSecret(configService: ConfigService): string {
  const secret = configService.get<string>('JWT_SECRET');

  if (secret) {
    return secret;
  }

  if (configService.get<string>('NODE_ENV') === 'production') {
    throw new InternalServerErrorException('JWT secret is not configured');
  }

  return 'development-jwt-secret';
}

export function getJwtExpiresIn(configService: ConfigService): string {
  return configService.get<string>('JWT_EXPIRES_IN') || '7d';
}
