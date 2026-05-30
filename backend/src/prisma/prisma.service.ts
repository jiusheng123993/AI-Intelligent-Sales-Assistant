/**
 * Prisma 数据库服务。
 *
 * 继承自 PrismaClient，封装数据库连接生命周期管理与基础健康检查能力。
 * 通过实现 OnModuleInit / OnModuleDestroy 接口，确保应用启动时建立数据库连接，
 * 应用关闭时优雅断开，避免连接泄漏。
 */
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  /**
   * 模块初始化钩子：在应用启动时主动连接数据库。
   * 主动连接可以让首次查询不再承担握手延迟。
   */
  async onModuleInit() {
    await this.$connect();
  }

  /**
   * 模块销毁钩子：在应用关闭时释放数据库连接，避免连接池泄漏。
   */
  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * 数据库健康检查。
   *
   * 通过执行最简单的 `SELECT 1` 验证数据库可用性，
   * 任何异常（连接断开、超时等）均会被吞掉并返回 false，以便上层快速降级。
   *
   * @returns 数据库是否可用
   */
  async checkHealth(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      // 错误兜底：健康检查不抛错，统一返回 false 由调用方决定后续策略
      return false;
    }
  }
}
