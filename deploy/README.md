# HeartNest on Sealos

HeartNest H5 使用命名空间 `ns-i61rahoe` 内的 nginx、Service、Ingress 与 1Gi PVC。静态文件通过临时 uploader Pod 写入 PVC，因此首次发布不依赖容器镜像仓库；`Dockerfile` 仍可用于后续镜像化发布。

## 发布

```powershell
pwsh deploy/verify.ps1 -StaticOnly
pwsh deploy/publish.ps1 -Kubeconfig 'C:\Users\Admin\Documents\HeartNest\kubeconfig (1).yaml'
pwsh deploy/verify.ps1 -Kubeconfig 'C:\Users\Admin\Documents\HeartNest\kubeconfig (1).yaml'
```

已验证访问地址：`https://heartnest-ns-i61rahoe.gzg.sealos.run/`。HTTP 与 HTTPS 均返回应用首页，HTTPS 使用 Sealos 的平台入口证书。

## 资源

- `persistentvolumeclaim/heartnest-web`
- `configmap/heartnest-web`
- `deployment/heartnest-web`
- `service/heartnest-web`
- `ingress/heartnest-web`

`pod/heartnest-uploader` 只在发布期间存在，上传完成后会被删除。

## 回滚

本方案的静态文件直接更新 PVC。需要内容级回滚时，在目标提交执行 `publish.ps1` 重新构建并覆盖站点。工作负载级回滚可执行：

```powershell
kubectl --kubeconfig '<kubeconfig>' -n ns-i61rahoe rollout undo deployment/heartnest-web
```

不要把 kubeconfig、token 或证书内容写入仓库。
