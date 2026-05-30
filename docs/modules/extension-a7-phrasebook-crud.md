# A 模块：浏览器扩展（销冠话术宝）— A7 子任务文档

> 子任务编号：**A7 — 个人话术库 CRUD（本地优先 + 后端同步占位）**
> 分支：`feature/A7-phrasebook-crud`（基于 `feature/A-extension`）

## 1. 子任务目标

实现个人话术库 CRUD：本地优先存储、后端同步占位、Side Panel 中新增/删除/搜索/标签过滤/复制。

## 2. 交付物

| 文件 | 职责 |
|---|---|
| [shared/phrasebook/types.ts](../../extension/src/shared/phrasebook/types.ts) | Phrase / PhraseInput 类型 |
| [shared/phrasebook/phrasebook.api.ts](../../extension/src/shared/phrasebook/phrasebook.api.ts) | 远端同步占位（A7 no-op） |
| [shared/phrasebook/phrasebook.service.ts](../../extension/src/shared/phrasebook/phrasebook.service.ts) | 本地优先 CRUD、输入校验、脏数据过滤、搜索/标签过滤 |
| [sidepanel/stores/phrasebook.store.ts](../../extension/src/sidepanel/stores/phrasebook.store.ts) | Zustand UI store，处理 load/create/update/remove/search/tag |
| [sidepanel/tabs/PhrasebookTab.tsx](../../extension/src/sidepanel/tabs/PhrasebookTab.tsx) | 话术库 UI：表单、搜索、标签筛选、复制、删除 |
| 测试：phrasebook-service / phrasebook-store / phrasebook-tab | 18 个新增用例 |

## 3. 数据模型

```ts
interface Phrase {
  id: string;
  title: string;      // 1~30
  content: string;    // 1~500
  tags: string[];     // <=5，每个 <=20
  createdAt: number;
  updatedAt: number;
}
```

## 4. 安全与边界

- 输入统一走 `validatePhraseInput`：标题/内容长度限制、标签去重裁剪
- storage 读取后运行时校验 `isPhrase`，脏数据直接过滤
- 删除不存在 id 幂等，不抛错
- 远端同步 no-op，失败不阻断本地 CRUD
- store 增加 `mutationRevision`，防止挂载时 `load()` 的过期结果覆盖用户刚新增的话术

## 5. 验证

```bash
cd extension
npm run typecheck   # ✅
npm run lint        # ✅
npm run test        # ✅ 158 tests passed
npm run build       # ✅
```

## 6. 衔接

- A8：右键菜单/快捷键可复用话术库中的内容插入逻辑
- B 模块：后端话术库接口完成后替换 `phrasebook.api.ts` 的 no-op sync
