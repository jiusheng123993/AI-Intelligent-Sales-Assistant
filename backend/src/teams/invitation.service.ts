import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { TeamInvitation, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SafeUser } from '../users/types/safe-user.type';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import {
  InvitationDetail,
  InvitationStatus,
} from './types/invitation-detail.type';

const MANAGEMENT_ROLES = new Set<UserRole>([
  UserRole.TRAINER,
  UserRole.MANAGER,
  UserRole.ADMIN,
]);

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const CODE_LENGTH = 16;
const DEFAULT_EXPIRES_DAYS = 7;
const MAX_GENERATE_RETRY = 5;

@Injectable()
export class InvitationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 生成邀请码：
   * - 仅 TRAINER / MANAGER / ADMIN 或 owner 可创建
   * - 禁止生成 ADMIN 角色邀请
   * - 默认 7 天过期、SALES 角色
   * - 邀请码 16 位 base32（高熵）；唯一索引兜底，最多重试 5 次防极小概率碰撞
   */
  async createInvitation(
    operator: SafeUser,
    teamId: string,
    dto: CreateInvitationDto,
  ): Promise<TeamInvitation> {
    const role = dto.role ?? UserRole.SALES;
    if (role === UserRole.ADMIN) {
      throw new BadRequestException('禁止创建 ADMIN 角色的邀请');
    }

    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException('团队不存在');
    }
    this.assertCanManageInvitation(operator, team.ownerId, teamId);

    const days = dto.expiresInDays ?? DEFAULT_EXPIRES_DAYS;
    const expiresAt = new Date(Date.now() + days * 24 * 3600 * 1000);

    let lastError: unknown;
    for (let attempt = 0; attempt < MAX_GENERATE_RETRY; attempt++) {
      const code = this.generateCode();
      try {
        return await this.prisma.teamInvitation.create({
          data: {
            code,
            teamId,
            invitedBy: operator.id,
            role,
            expiresAt,
          },
        });
      } catch (err) {
        lastError = err;
      }
    }
    throw new Error(`邀请码生成失败：${(lastError as Error)?.message ?? '未知错误'}`);
  }

  /**
   * 列出团队邀请：含派生 status 字段（PENDING/USED/EXPIRED/REVOKED）
   */
  async listInvitations(
    operator: SafeUser,
    teamId: string,
  ): Promise<InvitationDetail[]> {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException('团队不存在');
    }
    this.assertCanManageInvitation(operator, team.ownerId, teamId);

    const records = await this.prisma.teamInvitation.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toDetail(r));
  }

  /**
   * 撤销邀请：仅未使用、未撤销的邀请可撤销
   */
  async revokeInvitation(
    operator: SafeUser,
    teamId: string,
    invitationId: string,
  ): Promise<void> {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException('团队不存在');
    }
    this.assertCanManageInvitation(operator, team.ownerId, teamId);

    const invitation = await this.prisma.teamInvitation.findUnique({
      where: { id: invitationId },
    });
    if (!invitation) {
      throw new NotFoundException('邀请不存在');
    }
    if (invitation.teamId !== teamId) {
      throw new BadRequestException('邀请不属于该团队');
    }
    if (invitation.usedAt) {
      throw new BadRequestException('邀请已使用，无法撤销');
    }
    if (invitation.revokedAt) {
      throw new BadRequestException('邀请已撤销');
    }

    await this.prisma.teamInvitation.update({
      where: { id: invitationId },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * 接受邀请：事务原子
   * - 当前用户必须未归属任何团队、且未拥有团队
   * - 邀请必须存在、未过期、未使用、未撤销
   * - 事务：更新用户 teamId/role + 标记邀请已用
   */
  async acceptInvitation(
    user: SafeUser,
    dto: AcceptInvitationDto,
  ): Promise<void> {
    const invitation = await this.prisma.teamInvitation.findUnique({
      where: { code: dto.code },
    });
    if (!invitation) {
      throw new NotFoundException('邀请不存在');
    }
    if (invitation.revokedAt) {
      throw new BadRequestException('邀请已撤销');
    }
    if (invitation.usedAt) {
      throw new BadRequestException('邀请已被使用');
    }
    if (invitation.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('邀请已过期');
    }

    const me = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { ownedTeam: { select: { id: true } } },
    });
    if (!me) {
      throw new NotFoundException('当前用户不存在');
    }
    if (me.teamId) {
      throw new BadRequestException('您已属于某个团队，无法接受邀请');
    }
    if (me.ownedTeam) {
      throw new BadRequestException('您是某团队的 owner，无法接受邀请');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { teamId: invitation.teamId, role: invitation.role },
      });
      await tx.teamInvitation.update({
        where: { id: invitation.id },
        data: { usedAt: new Date(), usedById: user.id },
      });
    });
  }

  /**
   * 生成 16 位 base32（A-Z2-7）邀请码。
   * 使用 randomBytes 高熵随机源；80bit 熵足以抵御常规暴力穷举。
   */
  private generateCode(): string {
    const bytes = randomBytes(CODE_LENGTH);
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += BASE32_ALPHABET[bytes[i] % BASE32_ALPHABET.length];
    }
    return code;
  }

  /**
   * 派生邀请状态：撤销 > 已用 > 过期 > 待用
   */
  private toDetail(invitation: TeamInvitation): InvitationDetail {
    let status: InvitationStatus = 'PENDING';
    if (invitation.revokedAt) status = 'REVOKED';
    else if (invitation.usedAt) status = 'USED';
    else if (invitation.expiresAt.getTime() <= Date.now()) status = 'EXPIRED';

    return {
      id: invitation.id,
      code: invitation.code,
      teamId: invitation.teamId,
      role: invitation.role,
      invitedBy: invitation.invitedBy,
      expiresAt: invitation.expiresAt,
      usedAt: invitation.usedAt,
      usedById: invitation.usedById,
      revokedAt: invitation.revokedAt,
      createdAt: invitation.createdAt,
      status,
    };
  }

  /**
   * 邀请管理权限：
   * - ADMIN 始终可以
   * - 团队 owner 始终可以
   * - 同团队的 TRAINER / MANAGER 可以
   * - SALES 无权
   */
  private assertCanManageInvitation(
    operator: SafeUser,
    ownerId: string,
    teamId: string,
  ): void {
    if (operator.role === UserRole.ADMIN) return;
    if (operator.id === ownerId) return;
    if (
      MANAGEMENT_ROLES.has(operator.role) &&
      operator.teamId === teamId
    ) {
      return;
    }
    throw new ForbiddenException('您无权管理该团队的邀请');
  }
}

