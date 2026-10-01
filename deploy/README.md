# HeartNest on Sealos

HeartNest 以不可变容器镜像发布到 `ns-i61rahoe`。`deployment/heartnest` 使用两个无状态副本、`RollingUpdate`（`maxUnavailable: 0`）与 PodDisruptionBudget；PostgreSQL 是唯一生产数据源，应用 Pod 不挂载站点或数据 PVC。

## GitHub Secrets

在受保护的 `heartnest-production` Environment 中配置：

| Secret | 用途 |
| --- | --- |
| `HEARTNEST_KUBECONFIG` | Sealos kubeconfig，默认 namespace 必须为 `ns-i61rahoe` |
| `HEARTNEST_RUNTIME_ENV` | `DATABASE_URL`、令牌密钥、数据密钥、微信身份/支付/推送配置组成的 env 文件 |
| `DEEPSEEK_API_KEY` | 仅服务端使用的模型密钥 |
| `GHCR_PULL_USER` / `GHCR_PULL_TOKEN` | 集群只读拉取 GHCR 镜像的长期凭据 |
| `BACKUP_ENCRYPTION_KEY` | 独立高强度备份加密口令，不得与应用密钥复用 |

手动运行“部署 HeartNest 到 Sealos”并确认发布检查清单。工作流完成单元、集成、E2E、类型与 H5 构建后，推送提交 SHA 镜像并以 digest 部署；先执行数据库迁移，再滚动更新。Rollout 或公网 `/api/health` 失败会自动 `rollout undo`。

## 资源与可观测性

头像上传随应用镜像发布，需要先执行 `014_profile_avatars.sql`。图片保存在 PostgreSQL，两个应用副本共享同一数据源，无需新增文件卷。微信后台为 API 的 HTTPS 域名同时配置 `request` 与 `uploadFile` 合法域名（例如 `https://heartnest-ns-i61rahoe.gzg.sealos.run`）；`VITE_API_BASE_URL` 继续包含 `/api`。发布前在开发者工具和真机检查微信昵称填写、微信头像选择、相册上传、取消选择、超大文件、网络失败重试及重新打开资料后的一致性。

- `deploy/app.yaml`：Deployment、PDB、Service、强制 HTTPS 的 Ingress。
- `deploy/migrate-job.yaml`：使用与应用完全相同的镜像执行迁移。
- `deploy/postgres.yaml`：HeartNest 独享 PostgreSQL 16。
- `/metrics`：Prometheus 文本指标；Pod 注解声明采集路径。JSON 请求日志只记录 request ID、方法、路径、状态与耗时，不记录 Authorization、请求体或对话内容。
- 所有 5xx 响应包含可用于日志关联的 `requestId`。

## 微信头像上传域名报错

若开发者工具提示 `uploadFile:fail createUploadTask:fail url not in domain list`，请求被微信客户端拦截，尚未到达头像上传接口。`request` 与 `uploadFile` 的合法域名分别配置，普通 API 请求成功不代表头像上传已获准。

1. 登录对应小程序的微信公众平台，进入「开发管理 → 开发设置 → 服务器域名」。
2. 在 `uploadFile` 合法域名中添加 `https://heartnest-ns-i61rahoe.gzg.sealos.run`。只填写 HTTPS 域名，不带 `/api`、`/profile/avatar` 或末尾斜杠；保留已有域名。
3. 保存后，在微信开发者工具「详情 → 域名信息」刷新配置，然后重新编译并再次选择头像。
4. 检查真机上传、保存资料、重新打开后的头像一致性。若上传进入服务端后返回错误，再检查运行版本是否包含头像接口和数据库迁移 `014_profile_avatars.sql`。

如果后台已经包含上传域名，而控制台报错仍只列出 `https://tcb-api.tencentcloudapi.com`，先检查开发者工具实际加载的域名列表。在「详情 → 域名信息」刷新后，确认 `uploadFile` 列表出现目标域名，再重新编译、清空旧日志并重新选择头像。若刷新后列表仍未更新，核对工具、构建产物与后台所属小程序的 AppID 是否一致；当前项目默认 AppID 为 `wxf398149aa702daae`，随后关闭并重新打开项目再刷新。后台截图与旧报错同时存在，不能据此判断配置已经在客户端生效。

客户端 `VITE_API_BASE_URL` 仍为 `https://heartnest-ns-i61rahoe.gzg.sealos.run/api`。保持合法域名校验开启；后台配置不由项目代码自动同步。微信官方说明见 [网络通信](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html)。

如果上传请求已经到达服务器并返回 `404 API_NOT_FOUND`，检查发布版本是否包含 `app/server/avatars.mjs`、接口注册、运行依赖及迁移 `014_profile_avatars.sql`。仅重新编译小程序不会更新服务端；这些文件需要进入 Git 提交后再构建、部署新镜像。新版本 `/api/health` 应返回 `capabilities.avatarUpload: true`，发布流程会检查这个字段。无需登录访问一个不存在的 `/api/avatars/<UUID>` 应返回 `404 AVATAR_NOT_FOUND`，而不是 `401 AUTH_REQUIRED`；这个检查不会上传图片或写入数据。Ingress 总请求上限为 3 MiB，为 multipart 边界预留空间，应用仍将单个图片限制为 2 MiB。

## 微信提醒配置

小程序提醒必须走微信订阅消息；App 推送需要真实设备客户端 ID，不能用占位令牌代替授权。`POST /api/reminders` 返回 `403 NOTIFICATION_AUTH_REQUIRED` 时，先检查平台渠道和授权，保留服务端检查。

- 在对应小程序后台「功能 → 订阅消息」添加适合业务类目的模板。在服务端设置 `WECHAT_REMINDER_TEMPLATE_ID` 及 `WECHAT_REMINDER_TEMPLATE_DATA`，后者是与真实模板字段完全匹配的 JSON，例如 `{"thing1":{"value":"留一点时间给自己"},"time2":{"value":"{{time}}"}}`。示例字段只说明格式，实际字段必须来自所选模板。`{{time}}` 会替换为实际发送计划的当地日期和时间。
- 保留服务端 `WECHAT_MINI_APP_ID`、`WECHAT_MINI_SECRET`。模板内容配置不使用 `VITE_` 变量。新版本提供 `/api/notifications/config`，缺少模板/字段/身份配置时关闭微信保存入口；客户端与服务端需要一起发布。
- 用户点击「授权并保存提醒」后才调用 `uni.requestSubscribeMessage`，仅 `accept` 继续保存。使用新的微信登录码由服务端校验当前账号身份，并从已验证身份生成接收者 OpenID；客户端不能指定接收者或消息内容。
- 当前微信实现每次授权只设置一条提醒，入队后关闭该计划，后续再次提醒需要重新授权。App 保留每日计划。未开启推送 SDK、系统通知权限或服务端推送适配器时，不创建假的 App 提醒。
- 验收授权允许、拒绝、取消、模板未配置、身份不一致、保存重试、修改已有计划及取消提醒；最后在真机检查微信服务通知实际到达。没有真实模板及真机到达记录，不能将测试适配器成功标记为平台验收通过。

客户端 API 参考 [uni.requestSubscribeMessage](https://uniapp.dcloud.net.cn/api/other/requestSubscribeMessage.html)。

## 备份与恢复演练

`heartnest-backup` 每天 02:17（Asia/Shanghai）执行 custom-format `pg_dump`，用 AES-256-CBC + PBKDF2 加密并生成 SHA-256 校验文件，保留 30 天。`heartnest-restore-check` 每周日将最新备份恢复到隔离临时数据库，检查 `users`、`messages` 与 `audit_events`，无论成功或失败都强制删除临时库。最新备份和恢复结果分别写入备份卷的 JSON 状态文件，并同时进入 Job 日志。

检查：

```powershell
kubectl -n ns-i61rahoe get cronjob,job
kubectl -n ns-i61rahoe logs job/<restore-check-job>
kubectl -n ns-i61rahoe rollout status deployment/heartnest
```

定期备份不能替代异地副本。启用生产前，应为 `heartnest-backups` 卷配置 Sealos 卷快照或对象存储复制，并记录实际 RPO/RTO。

## 回滚

应用回滚：`kubectl -n ns-i61rahoe rollout undo deployment/heartnest`。迁移必须保持向后兼容；涉及破坏性 schema 变更时先部署兼容代码、回填，再在后续版本移除旧字段。数据库灾难恢复应从最近一个通过每周恢复校验的加密备份恢复到新实例，核验后再切换连接串，不能在原库上覆盖恢复。
