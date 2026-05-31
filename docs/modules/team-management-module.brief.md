# 团队与权限管理模块（简明版）

> 完整版见 `team-management-module.md`。本文档面向「快速查阅」场景。

---

## 一、模块职责

为系统提供「团队 + 角色权限」基础设施，给后端、前端、扩展端统一的团队/成员/邀请能力，并把「角色守卫」抽到 common 层供后续模块复用。

---

## 二、核心功能

1. 团队 CRUD：创建、查我团队、改名、解散
2. 所有权管理：转让 owner（owner 不能直接退出）
3. 成员管理：退出、移除、调整角色（禁改 ADMIN / owner / 自己）
4. 邀请管理：生成 16 位 base32 高熵邀请码、列出、撤销、凭码加入
5. 通用 `@Roles()` + `RolesGuard`：ADMIN 短路，其他角色按白名单

---

## 三、依赖说明

| 类别 | 项 |
|---|---|
| 后端内部 | `PrismaModule`、`AuthModule.JwtAuthGuard`、`SafeUser`、自带 `RolesGuard` |
| 前端内部 | `http`（含 JWT 拦截器）、`useAuth`、`antd` |
| 数据库 | 新增 1 表 `TeamInvitation`；`User` / `Team` 仅加反向关系字段，0 业务字段变更 |
| 第三方 npm | **0 新增**（邀请码用 Node 内置 `crypto.randomBytes`） |

---

## 四、对外接口

### REST（`backend/src/teams/`）
| Method | Path | 说明 |
|---|---|---|
| POST | `/teams` | 创建团队 |
| GET | `/teams/me` | 查我团队（未归属返回 null） |
| PATCH | `/teams/:teamId` | 改名（owner / ADMIN） |
| DELETE | `/teams/:teamId` | 解散（owner / ADMIN，事务清理资源） |
| POST | `/teams/:teamId/transfer` | 转让 owner（owner） |
| POST | `/teams/leave` | 退出（非 owner） |
| DELETE | `/teams/:teamId/members/:userId` | 移除成员 |
| PATCH | `/teams/:teamId/members/:userId/role` | 调成员角色 |
| POST | `/teams/:teamId/invitations` | 生成邀请 |
| GET | `/teams/:teamId/invitations` | 列邀请 |
| DELETE | `/teams/:teamId/invitations/:invId` | 撤销邀请 |
| POST | `/invitations/accept` | 凭码加入 |

### 前端 API（`frontend/src/api/teams.ts`）
12 个方法一一对应；类型 `TeamSummary / TeamDetail / TeamMemberSummary / InvitationDetail` 与后端对齐。

### 前端页面
`/workspace/team`：无团队态展示双 CTA；有团队态展示信息卡 + 成员表 + 邀请管理面板（依角色显示）。

### 复用基础设施
- `backend/src/common/decorators/roles.decorator.ts`
- `backend/src/common/guards/roles.guard.ts`

---

## 五、关键逻辑（速读）

- **并发安全**：所有写操作走事务 + `updateMany` CAS（复检 `where`），并发被抢即 `count=0` 抛错回滚
- **邀请码**：`crypto.randomBytes` + base32 16 位 ≈ 80bit 熵；仅对 P2002 重试 5 次
- **派生状态**：邀请 `status` 不入库，由 `revokedAt > usedAt > expiresAt` 优先级运行时推导
- **解散无损**：成员脱离 + 关联资源 `teamId` 置 null + 邀请 `revokedAt` 标记，**业务数据 0 删除**
- **自伤防护**：禁移自己、禁改自己角色、禁转让给自己、禁改 owner、owner 禁直接退出
- **提权防护**：邀请与改角色都禁止落到 ADMIN，ADMIN 仅 DB 手动指定
- **权限收敛**：controller 仅 `JwtAuthGuard` + 路径，细粒度权限由 service 闸门统一处理，不散落

---

> Tag：`v0.5.0` ｜ 完整文档：`team-management-module.md`
