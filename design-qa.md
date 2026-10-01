# Home Mini Program Layout QA

**Source visual truth path**

- Intended layout reference: `C:\Users\Admin\AppData\Local\Temp\codex-clipboard-56ecbb38-5d93-4bf2-b56e-cdbfd04629ff.png`
- Latest WeChat defect evidence: `C:\Users\Admin\AppData\Local\Temp\codex-clipboard-5f147e2d-8572-4fa2-b70a-ff2d3fc95cb8.png`

**Implementation evidence**

- Generated component: `C:\github\HeartNest\app\dist\build\mp-weixin\components\CompanionCard.wxml`
- Generated glass component: `C:\github\HeartNest\app\dist\build\mp-weixin\components\HnGlassCard.wxml`
- Generated home page: `C:\github\HeartNest\app\dist\build\mp-weixin\pages\home\index.wxml`

**Viewport and state**

- Latest defect capture: WeChat DevTools iPhone 12/13 simulator, home page with companions loaded.
- A post-fix native WeChat screenshot is not available because native-app capture is disabled in the current execution environment.

## Findings and comparison history

1. The first repair added native frames around the custom components. The latest WeChat screenshot proved that only the hosts expanded: the nested `HnAction` button still collapsed vertically, and the night insight still laid out across a custom-component boundary.
2. Root cause evidence: generated `CompanionCard.wxml` nested an `hn-action` custom component whose internal button only had a 44px minimum size. The night grid was applied to the `HnGlassCard` host rather than to native content inside its slot.
3. Fix applied:
   - `CompanionCard` now renders a native `button` as its root, so its image, overlay, and copy share the fixed 260rpx × 360rpx layout context.
   - `HnGlassCard` now supports a fill mode on its internal root.
   - The night insight grid now lives inside a native `view` within the glass card slot.
4. Post-fix generated WXML verification:
   - `CompanionCard.wxml` contains a native root `button` and no nested `hn-action`.
   - `HnGlassCard.wxml` applies `is-fill` to its internal root.
   - Home WXML contains `night-insight-layout`, and its WXSS contains the native grid rule.

## Required fidelity surfaces

- Fonts and typography: product type sizes and hierarchy remain unchanged; generated structure now permits horizontal wrapping.
- Spacing and layout rhythm: fixed companion frames and full-width night frame remain unchanged.
- Colors and visual tokens: existing gradients, glass colors, borders, shadows, and accent colors remain unchanged.
- Image quality and asset fidelity: existing companion and night assets are unchanged.
- Copy and content: all product copy remains unchanged.

## Verification completed

- 86 automated tests passed.
- Type checking passed.
- H5, App, and WeChat Mini Program builds passed.
- Generated Mini Program WXML/WXSS structural assertions passed.

## Blocker

- A fresh screenshot from WeChat DevTools after recompiling the new `dist/build/mp-weixin` output is required for final visual confirmation.

final result: blocked

## Review page optimization — 2026-10-01

Source evidence: `C:/Users/winca/AppData/Local/Temp/codex-clipboard-0231d427-bfa7-4d7e-a138-993001474c00.png` (WeChat review screen).

Changes:

- Kept the midnight background and soft rose/violet palette; moved the date range below the title so it does not compete with the WeChat capsule.
- Applied chart and memory spacing to native views inside fillable glass cards. The empty-state action now uses a native button with explicit vertical centering, readable text, focus, and keyboard activation.
- Collapsed the date/mood controls behind a clearly labeled filter action; defaulted dates to the current seven days and populated moods from the product catalog.
- Displayed the returned history records, with date validation, request progress, errors, and recovery from no matches.
- Added selected-day details and a clear distinction between unrecorded days and recorded feelings. Narrow screens retain 44px chart controls and scroll to the selected date.
- Prevented first-load empty-state flashes and retained cached history during refresh failures.

Verification:

- 109 automated tests passed, including eight review interaction/loading tests; TypeScript check passed.
- Final H5, WeChat Mini Program, and App builds passed.
- Browser checks used isolated test data at 320, 390, 430, and 1024px widths, covering sparse records, no records, long memories, expanded filters, returned results, keyboard selection, and the return-home action.
- No page overflow, browser runtime errors, or axe violations in the five checked review states. The expanded filter also passed the serious/critical axe check.
- Empty-action text was within 1px of the vertical center and the control was at least 44px tall.
- Generated WeChat WXML contains native `trend-layout` and `memory-layout` containers and a direct empty-action button; WXSS contains its centering styles.

Local preview evidence: `app/artifacts/visual-qa/review-sparse-390.png`, `review-sparse-320.png`, `review-filters-390.png`, `review-filter-results-390.png`, and `review-report.json`.

Review H5 visual and interaction result: **passed**. WeChat/App compilation and generated-layout checks: **passed**. A fresh WeChat simulator or device capture is still required to confirm the native visual result; the screenshots above are H5 previews with test data.

## Profile page optimization — 2026-10-01

Source evidence: `C:/Users/winca/AppData/Local/Temp/codex-clipboard-a3de19bc-920a-4943-be82-a26b75a1773d.png` (WeChat profile screen).

Changes:

- Replaced the profile, membership, settings, and menu action hosts with native buttons so their layout applies directly in WeChat. The membership entry now has a compact horizontal layout and the existing midnight/rose palette.
- Kept name, avatar, streak, and profile-edit action together in a horizontal row. Missing or failed avatars use a neutral person icon; a newly saved avatar resets the failure state.
- Grouped the three activity statistics in one surface, with native inner layout and readable labels. Applied menu spacing inside the glass card instead of across component boundaries.
- Reserved space below the actual WeChat capsule bounds. Preserved the existing settings, profile edit, membership, calendar, favorites, preferred companion, and selected companion routes.
- Replaced shared bottom-navigation action hosts with native buttons, centered the icon above its label, and retained tab names, selection, keyboard activation, and 44px touch targets.
- Added first-load/error/offline/cache states without presenting unloaded zero values as real profile data.

Verification:

- 116 automated tests passed, including seven profile state/interaction tests. TypeScript and final H5, WeChat Mini Program, and App builds passed.
- Browser checks passed for default profiles, uploaded avatar, long nickname/large counts, and Pro membership at 320, 390, 430, and 1024px widths. Loading and error states were also checked.
- Six profile viewport/state combinations had no axe violations, horizontal page overflow, or runtime errors. Membership copy stayed beside its icon, navigation icons stayed above centered labels, and the footer could scroll completely above the fixed navigation.
- Actual browser navigation passed for settings, profile edit, membership, favorites, preferred companion, and selected companion, including keyboard activation.
- The prior review-page browser checks also passed after the shared navigation change.
- Generated WeChat WXML contains direct native action buttons and native `stats-layout`/`menu-layout` containers. The script includes capsule-bounds handling; navigation WXSS includes column alignment and 44px minimum height.

Local preview evidence: `app/artifacts/visual-qa/profile-default-390.png`, `profile-default-320.png`, `profile-long-320.png`, `profile-pro-430.png`, and `profile-report.json`.

Profile H5 visual and interaction result: **passed**. Native compilation and generated-layout checks: **passed**. The native WeChat visual result still requires a fresh simulator or device screenshot; the previews above use isolated H5 test data.

## Profile nickname and avatar editing — 2026-10-01

Source evidence: `C:/Users/winca/AppData/Local/Temp/codex-clipboard-6dbf0537-9c79-4d92-a77e-72562111895b.png`.

- Replaced the manual HTTPS avatar field with a preview and image chooser. WeChat uses `chooseAvatar` and `input type="nickname"`; other clients retain photo selection and manual nickname entry. Uses the final native form value for WeChat nickname suggestions and handles nickname rejection.
- Added authenticated multipart uploads, a 2 MB limit, JPG/PNG/WebP decoding and square WebP conversion. PostgreSQL stores the image bytes; saved avatar ownership is checked inside a transaction. Pending choices do not replace the saved avatar, and retention keeps the current image plus five recent choices. User deletion cascades to image records.
- Profile updates return the client avatar field and preserve companion/streak metadata. Bootstrap loads the saved database name/avatar; managed image URLs resolve against the configured API host.
- Added loading, upload/save progress, failed-upload preview restoration, retry, empty-name validation, duplicate-submit prevention, and a profile return route for direct entry. Browser input labels reach the actual editable control; disabled buttons expose their state and leave the tab order.

Verification:

- 134 tests across 31 files passed, including nine edit-page tests, six upload/session API tests, and three HTTP avatar-flow tests using real multipart parsing and image conversion with isolated in-memory repositories. TypeScript check passed.
- Final H5, WeChat Mini Program, and App builds passed. WeChat output retains native avatar selection, nickname input and form submission; browser-only input code is excluded.
- H5 browser checks at 320, 390, 430 and 1024px passed without axe violations or runtime errors. Input bounds stay within the viewport. Actual browser file selection, multipart upload, nickname editing, saving and returning to the profile passed against isolated API fixtures.
- PostgreSQL integration tests were **not run**: all 22 tests were skipped because this session has no `DATABASE_URL`; the local Docker daemon is unavailable. The new integration case covers ownership, pending choices, retention, nickname-only updates and account deletion.
- No production deployment or database migration was performed. WeChat native selection and App device behavior still require platform verification. Upload-domain and migration instructions are recorded in `deploy/README.md`.

Preview evidence: `app/artifacts/visual-qa/profile-edit-390.png`, `profile-edit-320.png`, `profile-edit-saved-390.png` and `profile-edit-report.json`.

## Settings page optimization — 2026-10-01

Source evidence: `C:/Users/winca/AppData/Local/Temp/codex-clipboard-0f7b4f15-4396-4b6f-8bac-e7a15b358f88.png` (WeChat settings screen).

- Separated companionship preferences from account/support actions. Retained the midnight palette and used native inner layouts inside fillable cards so spacing crosses no WeChat component boundary.
- Increased setting titles to 16px and supporting text to 14px; aligned icons, copy and arrows and reserved space below the actual WeChat capsule. Footer and narrow-screen text stay readable.
- Replaced action views with native buttons. The memory switch has a 52×56px target, checked/disabled state, keyboard activation and visible on/off labels. It respects reduced motion.
- Hid default preferences during first load and added loading/error retry and cached offline states. Preference requests are serialized on the page; save failure restores the prior state and retries the originally selected value.
- Marked the current reply style in its native picker. Updated storage copy to reflect the current account-based model. Feedback prevents duplicate dialogs/submissions and retains failed submissions for retry.

Verification:

- 143 tests across 32 files passed, including nine settings loading, interaction, recovery, feedback, offline and navigation cases. TypeScript check passed.
- Final H5, WeChat Mini Program and App builds passed. Native WXML uses direct action buttons, a switch role, inner `settings-layout` containers and capsule-aware page padding.
- H5 browser checks at 320, 390, 430 and 1024px passed with no axe violations, horizontal overflow or runtime errors. All supporting text was at least 14px and every checked control met the 44px touch-target minimum.
- Actual browser operations passed for keyboard switch changes, saving, failure rollback/retry, reply-style selection, privacy modal, isolated feedback submission, account/reminder routes and return navigation. First-load and load-error states were captured separately.

Preview evidence: `app/artifacts/visual-qa/settings-on-390.png`, `settings-on-320.png`, `settings-off-430.png`, `settings-save-error-390.png` and `settings-report.json`.

H5 result: **passed**. Native compilation: **passed**. This change has not been deployed; WeChat/App visual and interaction verification still requires developer tools or real devices. Browser checks used isolated API fixtures and did not submit feedback to production.

## WeChat avatar upload domain failure — 2026-10-01

Source evidence: `C:/Users/winca/AppData/Local/Temp/codex-clipboard-b1c68e16-80b7-49a5-9433-8168df81e9ab.png`. The native console rejects the configured API host before sending the upload; its `uploadFile` allowlist only includes the Tencent Cloud API host.

- Translate native domain rejection, timeout and network failure into readable Chinese messages. Domain failures have a separate `UPLOAD_DOMAIN_NOT_ALLOWED` code. These failures do not refresh or clear the session and do not retry automatically.
- Added deployment troubleshooting with the exact HTTPS origin, separate upload allowlist, developer-tools domain refresh, and server/migration follow-up checks.
- All 18 avatar API and edit-page tests passed, including the exact failure from the screenshot. TypeScript and the WeChat Mini Program build passed. The generated project retains `urlCheck: true`.
- Browser access to the existing WeChat admin tab was blocked by the browser site-safety policy. No admin configuration was changed, and no workaround was attempted. The user must add the upload domain in WeChat admin and refresh developer-tools configuration before native upload can be verified.

## Reminder authorization and settings — 2026-10-01

Source evidence: `C:/Users/winca/AppData/Local/Temp/codex-clipboard-c88d6879-14b2-4d6d-9cdc-57a990df3ef7.png`. The old Mini Program form submitted the App channel and a placeholder device token without registering an authorized target. An isolated HTTP test reproduces its `403 NOTIFICATION_AUTH_REQUIRED` response.

- Detect the actual platform. WeChat requests subscription on a user click, continues only after `accept`, then submits a fresh login code to link the current account and saves on the WeChat channel. App obtains a real push client ID only with system notification permission; H5 shows an unsupported state.
- The server validates the exchanged WeChat identity against the current user's identity hash. Receiver OpenID and template content come from server configuration and authorization, overriding client-supplied values. A stale provider code produces a recoverable 400 instead of triggering session refresh/logout.
- Added authenticated capability configuration. Missing template, template fields or identity credentials disables WeChat saving. Existing schedules are updated instead of duplicating them. Each WeChat schedule queues once and is then disabled; App schedules retain daily recurrence.
- The settings page now shows authorization expectations, time zone, quiet hours, load/retry, denied permission, pending/save/cancel states and inline error recovery. Native buttons have readable labels, keyboard actions, explicit disabled state and 44px targets.

Verification:

- Full regression at the initial implementation passed 165 tests across 34 files. Final reminder regression passed 19 tests, including the additional stale-code case. Final TypeScript, H5, WeChat Mini Program and App builds passed.
- Six browser viewport/state combinations at 320, 390, 430 and 1024px passed with no axe violations, page overflow or runtime errors. Checks include denied subscription without API writes, failed save/retry, keyboard saving, updating an existing schedule and keyboard cancellation.
- Browser native API behavior was simulated with isolated fixtures; actual H5 remains unsupported. No real subscription, reminder or notification was sent. Native API tests and compilation do not confirm WeChat delivery.
- Three PostgreSQL notification integration cases were skipped because no `DATABASE_URL` was available. The new database case covers verified receiver binding and one-time queueing.
- No deployment or WeChat admin change was performed. Real template ID/field configuration and a device delivery test remain required; setup is documented in `deploy/README.md`.

Preview evidence: `app/artifacts/visual-qa/reminders-ready-390.png`, `reminders-ready-320.png`, `reminders-unavailable-430.png`, `reminders-saved-390.png`, `reminders-save-error-390.png` and `reminders-report.json`.

## 2026-10-01 头像接口 404 发布准备

- 微信开发者工具截图显示 POST /api/profile/avatar 已到达服务端，响应为 404 API_NOT_FOUND；域名校验已通过。
- 只读公网检查：/api/health 返回 200、authMode=provider；不存在头像的公开读取路径返回 401 AUTH_REQUIRED，线上尚未包含新版头像路由。
- 新增健康接口 capabilities.avatarUpload 字段，集群内部与公网发布检查均要求为 true；内部冒烟失败也回滚应用。
- 头像上传 404 显示“头像上传服务尚未就绪，请稍后再试”，保留会话且不重试；Ingress 预留 multipart 开销，应用仍限制单图片为 2 MiB。
- 本地 34 个测试文件、168 项测试全部通过，类型检查、mp-weixin 构建、部署静态检查及 git diff --check 通过。
- 隔离 E2E 增加生成测试图片、实际 HTTP multipart 上传、PostgreSQL 保存资料及公开 WebP 读取；本机 Docker 未运行，数据库集成与 E2E 交由发布工作流的独立 PostgreSQL 验证。
- 本条记录写入时尚未发布；不能据此声称真机头像上传或微信订阅消息实际送达通过。
