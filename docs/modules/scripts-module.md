# 话术库管理模块文档

## 模块职责

话术库管理模块负责销售话术的创建、查询、编辑、删除、分类筛选、关键词检索与权限隔离，为 AI 话术演练场和浏览器扩展话术推荐能力提供基础内容资产。

## 核心功能

- 新建话术：登录用户可创建个人话术，培训师、经理和管理员可创建团队共享话术。
- 查询列表：支持分页、关键词搜索、分类筛选。
- 查看详情：仅允许访问当前用户可见的话术。
- 编辑话术：仅允许创建者编辑非系统预设话术。
- 删除话术：仅允许创建者删除非系统预设话术。
- 前端页面：提供 `/workspace/scripts` 受保护页面，支持列表、搜索、新建、编辑、删除确认。
- 前端 API：统一封装 `/scripts` 相关请求。

## 依赖说明

- `PrismaModule`：提供 `Script` 数据模型访问能力。
- `JwtAuthGuard`：保护所有话术接口，未登录请求无法访问。
- `CurrentUser`：从认证上下文读取当前安全用户。
- `class-validator` 与 `class-transformer`：校验创建、更新、查询参数。
- `react-router-dom`：挂载受保护前端路由。
- `antd`：实现话术表格、搜索、筛选、表单弹窗与删除确认。
- `vitest`、Testing Library 与 Jest：覆盖前端 API、页面交互与后端业务规则。

## 对外接口

### POST /scripts

创建话术。

请求字段：`title`、`content`、`category`、`tags`、`isShared`。

权限规则：登录用户可创建个人话术；`TRAINER`、`MANAGER`、`ADMIN` 可创建共享话术。

### GET /scripts

查询话术列表。

查询参数：`keyword`、`category`、`page`、`pageSize`。

响应字段：`items`、`total`、`page`、`pageSize`。

### GET /scripts/:id

查询话术详情。

权限规则：仅允许访问本人话术、系统预设话术和同团队共享话术。

### PATCH /scripts/:id

更新话术。

权限规则：仅允许创建者更新非系统预设话术。

### DELETE /scripts/:id

删除话术。

权限规则：仅允许创建者删除非系统预设话术。

## 关键逻辑说明

- `backend/src/scripts/scripts.service.ts`：集中处理可见性、共享权限、编辑权限、分页上限、标签清洗和 CRUD 业务规则。
- `backend/src/scripts/dto/create-script.dto.ts`：限制标题、内容、分类、标签和共享字段，避免非法输入进入业务层。
- `backend/src/scripts/dto/update-script.dto.ts`：允许局部更新，同时复用字段长度与枚举校验。
- `backend/src/scripts/dto/list-scripts-query.dto.ts`：限制分页参数，`pageSize` 最大为 50，降低异常大分页带来的性能风险。
- `frontend/src/api/scripts.ts`：隔离话术 API 类型和 HTTP 请求，页面不直接操作 axios。
- `frontend/src/pages/scripts/ScriptsPage.tsx`：实现话术列表、关键词检索、分类筛选、表单弹窗和删除确认。
- `frontend/src/routes/index.tsx`：将 `/workspace/scripts` 放入认证路由守卫中。

## 安全设计

- 所有后端接口均受 JWT 鉴权保护。
- 后端以当前登录用户为准写入 `createdById`，不信任前端传入创建人。
- 查询仅返回当前用户可见的话术，避免越权读取。
- 编辑和删除均校验创建者身份与 `isPreset` 状态，避免篡改系统预设或他人话术。
- `SALES` 角色不能创建共享话术，避免普通销售误发布团队内容。
- 标签会去重、去空、裁剪最多 10 个，降低异常输入风险。
- 前端仅文本渲染话术内容，不使用 HTML 注入渲染。

## 测试覆盖

- 后端创建个人话术、拒绝普通销售创建共享话术、允许培训师创建共享话术。
- 后端列表分页、关键词、分类筛选和最大分页限制。
- 后端详情可见性、不可见资源 404。
- 后端编辑本人话术、拒绝编辑他人话术。
- 后端拒绝删除系统预设话术、允许删除本人非预设话术。
- 前端 API 查询、新建、详情、更新、删除封装。
- 前端页面加载、搜索、新建、编辑、删除确认和加载失败提示。

## 验证命令

```bash
cd backend
npx prisma validate
npm run test
npm run build
npm run lint

cd ../frontend
npm run test
npm run build
npm run lint
```

## Git 操作建议

```bash
git status --short
git add backend/src/app.module.ts backend/src/scripts frontend/src/api/scripts.ts frontend/src/api/scripts.test.ts frontend/src/pages/scripts frontend/src/routes/index.tsx frontend/src/index.css frontend/src/test/setup.ts docs/modules/scripts-module.md
git commit -m "feat(scripts): add script library management module"
git push -u origin feature/scripts-module
```
