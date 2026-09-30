# HeartNest 心栖

基于 uni-app、Vue 3、TypeScript、Pinia、Node.js 和 PostgreSQL 的跨端情绪陪伴应用，覆盖 H5、微信小程序与 App。当前版本使用统一微信身份、短期访问令牌与可轮换刷新令牌保护 HTTP API；用户数据、同意记录、对话、记忆和审计事件由 PostgreSQL 持久化。陪伴回复通过 DeepSeek Responses API 生成，未配置模型服务时会明确报错，不会回退为模拟文案。

## 本地开发

要求 Node.js 20+、npm 10+ 与 PostgreSQL 16。从 `.env.example` 参考服务端变量，至少配置数据库连接、令牌签名密钥、数据哈希密钥、三类微信身份凭据和 `DEEPSEEK_API_KEY`。默认模型为 `deepseek-flash`，可用 `DEEPSEEK_MODEL` 修改。不要在任何 `VITE_` 变量中放置 API key。

终端 1：

```bash
npm ci
DATABASE_URL='postgres://...' TOKEN_SIGNING_KEY='...' DATA_ENCRYPTION_KEY='...' DEEPSEEK_API_KEY='...' npm run dev:api
```

终端 2：

```bash
npm run dev:h5
```

H5 开发服务会将 `/api` 代理到 `http://127.0.0.1:8787`。微信小程序与 App 请通过 `VITE_API_BASE_URL` 指定允许访问的 HTTPS 服务地址。

## 身份、隐私与数据

- `POST /api/auth/provider`：交换小程序、App 或 H5 微信授权码。
- `POST /api/auth/refresh`：单次轮换刷新令牌；旧令牌重放会被拒绝。
- `POST /api/auth/logout` / `logout-all`：撤销当前或全部会话。
- `POST /api/privacy/consents`：记录版本化隐私、条款与 AI 数据同意。
- `POST/GET /api/privacy/exports`：生成隔离到当前用户的一次性数据导出。
- `POST/DELETE /api/account/deletion`：申请七天冷静期注销或在期限内取消。
- `GET /api/bootstrap`：陪伴者、情绪选项和当前用户的聚合数据。
- `PUT /api/state`：情绪、陪伴者与引导状态。
- `GET/POST /api/chats/:companionId[/messages]`：持久化会话与真实模型回复。
- `POST/DELETE /api/memories`：由用户主动保存或移除记忆。
- `PUT /api/preferences`：持久化回应风格与提醒偏好。
- `POST /api/membership/trial`：开启不扣费、不自动续费的 7 天试用。
- `POST /api/feedback`：真实提交并保存反馈。

PostgreSQL 是生产权威数据源。旧 `data/heartnest.json` 仅用于一次性迁移和回滚观察；`migrate:json` 支持 dry-run、幂等导入和 verify-only。生产数据路由不再信任 `X-HeartNest-Device`。发送 AI 对话前必须存在当前版本同意；危机分类在模型调用前执行，紧迫风险直接返回受控求助信息并跳过模型。

## 质量检查

```bash
npm test
npm run test:integration
npm run type-check
npm run build:h5
npm run build:mp-weixin
npm run build:app
```

集成测试需要 `DATABASE_URL`，覆盖 PostgreSQL 用户隔离、消息幂等、刷新令牌重放拒绝、同意门禁、导出隔离、七天注销冷静期和旧 JSON 幂等迁移。

## 生产运行

Sealos 使用 HeartNest 独享 PostgreSQL 16 StatefulSet。部署工作流先备份旧 JSON，再执行 dry-run、数据库迁移、真实幂等导入和核验，成功后才切换 Node API；所有运行时密钥由 Kubernetes Secret 引用。Ingress 强制 HTTPS，API 通过 Helmet 输出安全头并限制聊天请求频率。详见 `deploy/README.md`。

模型调用使用 DeepSeek 的 `/responses` 接口，传入 `instructions` 和最近的会话消息，并将思考模式设为 `none` 以生成简短回复。参考 [DeepSeek Responses API 文档](https://api-docs.deepseek.com/api/create-response/) 与 [错误码文档](https://api-docs.deepseek.com/quick_start/error_codes/)。

## P0 验收记录（2026-09-30）

- 单元、页面与服务端测试：14 个文件、43 项测试通过。
- PostgreSQL 集成测试：4 个文件、11 项测试通过。
- TypeScript 检查及 H5、微信小程序、App 三端生产构建通过。
- 客户端构建产物与独立 API 运行时的 `npm audit --omit=dev` 均为 0 漏洞。uni-app/Vue/Pinia 位于构建依赖，部署产物不携带其 Node 工具链。
- 部署静态安全检查通过；`postgres.yaml`、`migrate-job.yaml`、`workload-actions.yaml` 已通过 Sealos Kubernetes 服务端 dry-run，未执行真实资源写入或数据迁移。
- 已覆盖授权隔离、刷新令牌重放拒绝、迁移幂等、同意门禁、导出隔离、注销冷静期、危机内容模型旁路和 HTTPS 强制跳转。

以下检查依赖尚未提供的真实平台凭据，因此状态是 `blocked` 而不是通过：微信小程序、App、微信内 H5 的真实授权码交换与 UnionID 合并；真实 DeepSeek 输出安全回归；生产维护窗口中的 JSON 备份、导入与回滚演练。安装凭据后必须在对应沙箱和真机环境逐项执行。
