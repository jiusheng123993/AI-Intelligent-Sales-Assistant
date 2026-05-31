/**
 * RAG 控制器。
 *
 * 路由前缀 /rag，所有接口均需 JWT 鉴权。
 * 提供文档上传、列表、删除以及知识检索四个核心 API。
 */
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

  /**
   * 上传知识文档（multipart/form-data，字段名 file）。
   * 使用 FileInterceptor 解析单个上传文件。
   */
  @Post('documents')
  @UseInterceptors(FileInterceptor('file'))
  uploadDocument(
    @CurrentUser() user: SafeUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDocumentDto: UploadDocumentDto,
  ) {
    return this.ragService.uploadDocument(user, file, uploadDocumentDto);
  }

  /**
   * 分页获取当前用户可见的知识文档。
   * page/pageSize 通过查询字符串传入，统一转为 number。
   */
  @Get('documents')
  listDocuments(
    @CurrentUser() user: SafeUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.ragService.listDocuments(user, Number(page ?? 1), Number(pageSize ?? 10));
  }

  /** 删除自己上传的知识文档，并清理向量索引。 */
  @Delete('documents/:id')
  removeDocument(@CurrentUser() user: SafeUser, @Param('id') id: string) {
    return this.ragService.removeDocument(user, id);
  }

  /** 知识检索：向量优先，关键字降级。 */
  @Post('search')
  search(@CurrentUser() user: SafeUser, @Body() searchRagDto: SearchRagDto) {
    return this.ragService.search(user, searchRagDto);
  }
}
