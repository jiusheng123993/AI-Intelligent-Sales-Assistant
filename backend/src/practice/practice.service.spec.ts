import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ScenarioType, UserRole } from '@prisma/client';
import { PracticeService } from './practice.service';

const now = new Date('2026-05-30T00:00:00.000Z');

const user = {
  id: 'user-1',
  email: 'sales@example.com',
  name: '销售顾问',
  role: UserRole.SALES,
  teamId: 'team-1',
  createdAt: now,
  updatedAt: now,
};

const scenario = {
  id: 'scenario-1',
  title: '价格异议处理',
  description: '客户认为产品价格偏高，需要销售解释价值。',
  type: ScenarioType.NEGOTIATION,
  setting: { customer: '预算谨慎型客户' },
  isPreset: true,
  teamId: null,
  createdAt: now,
  updatedAt: now,
};

const session = {
  id: 'session-1',
  userId: 'user-1',
  scenarioId: 'scenario-1',
  status: 'IN_PROGRESS',
  score: null,
  createdAt: now,
  updatedAt: now,
  scenario,
  messages: [],
  evaluations: [],
};

const userMessage = {
  id: 'message-1',
  sessionId: 'session-1',
  role: 'USER',
  content: '我们能帮助您降低沟通成本，提高跟进效率。',
  rating: null,
  feedback: null,
  createdAt: now,
};

const assistantMessage = {
  id: 'message-2',
  sessionId: 'session-1',
  role: 'ASSISTANT',
  content: '听起来不错，但我还是担心价格投入是否值得。',
  rating: null,
  feedback: '参考来源：效率价值话术',
  createdAt: now,
};

const createPrismaMock = () => ({
  evaluation: {
    create: jest.fn(),
  },
  practiceMessage: {
    create: jest.fn(),
  },
  practiceSession: {
    count: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  scenario: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
});

const createRagMock = () => ({
  search: jest.fn(),
});

describe('PracticeService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let rag: ReturnType<typeof createRagMock>;
  let service: PracticeService;

  beforeEach(() => {
    prisma = createPrismaMock();
    rag = createRagMock();
    service = new PracticeService(prisma as any, rag as any);
  });

  it('lists visible scenarios for current user', async () => {
    prisma.scenario.findMany.mockResolvedValue([scenario]);

    const result = await service.listScenarios(user);

    expect(prisma.scenario.findMany).toHaveBeenCalledWith({
      where: { OR: [{ isPreset: true }, { teamId: 'team-1' }] },
      orderBy: { updatedAt: 'desc' },
    });
    expect(result).toEqual([scenario]);
  });

  it('creates a practice session with opening assistant message', async () => {
    prisma.scenario.findFirst.mockResolvedValue(scenario);
    prisma.practiceSession.create.mockResolvedValue({
      ...session,
      messages: [assistantMessage],
    });

    const result = await service.createSession(user, { scenarioId: 'scenario-1' });

    expect(prisma.practiceSession.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        scenarioId: 'scenario-1',
        status: 'IN_PROGRESS',
        messages: {
          create: expect.objectContaining({ role: 'ASSISTANT' }),
        },
      },
      include: expect.any(Object),
    });
    expect(result.messages).toHaveLength(1);
  });

  it('sends user message, searches RAG and stores assistant reply with sources', async () => {
    prisma.practiceSession.findFirst
      .mockResolvedValueOnce({ ...session, messages: [] })
      .mockResolvedValueOnce({ ...session, messages: [userMessage, assistantMessage] });
    prisma.practiceMessage.create
      .mockResolvedValueOnce(userMessage)
      .mockResolvedValueOnce(assistantMessage);
    rag.search.mockResolvedValue({
      degraded: false,
      sources: [
        {
          id: 'script:script-1',
          sourceType: 'SCRIPT',
          sourceId: 'script-1',
          title: '效率价值话术',
          content: '强调效率和成本价值。',
        },
      ],
    });

    const result = await service.sendMessage(user, 'session-1', { content: '我们能提高效率。' });

    expect(rag.search).toHaveBeenCalledWith(user, { query: '我们能提高效率。', topK: 5 });
    expect(prisma.practiceMessage.create).toHaveBeenCalledTimes(2);
    expect(result.rag.sources[0].title).toBe('效率价值话术');
    expect(result.session.messages).toHaveLength(2);
  });

  it('rejects sending messages to finished sessions', async () => {
    prisma.practiceSession.findFirst.mockResolvedValue({ ...session, status: 'FINISHED' });

    await expect(
      service.sendMessage(user, 'session-1', { content: '继续发送' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('finishes a session and creates evaluation with RAG sources', async () => {
    prisma.practiceSession.findFirst
      .mockResolvedValueOnce({ ...session, messages: [userMessage, assistantMessage] })
      .mockResolvedValueOnce({
        ...session,
        status: 'FINISHED',
        score: 85,
        messages: [userMessage, assistantMessage],
        evaluations: [
          {
            id: 'evaluation-1',
            sessionId: 'session-1',
            evaluatorId: 'user-1',
            score: 85,
            comments: '表现良好',
            createdAt: now,
          },
        ],
      });
    prisma.practiceSession.update.mockResolvedValue({ ...session, status: 'FINISHED', score: 85 });
    prisma.evaluation.create.mockResolvedValue({ id: 'evaluation-1' });
    rag.search.mockResolvedValue({ degraded: false, sources: [] });

    const result = await service.finishSession(user, 'session-1');

    expect(prisma.practiceSession.update).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: { status: 'FINISHED', score: 85 },
    });
    expect(prisma.evaluation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ sessionId: 'session-1', evaluatorId: 'user-1', score: 85 }),
    });
    expect(result.feedback.score).toBe(85);
  });

  it('throws not found for other users sessions', async () => {
    prisma.practiceSession.findFirst.mockResolvedValue(null);

    await expect(service.getSession(user, 'other-session')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
