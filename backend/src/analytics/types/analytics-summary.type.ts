import { ScriptCategory } from '@prisma/client';

export interface AnalyticsOverview {
  scriptCount: number;
  practiceSessionCount: number;
  averageScore: number | null;
  knowledgeDocumentCount: number;
  recommendationTriggerCount: number;
}

export interface PracticeTrendPoint {
  date: string;
  sessionCount: number;
  averageScore: number | null;
}

export interface ScriptCategoryDistributionItem {
  category: ScriptCategory;
  count: number;
}

export interface MemberRankingItem {
  userId: string;
  userName: string;
  sessionCount: number;
  averageScore: number | null;
}

export interface RecentPracticeSessionItem {
  id: string;
  userName: string;
  scenarioTitle: string;
  status: string;
  score: number | null;
  createdAt: Date;
}

export interface AnalyticsSummary {
  overview: AnalyticsOverview;
  practiceTrend: PracticeTrendPoint[];
  scriptCategoryDistribution: ScriptCategoryDistributionItem[];
  memberRanking: MemberRankingItem[];
  recentSessions: RecentPracticeSessionItem[];
}
