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

  @Get('scenarios')
  listScenarios(@CurrentUser() user: SafeUser) {
    return this.practiceService.listScenarios(user);
  }

  @Get('scenarios/:id')
  getScenario(@CurrentUser() user: SafeUser, @Param('id') id: string) {
    return this.practiceService.getScenario(user, id);
  }

  @Post('sessions')
  createSession(@CurrentUser() user: SafeUser, @Body() createSessionDto: CreateSessionDto) {
    return this.practiceService.createSession(user, createSessionDto);
  }

  @Get('sessions')
  listSessions(@CurrentUser() user: SafeUser, @Query() query: ListSessionsQueryDto) {
    return this.practiceService.listSessions(user, query);
  }

  @Get('sessions/:id')
  getSession(@CurrentUser() user: SafeUser, @Param('id') id: string) {
    return this.practiceService.getSession(user, id);
  }

  @Post('sessions/:id/messages')
  sendMessage(
    @CurrentUser() user: SafeUser,
    @Param('id') id: string,
    @Body() sendMessageDto: SendMessageDto,
  ) {
    return this.practiceService.sendMessage(user, id, sendMessageDto);
  }

  @Post('sessions/:id/finish')
  finishSession(@CurrentUser() user: SafeUser, @Param('id') id: string) {
    return this.practiceService.finishSession(user, id);
  }
}
