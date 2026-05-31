/**
 * 练习领域服务。
 *
 * 负责场景（Scenario）查询、练习会话（PracticeSession）的创建/读取/写入、
 * 客户消息的模拟回复、结束会话时的反馈生成与持久化。
 *
 * 设计要点：
 * - 所有场景查询都附带可见性过滤：预置 + 同团队；
 * - 与 RAG 服务交互均通过 searchSafely 兜底，失败不阻塞会话；
 * - 客户回复与最终评分均为基于规则的轻量模拟，便于离线运行。
 */
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RagService } from '../rag/rag.service';
import { RagSearchResult } from '../rag/types/rag-search-result.type';
import { RagSource } from '../rag/types/rag-source.type';
import { SafeUser } from '../users/types/safe-user.type';
import { CreateSessionDto } from './dto/create-session.dto';
import { ListSessionsQueryDto } from './dto/list-sessions-query.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { PracticeFeedback } from './types/practice-feedback.type';
import { PracticeSessionDetail } from './types/practice-session-detail.type';

// 会话详情通用 include：场景 + 消息（升序）+ 评估（最新在前）
const sessionInclude = {
  scenario: true,
  messages: { orderBy: { createdAt: 'asc' as const } },
  evaluations: { orderBy: { createdAt: 'desc' as const } },
};

@Injectable()
export class PracticeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ragService: RagService,
  ) {}

  /**
   * 查询当前用户可见的所有场景。
   * 可见 = 预置场景(isPreset) + 同团队场景(teamId 匹配)。
   */
  listScenarios(user: SafeUser) {
    return this.prisma.scenario.findMany({
      where: { OR: this.visibleScenarioConditions(user) },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * 查询单个场景。
   * 越权或不存在统一返回 404，避免暴露资源存在性。
   */
  async getScenario(user: SafeUser, id: string) {
    const scenario = await this.prisma.scenario.findFirst({
      where: { id, OR: this.visibleScenarioConditions(user) },
    });

    if (!scenario) {
      throw new NotFoundException('Scenario not found');
    }

    return scenario;
  }

  /**
   * 创建练习会话并写入开场白。
   * 流程：先校验场景可见 → 创建 IN_PROGRESS 会话 → 同时落入 AI 开场消息。
   */
  async createSession(user: SafeUser, dto: CreateSessionDto): Promise<PracticeSessionDetail> {
    const scenario = await this.getScenario(user, dto.scenarioId);

    return this.prisma.practiceSession.create({
      data: {
        userId: user.id,
        scenarioId: scenario.id,
        status: 'IN_PROGRESS',
        // 在创建会话的同时写入 AI 开场白，避免前端首屏空状态
        messages: {
          create: {
            role: 'ASSISTANT',
            content: `您好，我是本次「${scenario.title}」演练中的客户。请开始你的销售沟通。`,
          },
        },
      },
      include: sessionInclude,
    });
  }

  /**
   * 分页查询当前用户名下的练习会话。
   * status 可选过滤（IN_PROGRESS / FINISHED）。
   */
  async listSessions(user: SafeUser, query: ListSessionsQueryDto) {
    // 边界处理：page≥1，pageSize 限制在 [1, 50]
    const page = Math.max(query.page ?? 1, 1);
    const pageSize = Math.min(Math.max(query.pageSize ?? 10, 1), 50);
    const where: Prisma.PracticeSessionWhereInput = {
      userId: user.id,
      ...(query.status ? { status: query.status } : {}),
    };
    // 并行查询列表与总数，减少 RTT
    const [items, total] = await Promise.all([
      this.prisma.practiceSession.findMany({
        where,
        include: sessionInclude,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.practiceSession.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  /**
   * 查询单个练习会话详情。仅本人可见。
   */
  async getSession(user: SafeUser, id: string): Promise<PracticeSessionDetail> {
    const session = await this.prisma.practiceSession.findFirst({
      where: { id, userId: user.id },
      include: sessionInclude,
    });

    if (!session) {
      throw new NotFoundException('Practice session not found');
    }

    return session;
  }

  /**
   * 销售向客户发送一句话，并基于 RAG 上下文生成客户回复。
   *
   * 流程：
   * 1. 校验会话状态必须为 IN_PROGRESS；
   * 2. 写入用户消息；
   * 3. 用消息内容做 RAG 检索（失败兜底，不阻塞流程）；
   * 4. 生成模拟客户回复并写入；
   * 5. 返回最新会话与 RAG 结果。
   */
  async sendMessage(user: SafeUser, id: string, dto: SendMessageDto) {
    const session = await this.getSession(user, id);

    if (session.status !== 'IN_PROGRESS') {
      // 已结束的会话禁止继续发送，避免数据脏写
      throw new ForbiddenException('Practice session is already finished');
    }

    const content = dto.content.trim();
    await this.prisma.practiceMessage.create({
      data: {
        sessionId: id,
        role: 'USER',
        content,
      },
    });

    // RAG 检索失败由 searchSafely 兜底
    const rag = await this.searchSafely(user, content);
    const assistantContent = this.generateCustomerReply(session, content, rag.sources);
    await this.prisma.practiceMessage.create({
      data: {
        sessionId: id,
        role: 'ASSISTANT',
        content: assistantContent,
        feedback: rag.sources.length
          ? `参考来源：${rag.sources.map((source) => source.title).join('、')}`
          : null,
      },
    });

    return {
      session: await this.getSession(user, id),
      rag,
    };
  }

  /**
   * 结束练习会话并生成最终反馈。
   *
   * 流程：
   * 1. 校验会话状态必须为 IN_PROGRESS；
   * 2. 把所有历史消息拼接作为 RAG 查询语料；
   * 3. 生成评分与评语，更新会话状态、写入 Evaluation 记录。
   */
  async finishSession(user: SafeUser, id: string) {
    const session = await this.getSession(user, id);

    if (session.status !== 'IN_PROGRESS') {
      throw new ForbiddenException('Practice session is already finished');
    }

    // 用全量消息做一次 RAG 检索，反馈中给出参考来源
    const rag = await this.searchSafely(
      user,
      session.messages.map((message) => message.content).join('\n'),
    );
    const feedback = this.generateFeedback(session, rag.sources);

    await this.prisma.practiceSession.update({
      where: { id },
      data: { status: 'FINISHED', score: feedback.score },
    });
    await this.prisma.evaluation.create({
      data: {
        sessionId: id,
        evaluatorId: user.id,
        score: feedback.score,
        comments: feedback.comments,
      },
    });

    return {
      session: await this.getSession(user, id),
      feedback,
    };
  }

  /**
   * 安全包装的 RAG 检索。
   * 任何异常都退化为"degraded=true，sources=[]"，确保练习流程不会因 RAG 故障中断。
   */
  private async searchSafely(user: SafeUser, query: string): Promise<RagSearchResult> {
    try {
      return await this.ragService.search(user, { query, topK: 5 });
    } catch (error) {
      // 错误兜底：RAG 不可用时仍允许练习继续
      return { degraded: true, sources: [] };
    }
  }

  /**
   * 基于规则生成模拟客户回复。
   * 当 RAG 命中时引用片段，否则给出通用反馈。
   */
  private generateCustomerReply(
    session: PracticeSessionDetail,
    content: string,
    sources: RagSource[],
  ): string {
    const reference = sources[0]?.content;

    if (reference) {
      // 有可用参考：引用销售刚才那句话并追加场景化异议
      return `我理解你提到的「${content.slice(0, 40)}」。不过作为客户，我还想确认：${this.scenarioObjection(session.scenario.type)}你能结合具体价值再说明一下吗？`;
    }

    return `我听到了你的介绍，但我还没有完全理解这对我的实际价值。${this.scenarioObjection(session.scenario.type)}`;
  }

  /**
   * 生成本次练习的总体反馈。
   * 评分基于"消息轮次 + 是否覆盖价值关键词"做加分，最高 95 分。
   */
  private generateFeedback(session: PracticeSessionDetail, sources: RagSource[]): PracticeFeedback {
    const userMessages = session.messages.filter((message) => message.role === 'USER');
    // 价值类关键词集合：用于检测销售表达是否覆盖商业价值
    const valueKeywords = ['价值', '效率', '成本', '方案', '痛点'];
    const hasValueExpression = userMessages.some((message) =>
      valueKeywords.some((keyword) => message.content.includes(keyword)),
    );
    // 基础分：5 轮以上 85 分，否则 75 分
    const baseScore = userMessages.length >= 5 ? 85 : userMessages.length >= 2 ? 75 : 75;
    // 覆盖价值关键词额外 +10 分，最高封顶 95
    const score = Math.min(baseScore + (hasValueExpression ? 10 : 0), 95);
    const sourceText = sources.length
      ? `\n可参考来源：${sources.map((source) => source.title).join('、')}`
      : '';

    return {
      score,
      comments: `本次演练已完成。你共完成 ${userMessages.length} 轮销售表达，${hasValueExpression ? '已经体现价值、效率或成本意识' : '建议进一步补充客户价值、效率提升和成本收益表达'}。建议继续强化开场价值表达、异议澄清和下一步推进。${sourceText}`,
      sources,
    };
  }

  /**
   * 根据场景类型返回对应的客户异议话术，找不到时回退到 CUSTOM。
   */
  private scenarioObjection(type: string): string {
    const objections: Record<string, string> = {
      COLD_CALL: '我现在时间有限，',
      PRODUCT_DEMO: '我需要知道这个功能是否适合我们的业务，',
      NEGOTIATION: '价格方面我仍然有顾虑，',
      COMPETITOR: '我们也在看其他竞品，',
      CUSTOM: '我还有一些实际落地问题，',
    };

    return objections[type] ?? objections.CUSTOM;
  }

  /**
   * 构造场景可见性条件：预置场景 + 同团队场景。
   */
  private visibleScenarioConditions(user: SafeUser): Prisma.ScenarioWhereInput[] {
    const conditions: Prisma.ScenarioWhereInput[] = [{ isPreset: true }];

    if (user.teamId) {
      conditions.push({ teamId: user.teamId });
    }

    return conditions;
  }
}
