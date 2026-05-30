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
