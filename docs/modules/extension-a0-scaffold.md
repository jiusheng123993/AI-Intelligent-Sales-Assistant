# A 模块：浏览器扩展（销冠话术宝）— A0 子任务文档

> 子任务编号：**A0 — 脚手架（scaffold）**
> 分支：`feature/A0-scaffold`（基于 `feature/A-extension`）

## 1. 模块职责（A 模块整体）

销冠话术宝是一个 MV3 浏览器扩展，作为 AI 销售助手项目的客户端入口之一，嵌入到销售
日常对话页面（一期：企微网页版 / WhatsApp Web），提供 AI 推荐话术、润色、翻译、
扩写、个人话术库、会话归档等能力。

## 2. A0 子任务交付范围

仅完成**最小可加载的 MV3 扩展骨架**，不含任何业务功能。

- 工程化：Vite + @crxjs/vite-plugin + React 18 + TypeScript（strict）+ Tailwind
- 代码质量：ESLint + Prettier + Vitest（含 happy-dom 与 jest-dom 断言）
- 四大上下文骨架：
  - `src/background/index.ts` — Service Worker，含 PING/PONG 通路验证
  - `src/content/index.ts` — Content Script，仅在白名单站点注入
  - `src/popup/` — 360×480 弹出窗口，展示与 background 的通信结果
  - `src/sidepanel/` — 三 Tab（推荐 / 话术库 / 设置）静态骨架
- 共享层最小集：
  - `shared/utils/logger.ts` — 统一日志，含级别过滤与 child 前缀
  - `shared/utils/error.ts` — 统一 `ExtensionError` 与归一化函数
  - `shared/config/whitelist.ts` — 一期站点白名单 + URL 校验
  - `shared/styles/global.css` — Tailwind 入口

## 3. 目录结构

```
extension/
├── manifest.config.ts       MV3 manifest（CRXJS 注入）
├── vite.config.ts           构建 + Vitest 一体化
├── tailwind.config.ts
├── postcss.config.cjs
├── tsconfig.json            strict + 路径别名 @, @shared
├── .eslintrc.cjs
├── .prettierrc
├── .gitignore
├── package.json
├── src/
│   ├── background/index.ts
│   ├── content/index.ts
│   ├── popup/{index.html,main.tsx,PopupApp.tsx}
│   ├── sidepanel/{index.html,main.tsx,SidePanelApp.tsx}
│   ├── shared/
│   │   ├── config/whitelist.ts
│   │   ├── utils/{logger.ts,error.ts}
│   │   └── styles/global.css
│   └── types/global.d.ts
└── tests/
    ├── setup.ts
    └── unit/{whitelist,error,logger}.test.ts
```

## 4. 依赖说明

| 类型 | 关键依赖 | 用途 |
|---|---|---|
| 构建 | vite, @crxjs/vite-plugin | MV3 多入口打包 |
| UI | react, react-dom, tailwindcss, clsx, tailwind-merge | 视图层 |
| 状态 | zustand | 后续模块共享状态（A0 暂未使用） |
| 测试 | vitest, happy-dom, @testing-library/react, @testing-library/jest-dom | 单测 |
| 质量 | eslint, prettier, @typescript-eslint/* | 静态检查 |

## 5. 对外接口（A0 阶段）

- 浏览器 → 扩展：通过浏览器加载已解压扩展程序入口
- 上下文间消息：`{ type: 'PING' } → { type: 'PONG', ts }`（A2 将替换为强类型路由）

## 6. 关键逻辑说明

- **最小权限**：manifest 仅声明 `storage / activeTab / contextMenus / sidePanel /
  alarms / scripting`；host_permissions 严格白名单。
- **CSP 严格**：`script-src 'self'; object-src 'self';`，禁止 `unsafe-eval`。
- **运行期二次校验**：content script 即使被注入，也通过 `isWhitelisted(location.href)`
  二次校验后才继续，fail-safe。
- **统一异常**：所有可预期错误使用 `ExtensionError`；`toExtensionError` 兜底归一化。
- **统一日志**：`createLogger` + child 前缀，方便 DevTools 过滤。

## 7. 验证步骤

```bash
cd extension
pnpm install         # 或 npm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
# 然后在 Chrome → 扩展程序 → 打开开发者模式 → 加载已解压扩展程序 → 选择 extension/dist
```

## 8. 后续子任务衔接

- A1：补强 shared 层（secure-storage / validator），并把测试覆盖率拉到 ≥ 90%
- A2：强类型消息协议 + background 路由中心
- A3：鉴权（http + tokenManager + Login Popup）

