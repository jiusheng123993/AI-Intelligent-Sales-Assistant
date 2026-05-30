/**
 * 话术控制器。
 *
 * 路由前缀 /scripts，所有接口均需 JWT 鉴权。
 * 通过 @CurrentUser 自动注入当前用户，将权限校验、可见性过滤下沉到 Service 层。
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SafeUser } from '../users/types/safe-user.type';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateScriptDto } from './dto/create-script.dto';
import { ListScriptsQueryDto } from './dto/list-scripts-query.dto';
import { UpdateScriptDto } from './dto/update-script.dto';
import { ScriptsService } from './scripts.service';

@UseGuards(JwtAuthGuard)
@Controller('scripts')
export class ScriptsController {
  constructor(private readonly scriptsService: ScriptsService) {}

  /** 创建话术；共享话术需角色满足白名单。 */
  @Post()
  create(@CurrentUser() user: SafeUser, @Body() createScriptDto: CreateScriptDto) {
    return this.scriptsService.create(user, createScriptDto);
  }

  /** 分页查询当前用户可见的话术列表。 */
  @Get()
  findAll(@CurrentUser() user: SafeUser, @Query() query: ListScriptsQueryDto) {
    return this.scriptsService.findAll(user, query);
  }

  /** 查询单条话术；越权时统一返回 404。 */
  @Get(':id')
  findOne(@CurrentUser() user: SafeUser, @Param('id') id: string) {
    return this.scriptsService.findOne(user, id);
  }

  /** 部分更新话术。仅本人创建且非预置可编辑。 */
  @Patch(':id')
  update(
    @CurrentUser() user: SafeUser,
    @Param('id') id: string,
    @Body() updateScriptDto: UpdateScriptDto,
  ) {
    return this.scriptsService.update(user, id, updateScriptDto);
  }

  /** 删除话术；删除后会清理向量库索引。 */
  @Delete(':id')
  remove(@CurrentUser() user: SafeUser, @Param('id') id: string) {
    return this.scriptsService.remove(user, id);
  }
}
