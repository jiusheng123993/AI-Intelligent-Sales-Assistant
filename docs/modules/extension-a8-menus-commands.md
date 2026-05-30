# A 模块：浏览器扩展（销冠话术宝）— A8 子任务文档

> 子任务编号：**A8 — 右键菜单 + 快捷键**
> 分支：`feature/A8-menus-commands`（基于 `feature/A-extension`）

## 1. 子任务目标

实现浏览器扩展右键菜单与快捷键能力，让用户无需点击页面内悬浮按钮，也能触发 AI 推荐、润色、翻译、扩写流程。

## 2. 交付物

| 文件 | 职责 |
|---|---|
| [background/tab-actions.ts](../../extension/src/background/tab-actions.ts) | background 与当前活动 tab 通信封装：查询 active tab、采集上下文、插入文本 |
| [background/menus.ts](../../extension/src/background/menus.ts) | contextMenus 注册、右键菜单点击处理、触发 AI_SUGGEST_START |
| [background/commands.ts](../../extension/src/background/commands.ts) | chrome.commands 快捷键处理，映射到 recommend/polish 动作 |
| [content/runtime-actions.ts](../../extension/src/content/runtime-actions.ts) | content 侧响应 CONTENT_COLLECT_CONTEXT / CONTENT_INSERT_TEXT |
| [content/index.ts](../../extension/src/content/index.ts) | 启动 content runtime actions |
| [background/index.ts](../../extension/src/background/index.ts) | 注册 menus / commands 初始化 |
| [shared/messaging/types.ts](../../extension/src/shared/messaging/types.ts) | 新增 CONTENT_COLLECT_CONTEXT / CONTENT_INSERT_TEXT 协议 |
| 测试：tab-actions / menus-commands / runtime-actions | 11 个新增用例 |

## 3. 核心流程

```text
右键菜单 / 快捷键
  → background.runContextAction(mode, selectedText?)
  → tabActions.collectContextFromActiveTab()
  → content.runtime-actions 调 adapter.collectMessages + adapter.getInputText
  → background.handleSuggestStart()
  → A6 的 CHUNK/DONE/ERROR 流式推送
  → Side Panel SuggestionsTab 渲染
```

## 4. 新增协议

```ts
CONTENT_COLLECT_CONTEXT:
  payload: { mode, selectedText? }
  response: { contextText, inputText }

CONTENT_INSERT_TEXT:
  payload: { text }
  response: { ok: true } | { ok: false; reason }
```

## 5. 安全与边界

- background 仅与 active tab 通信，不扩大 host 权限
- content 不持 token，不直接请求后端
- 非白名单/未注入页面触发菜单或快捷键时捕获错误并静默降级
- contextMenus 启动时 `removeAll + create`，避免重复菜单
- commands 仅处理 manifest 中已声明的 `suggest-replies` / `polish-input`

## 6. 验证

```bash
cd extension
npm run typecheck   # ✅
npm run lint        # ✅
npm run test        # ✅ 169 tests passed
npm run build       # ✅
```

## 7. 手动验证

1. build 并加载 `extension/dist`
2. 打开企微或 WhatsApp Web 白名单页面
3. 右键页面/选中文本 → 看到"销冠话术宝"菜单
4. 点击 AI 推荐/润色/翻译/扩写 → background 采集上下文并触发 A6 推荐流
5. 使用快捷键：
   - `Ctrl+Shift+L`：推荐回复
   - `Ctrl+Shift+P`：润色当前输入

## 8. 衔接

- A9：全链路自检时可增强体验：触发菜单/快捷键后自动打开 Side Panel
- A9：可将 contextMenus 从 removeAll 改为按 id 精细化清理
