# 销冠话术宝 · 浏览器扩展（extension/）

> AI Intelligent Sales Assistant 的客户端入口之一（A 模块）。
> Manifest V3 扩展，嵌入到企微网页版 / WhatsApp Web 等销售对话场景，
> 提供 AI 推荐话术、润色、翻译、扩写、个人话术库、会话归档。

## 当前进度

| 子任务 | 状态 |
|---|---|
| A0 — 脚手架（Vite+CRXJS+React+TS+Tailwind+Vitest） | ✅ 已合 |
| A1 — 共享层（secure-storage / validator / storage adapter） | ✅ 已合 |
| A2 — 强类型消息协议 + background 路由 | ✅ 已合 |
| **A3** — 鉴权（http + tokenManager + Login Popup） | ✅ 已完成 |
| A4 — Side Panel 三 Tab + Zustand | ✅ 已完成 |
| A5 — Content adapter 框架 + WeCom adapter + 悬浮按钮 | ✅ 已完成 |
| A6 — AI 推荐主流程（SSE 流式 + Mock 后端） | ✅ 已完成 |
| A7 — 个人话术库 CRUD | ⏳ 待开 |
| A8 — 右键菜单 + 快捷键 | ⏳ 待开 |
| A9 — 全链路自检 + 安全加固 | ⏳ 待开 |

## 目录结构

```
extension/
├── manifest.config.ts         MV3 manifest（CRXJS 注入）
├── vite.config.ts             构建 + Vitest 一体化
├── tailwind.config.ts
├── tsconfig.json              strict + 别名 @, @shared
├── src/
│   ├── background/            Service Worker（router + handlers）
│   ├── content/               注入到白名单站点
│   ├── popup/                 360×480 弹出窗口
│   ├── sidepanel/             三 Tab 工作台
│   ├── shared/                跨上下文共享：messaging/storage/utils/config/styles
│   └── types/                 全局类型声明
└── tests/                     Vitest 单元测试
    ├── setup.ts
    └── unit/
```

## 启动 & 验证

```bash
cd extension
npm install
npm run typecheck    # TypeScript strict
npm run lint         # ESLint --max-warnings 0
npm run test         # Vitest 单元测试
npm run build        # 产物输出到 dist/
```

加载到 Chrome：
1. 打开 `chrome://extensions`
2. 开启右上"开发者模式"
3. 点击"加载已解压扩展程序"，选择 `extension/dist`

## 安全约束（架构强制）

- **CSP**：`script-src 'self'; object-src 'self';` 严禁 unsafe-eval
- **host_permissions**：仅白名单（`work.weixin.qq.com` / `web.whatsapp.com`）
- **Token**：仅 background 持有，加密落盘（AES-GCM-256）
- **content script**：不直接调业务 API，所有调用走 `sendMessage`
- **运行期二次校验**：即使 manifest 已限制，content 仍校验 `isWhitelisted`

## 子任务文档

- [A0 — 脚手架](../docs/modules/extension-a0-scaffold.md)
- [A1 — 共享层](../docs/modules/extension-a1-shared-utils.md)
- [A2 — 消息协议 + 路由](../docs/modules/extension-a2-messaging.md)
- [A3 — 鉴权](../docs/modules/extension-a3-auth.md)
- [A4 — Side Panel 骨架](../docs/modules/extension-a4-sidepanel.md)
- [A5 — Content adapter 框架](../docs/modules/extension-a5-content-adapter.md)
- [A6 — AI 推荐主流程](../docs/modules/extension-a6-ai-suggest-flow.md)
