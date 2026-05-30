import { AnalyticsController } from './analytics.controller';

const user = { id: 'user-1', teamId: 'team-1' } as any;
const dto = {
  source: 'SIDEPANEL' as const,
  mode: 'suggest' as const,
  status: 'SUCCESS' as const,
  durationMs: 500,
  pageHost: 'work.weixin.qq.com',
};

describe('AnalyticsController', () => {
  it('delegates extension usage event recording to service with current user', async () => {
    const createdAt = new Date('2026-05-31T08:00:00.000Z');
    const analyticsService = {
      getSummary: jest.fn(),
      recordExtensionUsageEvent: jest.fn().mockResolvedValue({ id: 'event-1', createdAt }),
    };
    const controller = new AnalyticsController(analyticsService as any);

    const result = await controller.recordExtensionUsageEvent(user, dto);

    expect(analyticsService.recordExtensionUsageEvent).toHaveBeenCalledWith(user, dto);
    expect(result).toEqual({ id: 'event-1', createdAt });
  });
});
