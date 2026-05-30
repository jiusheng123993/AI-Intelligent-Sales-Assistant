import { http } from './http';

export type UserRole = 'SALES' | 'TRAINER' | 'MANAGER' | 'ADMIN';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest extends LoginRequest {
  name: string;
}

export async function login(payload: LoginRequest) {
  const response = await http.post<AuthResponse>('/auth/login', payload);

  return response.data;
}

export async function register(payload: RegisterRequest) {
  const response = await http.post<AuthResponse>('/auth/register', payload);

  return response.data;
}

export async function getCurrentUser() {
  const response = await http.get<AuthUser>('/auth/me');

  return response.data;
}
