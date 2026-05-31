# A 模块：浏览器扩展（销冠话术宝）— A1 子任务文档

> 子任务编号：**A1 — 共享层强化（shared-utils）**
> 分支：`feature/A1-shared-utils`（基于 `feature/A-extension`）

## 1. 子任务目标

为后续所有业务模块铺设安全、可复用的共享层基石；零业务耦合，强一致的错误码、强参数
校验、加密落盘、可注入的存储驱动。

## 2. 交付物

| 文件 | 职责 |
|---|---|
| [shared/storage/keys.ts](../../extension/src/shared/storage/keys.ts) | 集中托管 storage key 命名空间 |
| [shared/storage/chrome-storage.ts](../../extension/src/shared/storage/chrome-storage.ts) | `chrome.storage.local` 的 Promise 化适配 + 可注入内存驱动 |
| [shared/storage/secure-storage.ts](../../extension/src/shared/storage/secure-storage.ts) | WebCrypto AES-GCM 透明加解密存储层 |
| [shared/utils/validator.ts](../../extension/src/shared/utils/validator.ts) | 函数式参数校验工具集 + `assertValid` |
| [tests/unit/chrome-storage.test.ts](../../extension/tests/unit/chrome-storage.test.ts) | 7 用例：CRUD、prefix 清理、非法 key |
| [tests/unit/secure-storage.test.ts](../../extension/tests/unit/secure-storage.test.ts) | 10 用例：往返、密文 != 明文、IV 随机、自动建种子、损坏密文、clear 保种、并发写 |
| [tests/unit/validator.test.ts](../../extension/tests/unit/validator.test.ts) | 21 用例：覆盖每个校验器的正常/边界/异常 |

## 3. secure-storage 安全设计

- **算法**：AES-GCM 256 位 + 12 字节随机 IV
- **密钥种子**：首次使用时随机生成 32 字节，明文写入 `__ssk_seed__`
  （沙箱已隔离同源页面访问；若要抗本地取证，下一版可基于用户密码 PBKDF2 派生）
- **密文格式**：`v1:<base64(iv)>:<base64(ciphertext)>`，自描述、便于排错与版本升级
- **失败模式**：
  - 密文损坏 / 密钥被替换 → 抛 `ExtensionError('CRYPTO', ...)`
  - 存储写入失败 → 抛 `ExtensionError('STORAGE', ...)`
- **并发安全**：per-key Promise 链锁，串行化同一 key 的并发写

## 4. 对外接口

```ts
import { secureStorage } from '@shared/storage/secure-storage';
import { STORAGE_NS } from '@shared/storage/keys';

await secureStorage.setItem(STORAGE_NS.AUTH_TOKEN, 'jwt...');
const token = await secureStorage.getItem<string>(STORAGE_NS.AUTH_TOKEN);
await secureStorage.removeItem(STORAGE_NS.AUTH_TOKEN);
await secureStorage.clear(); // 保留密钥种子
```

```ts
import { isEmail, isStringInRange, assertValid } from '@shared/utils/validator';

assertValid(isEmail(input), 'email');
assertValid(isStringInRange(1, 30)(title), 'title');
```

## 5. 验证

```bash
cd extension
npm run typecheck   # ✅
npm run lint        # ✅
npm run test        # ✅ 50 tests passed
npm run build       # ✅
```

## 6. 自检发现并已修复

- `withKeyLock` 锁清理判断基于"重新构造的 Promise 引用"，永远不相等导致内存泄漏 →
  改为缓存链式 Promise 引用比较；新增并发写单测验证语义。
- WebCrypto API 在新版 @types/node 下与 lib.dom 类型冲突 → 显式 `as BufferSource` 修正。

## 7. 衔接

- A2：强类型消息协议 + background 路由中心（依赖 A1 的 ExtensionError 与 logger）
- A3：鉴权（http + tokenManager），将通过 `secureStorage` 落地 access/refresh token
