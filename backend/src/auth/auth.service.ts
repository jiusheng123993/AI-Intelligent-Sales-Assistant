/**
 * 认证服务。
 *
 * 负责处理用户注册、登录与"获取当前用户"等核心认证业务。
 * 密码采用 bcrypt 加盐哈希存储（cost=12），登录采用邮箱+密码校验，
 * 校验通过后签发 JWT 访问令牌。
 */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponse } from './types/auth-response.type';
import { JwtPayload } from './types/jwt-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * 用户注册。
   *
   * 流程：
   * 1. 使用 bcrypt（cost=12）对明文密码进行哈希；
   * 2. 调用 UsersService 创建用户（其中会校验邮箱唯一性）；
   * 3. 基于新用户信息签发 JWT 并返回。
   *
   * @param registerDto 注册参数（邮箱、密码、姓名）
   * @returns 包含 accessToken 与脱敏用户信息的认证响应
   */
  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    // 密码安全：bcrypt cost=12，足够抵御常见暴力破解
    const hashedPassword = await bcrypt.hash(registerDto.password, 12);
    const user = await this.usersService.createUser({
      email: registerDto.email,
      password: hashedPassword,
      name: registerDto.name,
    });

    return {
      accessToken: await this.signToken({ sub: user.id, email: user.email, role: user.role }),
      user,
    };
  }

  /**
   * 用户登录。
   *
   * 注意：无论"邮箱不存在"还是"密码错误"，统一返回 "Invalid credentials"，
   * 避免通过错误信息探测账号是否存在（防用户枚举攻击）。
   *
   * @param loginDto 登录参数（邮箱、密码）
   * @returns 认证响应（accessToken + 脱敏用户）
   * @throws UnauthorizedException 邮箱不存在或密码错误
   */
  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmailWithPassword(loginDto.email);

    if (!user) {
      // 安全兜底：不暴露账号是否存在
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

    if (!isPasswordValid) {
      // 密码错误同样抛出统一异常文案
      throw new UnauthorizedException('Invalid credentials');
    }

    const safeUser = this.usersService.toSafeUser(user);

    return {
      accessToken: await this.signToken({
        sub: safeUser.id,
        email: safeUser.email,
        role: safeUser.role,
      }),
      user: safeUser,
    };
  }

  /**
   * 获取当前登录用户的脱敏信息。
   *
   * @param userId JWT 中携带的用户 ID
   */
  async getCurrentUser(userId: string) {
    return this.usersService.findSafeById(userId);
  }

  /**
   * 使用 JwtService 异步签发 token，统一封装便于将来扩展（如刷新令牌）。
   */
  private async signToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload);
  }
}
