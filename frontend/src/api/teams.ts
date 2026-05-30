/**
 * 团队与权限管理模块的前端 API 封装。
 * 所有方法都依赖 `http` 实例，token 注入与全局错误处理由 http 拦截器统一负责。
 */
import { http } from './http';

/** 与后端 Prisma UserRole 完全对齐 */
export type UserRole = 'SALES' | 'TRAINER' | 'MANAGER' | 'ADMIN';

/** 派生邀请状态，由后端基于 expiresAt / usedAt / revokedAt 计算 */
export type InvitationStatus = 'PENDING' | 'USED' | 'EXPIRED' | 'REVOKED';

/** 团队最基础字段 */
export interface TeamSummary {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

/** 团队成员摘要（用于团队详情中的成员列表） */
export interface TeamMemberSummary {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

/** 团队详情：摘要 + 成员清单 + 当前用户是否 owner */
export interface TeamDetail extends TeamSummary {
  members: TeamMemberSummary[];
  isOwner: boolean;
}

/** 邀请记录详情，附带派生状态字段，便于前端直接渲染 */
export interface InvitationDetail {
  id: string;
  code: string;
  teamId: string;
  role: UserRole;
  invitedBy: string;
  expiresAt: string;
  usedAt: string | null;
  usedById: string | null;
  revokedAt: string | null;
  createdAt: string;
  status: InvitationStatus;
}

/** 创建团队入参 */
export interface CreateTeamRequest {
  name: string;
}

/** 改名 / 解散用同一个简单入参 */
export interface UpdateTeamRequest {
  name: string;
}

/** 转让 owner 入参 */
export interface TransferOwnershipRequest {
  targetUserId: string;
}

/** 调整成员角色入参；后端会拒绝 ADMIN */
export interface UpdateMemberRoleRequest {
  role: UserRole;
}

/** 生成邀请的可选入参；默认 SALES 角色，7 天过期 */
export interface CreateInvitationRequest {
  role?: UserRole;
  expiresInDays?: number;
}

/** 接受邀请入参；code 为 16 位 base32 */
export interface AcceptInvitationRequest {
  code: string;
}

/** 创建团队 */
export async function createTeam(payload: CreateTeamRequest): Promise<TeamSummary> {
  const response = await http.post<TeamSummary>('/teams', payload);
  return response.data;
}

/**
 * 查询当前用户所属团队详情。
 * 未归属任何团队时后端返回 null，前端据此引导用户走「创建/加入」流程。
 */
export async function findMyTeam(): Promise<TeamDetail | null> {
  const response = await http.get<TeamDetail | null>('/teams/me');
  return response.data;
}

/** 改团队名（owner / ADMIN） */
export async function renameTeam(teamId: string, payload: UpdateTeamRequest): Promise<TeamSummary> {
  const response = await http.patch<TeamSummary>(`/teams/${teamId}`, payload);
  return response.data;
}

/** 解散团队（owner / ADMIN） */
export async function disbandTeam(teamId: string): Promise<void> {
  await http.delete(`/teams/${teamId}`);
}

/** 转让所有权（仅当前 owner） */
export async function transferOwnership(
  teamId: string,
  payload: TransferOwnershipRequest,
): Promise<void> {
  await http.post(`/teams/${teamId}/transfer`, payload);
}

/** 退出团队（非 owner） */
export async function leaveTeam(teamId: string): Promise<void> {
  await http.post(`/teams/${teamId}/leave`);
}

/** 移除成员（owner / MANAGER / ADMIN） */
export async function removeMember(teamId: string, memberId: string): Promise<void> {
  await http.delete(`/teams/${teamId}/members/${memberId}`);
}

/** 调整成员角色（owner / MANAGER / ADMIN，不允许提至 ADMIN） */
export async function updateMemberRole(
  teamId: string,
  memberId: string,
  payload: UpdateMemberRoleRequest,
): Promise<void> {
  await http.patch(`/teams/${teamId}/members/${memberId}/role`, payload);
}

/** 生成邀请码（owner / MANAGER / TRAINER / ADMIN） */
export async function createInvitation(
  teamId: string,
  payload: CreateInvitationRequest,
): Promise<InvitationDetail> {
  const response = await http.post<InvitationDetail>(`/teams/${teamId}/invitations`, payload);
  return response.data;
}

/** 列出团队所有邀请，含派生状态 */
export async function listInvitations(teamId: string): Promise<InvitationDetail[]> {
  const response = await http.get<InvitationDetail[]>(`/teams/${teamId}/invitations`);
  return response.data;
}

/** 撤销未使用未撤销的邀请 */
export async function revokeInvitation(teamId: string, invitationId: string): Promise<void> {
  await http.delete(`/teams/${teamId}/invitations/${invitationId}`);
}

/** 凭邀请码加入团队（顶级路径，便于无团队用户访问） */
export async function acceptInvitation(payload: AcceptInvitationRequest): Promise<void> {
  await http.post('/invitations/accept', payload);
}

