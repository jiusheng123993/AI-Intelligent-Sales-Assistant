# 后端用户认证模块文档

## 模块职责

后端用户认证模块负责用户注册、登录、JWT 签发、JWT 鉴权、当前用户识别与安全用户信息返回，为前端认证、话术库、AI 演练场和浏览器扩展提供统一身份基础。

## 核心功能

- 用户注册：校验邮箱、密码和姓名，密码哈希后入库。
- 用户登录：校验邮箱和密码，认证成功后返回 JWT。
- 当前用户：通过 Bearer Token 获取当前登录用户。
- 安全用户：所有对外响应均移除 password 字段。
- JWT 配置：生产环境缺失 `JWT_SECRET` 时阻断启动，避免固定弱密钥风险。

## 对外接口

### POST /auth/register

请求字段：`email`、`password`、`name`。

响应字段：`accessToken`、`user`。

### POST /auth/login

请求字段：`email`、`password`。

响应字段：`accessToken`、`user`。

### GET /auth/me

请求头：`Authorization: Bearer <accessToken>`。

响应字段：当前安全用户对象。

## 模块依赖

- `PrismaModule`：提供数据库访问能力。
- `ConfigModule`：提供 `JWT_SECRET`、`JWT_EXPIRES_IN`、`NODE_ENV` 配置。
- `@nestjs/jwt`：负责 JWT 签发。
- `@nestjs/passport` 与 `passport-jwt`：负责 Bearer Token 鉴权。
- `bcrypt`：负责密码哈希与密码比对。

## 关键文件

- `backend/src/users/users.service.ts`：用户创建、查询与安全用户裁剪。
- `backend/src/auth/auth.service.ts`：注册、登录、当前用户业务流程。
- `backend/src/auth/auth.controller.ts`：认证 HTTP 接口入口。
- `backend/src/auth/strategies/jwt.strategy.ts`：JWT Bearer Token 解析与用户校验。
- `backend/src/auth/config/jwt.config.ts`：JWT 密钥与过期时间配置。

## 安全设计

- 密码入库前使用 bcrypt 哈希，盐轮数为 12。
- 登录失败统一返回认证失败，不暴露邮箱是否存在。
- JWT payload 只包含 `sub`、`email`、`role`。
- `/auth/me` 必须通过 JWT Guard。
- 统一 SafeUser 类型裁剪 password 字段。
- 生产环境不允许使用开发兜底 JWT 密钥。

## 测试覆盖

- 用户创建正常场景。
- 邮箱重复冲突场景。
- 用户安全裁剪场景。
- 注册密码哈希与 token 返回场景。
- 登录成功场景。
- 邮箱不存在登录失败场景。
- 密码错误登录失败场景。
- JWT payload 校验成功场景。
- token 用户不存在场景。
- JWT 生产环境密钥缺失场景。

## 验证命令

```bash
cd backend
npx prisma validate
npm run test
npm run build
npm run lint
```

## Git 操作建议

```bash
git status --short
git add backend/src/auth backend/src/users backend/src/app.module.ts docs/modules/backend-auth-module.md docs/superpowers/plans/2026-05-30-backend-auth-module.md
git commit -m "feat(auth): add backend jwt authentication module"
git push origin feature/backend-auth-module
```
