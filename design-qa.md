# HeartNest Visual QA

## 2026-09-23 全项目基线验收

- 参考：`docs/原型.png` 与同目录 `(2)` 至 `(6)` 的参考图。
- 实现截图：`app/artifacts/visual-qa/*.png`（由 `tests/e2e/visual-smoke.mjs` 本地生成）。
- 视口：390 × 844 CSS px，device scale factor 1。
- 覆盖：引导、首页、陪伴者详情、聊天、回顾、个人中心、设置、会员。

第一次验收发现页面级 `uni-icons` 未被 npm 版 uni-ui 自动解析，以及聊天页头部顺序不符合移动端阅读顺序。项目随后增加了跨端图标适配组件、调整共享页头插槽顺序，并增加真实 Chrome 八屏截图与完整主流程测试。修正后 8/8 页面完整渲染，浏览器运行期无未处理错误，未遗留 P0、P1、P2 问题。

---

## 2026-09-30 欢迎页布局优化验收

## Comparison Target

- Source visual truth: `C:\Users\Admin\AppData\Local\Temp\codex-clipboard-9764e71d-81ac-4ad5-bbc3-8d2090116ad3.png`
- Approved direction: A「舒展分层」in `docs/superpowers/specs/2026-09-30-onboarding-layout-optimization-design.md`
- Browser-rendered implementation: `C:\Users\Admin\.codex\worktrees\onboarding-layout\HeartNest\app\artifacts\visual-qa\onboarding.png`
- Route: `http://127.0.0.1:5175/#/pages/onboarding/index`
- State: first onboarding slide, no overlay, default interaction state.

## Normalization

- Source pixels: 397 × 810. The source includes WeChat simulator device chrome and safe-area presentation.
- Implementation pixels: 390 × 844 at CSS viewport 390 × 844, `deviceScaleFactor: 1`.
- Compact responsive check: CSS viewport 375 × 667, `deviceScaleFactor: 1`.
- Comparison used the app-owned content region. Simulator bezel, status bar, top capsule, and home indicator were excluded from fidelity judgments.
- The source and browser capture were opened together in one comparison input before this report was written.

## Full-View Comparison Evidence

- The night-scene asset, subject crop, brand placement, title, supporting copy, feature labels, and entry actions remain consistent with the source.
- The approved change is visible: the feature cards, primary action, secondary action, and pagination now form one bottom-aligned vertical group with distinct spacing.
- At 390 × 844, the footer measures 360.9 × 172.9 CSS px and remains inside the viewport with no horizontal overflow.
- At 375 × 667, the footer measures 347 × 156.5 CSS px, ends at y=659, and remains fully visible with no overlap or horizontal overflow.

## Focused Region Comparison Evidence

The bottom interaction region was compared at readable scale because it is the requested optimization target:

- Feature cards are shorter and visually quieter than the source while preserving all three labels and icons.
- The primary button label is centered; the sound icon remains leading and the arrow remains inside the trailing circular container. The source's misleading center ring is absent.
- “我先看看” has a separate touch row and no longer visually collides with the primary button.
- The current page indicator is a short purple capsule, while inactive items remain circles.

No additional focused region was required for the background image because the original asset was reused without replacement or regeneration.

## Required Fidelity Surfaces

- Fonts and typography: title hierarchy, body size, line height, and button weight remain consistent. H5 may use a different installed CJK serif fallback than the WeChat simulator; this is an expected platform rendering difference and does not change wrapping or hierarchy.
- Spacing and layout rhythm: footer controls now use normal flex flow with explicit gaps; card, button, secondary action, and pagination bounds do not overlap at either tested viewport.
- Colors and visual tokens: the existing violet–pink–peach primary gradient, glass surfaces, muted text, and purple active indicator are preserved.
- Image quality and asset fidelity: the original `onboarding-night.jpg` is reused at full quality with `aspectFill`; no placeholder, generated substitute, CSS drawing, or rasterized UI replacement was introduced.
- Copy and content: all three slide titles and descriptions, three feature labels, “开始体验”, and “我先看看” remain unchanged.

## Findings

- No actionable P0, P1, or P2 visual differences remain.

## Interaction and Runtime Evidence

- Swiping from slide 1 to slide 2 changed the selected pagination tab from item 1 to item 2.
- “开始体验” navigated to `#/pages/consent/index`.
- “我先看看” navigated to `#/pages/consent/index`.
- Browser console check returned no warnings or errors.
- Project visual smoke test captured eight screens with zero unresolved icons and no runtime errors.

## Comparison History

- Initial comparison: no actionable P0/P1/P2 findings. No visual correction loop was required.

## Implementation Checklist

- [x] Unified footer structure.
- [x] Compact-height responsive rules.
- [x] Safe-area-aware bottom offset.
- [x] Distinct active pagination shape.
- [x] Primary and secondary navigation verified.
- [x] Browser console and visual smoke checks passed.

## Follow-up Polish

- P3: Re-check the exact CJK serif glyph rendering on a physical iOS device before store release; font fallback varies by platform but does not block this change.

final result: passed
