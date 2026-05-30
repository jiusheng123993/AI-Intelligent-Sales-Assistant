/**
 * 前端应用入口文件。
 * 职责：初始化 React 根节点，挂载 Ant Design 中文语言包与应用根组件 <App />。
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import './index.css';

// 创建 React 18 并发模式根节点，并在严格模式下渲染应用（开发期会触发双调用以检测副作用问题）
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN}>
      <App />
    </ConfigProvider>
  </React.StrictMode>,
);
