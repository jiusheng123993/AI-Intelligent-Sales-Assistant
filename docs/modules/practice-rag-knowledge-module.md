# RAG 知识库与 AI 话术演练模块

## 模块职责

本模块负责将话术库与上传文档统一纳入 RAG 检索范围，并在 AI 话术演练中引用检索结果生成客户回复和训练反馈。

## 核心功能

1. 知识库文档上传
   - 支持 `txt`、`md`、`pdf`、`docx`
   - 校验文件大小、格式和可读文本
   - 自动抽取文本并切片
   - 写入 `KnowledgeDocument`、`KnowledgeChunk`
   - 尝试写入 ChromaDB 向量库

2. RAG 检索
   - 支持话术与文档统一检索
   - 优先使用 ChromaDB 向量检索
   - ChromaDB 或 OpenAI 不可用时降级为 Prisma 关键词检索
   - 检索后通过数据库进行二次权限过滤

3. AI 话术演练
   - 查询可见演练场景
   - 创建演练会话并生成 AI 客户开场白
   - 用户发送消息时触发 RAG 检索
   - 返回 AI 客户回复和参考来源
   - 结束演练时生成评分、反馈和参考来源

4. 前端页面
   - `/workspace/knowledge`：文档上传、列表、删除、RAG 检索测试
   - `/workspace/practice`：场景选择、演练对话、RAG 来源展示、评分反馈

## 依赖说明

后端新增依赖：

- `pdf-parse`：PDF 文本抽取
- `mammoth`：DOCX 文本抽取
- `multer`：文件上传处理
- `@types/multer`：上传类型支持
- `@types/pdf-parse`：PDF 解析类型支持

RAG 相关环境变量：

```env
OPENAI_API_KEY="your-openai-api-key"
OPENAI_API_BASE="https://api.openai.com/v1"
OPENAI_CHAT_MODEL="gpt-4o-mini"
OPENAI_EMBEDDING_MODEL="text-embedding-3-small"
CHROMA_URL="http://localhost:8000"
RAG_TOP_K=5
UPLOAD_DIR="./uploads"
MAX_UPLOAD_SIZE_MB=10
RAG_CHUNK_SIZE=1000
RAG_CHUNK_OVERLAP=150
```

## 后端接口

### RAG 知识库

- `POST /rag/documents`：上传知识文档
- `GET /rag/documents`：查询当前用户可见文档
- `DELETE /rag/documents/:id`：删除本人上传文档
- `POST /rag/search`：测试 RAG 检索

### AI 演练

- `GET /practice/scenarios`：查询可见演练场景
- `GET /practice/scenarios/:id`：查询场景详情
- `POST /practice/sessions`：创建演练会话
- `GET /practice/sessions`：查询我的演练会话
- `GET /practice/sessions/:id`：查询会话详情
- `POST /practice/sessions/:id/messages`：发送演练消息并触发 RAG
- `POST /practice/sessions/:id/finish`：结束演练并生成评分反馈

## 权限规则

用户可检索：

- 本人创建的话术
- 团队共享话术
- 系统预设话术
- 本人上传的文档
- 本团队共享文档

用户不可检索：

- 其他用户私有话术
- 其他用户私有文档
- 其他团队共享内容

普通销售只能上传个人文档。培训师、经理、管理员可以上传团队共享文档。

## 安全与容错

- 上传文件限制格式与大小
- 空文档、不可读文档会被拒绝
- 向量库召回结果会通过数据库再次校验权限
- 向量写入失败不会阻断业务，文档会标记为 `FAILED`
- 检索失败时自动降级为关键词检索
- 演练消息只能操作当前用户自己的会话
- 已结束会话不能继续追加消息

## 测试覆盖

后端覆盖：

- 文档切片
- TXT 文本抽取
- 不支持格式拒绝
- 上传文档与向量写入
- 普通销售共享上传拒绝
- 向量检索失败降级
- 检索结果权限过滤
- 删除文档与向量清理
- 场景可见性
- 会话创建
- 发送消息触发 RAG
- 已结束会话拒绝追加消息
- 结束演练生成评分
- 越权会话访问拒绝

前端覆盖：

- RAG API 封装
- Practice API 封装
- 知识库页面上传、列表、删除、检索
- 演练页面场景加载、开始演练、发送消息、展示来源、结束评分

## 数据库同步

本模块修改了 Prisma schema，部署或本地首次运行前需要执行数据库同步命令：

```bash
cd backend
npx prisma db push
npx prisma generate
```

如果项目后续切换为迁移流，则应改为创建并提交正式 Prisma migration。
