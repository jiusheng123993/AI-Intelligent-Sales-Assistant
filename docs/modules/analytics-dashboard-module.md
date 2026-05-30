# 数据分析看板模块

> 模块分支：`feature/analytics-dashboard-module`
> 模块范围：Web 工作台数据看板 + NestJS 统计接口
> 当前状态：已完成

## 1. 模块职责

数据分析看板模块负责汇总销售赋能系统内的话术、演练与知识库数据，为销售成员、培训师、经理和管理员提供可视化复盘入口。模块以 `/workspace/analytics` 作为前端页面入口，以 `/analytics/summary` 作为后端聚合接口入口。

## 2. 核心功能

- 总览指标：话术总数、演练会话数、平均演练分、知识文档数。
- 演练趋势：按日期聚合演练次数与平均得分。
- 话术分类分布：按话术分类聚合数量。
- 成员演练排行：按演练次数与平均分展示前 10 名成员。
- 最近演练记录：展示最近 10 条演练会话。
- 页面入口：首页工作台新增“数据分析看板”模块卡片。

## 3. 后端设计

后端新增 `AnalyticsModule`，由 `AnalyticsController` 和 `AnalyticsService` 组成：

- `AnalyticsController`：提供 `GET /analytics/summary`，并通过 `JwtAuthGuard` 要求登录访问。
- `AnalyticsService`：统一完成日期范围归一化、角色权限范围计算、Prisma 聚合查询与响应结构组装。
- `AnalyticsQueryDto`：接收 `from` / `to` ISO 日期参数。
- `AnalyticsSummary` 类型：约束接口响应结构。

## 4. 权限与安全边界

所有统计范围均由后端根据当前登录用户计算，前端不能传入用户 ID 控制统计范围。

| 角色 | 统计范围 |
|---|---|
| SALES | 本人演练、本人的知识文档、本人可见话术 |
| TRAINER | 所属团队演练、本人或团队共享知识文档、本人可见话术 |
| MANAGER | 所属团队演练、本人或团队共享知识文档、本人可见话术 |
| ADMIN | 全局统计 |

日期范围限制为最多 180 天，避免一次请求拉取过大数据量。非法日期、倒置日期和超大跨度会返回 `BadRequestException`。

## 5. 前端设计

前端新增：

- `frontend/src/api/analytics.ts`：封装数据分析接口与类型。
- `frontend/src/pages/analytics/AnalyticsPage.tsx`：展示指标卡片、ECharts 图表、成员排行与最近演练表格。
- `/workspace/analytics` 路由：挂载到受保护路由下，仅登录后可访问。

页面具备加载态、错误提示与空数据兜底，图表无数据时展示 Ant Design 空状态。

## 6. 依赖说明

- 后端依赖现有 NestJS、Prisma、JWT 鉴权和 Prisma 数据模型。
- 前端依赖现有 React、Ant Design、ECharts、echarts-for-react、Vitest。
- 本模块未新增第三方依赖。

## 7. 测试覆盖

后端测试覆盖：

- SALES 个人统计范围。
- MANAGER 团队统计范围。
- ADMIN 全局统计范围。
- 日期跨度超过 180 天。
- 起止日期倒置。

前端测试覆盖：

- API 请求参数传递。
- API 默认参数行为。
- 页面正常加载展示。
- 页面加载失败提示。
- 空数据展示。
- 首页核心模块入口更新。

## 8. 验证结果

```bash
cd backend
npx prisma validate   # 通过
npm run test          # 106 tests passed
npm run build         # 通过
npm run lint          # 通过

cd frontend
npm run test          # 85 tests passed
npm run build         # 通过
npm run lint          # 通过
```

## 9. 后续扩展点

- 增加自定义日期范围筛选器。
- 增加团队筛选，仅对管理员或经理开放。
- 将趋势聚合下沉到数据库 SQL，提高大数据量场景性能。
- 增加浏览器扩展推荐触发次数统计。
- 增加数据导出和定时报表。
