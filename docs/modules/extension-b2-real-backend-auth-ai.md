# 扩展真实后端 Auth / AI 接入模块

> 模块分支：`feature/B2-extension-real-backend-auth-ai`
> 模块范围：浏览器扩展真实后端鉴权与 AI 推荐流接入
> 当前状态：已完成

## 1. 模块职责

B2 模块负责将浏览器扩展从 A 模块的 Mock 演示态推进到真实后端联调态。扩展默认连接真实后端 `http://localhost:3000`，登录走后端 `/auth/login`，AI 推荐走 B1 模块提供的 `/ai/suggest` SSE 接口。测试环境仍保留 Mock 能力，保证单元测试和离线验证稳定。

## 2. 核心功能

- 扩展 API 默认关闭 Mock，`import.meta.env.MODE === 'test'` 时自动启用 Mock。
- `authApi.login` 兼容真实后端大写角色枚举和无 `refreshToken` 响应。
- `tokenManager` 支持无 refresh token 的登录态保存。
- `aiApi.suggest` 使用真实 `POST /ai/suggest` SSE 接口。
- SSE parser 支持 `chunk`、`done`、`error` 事件，并支持网络分片缓冲。
- AI chunk 在流未关闭前即可增量回调给 UI。
- Background AI handler 对 UI 只广播固定脱敏错误文案，避免泄露上游异常细节。
- 测试保留 Mock 模式，原 A6 Mock AI 流式测试继续可用。

## 3. 配置说明

默认配置位于 `extension/src/shared/api/env.ts`：

```ts
apiConfig = {
  baseUrl: 'http://localhost:3000',
  timeoutMs: 10000,
  useMock: import.meta.env.MODE === 'test'
}
```

本地真实联调需要先启动后端：

```bash
cd backend
npm run start:dev
```

再构建并加载扩展：

```bash
cd extension
npm run build
```

## 4. Auth 接口契约

扩展登录请求：

```http
POST /auth/login
Content-Type: application/json
```

请求体：

```json
{
  "email": "sales@example.com",
  "password": "password123"
}
```

兼容响应：

```json
{
  "accessToken": "jwt-token",
  "user": {
    "id": "user-id",
    "email": "sales@example.com",
    "name": "销售顾问",
    "role": "SALES"
  }
}
```

如果后端返回 `refreshToken`，扩展会保存并用于后续 refresh；如果后端不返回，扩展仍保持登录态，401 时会清空登录态并提示重新登录。

## 5. AI 接口契约

扩展 AI 请求：

```http
POST /ai/suggest
Authorization: Bearer <accessToken>
Content-Type: application/json
Accept: text/event-stream
```

请求体：

```json
{
  "contextText": "客户问价格",
  "inputText": "",
  "mode": "suggest",
  "locale": "zh-CN",
  "platform": "extension"
}
```

SSE 成功响应：

```text
event: chunk
data: {"requestId":"ai_xxx","text":"推荐","index":0}

event: done
data: {"requestId":"ai_xxx","sources":[],"degraded":false}
```

SSE 异常响应：

```text
event: error
data: {"requestId":"ai_xxx","message":"AI 推荐生成失败，请稍后重试"}
```

## 6. 安全边界

- Token 仍只由 background 侧持有，content script 不直接请求后端。
- AI 请求必须携带 access token；缺失 token 时直接返回未登录错误。
- Background 捕获 AI 异常后只向 UI 广播固定中文错误。
- 真实后端错误、上游模型错误、堆栈信息不会透传给 UI。
- Mock 仅在测试模式或显式 `setApiConfig({ useMock: true })` 下使用。

## 7. 文件说明

| 文件 | 说明 |
|---|---|
| `extension/src/shared/api/env.ts` | API baseUrl / timeout / Mock 开关配置 |
| `extension/src/shared/api/auth.api.ts` | 后端 Auth 响应归一化 |
| `extension/src/shared/auth/token-manager.ts` | 登录态保存与 refresh token 可选兼容 |
| `extension/src/shared/api/ai.api.ts` | 真实 `/ai/suggest` SSE 调用 |
| `extension/src/shared/api/sse.ts` | SSE 事件解析与 Mock 文本流工具 |
| `extension/src/background/handlers/ai.handler.ts` | AI 错误脱敏广播 |
| `extension/tests/unit/b2-real-backend.test.ts` | B2 真实后端契约测试 |

## 8. 测试覆盖

已覆盖：

- 默认真实后端配置。
- Mock 关闭时请求配置的真实 baseUrl。
- 登录响应无 refresh token 时归一化为 `null`。
- tokenManager 可保存无 refresh token 登录态。
- 无 refresh token 时 refresh 返回未授权。
- SSE 事件跨网络 chunk 解析。
- AI 推荐真实 `/ai/suggest` 调用与 Authorization 头。
- AI chunk 在 SSE 未关闭前增量回调。
- 后端 AI 异常转为固定 UI 错误文案。

## 9. 验证命令

```bash
cd extension
npm run typecheck
npm run lint
npm run test
npm run build
```

## 10. 后续模块衔接

B2 完成后，下一步建议开发 B3：浏览器扩展个人话术库云同步，将 A7 的本地优先话术库与后端 `scripts` 模块打通。
