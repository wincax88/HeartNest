<script setup lang="ts">
import HnAppHeader from '@/components/HnAppHeader.vue'
import HnGlassCard from '@/components/HnGlassCard.vue'
import { useProfileStore } from '@/stores/profile'

const profileStore = useProfileStore()

function toggleNotifications() {
  profileStore.setNotifications(!profileStore.preferences.notificationsEnabled)
}

function goBack() {
  uni.navigateBack()
}
</script>

<template>
  <view class="hn-screen settings-screen">
    <view class="hn-page settings-page">
      <HnAppHeader back title="设置" subtitle="这些偏好只保存在你的设备上" @back="goBack" />
      <view class="settings-group">
        <text class="group-title">陪伴偏好</text>
        <HnGlassCard class="settings-card">
          <view class="setting-row">
            <view><text>温柔提醒</text><text>在你常用的夜间时段轻轻提醒</text></view>
            <view data-testid="notification-toggle" class="toggle" :class="{ 'is-on': profileStore.preferences.notificationsEnabled }" @click="toggleNotifications"><view /></view>
          </view>
          <view class="setting-row"><view><text>回应风格</text><text>温柔接纳</text></view><uni-icons type="right" :size="20" color="#9ba6c8" /></view>
          <view class="setting-row"><view><text>记忆提示</text><text>在合适的时候询问是否记住</text></view><view class="toggle is-on"><view /></view></view>
        </HnGlassCard>
      </view>
      <view class="settings-group">
        <text class="group-title">隐私与支持</text>
        <HnGlassCard class="settings-card">
          <view class="setting-row"><view><text>本地数据说明</text><text>当前版本使用模拟数据，不上传真实对话</text></view><uni-icons type="right" :size="20" color="#9ba6c8" /></view>
          <view class="setting-row"><view><text>帮助与反馈</text><text>告诉我们哪里还可以更温柔</text></view><uni-icons type="right" :size="20" color="#9ba6c8" /></view>
        </HnGlassCard>
      </view>
      <text class="version">HeartNest 心栖 · Demo 1.0</text>
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
.setting-row > view:first-child { display: flex; flex-direction: column; gap: 8rpx; }
.setting-row > view:first-child text:first-child { font-size: 26rpx; font-weight: 700; }
.setting-row > view:first-child text:last-child { color: #98a3c4; font-size: 20rpx; }
.toggle { width: 82rpx; height: 46rpx; padding: 5rpx; border-radius: 24rpx; background: #46506f; transition: background 0.2s ease; }
.toggle > view { width: 36rpx; height: 36rpx; border-radius: 50%; background: #e7eafa; transition: transform 0.2s ease; }
.toggle.is-on { background: linear-gradient(90deg, #8177ff, #d384c6); }
.toggle.is-on > view { transform: translateX(36rpx); }
.version { display: block; margin-top: 48rpx; color: #7984a7; font-size: 19rpx; text-align: center; }
</style>
