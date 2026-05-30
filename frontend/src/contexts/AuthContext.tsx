/**
 * 全局认证上下文。
 * 职责：
 *  1) 维护当前登录用户与初始化状态；
 *  2) 应用启动时根据本地令牌恢复会话；
 *  3) 暴露 login / register / logout 方法供页面调用；
 *  4) useAuth Hook 强制在 AuthProvider 内使用，避免误用。
 */
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthUser, LoginRequest, RegisterRequest, getCurrentUser, login as loginApi, register as registerApi } from '@/api/auth';
import { clearAccessToken, getAccessToken, setAccessToken } from '@/auth/tokenStorage';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (payload: LoginRequest) => Promise<void>;
  register: (payload: RegisterRequest) => Promise<void>;
  logout: () => void;
}

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * AuthProvider：在应用根节点注入认证上下文，并在首次挂载时尝试通过本地令牌恢复用户信息。
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // 副作用：组件首次挂载时读取本地令牌并请求当前用户信息，恢复登录态
  useEffect(() => {
    let isMounted = true;

    async function restoreUser() {
      const token = getAccessToken();

      // 未发现令牌时直接结束初始化，按未登录态处理
      if (!token) {
        setIsInitializing(false);
        return;
      }

      try {
        const currentUser = await getCurrentUser();

        if (isMounted) {
          setUser(currentUser);
        }
      } catch {
        // 错误兜底：令牌失效或网络异常时，清理本地令牌避免后续请求继续携带错误凭证
        clearAccessToken();
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    }

    void restoreUser();

    return () => {
      // 卸载兜底：避免在组件卸载后调用 setState 产生告警
      isMounted = false;
    };
  }, []);

  // 登录回调：调用后端登录接口，成功后写入令牌并切换为已登录态
  const login = useCallback(async (payload: LoginRequest) => {
    const response = await loginApi(payload);

    setAccessToken(response.accessToken);
    setUser(response.user);
  }, []);

  // 注册回调：调用注册接口，注册成功后立即完成登录态切换
  const register = useCallback(async (payload: RegisterRequest) => {
    const response = await registerApi(payload);

    setAccessToken(response.accessToken);
    setUser(response.user);
  }, []);

  // 登出回调：清理本地令牌并切换为未登录态
  const logout = useCallback(() => {
    clearAccessToken();
    setUser(null);
  }, []);

  // 通过 useMemo 缓存 context value，避免依赖未变时无谓地触发消费者重渲染
  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isInitializing,
      login,
      register,
      logout,
    }),
    [isInitializing, login, logout, register, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth：访问全局认证上下文的 Hook；若在 AuthProvider 外调用会立即抛错以暴露使用错误。
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth 必须在 AuthProvider 内使用');
  }

  return context;
}
