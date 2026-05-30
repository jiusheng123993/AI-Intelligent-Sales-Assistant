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
import { UpdateTeamDto } from './dto/update-team.dto';
import { TeamDetail } from './types/team-detail.type';

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

    return this.prisma.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: { name, ownerId: user.id },
      });
      await tx.user.update({
        where: { id: user.id },
        data: { teamId: team.id, role: UserRole.MANAGER },
      });
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
  async renameTeam(
    user: SafeUser,
    teamId: string,
    dto: UpdateTeamDto,
  ): Promise<Team> {
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
}

