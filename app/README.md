# HeartNest 心栖

基于 uni-app、Vue 3、TypeScript 与 Pinia 的跨端情绪陪伴体验。当前版本以确定性模拟数据跑通引导、首页、陪伴者详情、聊天、情绪回顾、个人中心、设置和会员演示，不会发起真实支付或上传真实对话。

## 本地开发

要求 Node.js 22 与 npm 10。

```powershell
npm ci
npm run dev:h5
```

质量检查：

```powershell
npm test
npm run type-check
npm run build:h5
npm run build:mp-weixin
npm run build:app
```

浏览器端到端测试使用本机 Chrome。先启动固定端口的 H5 预览，再执行：

```powershell
$env:HEARTNEST_URL='http://127.0.0.1:4173'
npm run test:e2e
```

## 平台输出

- H5：`dist/build/h5`
- 微信小程序：`dist/build/mp-weixin`，使用微信开发者工具导入该目录。
- App：`dist/build/app`，使用 HBuilderX 导入并运行或执行云打包。

业务逻辑和模拟数据保持跨端一致；安全区、滚动容器与固定底栏使用 uni-app 的平台兼容能力。
