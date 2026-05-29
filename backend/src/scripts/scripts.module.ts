import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ScriptsController } from './scripts.controller';
import { ScriptsService } from './scripts.service';

@Module({
  imports: [PrismaModule],
  controllers: [ScriptsController],
  providers: [ScriptsService],
  exports: [ScriptsService],
})
export class ScriptsModule {}
