/**
 * 认证控制器。
 *
 * 暴露三个核心 HTTP 接口：
 * - POST /auth/register：用户注册
 * - POST /auth/login：账号密码登录
 * - GET  /auth/me：获取当前登录用户（需要 JWT 守卫）
 */
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { SafeUser } from '../users/types/safe-user.type';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { AuthResponse } from './types/auth-response.type';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 用户注册接口。
   * 入参经 DTO 校验后由 AuthService 完成密码哈希与持久化。
   */
  @Post('register')
  register(@Body() registerDto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(registerDto);
  }

  /**
   * 用户登录接口。
   * 成功后返回 JWT accessToken 与脱敏用户。
   */
  @Post('login')
  login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(loginDto);
  }

  /**
   * 获取当前用户信息。
   * JwtAuthGuard 会校验 Bearer Token 并把当前用户注入到请求上下文，
   * 然后由 @CurrentUser 装饰器取出。
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@CurrentUser() user: SafeUser): SafeUser {
    return user;
  }
}
