/**
 * 全局 Axios HTTP 客户端封装。
 * 职责：
 *  1) 提供统一的 baseURL（取自 VITE_API_BASE_URL 环境变量，缺省回退到本地开发地址）；
 *  2) 请求拦截器自动附加 Bearer Token；
 *  3) 响应拦截器在收到 401 时清理本地令牌，触发未登录态。
 */
import axios from 'axios';
import { clearAccessToken, getAccessToken } from '@/auth/tokenStorage';

/**
 * 全局共享的 axios 实例，所有 API 模块均通过该实例发起请求。
 */
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000',
  timeout: 10000,
});

// 请求拦截器：若本地存在访问令牌，则自动以 Bearer 方案附加到 Authorization 头
http.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// 响应拦截器：错误兜底——当服务端返回 401 时，主动清理本地令牌以同步登录态
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearAccessToken();
    }

    return Promise.reject(error);
  },
);
