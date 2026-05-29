# 基础架构初始化模块文档

## 模块职责

基础架构初始化模块负责为「销智 AI 销售助手」建立可持续迭代的工程骨架，包括 Git 管控、后端 NestJS 服务基础、Prisma 数据模型、前端 React 应用基础入口、测试与构建校验能力。

## 核心功能

### Git 与工程规范

- 初始化本地 Git 仓库。
- 配置 `.gitignore`，避免提交 `.env`、`node_modules`、构建产物、日志和本地缓存。
- 配置 `.gitattributes`，统一跨 Windows/Mac 协作时的换行策略。
- 建立模块级提交记录，保证基础架构变更可追溯。

### 后端基础能力

- 使用 NestJS + TypeScript 建立后端应用入口。
- 使用 `ConfigModule` 统一加载环境变量。
- 使用全局 `ValidationPipe` 为后续 DTO 校验提供基础能力。
- 使用 `PrismaModule` 和 `PrismaService` 封装数据库访问生命周期。
- 使用 Prisma 定义用户、团队、话术、场景、演练、点评等核心数据模型。

### 前端基础能力

- 使用 React + Vite + TypeScript 建立 Web 前端应用。
- 使用 Ant Design 搭建首页基础视觉结构。
- 使用 React Router 建立路由容器。
- 使用 `AuthContext` 建立认证状态上下文占位。
- 使用 Vitest 和 Testing Library 建立前端单元测试能力。

## 依赖说明

### 后端依赖

- `@nestjs/common`、`@nestjs/core`、`@nestjs/platform-express`：NestJS 基础服务框架。
- `@nestjs/config`：环境变量配置管理。
- `@nestjs/jwt`、`@nestjs/passport`：后续用户认证模块使用。
- `@prisma/client`、`prisma`：数据库模型与 ORM 访问。
- `bcrypt`：后续密码哈希使用。
- `openai`、`langchain`、`chromadb`：后续 AI 对话与 RAG 检索能力使用。
- `ioredis`：后续缓存、会话与限流能力使用。
- `typescript` 固定为 `5.3.3`，避免与当前 `@typescript-eslint` 版本兼容性冲突。

### 前端依赖

- `react`、`react-dom`：前端渲染框架。
- `vite`：前端构建工具。
- `antd`、`@ant-design/icons`：基础 UI 与图标库。
- `react-router-dom`：前端路由。
- `zustand`：后续轻量状态管理预留。
- `axios`：后续 API 请求封装预留。
- `echarts`、`echarts-for-react`：后续数据驾驶舱可视化预留。
- `vitest`、`@testing-library/react`：前端测试能力。

## 对外接口

### 后端当前接口

当前模块只完成后端基础架构，没有开放业务 HTTP 接口。

已建立后续模块可复用的内部接口：

- `PrismaService`：提供 Prisma Client 生命周期管理与数据库访问能力。
- `PrismaModule`：全局导出 `PrismaService`，供认证、话术库、演练场等模块注入使用。

### 前端当前接口

当前模块只完成前端基础页面与上下文占位，没有对接真实后端 API。

已建立后续模块可复用的内部接口：

- `AuthProvider`：提供认证上下文容器。
- `useAuth()`：提供认证状态读取能力。
- `AppRoutes`：前端路由入口组件。

## 关键逻辑说明

### 环境变量安全

- `.env` 已被 `.gitignore` 忽略，不会进入 Git 版本库。
- 当前仓库只保留 `.env.example`，用于说明必要配置项。
- 本地 `backend/.env` 经检查处于 Git ignored 状态，未被版本追踪。

### Prisma 数据模型

- `User` 与 `Team` 建立成员关系和团队拥有者关系。
- `Script` 支持预设话术、自定义话术、团队共享话术。
- `Scenario` 支持预设演练场景与自定义演练场景。
- `PracticeSession` 与 `PracticeMessage` 支持完整演练对话记录。
- `Evaluation` 支持培训师或管理者对演练结果进行评分点评。

### 前端首页

- 首页展示产品名称、核心价值说明和两个核心模块入口。
- `BrowserRouter` 已启用 React Router v7 future flag，减少后续升级警告。
- Ant Design 响应式组件在测试环境中通过 `matchMedia` mock 保持测试稳定。

## 模块检查结论

### 已修复问题

- 修复 Prisma `Team.owner` 命名关系缺少 `User.ownedTeam` 反向字段的问题。
- 固定前后端 TypeScript 版本，避免 `@typescript-eslint` 兼容性警告扩大为后续构建风险。
- 增加 `.gitattributes`，降低跨平台换行差异造成的 Git 噪音。
- 清理认证模块草稿文件，避免跨模块污染当前基础架构模块。
- 验证 `backend/.env` 未被 Git 跟踪。

### 当前遗留风险

- 后端依赖审计存在高危和中危提示，后续建议单独创建安全审计模块处理，不应在业务模块中混合升级。
- 前端 Ant Design 产物体积超过 500KB 警告，当前通过手动分包缓解，后续进入正式页面时需要按路由懒加载继续优化。
- 后端当前没有业务单元测试，因为本模块只包含框架初始化；后续每个业务模块必须按 TDD 补齐正常、边界、异常场景测试。

## 验证命令

### 后端

```bash
cd backend
npx prisma validate
npm run build
npm run lint
npm run test -- --passWithNoTests
```

### 前端

```bash
cd frontend
npm run test
npm run build
npm run lint
```
