/**
 * Side Panel 入口：渲染最小三 Tab 骨架（A0 占位）。
 * - 后续 A4 子任务将拆分为独立路由与状态层
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import '@shared/styles/global.css';
import { SidePanelApp } from './SidePanelApp';

const root = document.getElementById('root');
if (!root) {
  throw new Error('SidePanel root element not found');
}
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <SidePanelApp />
  </React.StrictMode>,
);
