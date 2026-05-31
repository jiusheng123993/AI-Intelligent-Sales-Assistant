/**
 * RAG 模块。
 *
 * 聚合文档解析、切片、向量存储、检索服务，并对外暴露 RagService 供其他模块（如话术、练习）使用。
 */
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DocumentChunkerService } from './document-chunker.service';
import { DocumentParserService } from './document-parser.service';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';
import { VectorStoreService } from './vector-store.service';

@Module({
  imports: [PrismaModule],
  controllers: [RagController],
  providers: [DocumentParserService, DocumentChunkerService, VectorStoreService, RagService],
  exports: [RagService],
})
export class RagModule {}
