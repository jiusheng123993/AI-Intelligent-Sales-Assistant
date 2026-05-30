# A 模块：浏览器扩展（销冠话术宝）— A2 子任务文档

> 子任务编号：**A2 — 强类型消息协议 + background 路由中心**
> 分支：`feature/A2-messaging`（基于 `feature/A-extension`）

## 1. 子任务目标

建立四大上下文（background / content / sidepanel / popup）唯一、强类型、可测试的
消息通信中枢，杜绝散落字符串与 any，所有跨上下文调用类型推导贯通。

## 2. 交付物

| 文件 | 职责 |
|---|---|
| [shared/messaging/types.ts](../../extension/src/shared/messaging/types.ts) | discriminated union 消息协议；MessageMap 集中登记 |
| [shared/messaging/send.ts](../../extension/src/shared/messaging/send.ts) | type-safe sendMessage 封装；超时、错误外壳还原、可注入 transport |
| [background/router.ts](../../extension/src/background/router.ts) | MessageRouter 类：register/unregister/attach/dispatch；统一异常归一化 |
| [background/index.ts](../../extension/src/background/index.ts) | 替换为基于 router 的入口，注册一期所有消息 handler |
| [content/index.ts](../../extension/src/content/index.ts) | 改用 sendMessage 调用 PING 验证通路 |
| [popup/PopupApp.tsx](../../extension/src/popup/PopupApp.tsx) | 改用 sendMessage 调用 PING |
| 测试：messaging-types / send-message / router | 17 个新增用例 |

## 3. 协议示例

```ts
// 1) 在 types.ts 登记
export const MessageType = { PING: 'PING', ... } as const;
export interface MessageMap {
  [MessageType.PING]: { payload: undefined; response: { pong: true; ts: number } };
}

// 2) 调用方（任意上下文）
const r = await sendMessage(MessageType.PING, undefined);
//  ^^ 自动推导为 { pong: true; ts: number }

// 3) background 注册 handler
messageRouter.register(MessageType.PING, () => ({ pong: true, ts: Date.now() }));
messageRouter.attach();
```

## 4. 错误模型

- handler 抛 `ExtensionError(code, message)` → 路由层包装为 `{ __error: { code, message } }`
- `sendMessage` 收到错误外壳 → 自动还原为 `ExtensionError`
- 调用方一律 try-catch 即可，无需关心传输细节

## 5. 验证

```bash
cd extension
npm run typecheck   # ✅
npm run lint        # ✅
npm run test        # ✅ 67 tests passed
npm run build       # ✅
```

## 6. 衔接

- A3：鉴权（http + tokenManager + Login Popup），将通过 `messageRouter` 注册真实
  `AUTH_LOGIN` handler，并通过 `secureStorage` 落地 token。
- A5：content adapter 通过 `INSERT_TEXT` 由 background 转发到目标 tab。
- A6：AI 推荐通过 `AI_SUGGEST_START` 触发，后续将引入流式 chunk 单独消息类型。
