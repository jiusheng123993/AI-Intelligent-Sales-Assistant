# A9 手动验收清单：浏览器扩展全链路

## 1. 构建与加载

```bash
cd extension
npm install
npm run typecheck
npm run lint
npm run test
npm run build
```

- [ ] Chrome 打开 `chrome://extensions`
- [ ] 开启开发者模式
- [ ] 加载 `extension/dist`
- [ ] 扩展加载无 manifest 报错

## 2. Popup 登录

- [ ] 点击扩展图标显示登录页
- [ ] 输入任意邮箱 + 错误密码，显示错误提示
- [ ] 输入任意邮箱 + `demo1234`，登录成功
- [ ] 登录后显示用户信息
- [ ] 点击退出登录后回到登录页
- [ ] 重新登录后刷新扩展，登录态仍保留

## 3. Side Panel

- [ ] 打开 Side Panel
- [ ] 未登录时显示登录引导
- [ ] 登录后刷新 Side Panel，显示三 Tab
- [ ] 推荐 Tab 初始空态正常
- [ ] 话术库 Tab 可新增话术
- [ ] 话术库可搜索标题/内容
- [ ] 话术库可按标签筛选
- [ ] 话术内容可复制
- [ ] 话术可删除
- [ ] 设置 Tab 显示账号信息并可退出登录

## 4. Content Script 与悬浮按钮

- [ ] 打开 `https://work.weixin.qq.com/`
- [ ] 页面输入框附近出现 ✨ 按钮
- [ ] 点击按钮不会造成页面崩溃
- [ ] background 控制台可看到 AI requestId 日志
- [ ] 打开 `https://web.whatsapp.com/`，基础注入正常
- [ ] 非白名单页面不注入按钮

## 5. AI 推荐流

- [ ] 登录后打开 Side Panel 推荐 Tab
- [ ] 在白名单页面点击 ✨
- [ ] 推荐 Tab 显示流式生成文本
- [ ] 生成完成后可复制
- [ ] 点击清空后回到空态

## 6. 右键菜单与快捷键

- [ ] 白名单页面右键出现“销冠话术宝”菜单
- [ ] 子菜单包含 AI 推荐回复 / AI 润色 / AI 翻译 / AI 扩写
- [ ] 点击菜单项后触发推荐流
- [ ] `Ctrl+Shift+L` 触发推荐回复
- [ ] `Ctrl+Shift+P` 触发润色
- [ ] 非白名单页面触发快捷键不崩溃

## 7. 安全回归

- [ ] DevTools 中 content 上下文无法直接读取 token
- [ ] chrome.storage.local 中 token 字段不是明文
- [ ] content script 不直接发业务 API
- [ ] 刷新页面/扩展后不会重复出现多个悬浮按钮
- [ ] 右键菜单不会重复注册多份

## 8. 当前已知限制

- AI 推荐为 Mock 流式文本，真实 SSE 待后端 AI 模块完成后替换
- 鉴权为 Mock 后端，真实接口待后端认证模块对齐后替换
- WhatsApp DOM 适配为基础选择器，真实生产前需基于页面实测微调
