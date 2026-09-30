# HeartNest on Sealos

P0 数据库切换期间只允许从 GitHub Actions 页面手动部署，并必须勾选“已确认维护窗口及 JSON 备份策略”。工作流使用 `heartnest-production-maintenance` Environment；请在 GitHub 中为该 Environment 配置 required reviewers。主分支推送仍会触发工作流记录，但部署 Job 会跳过，避免未经维护窗口确认就迁移生产数据。

工作流会测试并构建 H5、安装 API 生产依赖，将提交 SHA 对应的完整版本上传到已有的 1Gi PVC；随后备份旧 JSON、运行迁移 dry-run、建立数据库结构、执行幂等导入与核验，全部成功后才切换 Node API。重新运行同一提交也会更新 Pod，以加载轮换后的 Secret。旧 JSON 和按部署编号保存的备份位于 PVC，迁移观察期内不会删除。

## 首次设置

在 GitHub 仓库的 **Settings → Secrets and variables → Actions → New repository secret** 中配置：

| Secret | 内容 |
| --- | --- |
| `HEARTNEST_KUBECONFIG` | `kubeconfig-heart-nest.yaml` 的完整原文。要求默认 namespace 为 `ns-i61rahoe`。 |
| `DEEPSEEK_API_KEY` | 有效的 DeepSeek API Key。仅由服务端使用，绝不写入 `VITE_` 环境变量。 |
| `HEARTNEST_POSTGRES_PASSWORD` | HeartNest 专用 PostgreSQL 应用账号密码。使用随机生成的高强度值。 |
| `TOKEN_SIGNING_KEY` | 至少 32 字节的随机访问令牌签名密钥。 |
| `DATA_ENCRYPTION_KEY` | 至少 32 字节的独立数据标识哈希密钥，不得与签名密钥相同。 |
| `WECHAT_MINI_APP_ID` / `WECHAT_MINI_SECRET` | 微信小程序身份凭据。 |
| `WECHAT_APP_ID` / `WECHAT_APP_SECRET` | 微信开放平台 App 身份凭据。 |
| `WECHAT_H5_APP_ID` / `WECHAT_H5_SECRET` | 微信内 H5 网页授权凭据。 |

不要把任何密钥写入仓库、Issue 或 Actions 日志。配置完成后，在 [部署工作流](https://github.com/wincax88/HeartNest/actions/workflows/deploy-sealos.yml) 点击 **Run workflow**，勾选维护窗口确认并由 Environment reviewer 批准。Action 会在缺少任何 Secret 时立即停止，不会切换现有服务。

Sealos 控制台为 `https://gzg.sealos.run/`；该集群现有 HeartNest 应用域名是 <https://heartnest-ns-i61rahoe.gzg.sealos.run/>。部署成功后，`/api/health` 应返回 `{"ok":true}`。前端默认使用同源 `/api`，部署时无需设置 `VITE_API_BASE_URL`。

## 资源与回滚

- `persistentvolumeclaim/heartnest-web`：现有 PVC。`/releases/<SHA>` 是不可变发布版本，`/data/heartnest.json` 是持久化数据。
- `statefulset/heartnest-postgres`、`service/heartnest-postgres`：HeartNest 独享 PostgreSQL 16，数据卷由 StatefulSet 单独申请，不引用其他项目数据库。
- `secret/heartnest-postgres`：只保存数据库密码；`secret/heartnest-runtime`：保存连接串、令牌密钥及三类微信身份凭据。二者均由 Action 从仓库 Secret 生成，不进 Git。
- `job/heartnest-db-migrate`：应用切换前执行数据库迁移、旧 JSON dry-run、幂等导入和 verify-only 核验。
- `secret/heartnest-ai`：由 Action 从仓库 Secret 同步 DeepSeek Key。
- `deployment/heartnest-web`、`service/heartnest-web`、`ingress/heartnest-web`：既有应用入口。Deployment 用 `Recreate` 策略，单副本部署时会有短暂中断。
- `pod/heartnest-actions-uploader`：仅在上传时存在，Action 会删除。

部署失败时，先看 Actions 日志与 `kubectl -n ns-i61rahoe describe deployment heartnest-web`。迁移失败不会切换应用。工作负载回滚可执行 `kubectl -n ns-i61rahoe rollout undo deployment/heartnest-web`；完整发布包作为 GitHub Artifact 保留 14 天，历史版本与 `/site/backups/heartnest-json-backup-<RUN>.json` 仍保留在 PVC。旧的 `publish.ps1` / `workload.yaml` 是静态 nginx 发布方案，不应再用于这个 Node API 服务，否则会把工作负载切回静态版。

## JSON 数据迁移

旧 `/data/heartnest.json` 迁移到 PostgreSQL 时必须先保存副本，再执行 dry-run。正式工作流已按这个顺序自动执行；本地演练可使用：

```powershell
npm run migrate:json -- --source C:\path\to\heartnest.json --dry-run
```

确认汇总数量后，只能在受保护的维护窗口设置 `DATABASE_URL` 并执行真实导入。导入按匿名设备标识的 SHA-256 摘要幂等，重复运行只会增加 `skippedUsers`，不会复制消息。完成后执行：

```powershell
npm run migrate:json -- --source C:\path\to\heartnest.json --verify-only
```

只有输出 `"verified":true` 才能进入数据库切换步骤。命令只输出计数，不输出设备标识或对话正文。迁移观察期结束前不得删除原 JSON 副本。

## 上线前的凭据依赖检查

仓库内自动测试不会模拟真实微信服务器。安装上述三组微信凭据后，需要分别在微信开发者工具、真机 App 与微信内 H5 验证授权码交换、UnionID 合并、刷新令牌轮换和退出登录。凭据未安装前，这些项目只能标记为 `blocked`，不能标记为通过。
