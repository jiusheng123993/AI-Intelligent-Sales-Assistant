/**
 * 受保护路由守卫组件。
 * 职责：在认证初始化期间显示全屏 Loading，未登录用户跳转到 /login，
 * 已登录用户渲染 <Outlet /> 子路由，并把当前位置保存在 state.from 便于登录后回跳。
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from '@/contexts/AuthContext';

/**
 * ProtectedRoute：仅允许已认证用户访问其包裹的子路由。
 */
export function ProtectedRoute() {
  const { isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  // 状态切换：认证状态尚未初始化完成时，先展示全屏 Loading，避免一闪而过的重定向
  if (isInitializing) {
    return <Spin fullscreen />;
  }

  // 状态切换：未登录用户重定向到登录页，并记录来源以便登录后回跳
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
