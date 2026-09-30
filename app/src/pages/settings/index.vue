<script setup lang="ts">
import { computed, onMounted } from 'vue'
import HnAppHeader from '@/components/HnAppHeader.vue'
import HnGlassCard from '@/components/HnGlassCard.vue'
import type { AppPreferences } from '@/domain/models'
import { useProfileStore } from '@/stores/profile'
import { useBootstrapStore } from '@/stores/bootstrap'
import { api } from '@/services/api'

const profileStore = useProfileStore()
const bootstrapStore = useBootstrapStore()
onMounted(() => bootstrapStore.initialize().catch(showError))

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

function toggleMemoryPrompts() {
  profileStore.setMemoryPrompts(!profileStore.preferences.memoryPromptsEnabled).catch(showError)
}

function openReplyStylePicker() {
  uni.showActionSheet({
    itemList: replyStyles.map((item) => item.label),
    success: ({ tapIndex }) => {
      const selected = replyStyles[tapIndex]
      if (selected) profileStore.setReplyStyle(selected.id).catch(showError)
    },
  })
}

function openLocalDataInfo() {
  uni.showModal({
    title: '数据说明',
    content: '你的情绪、对话、记忆和偏好会与当前设备的匿名标识关联，并保存到 HeartNest 服务端。最近的对话会发送至 DeepSeek 生成陪伴回复。',
    showCancel: false,
    confirmText: '知道了',
  })
}

function openHelpFeedback() {
  uni.showModal({
    title: '帮助与反馈',
    content: '',
    editable: true,
    placeholderText: '请告诉我们哪里还可以更好',
    confirmText: '提交',
    success: ({ confirm, content }) => {
      if (!confirm || !content?.trim()) return
      api.submitFeedback(content).then(() => uni.showToast({ title: '感谢你的反馈', icon: 'success' })).catch(showError)
    },
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
    <view class="hn-page settings-page">
      <HnAppHeader back title="设置" subtitle="这些偏好会安全同步" @back="goBack" />
      <view class="settings-group">
        <text class="group-title">陪伴偏好</text>
        <HnGlassCard class="settings-card">
          <view data-testid="account-row" class="setting-row is-action" @click="openAccount">
            <view><text>账号与隐私</text><text>导出数据、注销账号或退出登录</text></view>
            <uni-icons type="right" :size="20" color="#9ba6c8" />
          </view>
          <view data-testid="notification-settings-row" class="setting-row is-action" @click="openNotificationSettings">
            <view><text>温柔提醒</text><text>在你常用的夜间时段轻轻提醒</text></view>
            <uni-icons type="right" :size="20" color="#9ba6c8" />
          </view>
          <view data-testid="reply-style-row" class="setting-row is-action" @click="openReplyStylePicker">
            <view><text>回应风格</text><text>{{ replyStyleLabel }}</text></view>
            <uni-icons type="right" :size="20" color="#9ba6c8" />
          </view>
          <view class="setting-row">
            <view><text>记忆提示</text><text>在合适的时候询问是否记住</text></view>
            <view
              data-testid="memory-prompt-toggle"
              class="toggle"
              :class="{ 'is-on': profileStore.preferences.memoryPromptsEnabled }"
              @click="toggleMemoryPrompts"
            ><view /></view>
          </view>
        </HnGlassCard>
      </view>
      <view class="settings-group">
        <text class="group-title">隐私与支持</text>
        <HnGlassCard class="settings-card">
          <view data-testid="local-data-row" class="setting-row is-action" @click="openLocalDataInfo">
            <view><text>数据与隐私说明</text><text>了解对话与偏好如何保存</text></view>
            <uni-icons type="right" :size="20" color="#9ba6c8" />
          </view>
          <view data-testid="help-feedback-row" class="setting-row is-action" @click="openHelpFeedback">
            <view><text>帮助与反馈</text><text>告诉我们哪里还可以更温柔</text></view>
            <uni-icons type="right" :size="20" color="#9ba6c8" />
          </view>
        </HnGlassCard>
      </view>
      <text class="version">HeartNest 心栖 · 1.0</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.settings-screen { background: radial-gradient(circle at 80% 5%, rgba(111, 87, 179, 0.25), transparent 35%), #071126; }
.settings-page { padding-bottom: 80rpx; }
.settings-group { margin-top: 42rpx; }
.group-title { display: block; margin: 0 8rpx 16rpx; color: #aeb8d6; font-size: 21rpx; }
.settings-card { overflow: hidden; padding: 0 26rpx; }
.setting-row { display: grid; grid-template-columns: 1fr auto; align-items: center; min-height: 126rpx; border-bottom: 1rpx solid rgba(187, 197, 239, 0.12); }
.setting-row:last-child { border-bottom: 0; }
.setting-row.is-action { cursor: pointer; }
.setting-row > view:first-child { display: flex; flex-direction: column; gap: 8rpx; }
.setting-row > view:first-child text:first-child { font-size: 26rpx; font-weight: 700; }
.setting-row > view:first-child text:last-child { color: #98a3c4; font-size: 20rpx; }
.toggle { width: 82rpx; height: 46rpx; padding: 5rpx; border-radius: 24rpx; background: #46506f; transition: background 0.2s ease; }
.toggle > view { width: 36rpx; height: 36rpx; border-radius: 50%; background: #e7eafa; transition: transform 0.2s ease; }
.toggle.is-on { background: linear-gradient(90deg, #8177ff, #d384c6); }
.toggle.is-on > view { transform: translateX(36rpx); }
.version { display: block; margin-top: 48rpx; color: #7984a7; font-size: 19rpx; text-align: center; }
</style>
