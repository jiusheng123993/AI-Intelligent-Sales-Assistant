/**
 * Prisma 全局模块。
 *
 * 使用 @Global() 装饰器声明为全局模块，使得 PrismaService
 * 可以在任意业务模块中直接注入，无需在每个模块重复导入。
 */
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
