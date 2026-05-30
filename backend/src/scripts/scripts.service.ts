/**
 * 话术领域服务。
 *
 * 提供话术（Script）的 CRUD、可见性过滤、共享权限校验、与 RAG 向量库同步等能力。
 * 设计要点：
 * - 可见性：用户可见 = 自己创建 + 预置(isPreset) + 同团队共享(isShared && teamId)；
 * - 权限：仅 TRAINER / MANAGER / ADMIN 角色可发布共享话术；
 * - 副作用：增/改/删时通过 RagService 异步同步到向量库，删除失败不阻塞主流程。
 */
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Script, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RagService } from '../rag/rag.service';
import { SafeUser } from '../users/types/safe-user.type';
import { CreateScriptDto } from './dto/create-script.dto';
import { ListScriptsQueryDto } from './dto/list-scripts-query.dto';
import { UpdateScriptDto } from './dto/update-script.dto';

/**
 * 分页话术列表返回结构。
 */
export interface PaginatedScripts {
  items: Script[];
  total: number;
  page: number;
  pageSize: number;
}

// 拥有"共享话术"权限的角色集合，普通 SALES 角色无权共享
const sharedScriptRoles = new Set<UserRole>([UserRole.TRAINER, UserRole.MANAGER, UserRole.ADMIN]);

@Injectable()
export class ScriptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ragService?: RagService,
  ) {}

  /**
   * 创建话术。
   *
   * - 自动 trim 标题/内容；
   * - 共享话术需要满足角色权限；
   * - 创建成功后尝试同步到向量库（失败不抛错，由 RagService 兜底）。
   */
  async create(user: SafeUser, dto: CreateScriptDto): Promise<Script> {
    const isShared = dto.isShared ?? false;

    // 权限校验：仅特定角色可创建共享话术
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

    // 异步同步到向量库（可选依赖，缺失时跳过）
    await this.ragService?.syncScript(script);

    return script;
  }

  /**
   * 分页查询当前用户可见的话术列表。
   *
   * - page/pageSize 做边界约束，避免负数或超大分页；
   * - 同时返回总数，方便前端分页。
   */
  async findAll(user: SafeUser, query: ListScriptsQueryDto): Promise<PaginatedScripts> {
    // 边界处理：page 至少 1，pageSize 限制在 [1, 50]
    const page = Math.max(query.page ?? 1, 1);
    const pageSize = Math.min(Math.max(query.pageSize ?? 10, 1), 50);
    const where = this.buildVisibleWhere(user, query);
    // 并行查询列表与总数，减少 RTT
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

  /**
   * 根据 ID 查询单条话术。
   * 在 where 中拼入可见性条件，避免越权访问。
   */
  async findOne(user: SafeUser, id: string): Promise<Script> {
    const script = await this.prisma.script.findFirst({
      where: {
        id,
        OR: this.visibleConditions(user),
      },
    });

    if (!script) {
      // 未找到 / 无权访问统一返回 404，避免暴露资源存在性
      throw new NotFoundException('Script not found');
    }

    return script;
  }

  /**
   * 更新话术。
   *
   * 关键校验：
   * 1. 通过 findEditableScript 校验"是否本人创建 + 非预置"；
   * 2. 仅传入需要更新的字段（部分更新）；
   * 3. 共享开关变更需重新校验权限并连带处理 team 关联。
   */
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
      // 共享开关需复检权限
      this.assertSharedPermission(user, dto.isShared);
      data.isShared = dto.isShared;
      // 共享开启且有 team 时绑定团队；关闭时主动解绑，避免遗留团队归属
      data.team =
        dto.isShared && user.teamId ? { connect: { id: user.teamId } } : { disconnect: true };
    }

    const updatedScript = await this.prisma.script.update({
      where: { id: script.id },
      data,
    });

    // 同步更新到向量库
    await this.ragService?.syncScript(updatedScript);

    return updatedScript;
  }

  /**
   * 删除话术。
   * 同样要先确认编辑权限，再清理 DB 与向量库索引。
   */
  async remove(user: SafeUser, id: string): Promise<void> {
    const script = await this.findEditableScript(user, id);

    await this.prisma.script.delete({ where: { id: script.id } });
    // 删除后清理向量索引，避免脏数据残留
    await this.ragService?.deleteScript(script.id);
  }

  /**
   * 找到可被当前用户修改的话术：必须是本人创建且非预置。
   * 不满足时返回 403/404，避免任何越权操作。
   */
  private async findEditableScript(user: SafeUser, id: string): Promise<Script> {
    const script = await this.prisma.script.findFirst({ where: { id } });

    if (!script) {
      throw new NotFoundException('Script not found');
    }

    // 权限校验：必须本人创建且非预置话术
    if (script.createdById !== user.id || script.isPreset) {
      throw new ForbiddenException('No permission to modify this script');
    }

    return script;
  }

  /**
   * 根据查询参数构建带可见性条件的 where。
   * 关键字采用 ILIKE（mode: insensitive）做大小写不敏感匹配。
   */
  private buildVisibleWhere(user: SafeUser, query: ListScriptsQueryDto): Prisma.ScriptWhereInput {
    const conditions: Prisma.ScriptWhereInput[] = [{ OR: this.visibleConditions(user) }];
    const keyword = query.keyword?.trim();

    if (query.category) {
      conditions.push({ category: query.category });
    }

    if (keyword) {
      // 关键字模糊搜索：标题或内容任一命中即可
      conditions.push({
        OR: [
          { title: { contains: keyword, mode: 'insensitive' } },
          { content: { contains: keyword, mode: 'insensitive' } },
        ],
      });
    }

    return { AND: conditions };
  }

  /**
   * 构建用户可见话术的 OR 条件：自己创建 / 预置 / 同团队共享。
   */
  private visibleConditions(user: SafeUser): Prisma.ScriptWhereInput[] {
    const conditions: Prisma.ScriptWhereInput[] = [{ createdById: user.id }, { isPreset: true }];

    if (user.teamId) {
      conditions.push({ isShared: true, teamId: user.teamId });
    }

    return conditions;
  }

  /**
   * 共享权限断言：仅当 isShared=true 且角色不在白名单时抛 403。
   */
  private assertSharedPermission(user: SafeUser, isShared: boolean): void {
    if (isShared && !sharedScriptRoles.has(user.role)) {
      throw new ForbiddenException('No permission to share scripts');
    }
  }

  /**
   * 规范化 tag 列表：trim、去空、去重，最多保留 10 个，避免脏数据撑爆字段。
   */
  private normalizeTags(tags: string[] = []): string[] {
    return Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean))).slice(0, 10);
  }
}
