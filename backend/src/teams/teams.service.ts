import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Team, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SafeUser } from '../users/types/safe-user.type';
import { CreateTeamDto } from './dto/create-team.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { TeamDetail } from './types/team-detail.type';

const MANAGEMENT_ROLES = new Set<UserRole>([UserRole.MANAGER, UserRole.ADMIN]);

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建团队：
   * - 校验当前用户未归属任何团队，且未拥有其他团队
   * - 事务：创建团队 + 将当前用户绑定到团队并升级为 MANAGER（若原为 SALES 也升）
   */
  async createTeam(user: SafeUser, dto: CreateTeamDto): Promise<Team> {
    const name = (dto.name ?? '').trim();
    if (!name) {
      throw new BadRequestException('团队名不能为空');
    }

    const me = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { ownedTeam: { select: { id: true } } },
    });

    if (!me) {
      throw new NotFoundException('当前用户不存在');
    }
    if (me.teamId) {
      throw new BadRequestException('您已属于某个团队，无法重复创建');
    }
    if (me.ownedTeam) {
      throw new BadRequestException('您已经拥有一个团队，无法再创建新团队');
    }

    // 事务内原子操作：通过 where: { id, teamId: null } 复检，
    // 若并发已有另一个事务把 teamId 改非空，updateMany 受影响行数为 0 → 抛错回滚
    return this.prisma.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: { name, ownerId: user.id },
      });
      const updated = await tx.user.updateMany({
        where: { id: user.id, teamId: null },
        data: { teamId: team.id, role: UserRole.MANAGER },
      });
      if (updated.count !== 1) {
        throw new BadRequestException('您已属于某个团队，操作已取消');
      }
      return team;
    });
  }

  /**
   * 查询当前用户所属团队详情。
   * 未归属团队时返回 null，不抛错，便于前端引导页判定。
   */
  async findMyTeam(user: SafeUser): Promise<TeamDetail | null> {
    if (!user.teamId) {
      return null;
    }

    const team = await this.prisma.team.findUnique({
      where: { id: user.teamId },
      include: {
        members: {
          select: { id: true, name: true, email: true, role: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!team) {
      return null;
    }

    return {
      id: team.id,
      name: team.name,
      ownerId: team.ownerId,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
      members: team.members,
      isOwner: team.ownerId === user.id,
    };
  }

  /**
   * 修改团队名称。
   * 仅 owner 或 ADMIN 可执行。
   */
  async renameTeam(user: SafeUser, teamId: string, dto: UpdateTeamDto): Promise<Team> {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException('团队不存在');
    }
    if (team.ownerId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('仅团队 owner 或 ADMIN 可改名');
    }

    const name = (dto.name ?? '').trim();
    if (!name) {
      throw new BadRequestException('团队名不能为空');
    }

    return this.prisma.team.update({
      where: { id: teamId },
      data: { name },
    });
  }

  /**
   * 转让团队所有权（事务原子）：
   * - 仅当前 owner 可发起
   * - 目标必须是同团队成员且非自己
   * - 事务：Team.ownerId 改写 + 目标 role 升为 MANAGER
   * - 旧 owner 保持 MANAGER 角色（仍是普通管理员），不会被强制降级
   */
  async transferOwnership(
    user: SafeUser,
    teamId: string,
    dto: TransferOwnershipDto,
  ): Promise<void> {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException('团队不存在');
    }
    if (team.ownerId !== user.id) {
      throw new ForbiddenException('仅团队 owner 可转让所有权');
    }
    if (dto.targetUserId === user.id) {
      throw new BadRequestException('不能将所有权转让给自己');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: dto.targetUserId },
    });
    if (!target) {
      throw new NotFoundException('目标用户不存在');
    }
    if (target.teamId !== teamId) {
      throw new BadRequestException('目标用户不属于该团队');
    }

    // CAS 事务：where 复检 ownerId 仍为发起者；并发场景若被他人改动则 count=0 抛错回滚
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.team.updateMany({
        where: { id: teamId, ownerId: user.id },
        data: { ownerId: dto.targetUserId },
      });
      if (updated.count !== 1) {
        throw new ForbiddenException('团队状态已变更，转让已取消');
      }
      const promoted = await tx.user.updateMany({
        where: { id: dto.targetUserId, teamId },
        data: { role: UserRole.MANAGER },
      });
      if (promoted.count !== 1) {
        throw new BadRequestException('目标用户状态已变化，请刷新后重试');
      }
    });
  }

  /**
   * 当前用户退出团队：
   * - 必须已属于团队
   * - 不能是 owner（owner 必须先转让或解散）
   * - 退出后 teamId 置 null、角色统一降为 SALES
   */
  async leaveTeam(user: SafeUser): Promise<void> {
    if (!user.teamId) {
      throw new BadRequestException('您未加入任何团队');
    }
    const me = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { ownedTeam: { select: { id: true } } },
    });
    if (me?.ownedTeam) {
      throw new BadRequestException('您是团队 owner，请先转让所有权或解散团队');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { teamId: null, role: UserRole.SALES },
    });
  }

  /**
   * 移除团队成员：
   * - 操作者必须是 MANAGER 或 ADMIN
   * - 不能移除自己
   * - 不能移除 owner
   * - 目标必须属于该团队
   */
  async removeMember(operator: SafeUser, teamId: string, memberId: string): Promise<void> {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException('团队不存在');
    }
    if (memberId === operator.id) {
      throw new BadRequestException('不能移除自己，请使用退出团队');
    }
    if (memberId === team.ownerId) {
      throw new BadRequestException('不能移除团队 owner');
    }

    const operatorIsOwner = team.ownerId === operator.id;
    if (!operatorIsOwner && !MANAGEMENT_ROLES.has(operator.role)) {
      throw new ForbiddenException('无权移除团队成员');
    }
    if (!operatorIsOwner && operator.role === UserRole.MANAGER && operator.teamId !== teamId) {
      throw new ForbiddenException('无权操作非本团队成员');
    }

    const target = await this.prisma.user.findUnique({ where: { id: memberId } });
    if (!target || target.teamId !== teamId) {
      throw new BadRequestException('目标用户不属于该团队');
    }

    await this.prisma.user.update({
      where: { id: memberId },
      data: { teamId: null, role: UserRole.SALES },
    });
  }

  /**
   * 调整团队成员角色：
   * - 操作者必须是 owner / MANAGER（本团队）/ ADMIN
   * - 禁止将任何成员调为 ADMIN（ADMIN 仅由 DB 手动指定）
   * - 禁止修改 owner 与自己的角色
   * - 目标必须属于该团队
   */
  async updateMemberRole(
    operator: SafeUser,
    teamId: string,
    memberId: string,
    dto: UpdateMemberRoleDto,
  ): Promise<void> {
    if (dto.role === UserRole.ADMIN) {
      throw new BadRequestException('禁止将成员角色调整为 ADMIN');
    }

    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException('团队不存在');
    }
    if (memberId === team.ownerId) {
      throw new BadRequestException('不能修改团队 owner 的角色');
    }
    if (memberId === operator.id) {
      throw new BadRequestException('不能修改自己的角色');
    }

    const operatorIsOwner = team.ownerId === operator.id;
    if (!operatorIsOwner && !MANAGEMENT_ROLES.has(operator.role)) {
      throw new ForbiddenException('无权调整成员角色');
    }
    if (!operatorIsOwner && operator.role === UserRole.MANAGER && operator.teamId !== teamId) {
      throw new ForbiddenException('无权操作非本团队成员');
    }

    const target = await this.prisma.user.findUnique({ where: { id: memberId } });
    if (!target || target.teamId !== teamId) {
      throw new BadRequestException('目标用户不属于该团队');
    }

    await this.prisma.user.update({
      where: { id: memberId },
      data: { role: dto.role },
    });
  }

  /**
   * 解散团队（事务原子）：
   * - 仅 owner 或 ADMIN 可执行
   * - 事务：
   *   1. 所有成员 teamId 置 null、角色统一降为 SALES
   *   2. 关联 Script / Scenario / KnowledgeDocument 的 teamId 置 null（保留业务数据）
   *      Script / KnowledgeDocument 还需取消共享标记，避免数据残留共享态
   *   3. 撤销所有未使用未撤销的邀请
   *   4. 删除团队记录
   */
  async disbandTeam(user: SafeUser, teamId: string): Promise<void> {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException('团队不存在');
    }
    if (team.ownerId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('仅 owner 或 ADMIN 可解散团队');
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.user.updateMany({
        where: { teamId },
        data: { teamId: null, role: UserRole.SALES },
      });
      await tx.script.updateMany({
        where: { teamId },
        data: { teamId: null, isShared: false },
      });
      await tx.scenario.updateMany({
        where: { teamId },
        data: { teamId: null },
      });
      await tx.knowledgeDocument.updateMany({
        where: { teamId },
        data: { teamId: null, isShared: false },
      });
      await tx.teamInvitation.updateMany({
        where: { teamId, usedAt: null, revokedAt: null },
        data: { revokedAt: now },
      });
      await tx.team.delete({ where: { id: teamId } });
    });
  }
}
