# 前端用户认证模块文档

## 模块职责

前端用户认证模块负责 Web 端登录、注册、JWT 登录态保存、当前用户恢复、登出、认证路由守卫与认证页面交互，为后续话术库、AI 演练场和浏览器扩展登录态对接提供前端身份基础。

## 核心功能

- 登录：提交邮箱和密码到后端 `/auth/login`，成功后保存 access token 并写入当前用户。
- 注册：提交姓名、邮箱和密码到后端 `/auth/register`，成功后保存 access token 并写入当前用户。
- 登录态恢复：应用启动时读取本地 token，存在 token 时请求 `/auth/me` 恢复当前用户。
- 登出：清理本地 token 和内存用户状态。
- 路由守卫：未登录访问受保护路由时跳转登录页；已登录访问登录/注册页时跳转首页。
- 表单校验：覆盖邮箱格式、必填字段、密码长度、确认密码一致性。

## 依赖说明

- `react-router-dom`：页面路由、公开路由、受保护路由与跳转。
- `axios`：认证接口请求与 Authorization 请求头注入。
- `antd`：登录、注册表单与反馈组件。
- `vitest` 与 Testing Library：认证状态、接口封装、路由守卫和页面交互测试。

## 对外接口

### 前端 API 方法

- `login(payload)`：调用 `POST /auth/login`。
- `register(payload)`：调用 `POST /auth/register`。
- `getCurrentUser()`：调用 `GET /auth/me`。

### Context 能力

- `user`：当前安全用户。
- `isAuthenticated`：是否已登录。
- `isInitializing`：是否正在恢复登录态。
- `login(payload)`：登录并写入状态。
- `register(payload)`：注册并写入状态。
- `logout()`：登出并清理状态。

## 关键逻辑说明

- `frontend/src/auth/tokenStorage.ts`：隔离 token 读写，并捕获 localStorage 异常，避免隐私模式或存储不可用导致页面崩溃。
- `frontend/src/api/http.ts`：统一创建 axios 实例，请求前注入 Bearer Token，遇到 401 清理本地 token。
- `frontend/src/contexts/AuthContext.tsx`：统一管理登录、注册、登出和刷新恢复登录态，避免页面组件直接操作 token。
- `frontend/src/auth/ProtectedRoute.tsx`：保护后续业务工作台页面，未登录时跳转 `/login`。
- `frontend/src/auth/PublicOnlyRoute.tsx`：限制已登录用户重复进入登录和注册页。
- `frontend/src/pages/auth/LoginPage.tsx`：登录表单、失败提示和成功跳转。
- `frontend/src/pages/auth/RegisterPage.tsx`：注册表单、密码一致性校验、失败提示和成功跳转。

## 安全设计

- 不在控制台输出 token、密码或后端错误详情。
- JWT 仅通过 axios 请求拦截器加入 Authorization 请求头，不渲染到页面。
- 登录失败统一提示，避免泄露账号存在性。
- localStorage 异常时降级为未登录状态。
- 401 响应主动清理本地 token，降低无效凭证继续使用风险。

## 测试覆盖

- Token 保存、读取、清理、localStorage 异常兜底。
- 登录、注册、当前用户 API 封装。
- AuthContext 默认状态、登录成功、注册成功、登出、token 恢复、恢复失败清理。
- 路由守卫未登录跳登录页、已登录跳首页。
- 登录页邮箱格式校验、登录成功、登录失败。
- 注册页密码一致性校验、注册成功、注册失败。
- App 首页核心内容与未登录入口。

## 验证命令

```bash
cd frontend
npm run test
npm run build
npm run lint
```

## Git 操作建议

```bash
git status --short
git add frontend/src docs/modules/frontend-auth-module.md
git commit -m "feat(auth-frontend): add frontend authentication module"
git push origin feature/frontend-auth-module
```
