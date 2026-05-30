import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SafeUser } from '../users/types/safe-user.type';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { CreateExtensionUsageEventDto } from './dto/create-extension-usage-event.dto';
import {
  AnalyticsSummary,
  MemberRankingItem,
  PracticeTrendPoint,
} from './types/analytics-summary.type';

const managedRoles = new Set<UserRole>([UserRole.TRAINER, UserRole.MANAGER]);
const maxRangeDays = 180;

interface NormalizedDateRange {
  from: Date;
  to: Date;
  where: {
    gte: Date;
    lte: Date;
  };
}

interface SessionForAnalytics {
  id: string;
  userId: string;
  status: string;
  score: number | null;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
  };
  scenario: {
    title: string;
  };
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async recordExtensionUsageEvent(user: SafeUser, dto: CreateExtensionUsageEventDto) {
    return this.prisma.extensionUsageEvent.create({
      data: {
        userId: user.id,
        teamId: user.teamId ?? null,
        source: dto.source,
        mode: dto.mode,
        status: dto.status,
        durationMs: dto.durationMs ?? null,
        errorCode: dto.errorCode ?? null,
        pageHost: dto.pageHost ?? null,
      },
      select: { id: true, createdAt: true },
    });
  }

  async getSummary(user: SafeUser, query: AnalyticsQueryDto): Promise<AnalyticsSummary> {
    const range = this.normalizeDateRange(query);
    const createdAt = range.where;
    const scriptWhere = this.buildScriptWhere(user, createdAt);
    const practiceSessionWhere = this.buildPracticeSessionWhere(user, createdAt);
    const knowledgeDocumentWhere = this.buildKnowledgeDocumentWhere(user, createdAt);

    const [
      scriptCount,
      practiceSessionCount,
      knowledgeDocumentCount,
      sessions,
      categoryRows,
      recentRows,
    ] = await Promise.all([
      this.prisma.script.count({ where: scriptWhere }),
      this.prisma.practiceSession.count({ where: practiceSessionWhere }),
      this.prisma.knowledgeDocument.count({ where: knowledgeDocumentWhere }),
      this.prisma.practiceSession.findMany({
        where: practiceSessionWhere,
        include: {
          user: { select: { id: true, name: true, email: true } },
          scenario: { select: { title: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.script.groupBy({
        by: ['category'],
        where: scriptWhere,
        _count: { _all: true },
      }),
      this.prisma.practiceSession.findMany({
        where: practiceSessionWhere,
        include: {
          user: { select: { id: true, name: true, email: true } },
          scenario: { select: { title: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);
    const typedSessions = sessions as SessionForAnalytics[];
    const typedRecentRows = recentRows as SessionForAnalytics[];

    return {
      overview: {
        scriptCount,
        practiceSessionCount,
        averageScore: this.averageScore(typedSessions),
        knowledgeDocumentCount,
      },
      practiceTrend: this.buildPracticeTrend(typedSessions),
      scriptCategoryDistribution: categoryRows.map((row) => ({
        category: row.category,
        count: row._count._all,
      })),
      memberRanking: this.buildMemberRanking(typedSessions),
      recentSessions: typedRecentRows.map((session) => ({
        id: session.id,
        userName: session.user?.name ?? session.user?.email ?? '未知用户',
        scenarioTitle: session.scenario?.title ?? '未知场景',
        status: session.status,
        score: session.score,
        createdAt: session.createdAt,
      })),
    };
  }

  private normalizeDateRange(query: AnalyticsQueryDto): NormalizedDateRange {
    const now = new Date();
    const to = query.to ? this.endOfDay(query.to) : this.endOfDay(now.toISOString());
    const from = query.from
      ? this.startOfDay(query.from)
      : this.startOfDay(new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString());

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Invalid analytics date range');
    }

    if (from.getTime() > to.getTime()) {
      throw new BadRequestException('Analytics from date must be before to date');
    }

    const rangeDays = Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));

    if (rangeDays > maxRangeDays) {
      throw new BadRequestException('Analytics date range cannot exceed 180 days');
    }

    return { from, to, where: { gte: from, lte: to } };
  }

  private startOfDay(value: string): Date {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);

    return date;
  }

  private endOfDay(value: string): Date {
    const date = new Date(value);
    date.setHours(23, 59, 59, 999);

    return date;
  }

  private buildScriptWhere(
    user: SafeUser,
    createdAt: Prisma.DateTimeFilter,
  ): Prisma.ScriptWhereInput {
    const where: Prisma.ScriptWhereInput = { createdAt };

    if (user.role === UserRole.ADMIN) {
      return where;
    }

    return {
      ...where,
      OR: this.visibleScriptConditions(user),
    };
  }

  private visibleScriptConditions(user: SafeUser): Prisma.ScriptWhereInput[] {
    const conditions: Prisma.ScriptWhereInput[] = [{ createdById: user.id }, { isPreset: true }];

    if (user.teamId) {
      conditions.push({ isShared: true, teamId: user.teamId });
    }

    return conditions;
  }

  private buildPracticeSessionWhere(
    user: SafeUser,
    createdAt: Prisma.DateTimeFilter,
  ): Prisma.PracticeSessionWhereInput {
    const where: Prisma.PracticeSessionWhereInput = { createdAt };

    if (user.role === UserRole.ADMIN) {
      return where;
    }

    if (managedRoles.has(user.role) && user.teamId) {
      return { ...where, user: { teamId: user.teamId } };
    }

    return { ...where, userId: user.id };
  }

  private buildKnowledgeDocumentWhere(
    user: SafeUser,
    createdAt: Prisma.DateTimeFilter,
  ): Prisma.KnowledgeDocumentWhereInput {
    const where: Prisma.KnowledgeDocumentWhereInput = { createdAt };

    if (user.role === UserRole.ADMIN) {
      return where;
    }

    if (managedRoles.has(user.role) && user.teamId) {
      return { ...where, OR: [{ uploadedById: user.id }, { isShared: true, teamId: user.teamId }] };
    }

    return { ...where, uploadedById: user.id };
  }

  private buildPracticeTrend(sessions: SessionForAnalytics[]): PracticeTrendPoint[] {
    const buckets = new Map<string, { sessionCount: number; scores: number[] }>();

    for (const session of sessions) {
      const date = session.createdAt.toISOString().slice(0, 10);
      const bucket = buckets.get(date) ?? { sessionCount: 0, scores: [] };
      bucket.sessionCount += 1;

      if (typeof session.score === 'number') {
        bucket.scores.push(session.score);
      }

      buckets.set(date, bucket);
    }

    return Array.from(buckets.entries()).map(([date, bucket]) => ({
      date,
      sessionCount: bucket.sessionCount,
      averageScore: this.average(bucket.scores),
    }));
  }

  private buildMemberRanking(sessions: SessionForAnalytics[]): MemberRankingItem[] {
    const buckets = new Map<string, { userName: string; sessionCount: number; scores: number[] }>();

    for (const session of sessions) {
      const userName = session.user?.name ?? session.user?.email ?? '未知用户';
      const bucket = buckets.get(session.userId) ?? { userName, sessionCount: 0, scores: [] };
      bucket.sessionCount += 1;

      if (typeof session.score === 'number') {
        bucket.scores.push(session.score);
      }

      buckets.set(session.userId, bucket);
    }

    return Array.from(buckets.entries())
      .map(([userId, bucket]) => ({
        userId,
        userName: bucket.userName,
        sessionCount: bucket.sessionCount,
        averageScore: this.average(bucket.scores),
      }))
      .sort(
        (left, right) =>
          right.sessionCount - left.sessionCount ||
          (right.averageScore ?? 0) - (left.averageScore ?? 0),
      )
      .slice(0, 10);
  }

  private averageScore(sessions: SessionForAnalytics[]): number | null {
    return this.average(
      sessions
        .map((session) => session.score)
        .filter((score): score is number => typeof score === 'number'),
    );
  }

  private average(values: number[]): number | null {
    if (values.length === 0) {
      return null;
    }

    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  }
}
