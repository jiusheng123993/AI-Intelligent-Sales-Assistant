# A 模块：浏览器扩展（销冠话术宝）— A6 子任务文档

> 子任务编号：**A6 — AI 推荐主流程（Mock 流式 + SidePanel 渲染）**
> 分支：`feature/A6-ai-suggest-flow`（基于 `feature/A-extension`）

## 1. 子任务目标

打通 AI 推荐主流程：Content 点击 ✨ → background 接收 AI_SUGGEST_START → Mock 流式生成
chunk → Side Panel SuggestionsTab 展示流式推荐、完成态、错误态、复制按钮。

## 2. 交付物

| 文件 | 职责 |
|---|---|
| [shared/api/sse.ts](../../extension/src/shared/api/sse.ts) | SSE data 行解析 + Mock 文本流 |
| [shared/api/ai.api.ts](../../extension/src/shared/api/ai.api.ts) | Mock AI 推荐生成，onChunk 流式回调 |
| [background/handlers/ai.handler.ts](../../extension/src/background/handlers/ai.handler.ts) | AI_SUGGEST_START 真实 handler；广播 CHUNK/DONE/ERROR |
| [background/handlers.ts](../../extension/src/background/handlers.ts) | 注册 AI handler，替代 A5 占位 |
| [shared/messaging/types.ts](../../extension/src/shared/messaging/types.ts) | 新增 AI_SUGGEST_CHUNK / DONE / ERROR |
| [sidepanel/stores/suggestions.store.ts](../../extension/src/sidepanel/stores/suggestions.store.ts) | 流式推荐状态：idle/streaming/done/error |
| [sidepanel/tabs/SuggestionsTab.tsx](../../extension/src/sidepanel/tabs/SuggestionsTab.tsx) | 推荐结果渲染、复制、清空 |
| 测试：sse/ai-api/ai-handler/suggestions-store/suggestions-tab | 18 个新增用例 |

## 3. 流程

```
content floating button
  → sendMessage(AI_SUGGEST_START, { contextText, mode })
  → background.handleSuggestStart()
       → requestId
       → aiApi.suggest(payload, onChunk)
       → chrome.runtime.sendMessage(AI_SUGGEST_CHUNK/DONE/ERROR)
  → sidepanel suggestions.store.handleRuntimeMessage()
  → SuggestionsTab 渲染
```

## 4. 安全与边界

- handler 对 `contextText` 限制最大 10000 字符
- handler 对 `mode` 做白名单归一化，非法 mode 降级 `suggest`
- store 对 runtime message 做运行时校验，非法消息忽略
- runtime listener 使用模块级 attached 标记，重复挂载幂等
- sidepanel 未打开时 chunk 丢失属于 A6 可接受边界；A9 可持久化最近结果

## 5. 验证

```bash
cd extension
npm run typecheck   # ✅
npm run lint        # ✅
npm run test        # ✅ 140 tests passed
npm run build       # ✅
```

## 6. 手动验证

1. build 并加载扩展
2. Popup 登录（demo1234）
3. 打开 Side Panel → 推荐 Tab
4. 在白名单页面点击 ✨ 按钮
5. 推荐 Tab 显示流式文本，完成后可复制/清空

## 7. 衔接

- A7：话术库 CRUD，可复用推荐结果复制/插入能力
- A8：右键菜单和快捷键将复用 AI_SUGGEST_START 与 content adapter
- B 模块：后端 `/ai/suggest` 完成后替换 `ai.api.ts` 的 Mock 流
