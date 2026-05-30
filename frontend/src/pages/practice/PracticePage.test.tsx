import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PracticePage } from './PracticePage';

vi.mock('@/api/practice', () => ({
  createPracticeSession: vi.fn(),
  finishPracticeSession: vi.fn(),
  listPracticeScenarios: vi.fn(),
  listPracticeSessions: vi.fn(),
  sendPracticeMessage: vi.fn(),
}));

import { createPracticeSession, finishPracticeSession, listPracticeScenarios, listPracticeSessions, sendPracticeMessage } from '@/api/practice';

const scenario = {
  id: 'scenario-1',
  title: '价格异议处理',
  description: '客户认为产品价格偏高',
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
  status: 'IN_PROGRESS' as const,
  score: null,
  scenario,
  messages: [{ id: 'message-1', sessionId: 'session-1', role: 'ASSISTANT', content: '请开始演练', rating: null, feedback: null, createdAt: '2026-05-30T00:00:00.000Z' }],
  evaluations: [],
  createdAt: '2026-05-30T00:00:00.000Z',
  updatedAt: '2026-05-30T00:00:00.000Z',
};

describe('PracticePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listPracticeScenarios).mockResolvedValue([scenario]);
    vi.mocked(listPracticeSessions).mockResolvedValue({ items: [session], total: 1, page: 1, pageSize: 10 });
  });

  it('加载并展示演练场景', async () => {
    render(<PracticePage />);

    expect(await screen.findAllByText('价格异议处理')).toHaveLength(2);
    expect(screen.getByText('客户认为产品价格偏高')).toBeInTheDocument();
  });

  it('开始演练后展示会话消息', async () => {
    vi.mocked(createPracticeSession).mockResolvedValue(session);
    render(<PracticePage />);

    fireEvent.click(await screen.findByRole('button', { name: '开始演练' }));

    expect(await screen.findByText('请开始演练')).toBeInTheDocument();
    expect(createPracticeSession).toHaveBeenCalledWith({ scenarioId: 'scenario-1' });
  });

  it('发送消息后展示 RAG 来源', async () => {
    vi.mocked(createPracticeSession).mockResolvedValue(session);
    vi.mocked(sendPracticeMessage).mockResolvedValue({
      session: {
        ...session,
        messages: [...session.messages, { id: 'message-2', sessionId: 'session-1', role: 'USER', content: '我们能提升效率', rating: null, feedback: null, createdAt: '2026-05-30T00:00:00.000Z' }],
      },
      rag: { degraded: false, sources: [{ id: 'script:1', sourceType: 'SCRIPT', sourceId: '1', title: '效率话术', content: '提升效率' }] },
    });
    render(<PracticePage />);

    fireEvent.click(await screen.findByRole('button', { name: '开始演练' }));
    fireEvent.change(await screen.findByPlaceholderText('输入你的销售回复'), { target: { value: '我们能提升效率' } });
    fireEvent.click(screen.getByRole('button', { name: /发\s*送/ }));

    expect(await screen.findByText('效率话术')).toBeInTheDocument();
  });

  it('结束演练后展示评分反馈', async () => {
    vi.mocked(createPracticeSession).mockResolvedValue(session);
    vi.mocked(finishPracticeSession).mockResolvedValue({
      session: { ...session, status: 'FINISHED', score: 85 },
      feedback: { score: 85, comments: '表现良好', sources: [] },
    });
    render(<PracticePage />);

    fireEvent.click(await screen.findByRole('button', { name: '开始演练' }));
    fireEvent.click(await screen.findByRole('button', { name: '结束演练' }));

    await waitFor(() => expect(finishPracticeSession).toHaveBeenCalledWith('session-1'));
    expect(await screen.findByText('85 分')).toBeInTheDocument();
    expect(screen.getByText('表现良好')).toBeInTheDocument();
  });
});
