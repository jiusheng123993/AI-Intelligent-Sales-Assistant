import { UserRole } from '@prisma/client';
import { AiService } from './ai.service';

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

const createRagMock = () => ({
  search: jest.fn(),
});

const createConfigMock = (values: Record<string, string | undefined> = {}) => ({
  get: jest.fn((key: string) => values[key]),
});

describe('AiService', () => {
  let rag: ReturnType<typeof createRagMock>;
  let config: ReturnType<typeof createConfigMock>;
  let service: AiService;

  beforeEach(() => {
    rag = createRagMock();
    config = createConfigMock();
    service = new AiService(rag as any, config as any);
    jest.restoreAllMocks();
  });

  it('generates suggest chunks with visible RAG sources', async () => {
    rag.search.mockResolvedValue({
      degraded: false,
      sources: [
        {
          id: 'script:script-1',
          sourceType: 'SCRIPT',
          sourceId: 'script-1',
          title: '价格异议处理',
          content: '先共情，再强调价值与长期收益。',
        },
      ],
    });

    const result = await service.generateSuggestion(user, {
      contextText: '客户觉得价格有点贵，还在犹豫。',
      inputText: '',
      mode: 'suggest',
      locale: 'zh-CN',
      platform: 'wecom',
    });

    expect(result.requestId).toMatch(/^ai_/);
    expect(rag.search).toHaveBeenCalledWith(user, {
      query: '客户觉得价格有点贵，还在犹豫。',
      topK: 5,
    });
    expect(result.sources).toHaveLength(1);
    expect(result.text).toContain('推荐回复');
    expect(result.text).toContain('价格异议处理');
    expect(result.chunks.length).toBeGreaterThan(1);
  });

  it('polishes input text when mode is polish', async () => {
    rag.search.mockResolvedValue({ degraded: true, sources: [] });

    const result = await service.generateSuggestion(user, {
      contextText: '客户正在询问实施周期。',
      inputText: '我们很快就能做完',
      mode: 'polish',
    });

    expect(result.text).toContain('润色表达');
    expect(result.text).toContain('我们很快就能做完');
  });

  it('translates input text when mode is translate', async () => {
    rag.search.mockResolvedValue({ degraded: true, sources: [] });

    const result = await service.generateSuggestion(user, {
      contextText: '',
      inputText: 'Please send me the plan tomorrow.',
      mode: 'translate',
      locale: 'zh-CN',
    });

    expect(result.text).toContain('翻译优化');
    expect(result.text).toContain('Please send me the plan tomorrow.');
  });

  it('expands short input text when mode is expand', async () => {
    rag.search.mockResolvedValue({ degraded: true, sources: [] });

    const result = await service.generateSuggestion(user, {
      contextText: '',
      inputText: '可以先试用',
      mode: 'expand',
    });

    expect(result.text).toContain('扩写话术');
    expect(result.text).toContain('可以先试用');
  });

  it('falls back when RAG search fails', async () => {
    rag.search.mockRejectedValue(new Error('vector store down'));

    const result = await service.generateSuggestion(user, {
      contextText: '客户担心售后没人跟进。',
      inputText: '',
      mode: 'suggest',
    });

    expect(result.degraded).toBe(true);
    expect(result.sources).toEqual([]);
    expect(result.text).toContain('推荐回复');
  });

  it('uses OpenAI chat completion when api key is configured', async () => {
    rag.search.mockResolvedValue({ degraded: false, sources: [] });
    config = createConfigMock({ OPENAI_API_KEY: 'test-key', OPENAI_MODEL: 'gpt-test' });
    service = new AiService(rag as any, config as any);
    const create = jest.fn().mockResolvedValue({
      choices: [{ message: { content: '真实模型生成的话术建议' } }],
    });
    jest.spyOn(service as any, 'createOpenAiClient').mockReturnValue({
      chat: { completions: { create } },
    });

    const result = await service.generateSuggestion(user, {
      contextText: '客户需要报价。',
      inputText: '',
      mode: 'suggest',
    });

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ model: 'gpt-test' }));
    expect(result.text).toBe('真实模型生成的话术建议');
  });

  it('falls back when OpenAI returns empty content', async () => {
    rag.search.mockResolvedValue({ degraded: false, sources: [] });
    config = createConfigMock({ OPENAI_API_KEY: 'test-key' });
    service = new AiService(rag as any, config as any);
    jest.spyOn(service as any, 'createOpenAiClient').mockReturnValue({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({ choices: [{ message: { content: '' } }] }),
        },
      },
    });

    const result = await service.generateSuggestion(user, {
      contextText: '客户需要报价。',
      inputText: '',
      mode: 'suggest',
    });

    expect(result.degraded).toBe(true);
    expect(result.text).toContain('推荐回复');
  });

  it('builds safe SSE events for chunk and done', async () => {
    rag.search.mockResolvedValue({ degraded: true, sources: [] });

    const result = await service.generateSuggestion(user, {
      contextText: '客户需要报价。',
      inputText: '',
      mode: 'suggest',
    });
    const events = service.toSseEvents(result);

    expect(events[0]).toContain('event: chunk');
    expect(events[0]).toContain(result.requestId);
    expect(events.at(-1)).toContain('event: done');
  });
});
