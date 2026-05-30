/**
 * 练习控制器。
 *
 * 路由前缀 /practice，所有接口均需 JWT 鉴权。
 * 暴露场景查询、会话创建/列表/详情、发送消息、结束会话等接口。
 */
import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SafeUser } from '../users/types/safe-user.type';
import { CreateSessionDto } from './dto/create-session.dto';
import { ListSessionsQueryDto } from './dto/list-sessions-query.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { PracticeService } from './practice.service';

@UseGuards(JwtAuthGuard)
@Controller('practice')
export class PracticeController {
  constructor(private readonly practiceService: PracticeService) {}

  /** 查询当前用户可见的所有场景。 */
  @Get('scenarios')
  listScenarios(@CurrentUser() user: SafeUser) {
    return this.practiceService.listScenarios(user);
  }

  /** 查询单个场景详情。 */
  @Get('scenarios/:id')
  getScenario(@CurrentUser() user: SafeUser, @Param('id') id: string) {
    return this.practiceService.getScenario(user, id);
  }

  /** 创建新练习会话（自动写入开场白）。 */
  @Post('sessions')
  createSession(@CurrentUser() user: SafeUser, @Body() createSessionDto: CreateSessionDto) {
    return this.practiceService.createSession(user, createSessionDto);
  }

  /** 分页查询当前用户的练习会话。 */
  @Get('sessions')
  listSessions(@CurrentUser() user: SafeUser, @Query() query: ListSessionsQueryDto) {
    return this.practiceService.listSessions(user, query);
  }

  /** 查询单个练习会话详情。 */
  @Get('sessions/:id')
  getSession(@CurrentUser() user: SafeUser, @Param('id') id: string) {
    return this.practiceService.getSession(user, id);
  }

  /** 向客户发送一句话；返回会话最新状态和命中的 RAG 来源。 */
  @Post('sessions/:id/messages')
  sendMessage(
    @CurrentUser() user: SafeUser,
    @Param('id') id: string,
    @Body() sendMessageDto: SendMessageDto,
  ) {
    return this.practiceService.sendMessage(user, id, sendMessageDto);
  }

  /** 结束会话并生成最终评分与反馈。 */
  @Post('sessions/:id/finish')
  finishSession(@CurrentUser() user: SafeUser, @Param('id') id: string) {
    return this.practiceService.finishSession(user, id);
  }
}
