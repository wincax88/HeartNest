# Home Companion Layout Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restore full-width companion cards and the night insight card on WeChat Mini Program while preserving the existing appearance and behavior on H5 and App.

**Architecture:** Add native `view` sizing boundaries around the two custom-component regions. Let the companion component fill its fixed wrapper, and let the insight card fill a full-width wrapper with a flexible text column. Keep data, navigation, assets, and interaction logic unchanged.

**Tech Stack:** Vue 3, uni-app, SCSS, Vitest, Vue Test Utils

---

### Task 1: Add layout regression coverage

**Files:**
- Modify: `app/tests/pages/home.spec.ts`
- Modify: `app/tests/smoke/wxss-compat.spec.ts`

- [x] Add a page test asserting every companion is hosted by a native layout frame and the night insight has its own native frame.
- [x] Add a WXSS compatibility test rejecting `width: max-content` in the home page and requiring the two frame classes.
- [x] Run the targeted tests and confirm they fail because the frames and compatible layout are not implemented.

### Task 2: Implement the cross-platform layout boundaries

**Files:**
- Modify: `app/src/pages/home/index.vue`
- Modify: `app/src/components/CompanionCard.vue`

- [x] Wrap each `CompanionCard` in a fixed-size native `view` while preserving the component test id and click behavior.
- [x] Replace the unsupported content-width row with an inline flex row and fixed, non-shrinking card frames.
- [x] Wrap `HnGlassCard` in a full-width native `view` and add a flexible, minimum-width-zero copy column.
- [x] Make `CompanionCard` fill its wrapper instead of imposing its own minimum width.
- [x] Run the targeted tests and confirm they pass.

### Task 3: Verify builds and visual result

**Files:**
- Create: `design-qa.md`

- [x] Run the full test suite and type check.
- [x] Build H5, WeChat Mini Program, and App targets.
- [x] Inspect generated Mini Program output for the native wrappers and absence of `max-content`.
- [x] Run the H5 preview, capture the home page, and compare the two repaired sections against the supplied screenshot.
- [x] Record visual QA evidence in `design-qa.md` with `final result: passed` only if no blocking mismatch remains.
- [x] Review the diff and commit the focused change on the feature branch.
