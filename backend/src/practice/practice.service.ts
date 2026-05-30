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

  listScenarios(user: SafeUser) {
    return this.prisma.scenario.findMany({
      where: { OR: this.visibleScenarioConditions(user) },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getScenario(user: SafeUser, id: string) {
    const scenario = await this.prisma.scenario.findFirst({
      where: { id, OR: this.visibleScenarioConditions(user) },
    });

    if (!scenario) {
      throw new NotFoundException('Scenario not found');
    }

    return scenario;
  }

  async createSession(user: SafeUser, dto: CreateSessionDto): Promise<PracticeSessionDetail> {
    const scenario = await this.getScenario(user, dto.scenarioId);

    return this.prisma.practiceSession.create({
      data: {
        userId: user.id,
        scenarioId: scenario.id,
        status: 'IN_PROGRESS',
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

  async listSessions(user: SafeUser, query: ListSessionsQueryDto) {
    const page = Math.max(query.page ?? 1, 1);
    const pageSize = Math.min(Math.max(query.pageSize ?? 10, 1), 50);
    const where: Prisma.PracticeSessionWhereInput = {
      userId: user.id,
      ...(query.status ? { status: query.status } : {}),
    };
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

  async sendMessage(user: SafeUser, id: string, dto: SendMessageDto) {
    const session = await this.getSession(user, id);

    if (session.status !== 'IN_PROGRESS') {
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

  async finishSession(user: SafeUser, id: string) {
    const session = await this.getSession(user, id);

    if (session.status !== 'IN_PROGRESS') {
      throw new ForbiddenException('Practice session is already finished');
    }

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

  private async searchSafely(user: SafeUser, query: string): Promise<RagSearchResult> {
    try {
      return await this.ragService.search(user, { query, topK: 5 });
    } catch (error) {
      return { degraded: true, sources: [] };
    }
  }

  private generateCustomerReply(
    session: PracticeSessionDetail,
    content: string,
    sources: RagSource[],
  ): string {
    const reference = sources[0]?.content;

    if (reference) {
      return `我理解你提到的「${content.slice(0, 40)}」。不过作为客户，我还想确认：${this.scenarioObjection(session.scenario.type)}你能结合具体价值再说明一下吗？`;
    }

    return `我听到了你的介绍，但我还没有完全理解这对我的实际价值。${this.scenarioObjection(session.scenario.type)}`;
  }

  private generateFeedback(session: PracticeSessionDetail, sources: RagSource[]): PracticeFeedback {
    const userMessages = session.messages.filter((message) => message.role === 'USER');
    const valueKeywords = ['价值', '效率', '成本', '方案', '痛点'];
    const hasValueExpression = userMessages.some((message) =>
      valueKeywords.some((keyword) => message.content.includes(keyword)),
    );
    const baseScore = userMessages.length >= 5 ? 85 : userMessages.length >= 2 ? 75 : 75;
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

  private visibleScenarioConditions(user: SafeUser): Prisma.ScenarioWhereInput[] {
    const conditions: Prisma.ScenarioWhereInput[] = [{ isPreset: true }];

    if (user.teamId) {
      conditions.push({ teamId: user.teamId });
    }

    return conditions;
  }
}
