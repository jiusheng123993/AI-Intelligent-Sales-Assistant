# 后端 AI 推荐 SSE 模块

> 模块分支：`feature/B1-backend-ai-suggest`
> 模块范围：NestJS 后端 AI 推荐接口
> 当前状态：已完成

## 1. 模块职责

后端 AI 推荐 SSE 模块负责为浏览器扩展和后续前端入口提供真实 AI 话术推荐能力。模块通过 `POST /ai/suggest` 接收销售沟通上下文、用户草稿和推荐模式，结合现有 RAG 检索结果生成推荐文本，并以 Server-Sent Events 格式返回 `chunk`、`done` 或 `error` 事件。

## 2. 核心功能

- 提供 `POST /ai/suggest` 鉴权接口。
- 支持 `suggest`、`polish`、`translate`、`expand` 四种模式。
- 复用现有 `RagService` 检索知识库和话术来源。
- 支持 OpenAI 环境变量配置：`OPENAI_API_KEY`、`OPENAI_MODEL`、`OPENAI_API_BASE`。
- OpenAI 未配置、返回空内容或调用异常时自动降级到本地可解释话术。
- 将完整推荐文本拆分为 SSE `chunk` 事件，并通过 `done` 事件返回 sources 与 degraded 状态。
- 服务异常时输出脱敏 SSE `error` 事件，不暴露上游错误细节。

## 3. 对外接口

### `POST /ai/suggest`

请求头：

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
Accept: text/event-stream
```

请求体：

```json
{
  "contextText": "客户觉得价格有点贵，还在犹豫。",
  "inputText": "我们可以再便宜一点",
  "mode": "polish",
  "locale": "zh-CN",
  "platform": "wecom"
}
```

SSE 成功响应：

```text
event: chunk
data: {"requestId":"ai_xxx","text":"推荐文本片段","index":0}

event: done
data: {"requestId":"ai_xxx","sources":[],"degraded":false}
```

SSE 异常响应：

```text
event: error
data: {"requestId":"ai_xxx","message":"AI 推荐生成失败，请稍后重试"}
```

## 4. 参数校验

| 字段 | 规则 |
|---|---|
| `contextText` | 必填字符串，最大 4000 字符 |
| `inputText` | 可选字符串，最大 1000 字符 |
| `mode` | 必填，仅允许 `suggest`、`polish`、`translate`、`expand` |
| `locale` | 可选字符串，最大 20 字符 |
| `platform` | 可选字符串，最大 50 字符 |

## 5. 权限与安全边界

- 接口使用 `JwtAuthGuard`，未登录用户不能访问。
- RAG 检索由现有 `RagService` 根据当前用户执行权限过滤。
- 模块不会在日志中输出客户上下文、用户草稿或 OpenAI 原始错误。
- OpenAI 异常统一降级，不把上游错误透传给调用端。
- SSE error 只返回固定中文提示和 requestId，便于前端展示与问题追踪。

## 6. 文件说明

| 文件 | 说明 |
|---|---|
| `backend/src/ai/ai.module.ts` | AI 推荐模块声明，依赖 `RagModule` |
| `backend/src/ai/ai.controller.ts` | 暴露 `/ai/suggest` SSE 接口 |
| `backend/src/ai/ai.service.ts` | RAG 检索、OpenAI 调用、本地降级和 SSE 事件生成 |
| `backend/src/ai/dto/suggest.dto.ts` | 请求参数校验 |
| `backend/src/ai/types/ai-suggest-mode.type.ts` | 推荐模式类型定义 |
| `backend/src/ai/*.spec.ts` | Service、Controller、DTO 测试 |

## 7. 测试覆盖

已覆盖：

- `suggest` 模式结合 RAG sources 生成推荐。
- `polish` 模式使用用户草稿润色。
- `translate` 模式生成翻译优化表达。
- `expand` 模式扩写短句。
- RAG 检索失败时降级。
- OpenAI 配置存在时调用 chat completion。
- OpenAI 返回空内容时降级。
- SSE `chunk` / `done` 事件生成。
- Controller 生成失败时返回脱敏 `error` 事件。
- DTO 正常参数、非法 mode、超长 contextText、超长 inputText。

## 8. 验证命令

```bash
cd backend
npx prisma validate
npm run test
npm run build
npm run lint
```

## 9. 后续模块衔接

本模块完成后，下一步建议开发 B2：浏览器扩展关闭 Mock 并接入真实后端 Auth / AI。B2 可直接消费本模块的 `POST /ai/suggest` SSE 事件格式。
