# HeartNest 心栖

基于 uni-app、Vue 3、TypeScript、Pinia 和 Node.js 的跨端情绪陪伴应用。当前版本使用真实 HTTP API 读写情绪、对话、记忆、个人偏好、会员试用和反馈，服务端持久化后会话数据。陪伴者回复通过 DeepSeek Responses API 生成，未配置模型服务时会明确报错，不会回退为模拟文案。

## 本地开发

要求 Node.js 20+ 与 npm 10+。从 `.env.example` 参考服务端变量，配置 `DEEPSEEK_API_KEY`。默认模型为 `deepseek-flash`，可用 `DEEPSEEK_MODEL` 修改。不要在任何 `VITE_` 变量中放置 API key。

终端 1：

```bash
npm ci
DEEPSEEK_API_KEY='your-key' npm run dev:api
```

终端 2：

```bash
npm run dev:h5
```

H5 开发服务会将 `/api` 代理到 `http://127.0.0.1:8787`。微信小程序与 App 请通过 `VITE_API_BASE_URL` 指定允许访问的 HTTPS 服务地址。

## API 与数据

- `GET /api/bootstrap`：陪伴者、情绪选项和当前用户的聚合数据。
- `PUT /api/state`：情绪、陪伴者与引导状态。
- `GET/POST /api/chats/:companionId[/messages]`：持久化会话与真实模型回复。
- `POST/DELETE /api/memories`：由用户主动保存或移除记忆。
- `PUT /api/preferences`：持久化回应风格与提醒偏好。
- `POST /api/membership/trial`：开启不扣费、不自动续费的 7 天试用。
- `POST /api/feedback`：真实提交并保存反馈。

默认数据文件为 `data/heartnest.json`，可用 `HEARTNEST_DATA_FILE` 指向持久卷。写入使用串行队列与原子替换，避免单实例并发请求破坏数据。正式多副本部署建议将该存储层替换为 PostgreSQL。

## 质量检查

```bash
npm test
npm run type-check
npm run build:h5
npm run build:mp-weixin
npm run build:app
```

服务端集成测试会启动真实 HTTP 服务、写入临时数据文件，然后重建存储实例验证数据仍存在。

## 生产运行

根目录的 `deploy/Dockerfile` 会构建 H5 并由同一 Node.js 进程提供静态页与 API。运行时挂载 `/data`，并通过密钥注入 `DEEPSEEK_API_KEY`，按需设置 `DEEPSEEK_MODEL`。旧的纯 nginx/PVC 上传流程只能发布静态页，不适用于当前全栈版本。

模型调用使用 DeepSeek 的 `/responses` 接口，传入 `instructions` 和最近的会话消息，并将思考模式设为 `none` 以生成简短回复。参考 [DeepSeek Responses API 文档](https://api-docs.deepseek.com/api/create-response/) 与 [错误码文档](https://api-docs.deepseek.com/quick_start/error_codes/)。
