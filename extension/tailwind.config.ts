/**
 * Tailwind 配置（扩展全局通用）
 * 仅扫描扩展自身源码，避免误扫 node_modules 导致体积膨胀。
 */
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#4f46e5',
          hover: '#4338ca',
        },
      },
    },
  },
  plugins: [],
};

export default config;
