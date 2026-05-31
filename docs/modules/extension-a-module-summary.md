# A 模块总文档：浏览器扩展（销冠话术宝 / AI 输入法）

> 模块分支：`feature/A-extension`
> 模块范围：Chrome MV3 浏览器扩展客户端
> 当前状态：A0-A9 已完成

## 1. 模块职责

A 模块是 AI Intelligent Sales Assistant 的浏览器端入口，嵌入销售人员日常使用的网页沟通场景，提供：

- 登录鉴权
- 页面输入框识别
- 对话上下文采集
- AI 推荐 / 润色 / 翻译 / 扩写触发
- Side Panel 工作台
- 个人话术库 CRUD
- 右键菜单和快捷键
- 本地加密存储

## 2. 子模块完成情况

| 子模块 | 状态 | 文档 |
|---|---|---|
| A0 脚手架 | ✅ | [extension-a0-scaffold.md](./extension-a0-scaffold.md) |
| A1 共享层 | ✅ | [extension-a1-shared-utils.md](./extension-a1-shared-utils.md) |
| A2 消息协议 + 路由 | ✅ | [extension-a2-messaging.md](./extension-a2-messaging.md) |
| A3 鉴权 | ✅ | [extension-a3-auth.md](./extension-a3-auth.md) |
| A4 Side Panel | ✅ | [extension-a4-sidepanel.md](./extension-a4-sidepanel.md) |
| A5 Content Adapter | ✅ | [extension-a5-content-adapter.md](./extension-a5-content-adapter.md) |
| A6 AI 推荐主流程 | ✅ | [extension-a6-ai-suggest-flow.md](./extension-a6-ai-suggest-flow.md) |
| A7 个人话术库 CRUD | ✅ | [extension-a7-phrasebook-crud.md](./extension-a7-phrasebook-crud.md) |
| A8 右键菜单 + 快捷键 | ✅ | [extension-a8-menus-commands.md](./extension-a8-menus-commands.md) |
| A9 全链路自检 + 安全加固 | ✅ | [extension-a9-manual-checklist.md](./extension-a9-manual-checklist.md) |

## 3. 核心架构

```text
Chrome Extension MV3
├─ background service worker
│  ├─ MessageRouter
│  ├─ auth/token manager
│  ├─ AI mock stream handler
│  ├─ contextMenus / commands
│  └─ active tab bridge
├─ content script
│  ├─ site adapters
│  ├─ floating button
│  ├─ context collector
│  └─ runtime actions
├─ popup
│  └─ login/logout
├─ sidepanel
│  ├─ suggestions tab
│  ├─ phrasebook tab
│  └─ settings tab
└─ shared
   ├─ api
   ├─ auth
   ├─ messaging
   ├─ storage
   ├─ phrasebook
   └─ utils
```

## 4. 安全设计

- Token 仅 background 持有
- access / refresh / user 使用 AES-GCM secureStorage 加密落地
- content 不直接请求后端，不持 token
- 所有跨上下文消息集中在 `MessageMap`
- background handler 统一通过 `MessageRouter` 捕获异常
- content script 运行期二次白名单校验
- contextMenus 精细化删除本扩展菜单，避免误删未来菜单
- runtime message 接收方对关键 payload 做运行时校验

## 5. 验证结果

```bash
cd extension
npm run typecheck   # ✅ 0 errors
npm run lint        # ✅ 0 errors, 0 warnings
npm run test        # ✅ 169 tests passed
npm run build       # ✅ success
```

## 6. 当前 Mock 与后续替换点

| 当前 Mock | 后续替换模块 |
|---|---|
| `background/mock-backend.ts` auth mock | 后端真实 `/auth/*` |
| `shared/api/ai.api.ts` mock stream | 后端真实 `/ai/suggest` SSE |
| `shared/phrasebook/phrasebook.api.ts` sync no-op | 后端真实话术库接口 |

## 7. 模块边界

A 模块只负责浏览器扩展端，不直接修改数据库、不实现后端 AI 真实模型接口。后端真实接口将在后续模块中对接。
