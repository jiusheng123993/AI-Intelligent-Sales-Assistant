# 销智 AI 销售助手

> 面向销售团队的智能化销售赋能平台，包含 **AI 话术演练场 · 销冠话术宝（浏览器扩展）· 数据分析看板 · 团队协作** 四大核心能力。
>
> 当前版本：**v1.0.1**（MVP 全量交付 + 团队模块自检闭环）

---

## 一、产品矩阵

| 终端 | 名称 | 主要场景 |
|---|---|---|
| Web | 销智工作台 | 话术库管理、演练场对练、知识库 RAG、数据看板、团队管理 |
| Chrome 扩展 | 销冠话术宝 | 企业微信 / WhatsApp 等聊天页面实时 AI 推荐、个人话术库 |
| 后端 | 销智 API | 鉴权、AI 推荐 SSE、RAG 检索、团队权限、用法埋点 |

---

## 二、项目结构

```
.
├── frontend/          # Web 前端（React 18 + Vite + Antd + Zustand）
├── backend/           # 后端服务（NestJS 10 + Prisma + PostgreSQL + OpenAI）
├── extension/         # 浏览器扩展（Manifest V3 + Vite + CRXJS + React + Tailwind）
└── docs/
    ├── modules/       # 每个模块的简明设计/审计文档
    └── superpowers/   # 项目级 MVP 规划与历史 plan
```

---

## 三、技术栈

- **后端**：NestJS 10、Prisma 5、PostgreSQL、Redis（ioredis）、OpenAI、LangChain、ChromaDB、JWT、class-validator
- **前端**：React 18、TypeScript 5、Ant Design 5、Zustand、React Router 6、ECharts、Axios、Vitest
- **扩展**：Vite + CRXJS、React 18、Tailwind、Zustand、Manifest V3、Vitest + happy-dom
- **工具链**：ESLint + Prettier、ts-jest / Vitest、Git Flow（feature/* → develop → master）

---

## 四、快速开始

### 后端
```bash
cd backend
cp .env.example .env             # 配置 DATABASE_URL / JWT_SECRET / OPENAI_API_KEY
npm install
npx prisma migrate dev           # 初始化数据库
npm run start:dev                # http://localhost:3000
npm test                         # 17 套件 / 139 用例
```

### 前端
```bash
cd frontend
npm install
npm run dev                      # http://localhost:5173
npm test                         # 18 套件 / 85 用例
```

### 浏览器扩展
```bash
cd extension
npm install
npm run build                    # 产出 dist/
# Chrome → 扩展程序 → 加载已解压的扩展程序 → 选择 dist 目录
npm test                         # 33 套件 / 186 用例
```

---

## 五、模块导航

### A. 浏览器扩展（销冠话术宝）
- [扩展总览](docs/modules/extension-a-module-summary.md)
- [A0 脚手架](docs/modules/extension-a0-scaffold.md) ｜ [A1 共享层](docs/modules/extension-a1-shared-utils.md) ｜ [A2 消息协议](docs/modules/extension-a2-messaging.md)
- [A3 鉴权](docs/modules/extension-a3-auth.md) ｜ [A4 Side Panel](docs/modules/extension-a4-sidepanel.md) ｜ [A5 Content Adapter](docs/modules/extension-a5-content-adapter.md)
- [A6 AI 推荐流](docs/modules/extension-a6-ai-suggest-flow.md) ｜ [A7 话术库 CRUD](docs/modules/extension-a7-phrasebook-crud.md) ｜ [A8 菜单与快捷键](docs/modules/extension-a8-menus-commands.md)
- [A9 手工自检清单](docs/modules/extension-a9-manual-checklist.md)
- [B2 接入真实后端 Auth / AI](docs/modules/extension-b2-real-backend-auth-ai.md)

### B. 后端能力
- [基础设施 Foundation](docs/modules/foundation-module.md)
- [鉴权 Backend Auth](docs/modules/backend-auth-module.md)
- [AI 推荐 SSE](docs/modules/backend-ai-suggest-module.md)
- [话术库 Scripts](docs/modules/scripts-module.md)
- [演练场 + RAG 知识库](docs/modules/practice-rag-knowledge-module.md)
- [数据分析看板](docs/modules/analytics-dashboard-module.md)

### C. 前端 Web
- [前端鉴权](docs/modules/frontend-auth-module.md)

### D. 团队与权限
- [团队与权限管理（详版）](docs/modules/team-management-module.md)
- [团队模块速查（简版）](docs/modules/team-management-module.brief.md)

---

## 六、版本历史

| 版本 | 内容 |
|---|---|
| **v1.0.1**（当前） | 团队模块 D5/D6 自检闭环：`CuidParamPipe` 路径参数 cuid 校验、邀请事务复检文档同步 |
| v1.0.0 | MVP 全量首发：A 全套扩展 + B1-B5 收尾 + analytics 合入 master |
| v0.5.0 | 团队与角色管理模块（C） |
| v0.1.0-extension | 浏览器扩展 A0-A9 全模块 |

---

## 七、测试覆盖

| 项目 | 套件数 | 用例数 |
|---|---|---|
| backend | 17 | 139 |
| frontend | 18 | 85 |
| extension | 33 | 186 |
| **合计** | **68** | **410** |

全部 100% 通过。

---

## 八、Git 分支约定

- `master` — 稳定主干，仅接受 develop / hotfix 的合并
- `develop` — 集成分支，所有功能与修复先合入此处
- `feature/*` — 功能开发分支（一次一模块）
- `hotfix/*` — 紧急修复分支
- 禁止直接在 master / develop 上提交。所有 commit 走 `中文 type(scope): subject` 模板。

---

## 九、贡献流程

1. 从 develop 拉新分支：`git checkout -b feature/xxx develop`
2. 单模块独立开发，配套单元测试（正常 / 边界 / 异常）
3. 自检审计 → 输出模块文档到 `docs/modules/`
4. 推送分支并发起 PR 合入 develop；功能完整时再合并到 master 并打 tag

---

## 十、许可证

UNLICENSED — 内部项目，未对外开源。
