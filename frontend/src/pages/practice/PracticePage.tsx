/**
 * AI 演练场页面组件文件。
 * 职责：加载演练场景与历史会话；提供"开始演练→发送消息→结束并打分"完整交互；
 * 展示 RAG 检索来源与最终评分反馈，错误统一以 Alert 中文提示。
 */
import { Alert, Button, Card, Col, Input, List, Row, Space, Tag, Typography } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPracticeSession, finishPracticeSession, listPracticeScenarios, listPracticeSessions, PracticeScenario, PracticeSessionDetail, sendPracticeMessage } from '@/api/practice';
import { RagSource } from '@/api/rag';

/** 场景类型枚举到中文标签的映射 */
const scenarioLabels: Record<string, string> = {
  COLD_CALL: '陌生拜访',
  PRODUCT_DEMO: '产品演示',
  NEGOTIATION: '商务谈判',
  COMPETITOR: '竞品对比',
  CUSTOM: '自定义',
};

/**
 * PracticePage：AI 演练场页面，串联场景列表、会话发起、对话发送与结束打分流程。
 */
export function PracticePage() {
  const [scenarios, setScenarios] = useState<PracticeScenario[]>([]);
  const [sessions, setSessions] = useState<PracticeSessionDetail[]>([]);
  const [activeSession, setActiveSession] = useState<PracticeSessionDetail | null>(null);
  const [sources, setSources] = useState<RagSource[]>([]);
  const [feedback, setFeedback] = useState<{ score: number; comments: string; sources: RagSource[] } | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 防止 StrictMode 下首屏重复加载初始数据的“一次性”闸门
  const hasLoadedInitialData = useRef(false);

  // useCallback 缓存初始数据加载逻辑：并发请求场景与会话列表，提高首屏速度
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [scenarioItems, sessionResult] = await Promise.all([
        listPracticeScenarios(),
        listPracticeSessions({ page: 1, pageSize: 10 }),
      ]);
      setScenarios(scenarioItems);
      setSessions(sessionResult.items);
    } catch {
      // 错误兜底：初始数据加载失败时仅提示，不破坏已有 UI
      setError('演练数据加载失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 副作用：首次挂载时加载演练场景与历史会话；ref 闸门保证只执行一次
  useEffect(() => {
    if (hasLoadedInitialData.current) {
      return;
    }

    hasLoadedInitialData.current = true;
    void loadData();
  }, [loadData]);

  // 开始演练：创建新会话，重置 RAG 来源与上一次反馈，并刷新历史列表
  async function handleStart(scenarioId: string) {
    setError(null);
    setFeedback(null);
    setSources([]);

    try {
      const session = await createPracticeSession({ scenarioId });
      setActiveSession(session);
      await loadData();
    } catch {
      // 错误兜底：创建失败统一提示
      setError('演练创建失败，请稍后重试');
    }
  }

  // 发送演练消息：拒绝空消息，发送后同步会话快照与 RAG 来源
  async function handleSend() {
    const trimmedMessage = message.trim();

    if (!activeSession || !trimmedMessage) {
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const result = await sendPracticeMessage(activeSession.id, { content: trimmedMessage });
      setActiveSession(result.session);
      setSources(result.rag.sources);
      setMessage('');
    } catch {
      // 错误兜底：发送失败时保留输入框内容，便于用户重试
      setError('消息发送失败，请稍后重试');
    } finally {
      setIsSending(false);
    }
  }

  // 结束演练：触发评分流程，将反馈与最终来源同步到 UI
  async function handleFinish() {
    if (!activeSession) {
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const result = await finishPracticeSession(activeSession.id);
      setActiveSession(result.session);
      setFeedback(result.feedback);
      setSources(result.feedback.sources);
      await loadData();
    } catch {
      // 错误兜底：结束失败时仍允许用户继续操作或重试
      setError('结束演练失败，请稍后重试');
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="practice-page">
      <section className="practice-toolbar">
        <div>
          <Typography.Title level={2}>AI 话术演练场</Typography.Title>
          <Typography.Paragraph className="practice-subtitle">基于话术库和上传文档进行 RAG 检索，模拟客户异议并生成反馈。</Typography.Paragraph>
        </div>
      </section>

      {error ? <Alert type="error" showIcon message={error} className="practice-alert" /> : null}

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={8}>
          <Card title="演练场景" loading={isLoading}>
            <List
              dataSource={scenarios}
              renderItem={(scenario) => (
                <List.Item actions={[<Button key="start" type="primary" onClick={() => void handleStart(scenario.id)}>开始演练</Button>]}>
                  <List.Item.Meta title={<Space>{scenario.title}<Tag>{scenarioLabels[scenario.type]}</Tag></Space>} description={scenario.description} />
                </List.Item>
              )}
            />
          </Card>
          <Card title="历史演练" className="practice-card">
            <List
              dataSource={sessions}
              renderItem={(session) => (
                <List.Item onClick={() => setActiveSession(session)} className="practice-session-item">
                  <List.Item.Meta title={session.scenario.title} description={`${session.status}${session.score ? ` · ${session.score} 分` : ''}`} />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Card title={activeSession ? activeSession.scenario.title : '当前演练'} extra={activeSession && activeSession.status === 'IN_PROGRESS' ? <Button onClick={() => void handleFinish()} loading={isSending}>结束演练</Button> : null}>
            {activeSession ? (
              <>
                <List
                  className="practice-messages"
                  dataSource={activeSession.messages}
                  renderItem={(item) => (
                    <List.Item>
                      <List.Item.Meta title={item.role === 'USER' ? '销售' : 'AI 客户'} description={item.content} />
                    </List.Item>
                  )}
                />
                <Space.Compact className="practice-input">
                  <Input placeholder="输入你的销售回复" value={message} disabled={activeSession.status !== 'IN_PROGRESS'} onChange={(event) => setMessage(event.target.value)} onPressEnter={() => void handleSend()} />
                  <Button type="primary" disabled={activeSession.status !== 'IN_PROGRESS'} loading={isSending} onClick={() => void handleSend()}>
                    发送
                  </Button>
                </Space.Compact>
              </>
            ) : (
              <Typography.Paragraph>请选择左侧场景开始演练。</Typography.Paragraph>
            )}
          </Card>

          <Card title="RAG 参考来源" className="practice-card">
            <List
              dataSource={sources}
              locale={{ emptyText: '暂无参考来源' }}
              renderItem={(source) => (
                <List.Item>
                  <List.Item.Meta title={source.title} description={`${source.sourceType} · ${source.content}`} />
                </List.Item>
              )}
            />
          </Card>

          {feedback ? (
            <Card title="演练评分" className="practice-card">
              <Typography.Title level={3}>{feedback.score} 分</Typography.Title>
              <Typography.Paragraph>{feedback.comments}</Typography.Paragraph>
            </Card>
          ) : null}
        </Col>
      </Row>
    </main>
  );
}
