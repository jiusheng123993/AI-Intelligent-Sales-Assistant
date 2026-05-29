import { InternalServerErrorException } from '@nestjs/common';
import { getJwtExpiresIn, getJwtSecret } from './jwt.config';

const createConfigServiceMock = (values: Record<string, string | undefined>) => ({
  get: jest.fn((key: string) => values[key]),
});

describe('JWT config', () => {
  it('uses configured JWT secret when present', () => {
    const configService = createConfigServiceMock({ JWT_SECRET: 'configured-secret' });

    expect(getJwtSecret(configService as any)).toBe('configured-secret');
  });

  it('uses development fallback outside production', () => {
    const configService = createConfigServiceMock({ NODE_ENV: 'development' });

    expect(getJwtSecret(configService as any)).toBe('development-jwt-secret');
  });

  it('throws when production JWT secret is missing', () => {
    const configService = createConfigServiceMock({ NODE_ENV: 'production' });

    expect(() => getJwtSecret(configService as any)).toThrow(InternalServerErrorException);
  });

  it('uses configured JWT expiration when present', () => {
    const configService = createConfigServiceMock({ JWT_EXPIRES_IN: '1h' });

    expect(getJwtExpiresIn(configService as any)).toBe('1h');
  });

  it('uses seven days as default JWT expiration', () => {
    const configService = createConfigServiceMock({});

    expect(getJwtExpiresIn(configService as any)).toBe('7d');
  });
});
