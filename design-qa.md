# Home Layout Design QA

**Source visual truth path**

- `C:\Users\Admin\AppData\Local\Temp\codex-clipboard-56ecbb38-5d93-4bf2-b56e-cdbfd04629ff.png`
- Focused defect evidence: `C:\Users\Admin\AppData\Local\Temp\codex-clipboard-dc4ead6f-8176-4441-bc54-08d43cd3a955.png`

**Implementation screenshot path**

- `C:\github\HeartNest\.worktrees\fix-home-companion-layout\app\artifacts\visual-qa\home-layout-fixed.png`
- Combined comparison: `C:\github\HeartNest\.worktrees\fix-home-companion-layout\app\artifacts\visual-qa\home-layout-comparison.png`

**Viewport and normalization**

- Source: 406 × 810 pixels, supplied WeChat Mini Program device capture.
- Implementation: 390 × 844 pixels at a 390 × 844 CSS viewport and device scale factor 1.
- Comparison: both full mobile views were placed on one canvas at their native pixel density. The source includes WeChat device chrome; the implementation capture is content-only. This platform chrome difference was excluded from findings.

**State**

- Home page with all three companions loaded from the local development API.
- Default mood selected, Mika featured, night insight visible, bottom navigation visible.

## Full-view comparison evidence

The combined comparison shows the preserved night/glass visual direction, unchanged information hierarchy, and restored vertical rhythm. The repaired implementation no longer leaves a large empty region between “今天谁陪你” and the primary action.

## Focused region comparison evidence

- Companion region: all three companion cards render at a consistent readable width and height. Images, names, recommendation badge, and trait chips are horizontally legible; no card collapses to the custom button's minimum width.
- Night insight: the card spans the content width, the icon stays in its fixed column, and both text lines flow horizontally with normal wrapping.

## Required fidelity surfaces

- Fonts and typography: existing families, weights, sizes, hierarchy, and Chinese line wrapping are preserved. The repaired copy remains horizontal and readable.
- Spacing and layout rhythm: card dimensions, horizontal gaps, full-width insight alignment, radii, shadows, and section gaps match the established page system.
- Colors and visual tokens: the navy glass surfaces, pink-purple accents, warm recommendation badge, and foreground contrast are unchanged.
- Image quality and asset fidelity: the existing companion and night background assets are preserved, with no substitutions or generated approximations.
- Copy and content: all visible product copy is unchanged.

## Comparison history

1. Initial evidence contained two P1 layout failures: companion cards collapsed into narrow strips, and the night insight collapsed into a narrow vertical text column.
2. Fix applied: native `view` sizing frames were introduced; each companion host fills a fixed non-shrinking frame; the insight fills a full-width frame with a flexible `min-width: 0` text column; `max-content` was removed.
3. Post-fix evidence: `home-layout-fixed.png` and `home-layout-comparison.png` show both regions readable at the target mobile viewport. No actionable P0, P1, or P2 mismatch remains.

## Interaction and runtime checks

- Companion card click navigated to `#/pages/companion/index?id=mika` and browser back restored the home state.
- Browser console warnings/errors after the interaction: none.
- Automated page behavior and layout regression tests: passed.

## Findings

- No actionable P0, P1, or P2 findings remain.

## Follow-up polish

- None required for this focused repair.

final result: passed
