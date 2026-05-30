/**
 * 公共路由守卫组件。
 * 职责：仅未登录用户可访问（如登录、注册页）；已登录用户重定向回首页，
 * 认证初始化阶段渲染全屏 Loading 以避免页面闪烁。
 */
import { Navigate, Outlet } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from '@/contexts/AuthContext';

/**
 * PublicOnlyRoute：包裹仅对未登录用户开放的子路由。
 */
export function PublicOnlyRoute() {
  const { isAuthenticated, isInitializing } = useAuth();

  // 状态切换：认证状态尚未初始化完成时显示 Loading，避免在已登录情况下短暂渲染登录页
  if (isInitializing) {
    return <Spin fullscreen />;
  }

  // 状态切换：已登录用户访问公共页面（登录/注册）时，强制回退到首页
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
