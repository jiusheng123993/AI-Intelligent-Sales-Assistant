import { http } from './http';

export type AnalyticsScriptCategory = 'INTRODUCTION' | 'OBJECTION_HANDLING' | 'CLOSING' | 'FOLLOW_UP' | 'CUSTOM';

export interface AnalyticsSummaryParams {
  from?: string;
  to?: string;
}

export interface AnalyticsOverview {
  scriptCount: number;
  practiceSessionCount: number;
  averageScore: number | null;
  knowledgeDocumentCount: number;
}

export interface PracticeTrendPoint {
  date: string;
  sessionCount: number;
  averageScore: number | null;
}

export interface ScriptCategoryDistributionItem {
  category: AnalyticsScriptCategory;
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
  createdAt: string;
}

export interface AnalyticsSummary {
  overview: AnalyticsOverview;
  practiceTrend: PracticeTrendPoint[];
  scriptCategoryDistribution: ScriptCategoryDistributionItem[];
  memberRanking: MemberRankingItem[];
  recentSessions: RecentPracticeSessionItem[];
}

export async function getAnalyticsSummary(params: AnalyticsSummaryParams = {}) {
  const response = await http.get<AnalyticsSummary>('/analytics/summary', { params });

  return response.data;
}
