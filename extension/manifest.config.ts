/**
 * MV3 Manifest 配置（由 @crxjs/vite-plugin 在构建期注入）
 *
 * 设计要点：
 * 1. host_permissions 严格白名单：仅企微网页版 + WhatsApp Web（一期）。
 *    若未来新增站点，请在此处与 src/shared/config/whitelist.ts 同步更新。
 * 2. content_scripts 仅注入到白名单页面，杜绝对全网无差别注入。
 * 3. permissions 最小化：仅启用 storage / activeTab / contextMenus / sidePanel / alarms。
 * 4. CSP 严格：禁止 unsafe-eval；扩展页脚本仅自源。
 */
import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json' with { type: 'json' };

export default defineManifest({
  manifest_version: 3,
  name: '销冠话术宝 (Sales Coach)',
  version: pkg.version,
  description: pkg.description,
  minimum_chrome_version: '114',

  action: {
    default_popup: 'src/popup/index.html',
    default_title: '销冠话术宝',
  },

  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },

  side_panel: {
    default_path: 'src/sidepanel/index.html',
  },

  permissions: ['storage', 'activeTab', 'contextMenus', 'sidePanel', 'alarms', 'scripting'],

  // 一期白名单：企微网页版 + WhatsApp Web
  host_permissions: ['https://work.weixin.qq.com/*', 'https://web.whatsapp.com/*'],

  content_scripts: [
    {
      matches: ['https://work.weixin.qq.com/*', 'https://web.whatsapp.com/*'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],

  commands: {
    'suggest-replies': {
      suggested_key: {
        default: 'Ctrl+Shift+L',
        mac: 'Command+Shift+L',
      },
      description: '生成 AI 推荐话术',
    },
    'polish-input': {
      suggested_key: {
        default: 'Ctrl+Shift+P',
        mac: 'Command+Shift+P',
      },
      description: '润色当前输入框文本',
    },
  },

  content_security_policy: {
    extension_pages: "script-src 'self'; object-src 'self';",
  },

  web_accessible_resources: [
    {
      resources: ['assets/*'],
      matches: ['https://work.weixin.qq.com/*', 'https://web.whatsapp.com/*'],
    },
  ],
});
