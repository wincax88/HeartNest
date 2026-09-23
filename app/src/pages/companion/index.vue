<script setup lang="ts">
import { computed } from 'vue'
import HnAppHeader from '@/components/HnAppHeader.vue'
import HnGlassCard from '@/components/HnGlassCard.vue'
import HnPrimaryButton from '@/components/HnPrimaryButton.vue'
import type { CompanionId } from '@/domain/models'
import { companionById } from '@/mocks/companions'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
const companion = computed(() => companionById[appStore.selectedCompanionId])

const currentPages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
const currentPage = currentPages[currentPages.length - 1] as { options?: Record<string, string> } | undefined
const routeId = currentPage?.options?.id as CompanionId | undefined
if (routeId && companionById[routeId]) appStore.selectCompanion(routeId)

function goBack() {
  uni.navigateBack()
}

function startChat() {
  uni.navigateTo({ url: `/pages/chat/index?id=${companion.value.id}` })
}
</script>

<template>
  <view class="hn-screen profile-screen">
    <image class="profile-backdrop" :src="companion.profileImage" mode="aspectFill" />
    <view class="profile-shade" />
    <scroll-view scroll-y class="profile-scroll">
      <view class="hn-page profile-page">
        <HnAppHeader back @back="goBack" />

        <view class="profile-hero">
          <view class="profile-avatar-wrap">
            <image class="profile-avatar" :src="companion.profileImage" mode="aspectFill" />
            <view class="online-dot" />
          </view>
          <text class="profile-name">{{ companion.name }}</text>
          <text class="profile-cn">{{ companion.chineseName }} · {{ companion.role }}</text>
          <view class="profile-traits">
            <text v-for="trait in companion.traits" :key="trait">{{ trait }}</text>
          </view>
        </view>

        <HnGlassCard class="about-card">
          <text class="card-kicker">ABOUT ME</text>
          <text class="about-copy">{{ companion.description }}</text>
        </HnGlassCard>

        <view class="connection-grid">
          <HnGlassCard><text class="connection-value">12</text><text class="connection-label">次对话</text></HnGlassCard>
          <HnGlassCard><text class="connection-value">4.9</text><text class="connection-label">安心评分</text></HnGlassCard>
          <HnGlassCard><text class="connection-value">夜间</text><text class="connection-label">常在时段</text></HnGlassCard>
        </view>

        <view class="quote-card">
          <text class="quote-mark">“</text>
          <text class="quote-text">{{ companion.quote }}</text>
          <text class="quote-hours">常在 · {{ companion.preferredHours }}</text>
        </view>

        <HnPrimaryButton data-testid="profile-chat" label="和我聊聊" @click="startChat" />
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.profile-screen { background: #071126; }
.profile-scroll { height: 100vh; }
.profile-backdrop { position: fixed; inset: 0; width: 100%; height: 820rpx; opacity: 0.44; filter: blur(4rpx); transform: scale(1.03); }
.profile-shade { position: fixed; inset: 0; background: linear-gradient(180deg, rgba(4, 10, 29, 0.18), #071126 50%, #050d20 100%); }
.profile-page { padding-bottom: calc(80rpx + env(safe-area-inset-bottom)); }
.profile-hero { display: flex; flex-direction: column; align-items: center; padding: 22rpx 0 42rpx; }
.profile-avatar-wrap { position: relative; width: 264rpx; height: 264rpx; }
.profile-avatar { width: 100%; height: 100%; border: 5rpx solid rgba(255, 232, 241, 0.7); border-radius: 50%; box-shadow: 0 22rpx 80rpx rgba(172, 110, 199, 0.38); }
.online-dot { position: absolute; right: 18rpx; bottom: 22rpx; width: 30rpx; height: 30rpx; border: 6rpx solid #101937; border-radius: 50%; background: #52dda4; box-shadow: 0 0 24rpx rgba(82, 221, 164, 0.8); }
.profile-name { margin-top: 28rpx; font-family: Georgia, 'Songti SC', serif; font-size: 52rpx; font-weight: 700; }
.profile-cn { margin-top: 8rpx; color: #bcc3dd; font-size: 23rpx; }
.profile-traits { display: flex; flex-wrap: wrap; justify-content: center; gap: 12rpx; margin-top: 24rpx; }
.profile-traits text { padding: 10rpx 20rpx; border: 1rpx solid rgba(255, 199, 226, 0.22); border-radius: 30rpx; color: #f2c6df; font-size: 21rpx; background: rgba(149, 92, 145, 0.18); }
.about-card { display: flex; flex-direction: column; gap: 16rpx; padding: 30rpx; }
.card-kicker { color: #ee9fcf; font-size: 18rpx; font-weight: 700; letter-spacing: 5rpx; }
.about-copy { color: #d8dced; font-size: 25rpx; line-height: 1.85; }
.connection-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14rpx; margin: 22rpx 0; }
.connection-grid :deep(.glass-card) { display: flex; flex-direction: column; align-items: center; gap: 6rpx; padding: 22rpx 8rpx; }
.connection-value { color: #fff; font-size: 27rpx; font-weight: 700; }
.connection-label { color: #aeb7d3; font-size: 19rpx; }
.quote-card { display: flex; flex-direction: column; align-items: center; margin: 26rpx 0 36rpx; padding: 34rpx; text-align: center; }
.quote-mark { height: 38rpx; color: #dda1d2; font-family: Georgia, serif; font-size: 70rpx; line-height: 1; }
.quote-text { font-family: Georgia, 'Songti SC', serif; font-size: 31rpx; }
.quote-hours { margin-top: 14rpx; color: #9ca7c9; font-size: 20rpx; }
</style>
