# RAG 知识库与 AI 演练模块实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建支持文档上传、话术/文档统一 RAG 检索、AI 演练对话与评分反馈的闭环模块。

**Architecture:** 后端新增 `rag` 与 `practice` 两个边界清晰的 NestJS 模块，`rag` 负责知识文档、切片、向量检索与降级检索，`practice` 负责场景、会话、消息与 AI 演练编排。前端新增知识库页面与演练页面，通过 `api/rag.ts`、`api/practice.ts` 与后端交互。

**Tech Stack:** NestJS, Prisma, PostgreSQL, ChromaDB, OpenAI, React, TypeScript, Ant Design, Jest, Vitest。

---

### Task 1: 数据模型与依赖准备

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Modify: `backend/.env.example`
- Modify: `backend/package.json`

- [ ] 新增 `KnowledgeDocument` 与 `KnowledgeChunk` 模型，并补充 `User`、`Team` 关系字段。
- [ ] 补充 OpenAI、Chroma、上传与切片相关环境变量。
- [ ] 安装 `pdf-parse`、`mammoth`、`@types/multer`、`@types/pdf-parse`。
- [ ] 运行 `npx prisma validate` 验证 schema。

### Task 2: RAG 后端测试先行

**Files:**
- Create: `backend/src/rag/rag.service.spec.ts`

- [ ] 写失败测试覆盖文档切片、txt 上传处理、权限过滤检索、Chroma/OpenAI 降级、删除文档。
- [ ] 运行 `npm run test -- rag.service.spec.ts` 确认失败原因为模块不存在。

### Task 3: RAG 后端实现

**Files:**
- Create: `backend/src/rag/dto/search-rag.dto.ts`
- Create: `backend/src/rag/dto/upload-document.dto.ts`
- Create: `backend/src/rag/types/rag-source.type.ts`
- Create: `backend/src/rag/types/rag-search-result.type.ts`
- Create: `backend/src/rag/document-parser.service.ts`
- Create: `backend/src/rag/document-chunker.service.ts`
- Create: `backend/src/rag/vector-store.service.ts`
- Create: `backend/src/rag/rag.service.ts`
- Create: `backend/src/rag/rag.controller.ts`
- Create: `backend/src/rag/rag.module.ts`
- Modify: `backend/src/scripts/scripts.service.ts`
- Modify: `backend/src/scripts/scripts.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] 实现上传文件校验、文本抽取、切片、文档入库与向量写入。
- [ ] 实现话术同步到向量库，失败不阻断主流程。
- [ ] 实现 RAG 检索，向量检索失败时降级 Prisma 关键词检索。
- [ ] 实现文档列表与删除接口。
- [ ] 运行 RAG 后端测试直至通过。

### Task 4: Practice 后端测试先行

**Files:**
- Create: `backend/src/practice/practice.service.spec.ts`

- [ ] 写失败测试覆盖场景可见性、创建会话、发送消息使用 RAG、结束评分、越权与已结束会话拒绝追加消息。
- [ ] 运行 `npm run test -- practice.service.spec.ts` 确认失败原因为模块不存在。

### Task 5: Practice 后端实现

**Files:**
- Create: `backend/src/practice/dto/create-session.dto.ts`
- Create: `backend/src/practice/dto/list-sessions-query.dto.ts`
- Create: `backend/src/practice/dto/send-message.dto.ts`
- Create: `backend/src/practice/types/practice-session-detail.type.ts`
- Create: `backend/src/practice/types/practice-feedback.type.ts`
- Create: `backend/src/practice/practice.service.ts`
- Create: `backend/src/practice/practice.controller.ts`
- Create: `backend/src/practice/practice.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] 实现场景列表、详情、会话创建、会话列表、会话详情、消息发送、结束评分。
- [ ] AI/OpenAI 不可用时使用可解释的兜底客户回复和评分。
- [ ] 返回 RAG sources 供前端展示。
- [ ] 运行 Practice 后端测试直至通过。

### Task 6: 前端 API 测试先行与实现

**Files:**
- Create: `frontend/src/api/rag.test.ts`
- Create: `frontend/src/api/rag.ts`
- Create: `frontend/src/api/practice.test.ts`
- Create: `frontend/src/api/practice.ts`

- [ ] 写失败测试覆盖上传、列表、删除、检索、场景、会话、发送消息、结束评分 API。
- [ ] 实现 API 封装并运行对应测试通过。

### Task 7: 前端页面测试先行与实现

**Files:**
- Create: `frontend/src/pages/knowledge/KnowledgePage.test.tsx`
- Create: `frontend/src/pages/knowledge/KnowledgePage.tsx`
- Create: `frontend/src/pages/practice/PracticePage.test.tsx`
- Create: `frontend/src/pages/practice/PracticePage.tsx`
- Modify: `frontend/src/routes/index.tsx`
- Modify: `frontend/src/index.css`

- [ ] 知识库页面支持上传、文档列表、删除、RAG 测试检索。
- [ ] 演练页面支持场景选择、开始演练、发送消息、展示引用来源、结束评分。
- [ ] 路由挂载 `/workspace/knowledge` 与 `/workspace/practice`。
- [ ] 运行前端测试直至通过。

### Task 8: 文档、自检与验证

**Files:**
- Create: `docs/modules/practice-rag-knowledge-module.md`

- [ ] 输出模块职责、核心功能、依赖说明、接口、权限、安全与测试说明。
- [ ] 运行 `npx prisma validate`、后端 test/build/lint、前端 test/build/lint。
- [ ] 进行安全架构审查并修复发现的问题。
- [ ] 输出 Git add/commit/push 建议。
