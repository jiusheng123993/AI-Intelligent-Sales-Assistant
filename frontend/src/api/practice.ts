/**
 * AI 演练模块 API 封装。
 * 职责：演练场景列表、演练会话的创建/查询/消息发送/结束等接口调用，
 * 同时导出场景类型、会话状态、消息/评估实体与请求/响应类型。
 */
import { RagSearchResponse, RagSource } from './rag';
import { http } from './http';

/** 演练场景类型：陌生拜访 / 产品演示 / 商务谈判 / 竞品对比 / 自定义 */
export type ScenarioType = 'COLD_CALL' | 'PRODUCT_DEMO' | 'NEGOTIATION' | 'COMPETITOR' | 'CUSTOM';
/** 演练会话状态：进行中 / 已结束 */
export type PracticeSessionStatus = 'IN_PROGRESS' | 'FINISHED';

/** 演练场景实体 */
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

/** 演练会话中的一条对话消息 */
export interface PracticeMessage {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  rating: number | null;
  feedback: string | null;
  createdAt: string;
}

/** 演练会话评估记录 */
export interface PracticeEvaluation {
  id: string;
  sessionId: string;
  evaluatorId: string;
  score: number;
  comments: string | null;
  createdAt: string;
}

/** 演练会话详情（含场景、消息列表、评估列表） */
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

/** 创建演练会话请求体 */
export interface CreatePracticeSessionRequest {
  scenarioId: string;
}

/** 演练会话列表查询参数 */
export interface ListPracticeSessionsParams {
  page?: number;
  pageSize?: number;
  status?: PracticeSessionStatus;
}

/** 演练会话列表分页响应 */
export interface ListPracticeSessionsResponse {
  items: PracticeSessionDetail[];
  total: number;
  page: number;
  pageSize: number;
}

/** 发送演练消息请求体 */
export interface SendPracticeMessageRequest {
  content: string;
}

/** 发送演练消息响应（会话快照 + RAG 检索来源） */
export interface SendPracticeMessageResponse {
  session: PracticeSessionDetail;
  rag: RagSearchResponse;
}

/** 结束演练会话响应（会话快照 + 评分反馈） */
export interface FinishPracticeSessionResponse {
  session: PracticeSessionDetail;
  feedback: {
    score: number;
    comments: string;
    sources: RagSource[];
  };
}

/**
 * 获取全部可选演练场景。
 */
export async function listPracticeScenarios() {
  const response = await http.get<PracticeScenario[]>('/practice/scenarios');

  return response.data;
}

/**
 * 基于指定场景创建一次新的演练会话。
 */
export async function createPracticeSession(payload: CreatePracticeSessionRequest) {
  const response = await http.post<PracticeSessionDetail>('/practice/sessions', payload);

  return response.data;
}

/**
 * 分页获取当前用户的历史演练会话列表。
 */
export async function listPracticeSessions(params: ListPracticeSessionsParams = {}) {
  const response = await http.get<ListPracticeSessionsResponse>('/practice/sessions', { params });

  return response.data;
}

/**
 * 按 ID 获取单次演练会话的详细信息。
 */
export async function getPracticeSession(id: string) {
  const response = await http.get<PracticeSessionDetail>(`/practice/sessions/${id}`);

  return response.data;
}

/**
 * 在指定会话中发送一条销售消息，触发 AI 回复与 RAG 检索。
 */
export async function sendPracticeMessage(id: string, payload: SendPracticeMessageRequest) {
  const response = await http.post<SendPracticeMessageResponse>(`/practice/sessions/${id}/messages`, payload);

  return response.data;
}

/**
 * 结束指定演练会话，返回最终的评分与反馈。
 */
export async function finishPracticeSession(id: string) {
  const response = await http.post<FinishPracticeSessionResponse>(`/practice/sessions/${id}/finish`);

  return response.data;
}
