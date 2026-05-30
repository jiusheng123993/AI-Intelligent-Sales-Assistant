import { describe, expect, it, vi } from 'vitest';
import { http } from './http';
import { getAnalyticsSummary } from './analytics';

vi.mock('./http', () => ({
  http: {
    get: vi.fn(),
  },
}));

const summary = {
  overview: {
    scriptCount: 12,
    practiceSessionCount: 8,
    averageScore: 86,
    knowledgeDocumentCount: 5,
  },
  practiceTrend: [{ date: '2026-05-30', sessionCount: 3, averageScore: 88 }],
  scriptCategoryDistribution: [{ category: 'OBJECTION_HANDLING', count: 6 }],
  memberRanking: [{ userId: 'user-1', userName: '销售顾问', sessionCount: 4, averageScore: 90 }],
  recentSessions: [
    {
      id: 'session-1',
      userName: '销售顾问',
      scenarioTitle: '价格异议处理',
      status: 'FINISHED',
      score: 90,
      createdAt: '2026-05-30T00:00:00.000Z',
    },
  ],
};

describe('analytics api', () => {
  it('查询数据分析总览', async () => {
    vi.mocked(http.get).mockResolvedValueOnce({ data: summary });

    const result = await getAnalyticsSummary({ from: '2026-05-01', to: '2026-05-30' });

    expect(http.get).toHaveBeenCalledWith('/analytics/summary', {
      params: { from: '2026-05-01', to: '2026-05-30' },
    });
    expect(result).toEqual(summary);
  });

  it('未传参数时使用后端默认日期范围', async () => {
    vi.mocked(http.get).mockResolvedValueOnce({ data: summary });

    await getAnalyticsSummary();

    expect(http.get).toHaveBeenCalledWith('/analytics/summary', { params: {} });
  });
});
