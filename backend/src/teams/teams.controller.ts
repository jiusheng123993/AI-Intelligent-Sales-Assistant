import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SafeUser } from '../users/types/safe-user.type';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { CreateTeamDto } from './dto/create-team.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { InvitationService } from './invitation.service';
import { TeamsService } from './teams.service';

/**
 * 团队及成员管理路由。
 * 所有接口均需要 JWT 鉴权；具体角色控制由 service 层完成（owner/MANAGER/ADMIN 等）。
 */
@UseGuards(JwtAuthGuard)
@Controller('teams')
export class TeamsController {
  constructor(
    private readonly teamsService: TeamsService,
    private readonly invitationService: InvitationService,
  ) {}

  @Post()
  createTeam(@CurrentUser() user: SafeUser, @Body() dto: CreateTeamDto) {
    return this.teamsService.createTeam(user, dto);
  }

  @Get('me')
  findMyTeam(@CurrentUser() user: SafeUser) {
    return this.teamsService.findMyTeam(user);
  }

  @Patch(':teamId')
  renameTeam(
    @CurrentUser() user: SafeUser,
    @Param('teamId') teamId: string,
    @Body() dto: UpdateTeamDto,
  ) {
    return this.teamsService.renameTeam(user, teamId, dto);
  }

  @Delete(':teamId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async disbandTeam(@CurrentUser() user: SafeUser, @Param('teamId') teamId: string): Promise<void> {
    await this.teamsService.disbandTeam(user, teamId);
  }

  @Post(':teamId/transfer')
  @HttpCode(HttpStatus.NO_CONTENT)
  async transferOwnership(
    @CurrentUser() user: SafeUser,
    @Param('teamId') teamId: string,
    @Body() dto: TransferOwnershipDto,
  ): Promise<void> {
    await this.teamsService.transferOwnership(user, teamId, dto);
  }

  @Post('leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  async leaveTeam(@CurrentUser() user: SafeUser): Promise<void> {
    // 路由刻意不带 :teamId：用户始终只能退出自己当前所属团队
    await this.teamsService.leaveTeam(user);
  }

  @Delete(':teamId/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @CurrentUser() user: SafeUser,
    @Param('teamId') teamId: string,
    @Param('userId') memberId: string,
  ): Promise<void> {
    await this.teamsService.removeMember(user, teamId, memberId);
  }

  @Patch(':teamId/members/:userId/role')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateMemberRole(
    @CurrentUser() user: SafeUser,
    @Param('teamId') teamId: string,
    @Param('userId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ): Promise<void> {
    await this.teamsService.updateMemberRole(user, teamId, memberId, dto);
  }

  @Post(':teamId/invitations')
  createInvitation(
    @CurrentUser() user: SafeUser,
    @Param('teamId') teamId: string,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.invitationService.createInvitation(user, teamId, dto);
  }

  @Get(':teamId/invitations')
  listInvitations(@CurrentUser() user: SafeUser, @Param('teamId') teamId: string) {
    return this.invitationService.listInvitations(user, teamId);
  }

  @Delete(':teamId/invitations/:invitationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeInvitation(
    @CurrentUser() user: SafeUser,
    @Param('teamId') teamId: string,
    @Param('invitationId') invitationId: string,
  ): Promise<void> {
    await this.invitationService.revokeInvitation(user, teamId, invitationId);
  }
}
