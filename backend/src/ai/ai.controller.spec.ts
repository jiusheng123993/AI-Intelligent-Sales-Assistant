import { Response } from 'express';
import { AiController } from './ai.controller';

const user = { id: 'user-1' } as any;
const dto = {
  contextText: '客户需要报价。',
  inputText: '',
  mode: 'suggest' as const,
};

const createResponse = () => ({
  status: jest.fn().mockReturnThis(),
  write: jest.fn().mockReturnThis(),
  end: jest.fn().mockReturnThis(),
});

describe('AiController', () => {
  it('writes AI suggestion as SSE events', async () => {
    const result = {
      requestId: 'ai_test',
      text: '推荐回复',
      chunks: ['推荐', '回复'],
      sources: [],
      degraded: false,
    };
    const aiService = {
      generateSuggestion: jest.fn().mockResolvedValue(result),
      toSseEvents: jest
        .fn()
        .mockReturnValue([
          'event: chunk\ndata: {"requestId":"ai_test","text":"推荐","index":0}\n\n',
          'event: done\ndata: {"requestId":"ai_test"}\n\n',
        ]),
      toSseErrorEvent: jest.fn(),
    };
    const controller = new AiController(aiService as any);
    const response = createResponse();

    await controller.suggest(user, dto, response as unknown as Response);

    expect(aiService.generateSuggestion).toHaveBeenCalledWith(user, dto);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.write).toHaveBeenCalledTimes(2);
    expect(response.end).toHaveBeenCalledTimes(1);
  });

  it('writes sanitized SSE error when generation fails', async () => {
    const aiService = {
      generateSuggestion: jest.fn().mockRejectedValue(new Error('secret upstream error')),
      toSseEvents: jest.fn(),
      toSseErrorEvent: jest
        .fn()
        .mockReturnValue(
          'event: error\ndata: {"requestId":"ai_fallback","message":"AI 推荐生成失败，请稍后重试"}\n\n',
        ),
    };
    const controller = new AiController(aiService as any);
    const response = createResponse();

    await controller.suggest(user, dto, response as unknown as Response);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.write).toHaveBeenCalledWith(
      expect.stringContaining('AI 推荐生成失败，请稍后重试'),
    );
    expect(response.write).not.toHaveBeenCalledWith(
      expect.stringContaining('secret upstream error'),
    );
    expect(response.end).toHaveBeenCalledTimes(1);
  });
});
