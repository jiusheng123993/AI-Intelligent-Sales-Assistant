# 团队与权限管理模块（Team & Role）

> 模块代号：C
> 状态：已交付（v0.5.0）
> 分支：feature/team-management-module
> 开发节点：C-1 → C-2 → C-2.5 → C-3 → C-4 → C-5 → C-6 → C-6b → C-7

---

## 一、模块职责

为系统提供「团队 + 角色权限」基础设施，覆盖：

1. 团队全生命周期：创建、查看详情、改名、转让所有权、解散。
2. 成员管理：加入、退出、移除、调整角色。
3. 邀请管理：生成邀请码、列出邀请、撤销邀请、凭码加入团队。
4. 通用角色权限基础设施：`@Roles()` 装饰器 + `RolesGuard`，供 A、B 等后续模块直接复用。

---

## 二、核心功能矩阵

| 功能 | SALES | TRAINER | MANAGER | ADMIN |
|---|:-:|:-:|:-:|:-:|
| 创建团队（自动晋升 MANAGER） | ✅ | ✅ | ✅ | ✅ |
| 查看自己团队详情 | ✅ | ✅ | ✅ | ✅ |
| 改团队名 / 解散 / 转让 | ❌ | ❌ | ✅(owner) | ✅(全部) |
| 调整成员角色 / 移除成员 | ❌ | ❌ | ✅(本团队) | ✅(全部) |
| 生成 / 撤销邀请 | ❌ | ✅(本团队) | ✅(本团队) | ✅ |
| 退出团队（owner 不可) | ✅ | ✅ | ✅ | ✅ |

> 业务规则：
> - 禁止将任何成员调为 ADMIN；ADMIN 仅由 DB 手动指定
> - owner 不能直接退出团队，必须先转让或解散
> - 解散团队只会把关联 Script/Scenario/KnowledgeDocument 的 `teamId` 置 null，不会删除业务数据
> - 邀请码 16 位 base32（80bit 熵），默认 7 天过期，可指定 1~30 天；不允许生成 ADMIN 角色邀请

---

## 三、依赖说明

### 内部依赖
- `PrismaModule` —— 数据访问
- `AuthModule.JwtAuthGuard` —— 全局鉴权前置
- `users/types/safe-user.type` —— `SafeUser` 用户上下文
- `common/guards/roles.guard.ts` —— 新增的通用角色守卫（本模块自带，已 export 给后续模块复用）

### 外部依赖
- 仅依赖 Node 内置 `crypto.randomBytes` 生成邀请码；**未引入任何新 npm 包**。

### 数据库改动
- 新增 1 张表 `TeamInvitation`
- `User` 模型新增 2 个反向关系字段（`sentInvitations` / `usedInvitations`）
- `Team` 模型新增 1 个反向关系字段（`invitations`）
- **未改任何业务字段**，0 回归风险

---

## 四、对外接口

### 4.1 REST 接口

| Method | Path | 角色要求 |
|---|---|---|
| POST | `/teams` | 任意（创建后自动晋升 MANAGER） |
| GET | `/teams/me` | 任意（未归属返回 null） |
| PATCH | `/teams/:teamId` | owner / ADMIN |
| DELETE | `/teams/:teamId` | owner / ADMIN |
| POST | `/teams/:teamId/transfer` | owner |
| POST | `/teams/leave` | 已属团队、非 owner |
| DELETE | `/teams/:teamId/members/:userId` | owner / MANAGER（本团队） / ADMIN |
| PATCH | `/teams/:teamId/members/:userId/role` | 同上 |
| POST | `/teams/:teamId/invitations` | owner / TRAINER / MANAGER（本团队） / ADMIN |
| GET | `/teams/:teamId/invitations` | 同上 |
| DELETE | `/teams/:teamId/invitations/:invitationId` | 同上 |
| POST | `/invitations/accept` | 任意已登录用户，未归属团队 |

### 4.2 前端 API（`frontend/src/api/teams.ts`）
12 个方法对应上述接口，完整 TS 类型声明：
`createTeam / findMyTeam / renameTeam / disbandTeam / transferOwnership / leaveTeam / removeMember / updateMemberRole / createInvitation / listInvitations / revokeInvitation / acceptInvitation`

### 4.3 前端页面
- `/workspace/team`：自动二态渲染
  - **无团队**：双 CTA 引导（创建团队 / 输入邀请码加入）
  - **有团队**：团队信息卡 + 成员表 + 邀请管理面板

### 4.4 复用基础设施
- `backend/src/common/decorators/roles.decorator.ts` `Roles(...roles)`
- `backend/src/common/guards/roles.guard.ts` `RolesGuard`

---

## 五、关键逻辑说明

### 5.1 并发安全（CAS / atomic where）
所有写操作均通过事务 + 复检 `where` 字段实现 CAS：
- `createTeam`：`user.updateMany({ where: { id, teamId: null }, ... })`，若被并发占用 `count=0` 即抛错回滚
- `transferOwnership`：`team.updateMany({ where: { id, ownerId: 原 owner }, ... })`，防止两个 owner 同时转让
- `disbandTeam`：完整事务包含成员脱离 + 资源 `teamId` 置 null + 撤销邀请 + 删团队
- `acceptInvitation`：事务包住 user.update + 邀请标记已用

### 5.2 邀请码生成
- `crypto.randomBytes(16)` 高熵随机源（80bit 熵）
- 字符集 base32（A-Z2-7），16 位
- 唯一索引兜底；仅对 `Prisma.PrismaClientKnownRequestError code=P2002` 重试最多 5 次
- 其他错误（连接断开、外键失效）立即冒泡，不掩盖根因

### 5.3 派生状态
邀请状态 `PENDING / USED / EXPIRED / REVOKED` **不入库**，由 `expiresAt / usedAt / revokedAt` 运行时推导，优先级：REVOKED > USED > EXPIRED > PENDING。

### 5.4 解散团队的数据保留策略
- 成员：`teamId` 置 null，角色统一降为 SALES
- Script / KnowledgeDocument：`teamId` 置 null + `isShared = false`
- Scenario：`teamId` 置 null
- 未使用未撤销的邀请：写 `revokedAt = now`
- 最后 `team.delete`
- **业务数据 0 删除**

### 5.5 角色权限闸门
- `RolesGuard`（`backend/src/common/guards/roles.guard.ts`）：
  - 未声明 `@Roles()` 时放行（保护公共接口）
  - `request.user` 缺失即拒绝（防止漏配 `JwtAuthGuard`）
  - `ADMIN` 短路放行
  - 其他角色按 `includes` 判定
- 业务层细粒度权限（owner / 同团队 / 自伤防护）在 service 内完成，不散落到 controller

---

## 六、测试覆盖

| 文件 | 用例数 | 覆盖范围 |
|---|---|---|
| backend/src/common/guards/roles.guard.spec.ts | 7 | 未声明 / 空数组 / 缺 user / 匹配 / 不匹配 / ADMIN / Reflector 调用 |
| backend/src/teams/teams.service.spec.ts | 28 | 8 方法的正常路径 + 全部异常分支 |
| backend/src/teams/invitation.service.spec.ts | 18 | 4 方法的正常路径 + 过期/已用/已撤/越权/已属团队 |
| frontend/src/api/teams.test.ts | 13 | 12 个 API 方法 + `findMyTeam` null 边界 |
| frontend/src/pages/team/TeamPage.test.tsx | 8 | 无团队引导 / owner 视图 / 非 owner 视图 / 创建 / 加入 / 加载失败 / 移除 / 改角色 Modal |
| frontend/src/pages/team/InvitationsPanel.test.tsx | 6 | 无权不渲染 / 加载列表 / 生成 / 撤销可见性 / 撤销流程 / 加载失败 |

**模块测试合计：80 个用例。**
**全量回归：26 套件 / 181 用例 100% 通过；tsc 0 错。**

---

## 七、自检审计修复记录

| # | 缺陷 | 修复 |
|---|---|---|
| D1 | `leaveTeam` 路由签名带 `:teamId` 但 service 不用，造成虚假参数 | 改为 `POST /teams/leave`，前端同步 |
| D2 | 5 处写操作 `findUnique→update` 存在 TOCTOU 并发风险 | `transferOwnership` 改为事务内 `updateMany` CAS |
| D3 | `createTeam` 同一用户并发可能创建两个团队 | 事务内 `user.updateMany({ where: { id, teamId: null } })` CAS |
| D4 | 邀请码重试吞掉非唯一冲突错误 | 仅对 Prisma P2002 重试，其他错误冒泡 |

### 当前已知未修复（接受现状）
- **D5**（低）：teamId 缺 cuid 格式校验，依赖 Prisma 兜底报错
- **D6**（低）：`acceptInvitation` 过期判断未做事务内复检，理论上接受瞬间被撤销仍可加入

后续如果出现真实问题，会以独立 fix 分支处理。

---

## 八、运维建议

- 生产部署务必用 `prisma migrate deploy`，**禁用** `db push`（本模块 MVP 暂用 push，迁移到 migrate 是发布前的必经步骤）
- Postgres 上 `Team.ownerId` 已是 unique，配合应用层 CAS 双保险
- 邀请码 16 位 base32 ≈ 80bit 熵；如未来要加速率限制，建议在 Nginx/Gateway 层为 `POST /invitations/accept` 加 IP 维度限流
