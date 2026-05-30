# A 模块：浏览器扩展（销冠话术宝）— A5 子任务文档

> 子任务编号：**A5 — Content adapter 框架 + WeCom adapter + 悬浮按钮**
> 分支：`feature/A5-content-adapter`（基于 `feature/A-extension`）

## 1. 子任务目标

实现 Content Script 的站点适配框架：输入框识别、文本插入、上下文采集、悬浮按钮注入。
A5 不接 AI、不接真实后端，仅完成页面内能力基础设施。

## 2. 交付物

| 文件 | 职责 |
|---|---|
| [content/adapters/base.adapter.ts](../../extension/src/content/adapters/base.adapter.ts) | ChatAdapter 协议、DOM 查询、文本插入、角色推断 |
| [content/adapters/wecom.adapter.ts](../../extension/src/content/adapters/wecom.adapter.ts) | 企微网页版多 selector 兜底适配 |
| [content/adapters/whatsapp.adapter.ts](../../extension/src/content/adapters/whatsapp.adapter.ts) | WhatsApp Web 基础适配 |
| [content/context-collector.ts](../../extension/src/content/context-collector.ts) | 最近 N 条消息采集与长度裁剪 |
| [content/injector/floating-button.ts](../../extension/src/content/injector/floating-button.ts) | 单例悬浮按钮注入 + MutationObserver 刷新 |
| [content/index.ts](../../extension/src/content/index.ts) | 按 host 选择 adapter，启动按钮，点击触发 AI_SUGGEST_START 占位 |
| 测试：base-adapter/site-adapters/context-collector/floating-button | 18 个新增用例 |

## 3. 架构约束

- Adapter 只处理 DOM，不负责 UI 注入、不发消息、不持业务状态
- Injector 不关心具体站点，仅依赖 ChatAdapter
- Content 不持 token、不直接请求后端，所有业务请求走 background 消息
- 白名单二次校验保留，非白名单站点直接拒绝初始化

## 4. 关键边界

- `inferRole` 已修复 `message-in` 被 `me` 子串误判的问题，改为 token 化 class 匹配
- 输入插入：input/textarea 走 value+selection；contenteditable 优先 `execCommand('insertText')`，失败用 Range fallback
- 重复注入：固定按钮 id `sales-coach-floating-button`，确保页面最多一个

## 5. 验证

```bash
cd extension
npm run typecheck   # ✅
npm run lint        # ✅
npm run test        # ✅ 122 tests passed
npm run build       # ✅
```

## 6. 手动验证

1. 加载 `extension/dist`
2. 打开 `https://work.weixin.qq.com/` 或 `https://web.whatsapp.com/`
3. 聚焦输入框，页面右下/输入框附近出现 ✨ 按钮
4. 点击按钮，DevTools content 控制台应输出 `AI_SUGGEST_START placeholder requestId`

## 7. 衔接

- A6：点击按钮后将打开/刷新 Side Panel，并把流式推荐结果展示在 SuggestionsTab
- A8：右键菜单/快捷键复用 adapter.insertText 与 collectContext
