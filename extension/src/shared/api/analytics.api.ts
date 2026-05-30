import { request } from './http';

export type ExtensionUsageEventSource = 'SIDEPANEL' | 'FLOATING_BUTTON' | 'CONTEXT_MENU' | 'COMMAND';
export type ExtensionUsageEventMode = 'suggest' | 'polish' | 'translate' | 'expand';
export type ExtensionUsageEventStatus = 'SUCCESS' | 'FAILED';

export interface ExtensionUsageEventPayload {
  source: ExtensionUsageEventSource;
  mode: ExtensionUsageEventMode;
  status: ExtensionUsageEventStatus;
  durationMs?: number;
  errorCode?: string;
  pageHost?: string;
}

export interface ExtensionUsageEventResult {
  id: string;
  createdAt: string;
}

function withoutUndefined(payload: ExtensionUsageEventPayload): ExtensionUsageEventPayload {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  ) as ExtensionUsageEventPayload;
}

export const analyticsApi = {
  async recordExtensionUsageEvent(
    payload: ExtensionUsageEventPayload,
  ): Promise<ExtensionUsageEventResult | null> {
    try {
      return await request<ExtensionUsageEventResult>('/analytics/extension-events', {
        method: 'POST',
        body: withoutUndefined(payload),
      });
    } catch {
      return null;
    }
  },
};
