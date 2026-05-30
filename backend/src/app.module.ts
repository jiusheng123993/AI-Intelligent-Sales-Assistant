/**
 * 应用根模块。
 *
 * 聚合所有业务功能模块：认证、练习、知识库（RAG）、话术、Prisma 数据访问。
 * 通过 ConfigModule.forRoot({ isGlobal: true }) 让环境变量在全应用范围内可注入。
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PracticeModule } from './practice/practice.module';
import { PrismaModule } from './prisma/prisma.module';
import { RagModule } from './rag/rag.module';
import { ScriptsModule } from './scripts/scripts.module';
import { TeamsModule } from './teams/teams.module';

@Module({
  imports: [
    // 全局加载 .env 配置，使 ConfigService 可在所有模块中直接注入
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    RagModule,
    ScriptsModule,
    PracticeModule,
    TeamsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
