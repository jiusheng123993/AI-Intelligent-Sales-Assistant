# A 模块：浏览器扩展（销冠话术宝）— A4 子任务文档

> 子任务编号：**A4 — Side Panel 三 Tab + Zustand stores**
> 分支：`feature/A4-sidepanel`（基于 `feature/A-extension`）

## 1. 子任务目标

搭建 Side Panel 工作台骨架：鉴权守卫 + 三 Tab（推荐 / 话术库 / 设置）+ Zustand
状态层 + 空数据态，为 A6/A7 等业务功能提供承载容器。

## 2. 交付物

| 文件 | 职责 |
|---|---|
| [sidepanel/SidePanelApp.tsx](../../extension/src/sidepanel/SidePanelApp.tsx) | 根组件；loading/anon/authed 三态切换 |
| [sidepanel/stores/auth.store.ts](../../extension/src/sidepanel/stores/auth.store.ts) | 登录态快照（权威源仍是 background） |
| [sidepanel/stores/ui.store.ts](../../extension/src/sidepanel/stores/ui.store.ts) | currentTab + toast 队列 |
| [sidepanel/components/TabNav.tsx](../../extension/src/sidepanel/components/TabNav.tsx) | 顶部 Tab 导航条 |
| [sidepanel/components/EmptyState.tsx](../../extension/src/sidepanel/components/EmptyState.tsx) | 复用空态展示 |
| [sidepanel/components/LoadingState.tsx](../../extension/src/sidepanel/components/LoadingState.tsx) | 复用加载占位 |
| [sidepanel/tabs/SuggestionsTab.tsx](../../extension/src/sidepanel/tabs/SuggestionsTab.tsx) | 推荐 Tab 空态（A6 接入） |
| [sidepanel/tabs/PhrasebookTab.tsx](../../extension/src/sidepanel/tabs/PhrasebookTab.tsx) | 话术库 Tab 空态（A7 接入） |
| [sidepanel/tabs/SettingsTab.tsx](../../extension/src/sidepanel/tabs/SettingsTab.tsx) | 账号信息 + 退出登录 |
| 测试：auth-store / ui-store / sidepanel-app | 12 个新增用例 |

## 3. 状态管理

- **auth.store** — 三态 `loading | anon | authed`；提供 `refresh()` 与 `logout()`；
  数据权威源始终是 background；refresh/logout 异常自动降级为 anon
- **ui.store** — currentTab + toast 队列；仅承载 UI 本地状态

## 4. 鉴权守卫流程

```
SidePanelApp 挂载 → useAuthStore.refresh()
  ├─ AUTH_STATUS 返回 loggedIn:true  → authed → 渲染 TabNav + 当前 Tab
  ├─ AUTH_STATUS 返回 loggedIn:false → anon   → EmptyState + 刷新按钮
  └─ sendMessage 抛错                  → anon   → 同上
```

## 5. 验证

```bash
cd extension
npm run typecheck   # ✅
npm run lint        # ✅
npm run test        # ✅ 104 tests passed
npm run build       # ✅
```

### Chrome 手动验证
1. `npm run build` → 加载 `dist/`
2. Chrome 顶栏扩展图标右键 → "打开侧边栏"
3. 未登录态 → 看到"未登录"引导；先去 Popup 登录后回到 Side Panel 点"刷新状态"
4. 已登录态 → 三 Tab 可切换；设置 Tab 退出登录后回到引导态

## 6. 衔接

- **A5**：Content adapter；与 Side Panel 通过 INSERT_TEXT 通信
- **A6**：在 SuggestionsTab 接入 SSE 流式 AI 推荐
- **A7**：在 PhrasebookTab 接入个人话术库 CRUD

## 7. 待办（继承自 A3）
- A6 引入 chrome.runtime.onMessage 广播 AUTH_STATE_CHANGED，
  让 Side Panel 在 Popup 登录后自动刷新（无需手动点按钮）
