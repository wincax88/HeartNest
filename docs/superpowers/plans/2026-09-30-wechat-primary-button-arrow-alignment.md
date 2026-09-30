# 微信小程序主按钮箭头对齐实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让微信小程序主按钮右侧箭头稳定居中于圆形容器，并保持其余视觉与交互不变。

**Architecture:** 继续复用 `HnPrimaryButton`，不新增平台分支或组件。按钮提供定位上下文，圆形箭头容器绝对定位，箭头图标宿主显式归一化尺寸与行高。

**Tech Stack:** Vue 3、uni-app、SCSS、Vitest、微信小程序构建器

---

### Task 1: 固定微信端箭头盒模型与位置

**Files:**
- Modify: `app/src/components/HnPrimaryButton.vue`
- Test: `app/tests/smoke/mini-program-rendering.spec.ts`

- [x] **Step 1: 写入失败的回归测试**

在 `mini-program-rendering.spec.ts` 增加：

```ts
it('pins the primary button arrow inside its circle on WeChat', () => {
  const source = readSource('src/components/HnPrimaryButton.vue')

  expect(source).toContain('class="primary-button__arrow-icon"')
  expect(source).toMatch(/\.primary-button\s*\{[^}]*position:\s*relative/s)
  expect(source).toMatch(/\.primary-button__arrow\s*\{[^}]*position:\s*absolute[^}]*top:\s*50%[^}]*right:\s*12rpx[^}]*transform:\s*translateY\(-50%\)/s)
  expect(source).toMatch(/\.primary-button__arrow-icon\s*\{[^}]*display:\s*block[^}]*width:\s*44rpx[^}]*height:\s*44rpx[^}]*line-height:\s*1/s)
})
```

- [x] **Step 2: 运行测试并确认按预期失败**

Run: `cd app && npm test -- tests/smoke/mini-program-rendering.spec.ts`

Expected: FAIL，提示缺少 `primary-button__arrow-icon` 或定位样式。

- [x] **Step 3: 实施最小修复**

将箭头图标标记为：

```vue
<uni-icons class="primary-button__arrow-icon" type="right" :size="22" color="#ffffff" />
```

为按钮和箭头增加：

```scss
.primary-button {
  position: relative;
}

.primary-button__arrow {
  position: absolute;
  top: 50%;
  right: 12rpx;
  transform: translateY(-50%);
}

.primary-button__arrow-icon {
  display: block;
  width: 44rpx;
  height: 44rpx;
  overflow: hidden;
  line-height: 1;
}
```

删除箭头容器原有的 `margin-left: auto`，其余视觉样式保持不变。

- [x] **Step 4: 运行回归测试并确认通过**

Run: `cd app && npm test -- tests/smoke/mini-program-rendering.spec.ts`

Expected: 该测试文件全部通过。

- [x] **Step 5: 构建并检查微信 WXSS**

Run: `cd app && npm run build:mp-weixin`

Expected: 构建成功，`dist/build/mp-weixin/components/HnPrimaryButton.wxss` 包含 `position:absolute`、`top:50%`、`right:12rpx` 与 `translateY(-50%)`。

- [x] **Step 6: 完整验证**

Run: `cd app && npm test && npm run type-check && npm run build:h5 && npm run build:mp-weixin`

Expected: 测试、类型检查和两个平台构建全部通过。

- [x] **Step 7: 提交实现**

```bash
git add app/src/components/HnPrimaryButton.vue app/tests/smoke/mini-program-rendering.spec.ts docs/superpowers/plans/2026-09-30-wechat-primary-button-arrow-alignment.md
git commit -m "fix: align WeChat primary button arrow"
```
