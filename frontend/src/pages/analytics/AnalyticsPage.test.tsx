import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsPage } from './AnalyticsPage';

vi.mock('echarts-for-react', () => ({
  default: ({ option }: { option: { title?: { text?: string } } }) => <div data-testid="chart">{option.title?.text ?? '图表'}</div>,
}));

vi.mock('@/api/analytics', () => ({
  getAnalyticsSummary: vi.fn(),
}));

import { getAnalyticsSummary } from '@/api/analytics';

const summary = {
  overview: {
    scriptCount: 12,
    practiceSessionCount: 8,
    averageScore: 86,
    knowledgeDocumentCount: 5,
  },
  practiceTrend: [{ date: '2026-05-30', sessionCount: 3, averageScore: 88 }],
  scriptCategoryDistribution: [{ category: 'OBJECTION_HANDLING' as const, count: 6 }],
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

describe('AnalyticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAnalyticsSummary).mockResolvedValue(summary);
  });

  it('加载并展示数据分析看板', async () => {
    render(<AnalyticsPage />);

    expect(await screen.findByText('数据分析看板')).toBeInTheDocument();
    expect(screen.getByText('话术总数')).toBeInTheDocument();
    expect(screen.getByText('演练会话数')).toBeInTheDocument();
    expect(screen.getByText('平均演练分')).toBeInTheDocument();
    expect(screen.getByText('知识文档数')).toBeInTheDocument();
    expect(screen.getAllByText('销售顾问')).toHaveLength(2);
    expect(screen.getByText('价格异议处理')).toBeInTheDocument();
  });

  it('加载失败时展示错误提示', async () => {
    vi.mocked(getAnalyticsSummary).mockRejectedValue(new Error('network error'));

    render(<AnalyticsPage />);

    expect(await screen.findByText('数据分析加载失败，请稍后重试')).toBeInTheDocument();
  });

  it('空数据时展示空态指标', async () => {
    vi.mocked(getAnalyticsSummary).mockResolvedValue({
      overview: {
        scriptCount: 0,
        practiceSessionCount: 0,
        averageScore: null,
        knowledgeDocumentCount: 0,
      },
      practiceTrend: [],
      scriptCategoryDistribution: [],
      memberRanking: [],
      recentSessions: [],
    });

    render(<AnalyticsPage />);

    await waitFor(() => expect(getAnalyticsSummary).toHaveBeenCalled());
    expect(screen.getByText('--')).toBeInTheDocument();
    expect(screen.getAllByText('暂无数据').length).toBeGreaterThan(0);
  });
});
