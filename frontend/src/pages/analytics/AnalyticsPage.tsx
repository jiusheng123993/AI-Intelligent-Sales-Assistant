import { Alert, Button, Card, Col, Empty, Row, Space, Statistic, Table, Typography } from 'antd';
import ReactECharts from 'echarts-for-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { getAnalyticsSummary, RecentPracticeSessionItem, AnalyticsSummary } from '@/api/analytics';

const categoryLabels: Record<string, string> = {
  INTRODUCTION: '开场破冰',
  OBJECTION_HANDLING: '异议处理',
  CLOSING: '成交推进',
  FOLLOW_UP: '跟进复访',
  CUSTOM: '自定义',
};

function emptySummary(): AnalyticsSummary {
  return {
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
  };
}

export function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary>(emptySummary());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedInitialSummary = useRef(false);

  const loadSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getAnalyticsSummary();
      setSummary(result);
    } catch {
      setError('数据分析加载失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasLoadedInitialSummary.current) {
      return;
    }

    hasLoadedInitialSummary.current = true;
    void loadSummary();
  }, [loadSummary]);

  const trendOption = useMemo(() => ({
    title: { text: '演练趋势' },
    tooltip: { trigger: 'axis' },
    legend: { data: ['演练次数', '平均得分'] },
    xAxis: { type: 'category', data: summary.practiceTrend.map((item) => item.date) },
    yAxis: [{ type: 'value' }, { type: 'value', min: 0, max: 100 }],
    series: [
      { name: '演练次数', type: 'bar', data: summary.practiceTrend.map((item) => item.sessionCount) },
      { name: '平均得分', type: 'line', yAxisIndex: 1, data: summary.practiceTrend.map((item) => item.averageScore ?? 0) },
    ],
  }), [summary.practiceTrend]);

  const categoryOption = useMemo(() => ({
    title: { text: '话术分类分布' },
    tooltip: { trigger: 'item' },
    series: [
      {
        name: '话术分类',
        type: 'pie',
        radius: '60%',
        data: summary.scriptCategoryDistribution.map((item) => ({
          name: categoryLabels[item.category] ?? item.category,
          value: item.count,
        })),
      },
    ],
  }), [summary.scriptCategoryDistribution]);

  const columns: ColumnsType<RecentPracticeSessionItem> = [
    {
      title: '成员',
      dataIndex: 'userName',
      key: 'userName',
    },
    {
      title: '场景',
      dataIndex: 'scenarioTitle',
      key: 'scenarioTitle',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
    },
    {
      title: '得分',
      dataIndex: 'score',
      key: 'score',
      render: (score: number | null) => score ?? '--',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (createdAt: string) => new Date(createdAt).toLocaleString('zh-CN'),
    },
  ];

  return (
    <main className="analytics-page">
      <section className="analytics-toolbar">
        <div>
          <Typography.Title level={2}>数据分析看板</Typography.Title>
          <Typography.Paragraph className="analytics-subtitle">聚合话术、演练和知识库数据，辅助销售管理与培训复盘。</Typography.Paragraph>
        </div>
        <Button onClick={() => void loadSummary()} loading={isLoading}>刷新数据</Button>
      </section>

      {error ? <Alert type="error" showIcon message={error} className="analytics-alert" /> : null}

      <Row gutter={[16, 16]} className="analytics-stat-grid">
        <Col xs={24} sm={12} lg={6}>
          <Card loading={isLoading}>
            <Statistic title="话术总数" value={summary.overview.scriptCount} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={isLoading}>
            <Statistic title="演练会话数" value={summary.overview.practiceSessionCount} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={isLoading}>
            <Statistic title="平均演练分" value={summary.overview.averageScore ?? '--'} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={isLoading}>
            <Statistic title="知识文档数" value={summary.overview.knowledgeDocumentCount} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]} className="analytics-chart-grid">
        <Col xs={24} lg={14}>
          <Card className="analytics-card" loading={isLoading}>
            {summary.practiceTrend.length > 0 ? <ReactECharts option={trendOption} /> : <Empty description="暂无数据" />}
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card className="analytics-card" loading={isLoading}>
            {summary.scriptCategoryDistribution.length > 0 ? <ReactECharts option={categoryOption} /> : <Empty description="暂无数据" />}
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]} className="analytics-table-grid">
        <Col xs={24} lg={8}>
          <Card title="成员演练排行" className="analytics-card" loading={isLoading}>
            {summary.memberRanking.length > 0 ? (
              <Space direction="vertical" className="analytics-ranking">
                {summary.memberRanking.map((item) => (
                  <Card key={item.userId} size="small">
                    <Space direction="vertical">
                      <Typography.Text strong>{item.userName}</Typography.Text>
                      <Typography.Text type="secondary">{item.sessionCount} 次演练 · {item.averageScore ?? '--'} 分</Typography.Text>
                    </Space>
                  </Card>
                ))}
              </Space>
            ) : (
              <Empty description="暂无数据" />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={16}>
          <Card title="最近演练记录" className="analytics-card" loading={isLoading}>
            <Table rowKey="id" columns={columns} dataSource={summary.recentSessions} pagination={false} locale={{ emptyText: '暂无数据' }} />
          </Card>
        </Col>
      </Row>
    </main>
  );
}
