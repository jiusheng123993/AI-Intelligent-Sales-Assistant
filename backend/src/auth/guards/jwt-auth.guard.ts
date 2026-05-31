/**
 * JWT 认证守卫。
 * 继承自 Passport AuthGuard('jwt')，复用 JwtStrategy 的校验逻辑。
 * 在 Controller 或方法上使用 @UseGuards(JwtAuthGuard) 即可启用。
 */
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
