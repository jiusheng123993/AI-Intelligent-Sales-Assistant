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
