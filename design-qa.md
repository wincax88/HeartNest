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
