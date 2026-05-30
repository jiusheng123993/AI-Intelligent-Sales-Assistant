/**
 * 应用根组件文件。
 * 职责：组合路由（BrowserRouter）与全局认证上下文（AuthProvider），
 * 启用 react-router v7 兼容性 flag 以提前规避未来升级风险。
 */
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AppRoutes from './routes';

/**
 * App 根组件：注入路由能力与全局认证状态，渲染应用所有页面路由。
 */
function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
