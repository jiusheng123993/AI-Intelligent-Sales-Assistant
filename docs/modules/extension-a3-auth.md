# A 模块：浏览器扩展（销冠话术宝）— A3 子任务文档

> 子任务编号：**A3 — 鉴权（http + tokenManager + Login Popup）**
> 分支：`feature/A3-auth`（基于 `feature/A-extension`）

## 1. 子任务目标

在 background 上下文实现完整的鉴权层：
- HTTP 客户端（含超时、错误归一化、401 自动 refresh）
- TokenManager（加密落地 access/refresh/user，refresh 单飞）
- 真实的 AUTH_LOGIN / AUTH_LOGOUT / AUTH_STATUS handler
- Popup 最小登录 UI（邮箱/密码 + 已登录态展示 + 退出）
- 内置 Mock 后端，便于后端就绪前独立联调

## 2. 交付物

| 文件 | 职责 |
|---|---|
| [shared/api/env.ts](../../extension/src/shared/api/env.ts) | API 运行时配置（baseUrl/timeout/useMock） |
| [shared/api/http.ts](../../extension/src/shared/api/http.ts) | fetch 封装：超时/错误归一化/401 重试/Mock 路由 |
| [shared/api/auth.api.ts](../../extension/src/shared/api/auth.api.ts) | /auth/login /refresh /logout endpoint |
| [shared/auth/token-manager.ts](../../extension/src/shared/auth/token-manager.ts) | 内存+加密持久化双层；refresh 单飞；AuthProvider 实现 |
| [background/mock-backend.ts](../../extension/src/background/mock-backend.ts) | 内置 Mock：密码 demo1234 / admin@*.com 给 admin 角色 |
| [background/handlers/auth.handler.ts](../../extension/src/background/handlers/auth.handler.ts) | handleLogin / handleLogout / handleAuthStatus |
| [background/handlers.ts](../../extension/src/background/handlers.ts) | 注册中心：依赖注入 + 替换占位 |
| [popup/PopupApp.tsx](../../extension/src/popup/PopupApp.tsx) | 登录态切换根组件 |
| [popup/Login.tsx](../../extension/src/popup/Login.tsx) | 登录表单 + 客户端校验 |
| [shared/messaging/types.ts](../../extension/src/shared/messaging/types.ts) | 新增 AUTH_LOGOUT / AUTH_STATUS / AuthUserProjection |
| 测试：http / token-manager / auth-handler | 23 个新增用例 |

## 3. 关键安全约束

- **Token 不出 background**：popup/content 永远拿不到 token 本体
- **凭证错误统一文案**：避免泄漏后端细节
- **handler 防御性校验**：popup 已校验后 handler 再校验一次
- **加密落地**：access/refresh/user 均通过 secureStorage（A1 实现）
- **refresh 单飞**：并发 401 仅触发一次刷新

## 4. 验证

```bash
cd extension
npm run typecheck   # ✅
npm run lint        # ✅
npm run test        # ✅ 92 tests passed
npm run build       # ✅
```

### Chrome 手动验证
1. 加载 `dist/`
2. 点击扩展图标 → 弹出登录表单
3. 输入任意邮箱 + `demo1234` → 进入已登录态，显示用户信息
4. 点击"退出登录" → 回到登录表单
5. 刷新扩展后状态仍然保留（secureStorage 持久化）

## 5. 衔接

- **A4**：Side Panel 接入 AUTH_STATUS，根据登录态展示登录提示或工作台
- **A6/A7**：所有受保护 API 通过 `request()` 自动携带 token；401 自动 refresh

## 6. 待办（记入后续）
- A4 引入 store 时，refresh 失败后广播 AUTH_STATE_CHANGED 给 sidepanel
- B 模块完成后，将 `apiConfig.useMock` 改为 false 并移除 mock-backend 注入
