import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SafeUser } from '../users/types/safe-user.type';
import { SearchRagDto } from './dto/search-rag.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { RagService } from './rag.service';

@UseGuards(JwtAuthGuard)
@Controller('rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post('documents')
  @UseInterceptors(FileInterceptor('file'))
  uploadDocument(
    @CurrentUser() user: SafeUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDocumentDto: UploadDocumentDto,
  ) {
    return this.ragService.uploadDocument(user, file, uploadDocumentDto);
  }

  @Get('documents')
  listDocuments(
    @CurrentUser() user: SafeUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.ragService.listDocuments(user, Number(page ?? 1), Number(pageSize ?? 10));
  }

  @Delete('documents/:id')
  removeDocument(@CurrentUser() user: SafeUser, @Param('id') id: string) {
    return this.ragService.removeDocument(user, id);
  }

  @Post('search')
  search(@CurrentUser() user: SafeUser, @Body() searchRagDto: SearchRagDto) {
    return this.ragService.search(user, searchRagDto);
  }
}
