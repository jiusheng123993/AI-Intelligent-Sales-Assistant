import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Script, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RagService } from '../rag/rag.service';
import { SafeUser } from '../users/types/safe-user.type';
import { CreateScriptDto } from './dto/create-script.dto';
import { ListScriptsQueryDto } from './dto/list-scripts-query.dto';
import { UpdateScriptDto } from './dto/update-script.dto';

export interface PaginatedScripts {
  items: Script[];
  total: number;
  page: number;
  pageSize: number;
}

const sharedScriptRoles = new Set<UserRole>([UserRole.TRAINER, UserRole.MANAGER, UserRole.ADMIN]);

@Injectable()
export class ScriptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ragService?: RagService,
  ) {}

  async create(user: SafeUser, dto: CreateScriptDto): Promise<Script> {
    const isShared = dto.isShared ?? false;

    this.assertSharedPermission(user, isShared);

    const script = await this.prisma.script.create({
      data: {
        title: dto.title.trim(),
        content: dto.content.trim(),
        category: dto.category,
        tags: this.normalizeTags(dto.tags),
        isShared,
        createdById: user.id,
        teamId: user.teamId,
      },
    });

    await this.ragService?.syncScript(script);

    return script;
  }

  async findAll(user: SafeUser, query: ListScriptsQueryDto): Promise<PaginatedScripts> {
    const page = Math.max(query.page ?? 1, 1);
    const pageSize = Math.min(Math.max(query.pageSize ?? 10, 1), 50);
    const where = this.buildVisibleWhere(user, query);
    const [items, total] = await Promise.all([
      this.prisma.script.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.script.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async findOne(user: SafeUser, id: string): Promise<Script> {
    const script = await this.prisma.script.findFirst({
      where: {
        id,
        OR: this.visibleConditions(user),
      },
    });

    if (!script) {
      throw new NotFoundException('Script not found');
    }

    return script;
  }

  async update(user: SafeUser, id: string, dto: UpdateScriptDto): Promise<Script> {
    const script = await this.findEditableScript(user, id);
    const data: Prisma.ScriptUpdateInput = {};

    if (dto.title !== undefined) {
      data.title = dto.title.trim();
    }

    if (dto.content !== undefined) {
      data.content = dto.content.trim();
    }

    if (dto.category !== undefined) {
      data.category = dto.category;
    }

    if (dto.tags !== undefined) {
      data.tags = this.normalizeTags(dto.tags);
    }

    if (dto.isShared !== undefined) {
      this.assertSharedPermission(user, dto.isShared);
      data.isShared = dto.isShared;
      data.team =
        dto.isShared && user.teamId ? { connect: { id: user.teamId } } : { disconnect: true };
    }

    const updatedScript = await this.prisma.script.update({
      where: { id: script.id },
      data,
    });

    await this.ragService?.syncScript(updatedScript);

    return updatedScript;
  }

  async remove(user: SafeUser, id: string): Promise<void> {
    const script = await this.findEditableScript(user, id);

    await this.prisma.script.delete({ where: { id: script.id } });
    await this.ragService?.deleteScript(script.id);
  }

  private async findEditableScript(user: SafeUser, id: string): Promise<Script> {
    const script = await this.prisma.script.findFirst({ where: { id } });

    if (!script) {
      throw new NotFoundException('Script not found');
    }

    if (script.createdById !== user.id || script.isPreset) {
      throw new ForbiddenException('No permission to modify this script');
    }

    return script;
  }

  private buildVisibleWhere(user: SafeUser, query: ListScriptsQueryDto): Prisma.ScriptWhereInput {
    const conditions: Prisma.ScriptWhereInput[] = [{ OR: this.visibleConditions(user) }];
    const keyword = query.keyword?.trim();

    if (query.category) {
      conditions.push({ category: query.category });
    }

    if (keyword) {
      conditions.push({
        OR: [
          { title: { contains: keyword, mode: 'insensitive' } },
          { content: { contains: keyword, mode: 'insensitive' } },
        ],
      });
    }

    return { AND: conditions };
  }

  private visibleConditions(user: SafeUser): Prisma.ScriptWhereInput[] {
    const conditions: Prisma.ScriptWhereInput[] = [{ createdById: user.id }, { isPreset: true }];

    if (user.teamId) {
      conditions.push({ isShared: true, teamId: user.teamId });
    }

    return conditions;
  }

  private assertSharedPermission(user: SafeUser, isShared: boolean): void {
    if (isShared && !sharedScriptRoles.has(user.role)) {
      throw new ForbiddenException('No permission to share scripts');
    }
  }

  private normalizeTags(tags: string[] = []): string[] {
    return Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean))).slice(0, 10);
  }
}
