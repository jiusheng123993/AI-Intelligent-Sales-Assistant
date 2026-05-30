/**
 * Vite 构建配置（销冠话术宝扩展）
 * - 集成 @crxjs/vite-plugin，自动生成 MV3 manifest 与多入口产物
 * - 路径别名 @ / @shared，避免相对路径地狱
 * - vitest 配置内联，统一一份构建入口
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import path from 'node:path';
import manifest from './manifest.config';

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      // CRXJS 自动处理多入口；此处保留扩展点
    },
  },
  server: {
    port: 5180,
    strictPort: true,
    hmr: {
      port: 5181,
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.{ts,tsx}', 'src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.config.*'],
    },
  },
});
