# HeartNest on Sealos

GitHub Actions 在 `main` 分支的应用或部署文件变更后自动部署，也可从 Actions 页面手动运行。它会测试并构建 H5、安装 API 生产依赖，将提交 SHA 对应的完整版本上传到已有的 1Gi PVC，再把同一个 Service/Ingress 切换至 Node API。重新运行同一提交也会更新 Pod，以加载轮换后的 Secret。用户数据单独保存在 PVC 的 `/data/heartnest.json`，不会被发布过程覆盖。

## 首次设置

在 GitHub 仓库的 **Settings → Secrets and variables → Actions → New repository secret** 中配置：

| Secret | 内容 |
| --- | --- |
| `HEARTNEST_KUBECONFIG` | `kubeconfig-heart-nest.yaml` 的完整原文。要求默认 namespace 为 `ns-i61rahoe`。 |
| `DEEPSEEK_API_KEY` | 有效的 DeepSeek API Key。仅由服务端使用，绝不写入 `VITE_` 环境变量。 |

不要把这两项写入仓库、Issue 或 Actions 日志。配置完成后，在 [部署工作流](https://github.com/wincax88/HeartNest/actions/workflows/deploy-sealos.yml) 点击 **Run workflow**；之后向 `main` 推送即可自动部署。Action 会在缺少 Secret 时立即停止，不会切换现有服务。

Sealos 控制台为 `https://gzg.sealos.run/`；该集群现有 HeartNest 应用域名是 <https://heartnest-ns-i61rahoe.gzg.sealos.run/>。部署成功后，`/api/health` 应返回 `{"ok":true}`。前端默认使用同源 `/api`，部署时无需设置 `VITE_API_BASE_URL`。

## 资源与回滚

- `persistentvolumeclaim/heartnest-web`：现有 PVC。`/releases/<SHA>` 是不可变发布版本，`/data/heartnest.json` 是持久化数据。
- `secret/heartnest-ai`：由 Action 从仓库 Secret 同步 DeepSeek Key。
- `deployment/heartnest-web`、`service/heartnest-web`、`ingress/heartnest-web`：既有应用入口。Deployment 用 `Recreate` 策略，单副本部署时会有短暂中断。
- `pod/heartnest-actions-uploader`：仅在上传时存在，Action 会删除。

部署失败时，先看 Actions 日志与 `kubectl -n ns-i61rahoe describe deployment heartnest-web`。工作负载回滚可执行 `kubectl -n ns-i61rahoe rollout undo deployment/heartnest-web`；历史版本仍保留在 PVC。旧的 `publish.ps1` / `workload.yaml` 是静态 nginx 发布方案，不应再用于这个 Node API 服务，否则会把工作负载切回静态版。

## JSON 数据迁移

旧 `/data/heartnest.json` 迁移到 PostgreSQL 时必须先保存只读副本，再执行 dry-run：

```powershell
npm run migrate:json -- --source C:\path\to\heartnest.json --dry-run
```

确认汇总数量后，在维护窗口设置 `DATABASE_URL` 并执行真实导入。导入按匿名设备标识的 SHA-256 摘要幂等，重复运行只会增加 `skippedUsers`，不会复制消息。完成后执行：

```powershell
npm run migrate:json -- --source C:\path\to\heartnest.json --verify-only
```

只有输出 `"verified":true` 才能进入数据库切换步骤。命令只输出计数，不输出设备标识或对话正文。迁移观察期结束前不得删除原 JSON 副本。
