/**
 * Popup 入口：渲染最小欢迎页（A0 阶段仅验证 React 与样式可用）。
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import '@shared/styles/global.css';
import { PopupApp } from './PopupApp';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Popup root element not found');
}
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <PopupApp />
  </React.StrictMode>,
);
