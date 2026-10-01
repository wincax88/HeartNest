<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import HnGlassCard from '@/components/HnGlassCard.vue'
import HnAsyncState from '@/components/HnAsyncState.vue'
import type { AppPreferences } from '@/domain/models'
import { useProfileStore } from '@/stores/profile'
import { useBootstrapStore } from '@/stores/bootstrap'
import { api } from '@/services/api'
import { useNetworkState } from '@/composables/useNetworkState'

const profileStore = useProfileStore()
const bootstrapStore = useBootstrapStore()
const { online } = useNetworkState()
const savingPreference = ref<'memory' | 'reply' | ''>('')
const saveError = ref('')
const saved = ref(false)
const replyPickerOpen = ref(false)
const feedbackOpen = ref(false)
const submittingFeedback = ref(false)
const feedbackDraft = ref('')
let retryPreference: (() => Promise<void>) | undefined
const preferencesDisabled = computed(() => !online.value || !!savingPreference.value || !bootstrapStore.loaded)
const pageStyle: { paddingTop?: string } = {}
// #ifdef MP-WEIXIN
const capsule = uni.getMenuButtonBoundingClientRect?.()
if (capsule?.bottom > 0) pageStyle.paddingTop = `${capsule.bottom + 12}px`
// #endif
onMounted(loadSettings)

async function loadSettings() {
  try { await bootstrapStore.initialize() }
  catch { /* Loading errors are displayed with a retry instead of default preferences. */ }
}

function showError(error: unknown) {
  uni.showToast({ title: error instanceof Error ? error.message : '操作失败', icon: 'none' })
}

const replyStyles: Array<{ id: AppPreferences['replyStyle']; label: string }> = [
  { id: 'gentle', label: '温柔接纳' },
  { id: 'concise', label: '简洁陪伴' },
  { id: 'reflective', label: '轻柔复盘' },
]

const replyStyleLabel = computed(
  () => replyStyles.find((item) => item.id === profileStore.preferences.replyStyle)?.label ?? '温柔接纳',
)

function openNotificationSettings() { uni.navigateTo({ url: '/pages/notification-settings/index' }) }

async function savePreference(kind: 'memory' | 'reply', action: () => Promise<void>) {
  if (preferencesDisabled.value) return
  savingPreference.value = kind
  saveError.value = ''
  saved.value = false
  retryPreference = undefined
  try { await action(); saved.value = true }
  catch (error) {
    saveError.value = error instanceof Error ? error.message : '请稍后重试'
    retryPreference = () => savePreference(kind, action)
  } finally { savingPreference.value = '' }
}

function retrySave() { if (online.value) void retryPreference?.() }

function toggleMemoryPrompts() {
  const enabled = !profileStore.preferences.memoryPromptsEnabled
  void savePreference('memory', () => profileStore.setMemoryPrompts(enabled))
}

function openReplyStylePicker() {
  if (preferencesDisabled.value || replyPickerOpen.value) return
  replyPickerOpen.value = true
  uni.showActionSheet({
    itemList: replyStyles.map((item) => `${item.label}${item.id === profileStore.preferences.replyStyle ? '（当前）' : ''}`),
    success: ({ tapIndex }) => {
      const selected = replyStyles[tapIndex]
      if (selected && selected.id !== profileStore.preferences.replyStyle) void savePreference('reply', () => profileStore.setReplyStyle(selected.id))
    },
    fail: (error) => { if (!error.errMsg?.toLowerCase().includes('cancel')) showError(error) },
    complete: () => { replyPickerOpen.value = false },
  })
}

function openLocalDataInfo() {
  uni.showModal({
    title: '数据说明',
    content: '你的资料、情绪、对话、记忆与偏好会关联当前账号，并保存在 HeartNest 服务端。为生成陪伴回复，最近的对话会发送给 DeepSeek。你可以在「账号与隐私」导出数据或申请注销账号。',
    showCancel: false,
    confirmText: '知道了',
  })
}

function openHelpFeedback() {
  if (!online.value || feedbackOpen.value || submittingFeedback.value) return
  feedbackOpen.value = true
  uni.showModal({
    title: '帮助与反馈',
    content: feedbackDraft.value,
    editable: true,
    placeholderText: '请告诉我们哪里还可以更好',
    confirmText: '提交',
    success: ({ confirm, content }) => {
      if (!confirm) return
      feedbackDraft.value = content?.trim() || ''
      if (!feedbackDraft.value) { uni.showToast({ title: '请先写下你的反馈', icon: 'none' }); return }
      submittingFeedback.value = true
      api.submitFeedback(feedbackDraft.value).then(() => {
        feedbackDraft.value = ''
        uni.showToast({ title: '感谢你的反馈', icon: 'success' })
      }).catch(showError).finally(() => { submittingFeedback.value = false })
    },
    complete: () => { feedbackOpen.value = false },
  })
}

function openAccount() {
  uni.navigateTo({ url: '/pages/account/index' })
}

function goBack() {
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  if (pages.length > 1) {
    uni.navigateBack()
    return
  }
  uni.reLaunch({ url: '/pages/profile/index' })
}
</script>

<template>
  <view class="hn-screen settings-screen">
    <view class="hn-page settings-page" :style="pageStyle">
      <view class="settings-header">
        <button data-testid="settings-back" class="back-button" type="button" role="button" tabindex="0" aria-label="返回我的页面" @click="goBack" @keydown.enter.prevent="goBack" @keydown.space.prevent="goBack"><uni-icons type="left" :size="24" color="#eef0ff" /></button>
        <view class="header-copy"><text class="page-title">设置</text><text class="page-subtitle">按你的习惯，慢慢调整</text></view>
      </view>
      <HnAsyncState v-if="bootstrapStore.loading && !bootstrapStore.loaded" state="loading" title="正在载入你的设置…" />
      <HnAsyncState v-else-if="!online && !bootstrapStore.loaded" state="offline" title="当前处于离线状态" description="联网后就能查看和调整你的偏好。" action-label="重新检查" @action="loadSettings" />
      <HnAsyncState v-else-if="bootstrapStore.error && !bootstrapStore.loaded" state="error" title="暂时没能加载设置" :description="bootstrapStore.error" action-label="重新加载" @action="loadSettings" />
      <template v-else-if="bootstrapStore.loaded">
        <HnAsyncState v-if="!online" state="offline" title="正在查看已缓存的设置" description="联网后，就可以继续调整你的偏好。" />
      <view class="settings-group">
        <text class="group-title">陪伴偏好</text>
        <view class="settings-frame"><HnGlassCard fill><view class="settings-layout">
          <button data-testid="notification-settings-row" class="setting-row is-action" type="button" role="button" tabindex="0" aria-label="温柔提醒，设置提醒时间与授权" @click="openNotificationSettings" @keydown.enter.prevent="openNotificationSettings" @keydown.space.prevent="openNotificationSettings">
            <view class="setting-icon reminder-icon"><uni-icons type="calendar-filled" :size="21" color="#f9cfa4" /></view>
            <view class="setting-copy"><text class="setting-title">温柔提醒</text><text class="setting-description">设置提醒时间与授权</text></view>
            <uni-icons type="right" :size="18" color="#b6bdd8" />
          </button>
          <button data-testid="reply-style-row" class="setting-row is-action" type="button" role="button" :tabindex="preferencesDisabled ? -1 : 0" :disabled="preferencesDisabled" :aria-disabled="preferencesDisabled" :aria-label="`回应风格，当前${replyStyleLabel}，更改回应风格`" @click="openReplyStylePicker" @keydown.enter.prevent="openReplyStylePicker" @keydown.space.prevent="openReplyStylePicker">
            <view class="setting-icon reply-icon"><uni-icons type="chatboxes-filled" :size="21" color="#c5c3ff" /></view>
            <view class="setting-copy"><text class="setting-title">回应风格</text><text class="setting-description">{{ replyStyleLabel }}</text></view>
            <uni-icons type="right" :size="18" color="#b6bdd8" />
          </button>
          <view class="setting-row memory-row">
            <view class="setting-icon memory-icon"><uni-icons type="heart-filled" :size="21" color="#f0bedc" /></view>
            <view class="setting-copy"><text class="setting-title">记忆提示</text><text class="setting-description">对话中询问，是否留作记忆</text></view>
            <button data-testid="memory-prompt-toggle" class="memory-switch" type="button" role="switch" :tabindex="preferencesDisabled ? -1 : 0" aria-label="记忆提示" :aria-checked="profileStore.preferences.memoryPromptsEnabled" :aria-disabled="preferencesDisabled" :disabled="preferencesDisabled" @click="toggleMemoryPrompts" @keydown.enter.prevent="toggleMemoryPrompts" @keydown.space.prevent="toggleMemoryPrompts">
              <view class="toggle" :class="{ 'is-on': profileStore.preferences.memoryPromptsEnabled }" aria-hidden="true"><view class="toggle-thumb" /></view>
              <text class="switch-state" aria-hidden="true">{{ profileStore.preferences.memoryPromptsEnabled ? '已开启' : '已关闭' }}</text>
            </button>
          </view>
        </view></HnGlassCard></view>
        <text class="sync-status" :class="{ 'is-saved': saved }" role="status" aria-live="polite">{{ savingPreference ? '正在保存偏好…' : saved ? '你的偏好已保存' : saveError ? '设置未保存，已恢复原状态' : '偏好会随账号同步' }}</text>
        <HnAsyncState v-if="saveError" state="error" title="这次设置没能保存" :description="saveError" :action-label="online ? '重新保存' : ''" @action="retrySave" />
      </view>
      <view class="settings-group">
        <text class="group-title">账号与支持</text>
        <view class="settings-frame"><HnGlassCard fill><view class="settings-layout">
          <button data-testid="account-row" class="setting-row is-action" type="button" role="button" tabindex="0" aria-label="账号与隐私，导出数据、注销或退出登录" @click="openAccount" @keydown.enter.prevent="openAccount" @keydown.space.prevent="openAccount">
            <view class="setting-icon account-icon"><uni-icons type="person-filled" :size="21" color="#c8d7ff" /></view>
            <view class="setting-copy"><text class="setting-title">账号与隐私</text><text class="setting-description">导出数据、注销或退出登录</text></view>
            <uni-icons type="right" :size="18" color="#b6bdd8" />
          </button>
          <button data-testid="local-data-row" class="setting-row is-action" type="button" role="button" tabindex="0" aria-label="数据与隐私说明，了解你的信息如何保存" @click="openLocalDataInfo" @keydown.enter.prevent="openLocalDataInfo" @keydown.space.prevent="openLocalDataInfo">
            <view class="setting-icon data-icon"><uni-icons type="cloud-filled" :size="21" color="#c5c3ff" /></view>
            <view class="setting-copy"><text class="setting-title">数据与隐私说明</text><text class="setting-description">了解你的信息如何保存</text></view>
            <uni-icons type="right" :size="18" color="#b6bdd8" />
          </button>
          <button data-testid="help-feedback-row" class="setting-row is-action" type="button" role="button" :tabindex="!online || submittingFeedback ? -1 : 0" :disabled="!online || submittingFeedback" :aria-disabled="!online || submittingFeedback" aria-label="帮助与反馈，告诉我们哪里可以更好" @click="openHelpFeedback" @keydown.enter.prevent="openHelpFeedback" @keydown.space.prevent="openHelpFeedback">
            <view class="setting-icon feedback-icon"><uni-icons type="paperplane-filled" :size="21" color="#f0bedc" /></view>
            <view class="setting-copy"><text class="setting-title">帮助与反馈</text><text class="setting-description">{{ submittingFeedback ? '正在提交你的反馈…' : '告诉我们哪里可以更好' }}</text></view>
            <uni-icons type="right" :size="18" color="#b6bdd8" />
          </button>
        </view></HnGlassCard></view>
      </view>
      <view class="settings-footer"><text class="brand-name">HeartNest 心栖</text><text class="version">版本 1.0</text></view>
      </template>
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as *;
.settings-screen { background: radial-gradient(circle at 85% 0, rgba(111, 87, 179, .17), transparent 42%), $hn-bg-deep; }
.settings-page { padding-bottom: calc(56rpx + env(safe-area-inset-bottom)); }
.settings-header { display: flex; align-items: center; gap: 20rpx; min-height: 88rpx; }
.header-copy { display: flex; flex-direction: column; gap: 4rpx; min-width: 0; }
.page-title { color: $hn-text; font-size: 22px; font-weight: 700; line-height: 1.4; }
.page-subtitle { color: $hn-text-muted; font-size: 14px; line-height: 1.6; }
.back-button { display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 76rpx; height: 76rpx; min-width: 44px; min-height: 44px; margin: 0; padding: 0; border: 1rpx solid $hn-line; border-radius: 50%; color: $hn-text; background: $hn-surface-soft; line-height: 1; }
.back-button::after, .setting-row::after, .memory-switch::after { border: 0; }
.settings-group { margin-top: 42rpx; }
.group-title { display: block; margin: 0 6rpx 18rpx; color: #c1c8e0; font-size: 14px; font-weight: 600; line-height: 1.5; }
.settings-frame { border-radius: 32rpx; overflow: hidden; }
.settings-layout { padding: 0 28rpx; }
.setting-row { display: flex; align-items: center; gap: 24rpx; width: 100%; min-height: 144rpx; margin: 0; padding: 26rpx 0; border: 0; border-bottom: 1rpx solid rgba(187, 197, 239, .14); border-radius: 0; color: $hn-text; background: transparent; text-align: left; line-height: 1.5; }
.setting-row:last-child { border-bottom: 0; }
.setting-row.is-action { cursor: pointer; }
.setting-row.is-action:active { background: $hn-surface-soft; }
.setting-icon { display: flex; flex-shrink: 0; align-items: center; justify-content: center; width: 68rpx; height: 68rpx; border-radius: 20rpx; background: rgba(197, 195, 255, .1); }
.reminder-icon { background: rgba(255, 196, 142, .1); }
.memory-icon, .feedback-icon { background: rgba(236, 145, 204, .1); }
.setting-copy { display: flex; flex: 1; flex-direction: column; gap: 8rpx; min-width: 0; }
.setting-title { color: $hn-text; font-size: 16px; font-weight: 600; line-height: 1.4; }
.setting-description { color: #c1c8e0; font-size: 14px; line-height: 1.6; overflow-wrap: break-word; }
.memory-switch { display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0; gap: 8rpx; min-width: 52px; min-height: 56px; margin: 0; padding: 0; border: 0; color: $hn-text-muted; background: transparent; line-height: 1.3; }
.toggle { width: 48px; height: 28px; padding: 3px; border: 1px solid rgba(193, 200, 224, .45); border-radius: 16px; background: #46506f; }
.toggle-thumb { width: 20px; height: 20px; border-radius: 50%; background: #f5edfc; transition: transform .18s ease-out; }
.toggle.is-on { border-color: #ad91dc; background: #8d75c9; }
.toggle.is-on .toggle-thumb { transform: translateX(20px); }
.switch-state { color: #d2c8eb; font-size: 14px; }
.setting-row[disabled], .memory-switch[disabled] { opacity: .6; cursor: default; }
.sync-status { display: block; min-height: 22px; margin: 18rpx 6rpx 0; color: $hn-text-muted; font-size: 14px; line-height: 1.5; }
.sync-status.is-saved { color: #c7e6da; }
.settings-footer { display: flex; flex-direction: column; align-items: center; gap: 8rpx; margin-top: 48rpx; color: $hn-text-muted; font-size: 14px; line-height: 1.5; }
.brand-name { color: #c1c8e0; }
.version { color: $hn-text-muted; }
@media (max-width: 360px) { .settings-page { padding-right: 28rpx; padding-left: 28rpx; } .settings-layout { padding-right: 24rpx; padding-left: 24rpx; } .setting-row { gap: 18rpx; } }
@media (prefers-reduced-motion: reduce) { .toggle-thumb { transition: none; } }
</style>
