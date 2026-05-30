import { describe, expect, it, vi } from 'vitest';
import { http } from './http';
import { createPracticeSession, finishPracticeSession, getPracticeSession, listPracticeScenarios, listPracticeSessions, sendPracticeMessage } from './practice';

vi.mock('./http', () => ({
  http: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const scenario = {
  id: 'scenario-1',
  title: '价格异议处理',
  description: '客户认为价格较高',
  type: 'NEGOTIATION' as const,
  setting: {},
  isPreset: true,
  teamId: null,
  createdAt: '2026-05-30T00:00:00.000Z',
  updatedAt: '2026-05-30T00:00:00.000Z',
};

const session = {
  id: 'session-1',
  userId: 'user-1',
  scenarioId: 'scenario-1',
  status: 'IN_PROGRESS',
  score: null,
  scenario,
  messages: [],
  evaluations: [],
  createdAt: '2026-05-30T00:00:00.000Z',
  updatedAt: '2026-05-30T00:00:00.000Z',
};

describe('practice api', () => {
  it('查询演练场景', async () => {
    vi.mocked(http.get).mockResolvedValueOnce({ data: [scenario] });

    const result = await listPracticeScenarios();

    expect(http.get).toHaveBeenCalledWith('/practice/scenarios');
    expect(result).toEqual([scenario]);
  });

  it('创建演练会话', async () => {
    vi.mocked(http.post).mockResolvedValueOnce({ data: session });

    const result = await createPracticeSession({ scenarioId: 'scenario-1' });

    expect(http.post).toHaveBeenCalledWith('/practice/sessions', { scenarioId: 'scenario-1' });
    expect(result).toEqual(session);
  });

  it('查询演练会话列表', async () => {
    vi.mocked(http.get).mockResolvedValueOnce({ data: { items: [session], total: 1, page: 1, pageSize: 10 } });

    const result = await listPracticeSessions({ status: 'IN_PROGRESS', page: 1, pageSize: 10 });

    expect(http.get).toHaveBeenCalledWith('/practice/sessions', { params: { status: 'IN_PROGRESS', page: 1, pageSize: 10 } });
    expect(result.items).toEqual([session]);
  });

  it('查询演练会话详情', async () => {
    vi.mocked(http.get).mockResolvedValueOnce({ data: session });

    const result = await getPracticeSession('session-1');

    expect(http.get).toHaveBeenCalledWith('/practice/sessions/session-1');
    expect(result).toEqual(session);
  });

  it('发送演练消息', async () => {
    const response = { session, rag: { degraded: false, sources: [] } };
    vi.mocked(http.post).mockResolvedValueOnce({ data: response });

    const result = await sendPracticeMessage('session-1', { content: '我们能提升效率' });

    expect(http.post).toHaveBeenCalledWith('/practice/sessions/session-1/messages', { content: '我们能提升效率' });
    expect(result).toEqual(response);
  });

  it('结束演练会话', async () => {
    const response = { session: { ...session, status: 'FINISHED' as const, score: 85 }, feedback: { score: 85, comments: '表现良好', sources: [] } };
    vi.mocked(http.post).mockResolvedValueOnce({ data: response });

    const result = await finishPracticeSession('session-1');

    expect(http.post).toHaveBeenCalledWith('/practice/sessions/session-1/finish');
    expect(result.feedback.score).toBe(85);
  });
});
