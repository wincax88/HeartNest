# HeartNest 生产发布检查清单

更新：2026-09-30。此清单区分自动通过、服务端 dry-run 通过和依赖外部凭据/真机的阻塞项；不得用模拟适配器结果替代真实平台验收。

## 自动化基线

- [x] `npm ci` 干净安装成功。
- [x] 单元、组件、页面与服务端：26 个文件、82 项测试通过。
- [x] PostgreSQL 集成：8 个文件、21 项测试通过。
- [x] 隔离 E2E：登录同意、失败原 ID 重试、收藏、资料、提醒、支付回调通过。
- [x] TypeScript 检查通过。
- [x] H5、微信小程序、App 构建通过。
- [x] onboarding、home、chat、review、profile 的 axe serious/critical 违规为 0。
- [x] 根产物与 `app/server` 的生产依赖审计均为 0 漏洞。
- [x] 应用镜像与备份工具镜像均从锁定 digest 构建；运行用户分别为 `node` / `postgres`。
- [x] 部署静态检查通过；应用、PDB、Service、Ingress、备份与恢复 CronJob 经 Sealos API 服务端 dry-run 接受。

## 发布前人工门禁

- [ ] 在微信开发者工具用真实 AppID 验证授权、隐私同意、聊天、收藏、回顾、订阅消息与支付沙箱。
- [ ] 在一台 Android 和一台 iOS 真机验证 App 微信登录/支付、Push 到达、键盘遮挡、焦点顺序、读屏标签、44px 点击目标和减少动效。
- [ ] 用真实 DeepSeek Key 执行正常、敏感、危机和上游失败回归；危机请求必须在模型前旁路。
- [ ] 配置 `GHCR_PULL_USER`、`GHCR_PULL_TOKEN`、`HEARTNEST_RUNTIME_ENV`、`WECHAT_MINI_SECRET`、`BACKUP_ENCRYPTION_KEY`、微信支付/订阅/Push 凭据。
- [ ] 为 `heartnest-production` Environment 配置 required reviewers，并确认数据库迁移向后兼容。
- [ ] 为 `heartnest-backups` 配置异地卷快照或对象存储复制，记录 RPO/RTO。

小程序身份服务已使用真实 AppID/Secret 完成生产切流；支付、订阅消息、Push、模型专项回归和两类真机验收仍为 **blocked**，不能用本次身份链路部署代替这些平台验收。

## 生产部署验证

- [x] GitHub Actions [运行 #36684492617](https://github.com/wincax88/HeartNest/actions/runs/36684492617) 完成测试、镜像、迁移、发布和业务冒烟。
- [x] 公网 `/api/health` 返回 `{"ok":true,"authMode":"provider"}`。
- [x] 无效诊断 code 返回 HTTP 401 / `PROVIDER_EXCHANGE_FAILED`，不再进入旧 `DEVICE_ID_REQUIRED` 链路。
- [x] `deployment/heartnest` 为 2/2 可用，`deployment/heartnest-web` 已缩至 0，`statefulset/heartnest-postgres` 为 1/1 Ready。
- [ ] 在微信开发者工具中用新鲜 `wx.login` code 完成真实登录验收。

## 分阶段上线

1. 应用 PostgreSQL 与运行密钥，执行不可变镜像中的迁移 Job；失败即停止。
2. 按 digest 部署两个应用副本，先在集群内确认 `/api/health` 返回 `authMode=provider`，再切换 Ingress；公网验证失败时自动恢复旧入口。
3. 依次启用真实微信身份、模型、支付、订阅/Push；每个阶段单独观察错误率和延迟。
4. 手动触发首次加密备份，再触发 restore-check；只有完整性查询与清理均成功后才关闭发布窗口。
5. 任一业务冒烟失败执行 `kubectl -n ns-i61rahoe rollout undo deployment/heartnest`；数据库只按恢复手册恢复到新实例，不覆盖原库。

## 发布后 24 小时

- [ ] 检查 5xx、AI、支付、提醒失败计数和 p95 延迟。
- [ ] 确认两个副本无重启循环，PostgreSQL 容量与连接数正常。
- [ ] 确认最新备份状态 JSON、校验文件及异地副本存在。
- [ ] 记录实际平台版本、测试账号、订单号、通知 job ID 与恢复演练结果（不得记录令牌或对话正文）。
