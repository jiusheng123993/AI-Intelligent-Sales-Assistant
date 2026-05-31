/**
 * JWT Passport 策略。
 *
 * 负责：
 * 1. 从 Authorization Bearer Header 提取 JWT；
 * 2. 使用配置的密钥校验签名与过期时间；
 * 3. 根据 payload.sub 查询脱敏用户对象，作为 request.user 注入。
 */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { getJwtSecret } from '../config/jwt.config';
import { JwtPayload } from '../types/jwt-payload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      // 从 Authorization: Bearer <token> 中提取 token
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // 不忽略过期时间，过期 token 直接被拒绝
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(configService),
    });
  }

  /**
   * Passport 校验回调。
   *
   * @param payload 经过签名校验后的 JWT payload
   * @returns 脱敏用户对象，会被 Passport 注入到 request.user
   * @throws UnauthorizedException 用户不存在或查询失败时抛出，避免悬空 token 持续可用
   */
  async validate(payload: JwtPayload) {
    try {
      return await this.usersService.findSafeById(payload.sub);
    } catch (error) {
      // 错误兜底：任何查询异常一律视作鉴权失败
      throw new UnauthorizedException('Invalid token user');
    }
  }
}
