/**
 * 用户领域服务。
 *
 * 提供用户的基础持久化操作以及脱敏转换工具，是 AuthModule 与 JwtStrategy 的依赖。
 * 注意：所有对外返回的用户信息均通过 toSafeUser 去掉密码字段，避免敏感数据泄漏。
 */
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SafeUser } from './types/safe-user.type';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建新用户。
   *
   * 调用前请确保密码已使用 bcrypt 哈希，本方法不做明文密码哈希处理。
   * 若邮箱已存在则抛 ConflictException，避免 Prisma 唯一索引报错暴露底层细节。
   *
   * @param data 用户基础数据（密码必须为已哈希值）
   * @returns 脱敏用户
   * @throws ConflictException 当邮箱已被注册时
   */
  async createUser(data: { email: string; password: string; name: string }): Promise<SafeUser> {
    // 业务层显式查重，将数据库唯一索引冲突转换为友好的 4xx 异常
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const user = await this.prisma.user.create({
      data,
    });

    return this.toSafeUser(user);
  }

  /**
   * 根据邮箱查询用户（包含密码哈希）。
   *
   * 仅在登录场景使用，返回值包含 password 字段，调用方必须对此谨慎处理，
   * 严禁直接对外返回。
   */
  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * 根据用户 ID 查询脱敏后的用户。
   *
   * @throws NotFoundException 用户不存在
   */
  async findSafeById(id: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toSafeUser(user);
  }

  /**
   * 将原始用户实体转换为脱敏用户。
   * 显式枚举所有对外字段，避免将来 Prisma 模型新增敏感字段时被意外暴露。
   */
  toSafeUser(user: User): SafeUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      teamId: user.teamId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
