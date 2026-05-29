# 销智 AI 销售助手 MVP 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建销智 AI 销售助手 MVP，包含基础架构、用户模块、话术库管理、AI 话术演练场、浏览器扩展五大核心模块。

**Architecture:** 采用前后端分离架构，前端使用 React + TypeScript，后端使用 NestJS + TypeScript，数据库使用 PostgreSQL + Redis，AI 能力集成 OpenAI API。

**Tech Stack:** React 18, TypeScript, Ant Design, NestJS, Prisma, PostgreSQL, Redis, OpenAI API, LangChain, ChromaDB, Vite, CRXJS

---

## 阶段一：基础架构与 Git 初始化

### Task 1: Git 仓库初始化

**Files:**
- Create: `e:\AI Intelligent Sales Assistant\.gitignore`
- Create: `e:\AI Intelligent Sales Assistant\README.md`

- [ ] **Step 1: 创建 .gitignore 文件**

```gitignore
node_modules
dist
build
.env
.env.local
.env.*.local
.vscode
.idea
*.log
coverage
.prisma
chroma_data
redis_data
```

- [ ] **Step 2: 创建 README.md**

```markdown
# 销智 AI 销售助手

销智 AI 销售助手是一款面向销售团队的智能化销售赋能工具，包含两大核心模块：
- AI 话术演练场
- 销冠话术宝（AI 输入法）

## 项目结构

```
.
├── frontend/          # Web 前端应用
├── backend/           # NestJS 后端服务
├── extension/         # 浏览器扩展
└── docs/              # 文档
```

## 快速开始

详见各模块 README。
```

- [ ] **Step 3: 初始化 Git 仓库**

```bash
git init
git add .
git commit -m "feat: 初始化项目结构与文档"
```

---

## 阶段二：后端基础架构

### Task 2: 后端项目初始化

**Files:**
- Create: `e:\AI Intelligent Sales Assistant\backend\package.json`
- Create: `e:\AI Intelligent Sales Assistant\backend\tsconfig.json`
- Create: `e:\AI Intelligent Sales Assistant\backend\.env.example`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "ai-sales-assistant-backend",
  "version": "0.1.0",
  "description": "销智 AI 销售助手后端服务",
  "author": "",
  "private": true,
  "license": "UNLICENSED",
  "scripts": {
    "build": "nest build",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  },
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@nestjs/jwt": "^10.0.0",
    "@nestjs/passport": "^10.0.0",
    "@nestjs/config": "^3.0.0",
    "@prisma/client": "^5.0.0",
    "passport": "^0.6.0",
    "passport-jwt": "^4.0.0",
    "passport-local": "^1.0.0",
    "bcrypt": "^5.1.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.0",
    "reflect-metadata": "^0.1.13",
    "rxjs": "^7.8.1",
    "openai": "^4.0.0",
    "langchain": "^0.1.0",
    "chromadb": "^1.8.0",
    "ioredis": "^5.3.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",
    "@nestjs/schematics": "^10.0.0",
    "@nestjs/testing": "^10.0.0",
    "@types/express": "^4.17.17",
    "@types/jest": "^29.5.2",
    "@types/node": "^20.3.1",
    "@types/passport-jwt": "^3.0.9",
    "@types/passport-local": "^1.0.35",
    "@types/bcrypt": "^5.0.0",
    "@types/supertest": "^2.0.12",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.42.0",
    "eslint-config-prettier": "^9.0.0",
    "eslint-plugin-prettier": "^5.0.0",
    "jest": "^29.5.0",
    "prettier": "^3.0.0",
    "prisma": "^5.0.0",
    "source-map-support": "^0.5.21",
    "supertest": "^6.3.3",
    "ts-jest": "^29.1.0",
    "ts-loader": "^9.4.3",
    "ts-node": "^10.9.1",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^5.1.3"
  },
  "jest": {
    "moduleFileExtensions": [
      "js",
      "json",
      "ts"
    ],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"
    },
    "collectCoverageFrom": [
      "**/*.(t|j)s"
    ],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node"
  }
}
```

- [ ] **Step 2: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": false,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "forceConsistentCasingInFileNames": false,
    "noFallthroughCasesInSwitch": false
  }
}
```

- [ ] **Step 3: 创建 .env.example**

```env
DATABASE_URL="postgresql://user:password@localhost:5432/ai_sales_assistant?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"
OPENAI_API_KEY="your-openai-api-key"
OPENAI_API_BASE="https://api.openai.com/v1"
PORT=3000
NODE_ENV="development"
```

- [ ] **Step 4: Git 提交**

```bash
git add backend/
git commit -m "feat: 初始化后端项目配置"
```

---

### Task 3: Prisma 数据库模型设计

**Files:**
- Create: `e:\AI Intelligent Sales Assistant\backend\prisma\schema.prisma`

- [ ] **Step 1: 创建 schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  SALES
  TRAINER
  MANAGER
  ADMIN
}

enum ScriptCategory {
  INTRODUCTION
  OBJECTION_HANDLING
  CLOSING
  FOLLOW_UP
  CUSTOM
}

enum ScenarioType {
  COLD_CALL
  PRODUCT_DEMO
  NEGOTIATION
  COMPETITOR
  CUSTOM
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String
  role      UserRole @default(SALES)
  teamId    String?
  team      Team?    @relation(fields: [teamId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  practiceSessions PracticeSession[]
  scriptUsages     ScriptUsage[]
  scripts          Script[]
  evaluations      Evaluation[]

  @@index([teamId])
}

model Team {
  id        String   @id @default(cuid())
  name      String
  ownerId   String   @unique
  owner     User     @relation("TeamOwner", fields: [ownerId], references: [id])
  members   User[]
  scripts   Script[]
  scenarios Scenario[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Script {
  id          String          @id @default(cuid())
  title       String
  content     String
  category    ScriptCategory  @default(CUSTOM)
  tags        String[]
  isShared    Boolean         @default(false)
  isPreset    Boolean         @default(false)
  createdById String
  createdBy   User            @relation(fields: [createdById], references: [id])
  teamId      String?
  team        Team?           @relation(fields: [teamId], references: [id])
  usages      ScriptUsage[]
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  @@index([teamId])
  @@index([category])
}

model ScriptUsage {
  id        String   @id @default(cuid())
  scriptId  String
  script    Script   @relation(fields: [scriptId], references: [id])
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  context   String?
  rating    Int?
  createdAt DateTime @default(now())

  @@index([scriptId])
  @@index([userId])
}

model Scenario {
  id          String        @id @default(cuid())
  title       String
  description String
  type        ScenarioType  @default(CUSTOM)
  setting     Json
  isPreset    Boolean       @default(false)
  teamId      String?
  team        Team?         @relation(fields: [teamId], references: [id])
  sessions    PracticeSession[]
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  @@index([teamId])
}

model PracticeSession {
  id          String               @id @default(cuid())
  userId      String
  user        User                 @relation(fields: [userId], references: [id])
  scenarioId  String
  scenario    Scenario             @relation(fields: [scenarioId], references: [id])
  status      String               @default("IN_PROGRESS")
  score       Int?
  messages    PracticeMessage[]
  evaluations Evaluation[]
  createdAt   DateTime             @default(now())
  updatedAt   DateTime             @updatedAt

  @@index([userId])
  @@index([scenarioId])
}

model PracticeMessage {
  id        String   @id @default(cuid())
  sessionId String
  session   PracticeSession @relation(fields: [sessionId], references: [id])
  role      String
  content   String
  rating    Int?
  feedback  String?
  createdAt DateTime @default(now())

  @@index([sessionId])
}

model Evaluation {
  id          String   @id @default(cuid())
  sessionId   String
  session     PracticeSession @relation(fields: [sessionId], references: [id])
  evaluatorId String
  evaluator   User     @relation(fields: [evaluatorId], references: [id])
  score       Int
  comments    String?
  createdAt   DateTime @default(now())

  @@index([sessionId])
  @@index([evaluatorId])
}
```

- [ ] **Step 2: 创建 NestJS 主文件**

创建 `e:\AI Intelligent Sales Assistant\backend\src\main.ts`：
```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
```

创建 `e:\AI Intelligent Sales Assistant\backend\src\app.module.ts`：
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

- [ ] **Step 3: Git 提交**

```bash
git add backend/prisma/ backend/src/
git commit -m "feat: 添加 Prisma 数据模型与后端基础模块"
```

---

## 阶段三：前端基础架构

### Task 4: 前端项目初始化

**Files:**
- Create: `e:\AI Intelligent Sales Assistant\frontend\package.json`
- Create: `e:\AI Intelligent Sales Assistant\frontend\vite.config.ts`
- Create: `e:\AI Intelligent Sales Assistant\frontend\tsconfig.json`
- Create: `e:\AI Intelligent Sales Assistant\frontend\index.html`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "ai-sales-assistant-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "antd": "^5.12.0",
    "@ant-design/icons": "^5.2.0",
    "zustand": "^4.4.0",
    "axios": "^1.6.0",
    "dayjs": "^1.11.10",
    "echarts": "^5.4.3",
    "echarts-for-react": "^3.0.2"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@typescript-eslint/eslint-plugin": "^6.14.0",
    "@typescript-eslint/parser": "^6.14.0",
    "@vitejs/plugin-react": "^4.2.1",
    "eslint": "^8.55.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.5",
    "typescript": "^5.2.2",
    "vite": "^5.0.8"
  }
}
```

- [ ] **Step 2: 创建 vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 3: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 4: 创建 tsconfig.node.json**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 5: 创建 index.html**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>销智 AI 销售助手</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: 创建基础入口文件**

创建 `e:\AI Intelligent Sales Assistant\frontend\src\main.tsx`：
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN}>
      <App />
    </ConfigProvider>
  </React.StrictMode>,
);
```

创建 `e:\AI Intelligent Sales Assistant\frontend\src\App.tsx`：
```tsx
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AppRoutes from './routes';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
```

创建 `e:\AI Intelligent Sales Assistant\frontend\src\index.css`：
```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

- [ ] **Step 7: Git 提交**

```bash
git add frontend/
git commit -m "feat: 初始化前端项目配置与基础入口"
```

---

## 阶段四：用户认证模块（前后端）

### Task 5: 后端用户认证模块

**Files:**
- Create/Modify: `e:\AI Intelligent Sales Assistant\backend\src\*` (多个文件)

> 注：此任务将由子代理完整实现用户认证模块，包括：
> - Prisma Service
> - Auth Module (登录、注册、JWT)
> - User Module (用户管理)
> - Team Module (团队管理)
> - DTOs、Guards、Decorators

---

### Task 6: 前端用户认证模块

**Files:**
- Create/Modify: `e:\AI Intelligent Sales Assistant\frontend\src\*` (多个文件)

> 注：此任务将由子代理完整实现前端认证模块，包括：
> - AuthContext (Zustand store)
> - 登录/注册页面
> - 路由保护
> - API 封装)

---

## 阶段五-八：后续模块开发

后续模块将在用户认证模块完成后继续：
- 话术库管理模块
- AI 话术演练场模块
- 浏览器扩展模块
- 数据分析模块

---

## 计划确认

以上是第一阶段的实施计划。是否确认开始执行？

**两个执行选项：**

**1. 子代理驱动（推荐）** - 每个任务分配独立子代理，任务间review，快速迭代

**2. 内联执行** - 在当前会话中执行，批量执行并设置检查点review

**请选择执行方式。**
