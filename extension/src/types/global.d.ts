/**
 * 全局类型声明：
 * - 暴露 `__APP_VERSION__` 编译期常量（构建时由 Vite 注入，A0 阶段暂未注入，保留占位）
 * - 兼容 Vite 资产模块声明
 */
declare const __APP_VERSION__: string;

declare module '*.css';
declare module '*.svg' {
  const src: string;
  export default src;
}
