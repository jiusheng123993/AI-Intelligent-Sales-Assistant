import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SafeUser } from '../users/types/safe-user.type';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { InvitationService } from './invitation.service';

/**
 * 邀请独立入口：任意已登录用户均可凭 code 接受邀请，不受团队作用域限制。
 * 故与 /teams/* 分离，挂在 /invitations 顶级路径下。
 */
@UseGuards(JwtAuthGuard)
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationService: InvitationService) {}

  @Post('accept')
  @HttpCode(HttpStatus.NO_CONTENT)
  async accept(
    @CurrentUser() user: SafeUser,
    @Body() dto: AcceptInvitationDto,
  ): Promise<void> {
    await this.invitationService.acceptInvitation(user, dto);
  }
}

