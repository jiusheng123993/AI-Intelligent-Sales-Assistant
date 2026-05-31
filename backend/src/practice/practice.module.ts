/**
 * 练习模块。
 * 依赖 PrismaModule 做持久化、RagModule 做知识检索。
 */
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RagModule } from '../rag/rag.module';
import { PracticeController } from './practice.controller';
import { PracticeService } from './practice.service';

@Module({
  imports: [PrismaModule, RagModule],
  controllers: [PracticeController],
  providers: [PracticeService],
})
export class PracticeModule {}
