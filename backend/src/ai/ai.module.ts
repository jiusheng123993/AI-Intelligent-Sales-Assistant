import { Module } from '@nestjs/common';
import { RagModule } from '../rag/rag.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [RagModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
