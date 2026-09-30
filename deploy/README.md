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

- `deploy/app.yaml`：Deployment、PDB、Service、强制 HTTPS 的 Ingress。
- `deploy/migrate-job.yaml`：使用与应用完全相同的镜像执行迁移。
- `deploy/postgres.yaml`：HeartNest 独享 PostgreSQL 16。
- `/metrics`：Prometheus 文本指标；Pod 注解声明采集路径。JSON 请求日志只记录 request ID、方法、路径、状态与耗时，不记录 Authorization、请求体或对话内容。
- 所有 5xx 响应包含可用于日志关联的 `requestId`。

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
