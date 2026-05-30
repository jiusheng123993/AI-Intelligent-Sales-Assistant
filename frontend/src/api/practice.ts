import { RagSearchResponse, RagSource } from './rag';
import { http } from './http';

export type ScenarioType = 'COLD_CALL' | 'PRODUCT_DEMO' | 'NEGOTIATION' | 'COMPETITOR' | 'CUSTOM';
export type PracticeSessionStatus = 'IN_PROGRESS' | 'FINISHED';

export interface PracticeScenario {
  id: string;
  title: string;
  description: string;
  type: ScenarioType;
  setting: unknown;
  isPreset: boolean;
  teamId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PracticeMessage {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  rating: number | null;
  feedback: string | null;
  createdAt: string;
}

export interface PracticeEvaluation {
  id: string;
  sessionId: string;
  evaluatorId: string;
  score: number;
  comments: string | null;
  createdAt: string;
}

export interface PracticeSessionDetail {
  id: string;
  userId: string;
  scenarioId: string;
  status: PracticeSessionStatus;
  score: number | null;
  scenario: PracticeScenario;
  messages: PracticeMessage[];
  evaluations: PracticeEvaluation[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePracticeSessionRequest {
  scenarioId: string;
}

export interface ListPracticeSessionsParams {
  page?: number;
  pageSize?: number;
  status?: PracticeSessionStatus;
}

export interface ListPracticeSessionsResponse {
  items: PracticeSessionDetail[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SendPracticeMessageRequest {
  content: string;
}

export interface SendPracticeMessageResponse {
  session: PracticeSessionDetail;
  rag: RagSearchResponse;
}

export interface FinishPracticeSessionResponse {
  session: PracticeSessionDetail;
  feedback: {
    score: number;
    comments: string;
    sources: RagSource[];
  };
}

export async function listPracticeScenarios() {
  const response = await http.get<PracticeScenario[]>('/practice/scenarios');

  return response.data;
}

export async function createPracticeSession(payload: CreatePracticeSessionRequest) {
  const response = await http.post<PracticeSessionDetail>('/practice/sessions', payload);

  return response.data;
}

export async function listPracticeSessions(params: ListPracticeSessionsParams = {}) {
  const response = await http.get<ListPracticeSessionsResponse>('/practice/sessions', { params });

  return response.data;
}

export async function getPracticeSession(id: string) {
  const response = await http.get<PracticeSessionDetail>(`/practice/sessions/${id}`);

  return response.data;
}

export async function sendPracticeMessage(id: string, payload: SendPracticeMessageRequest) {
  const response = await http.post<SendPracticeMessageResponse>(`/practice/sessions/${id}/messages`, payload);

  return response.data;
}

export async function finishPracticeSession(id: string) {
  const response = await http.post<FinishPracticeSessionResponse>(`/practice/sessions/${id}/finish`);

  return response.data;
}
