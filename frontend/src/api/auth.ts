/**
 * 认证模块 API 封装。
 * 职责：登录、注册、获取当前用户信息等鉴权接口的前端调用入口，
 * 同时导出用户角色、用户实体、请求/响应等类型定义。
 */
import { http } from './http';

/** 用户角色枚举：销售 / 培训师 / 经理 / 管理员 */
export type UserRole = 'SALES' | 'TRAINER' | 'MANAGER' | 'ADMIN';

/** 已认证用户的基础信息结构 */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

/** 登录/注册接口的统一响应结构 */
export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

/** 登录请求体 */
export interface LoginRequest {
  email: string;
  password: string;
}

/** 注册请求体（在登录字段基础上扩展姓名） */
export interface RegisterRequest extends LoginRequest {
  name: string;
}

/**
 * 调用登录接口，返回访问令牌与用户信息。
 */
export async function login(payload: LoginRequest) {
  const response = await http.post<AuthResponse>('/auth/login', payload);

  return response.data;
}

/**
 * 调用注册接口，注册成功后直接返回访问令牌与用户信息。
 */
export async function register(payload: RegisterRequest) {
  const response = await http.post<AuthResponse>('/auth/register', payload);

  return response.data;
}

/**
 * 通过当前令牌获取登录用户信息，用于刷新页面后的会话恢复。
 */
export async function getCurrentUser() {
  const response = await http.get<AuthUser>('/auth/me');

  return response.data;
}
