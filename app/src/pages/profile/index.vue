<script setup lang="ts">
import HnBottomNav from '@/components/HnBottomNav.vue'
import HnGlassCard from '@/components/HnGlassCard.vue'
import { companionById } from '@/mocks/companions'
import { useProfileStore } from '@/stores/profile'

const profileStore = useProfileStore()
const companion = companionById[profileStore.profile.preferredCompanionId]

const menu = [
  { icon: 'heart-filled', color: '#f2a7c9', title: '我的陪伴者', subtitle: `最常聊天 · ${companion.name}` },
  { icon: 'calendar-filled', color: '#aeb8ff', title: '情绪日历', subtitle: '查看你的情绪足迹' },
  { icon: 'star-filled', color: '#ffd09a', title: '我的收藏', subtitle: '被你留下的温柔片段' },
]

function openSettings() {
  uni.navigateTo({ url: '/pages/settings/index' })
}

function openMembership() {
  uni.navigateTo({ url: '/pages/membership/index' })
}

function navigate(destination: string) {
  const routes: Record<string, string> = {
    home: '/pages/home/index', companions: '/pages/companion/index?id=mika', review: '/pages/review/index', profile: '/pages/profile/index',
  }
  uni.reLaunch({ url: routes[destination] })
}
</script>

<template>
  <view class="hn-screen">
    <image class="hn-night-bg profile-bg" src="/static/heartnest/onboarding-night.jpg" mode="aspectFill" />
    <view class="hn-night-shade" />
    <scroll-view scroll-y class="profile-scroll">
      <view class="hn-page user-page">
        <view class="top-row"><text>我的</text><button data-testid="open-settings" @click="openSettings"><uni-icons type="gear-filled" :size="26" color="#e6e7f6" /></button></view>
        <view class="user-card">
          <image src="/static/heartnest/mika-profile.jpg" mode="aspectFill" />
          <view class="user-copy"><text>{{ profileStore.profile.displayName }}</text><text>连续陪伴 {{ profileStore.profile.streakDays }} 天</text></view>
          <view class="streak"><uni-icons type="fire-filled" :size="19" color="#ffd1a3" /><text>{{ profileStore.profile.streakDays }}</text></view>
        </view>

        <HnGlassCard data-testid="open-membership" class="membership-banner" @click="openMembership">
          <view class="member-icon"><uni-icons type="vip-filled" :size="28" color="#fff1c9" /></view>
          <view><text>{{ profileStore.membership.title }}</text><text>{{ profileStore.membership.tier === 'pro' ? '长期记忆与无限陪伴已开启' : '开启更长久的记忆与陪伴' }}</text></view>
          <uni-icons type="right" :size="22" color="#f8d6ec" />
        </HnGlassCard>

        <view class="stats-grid">
          <HnGlassCard><text>18</text><text>累计对话</text></HnGlassCard>
          <HnGlassCard><text>12</text><text>被记住的片段</text></HnGlassCard>
          <HnGlassCard><text>7</text><text>陪伴天数</text></HnGlassCard>
        </view>

        <view class="hn-section-title">我的心栖</view>
        <HnGlassCard class="menu-card">
          <view v-for="item in menu" :key="item.title" class="menu-row">
            <view class="menu-icon"><uni-icons :type="item.icon" :size="23" :color="item.color" /></view>
            <view><text>{{ item.title }}</text><text>{{ item.subtitle }}</text></view>
            <uni-icons type="right" :size="20" color="#8f99b9" />
          </view>
        </HnGlassCard>

        <text class="gentle-note">谢谢你，愿意把一些时刻留在这里。</text>
      </view>
    </scroll-view>
    <HnBottomNav active="profile" @navigate="navigate" />
  </view>
</template>

<style scoped lang="scss">
.profile-bg { opacity: 0.28; }
.profile-scroll { height: 100vh; }
.user-page { padding-bottom: calc(210rpx + env(safe-area-inset-bottom)); }
.top-row { display: flex; align-items: center; justify-content: space-between; margin: 12rpx 0 34rpx; }
.top-row > text { font-family: Georgia, 'Songti SC', serif; font-size: 52rpx; font-weight: 700; }
.top-row button { display: grid; place-items: center; width: 70rpx; height: 70rpx; padding: 0; border: 1rpx solid rgba(196, 205, 243, 0.18); border-radius: 50%; background: rgba(39, 49, 91, 0.58); }
.user-card { display: grid; grid-template-columns: 112rpx 1fr auto; align-items: center; gap: 22rpx; margin-bottom: 28rpx; }
.user-card image { width: 112rpx; height: 112rpx; border: 3rpx solid rgba(255, 213, 235, 0.56); border-radius: 36rpx; }
.user-copy { display: flex; flex-direction: column; gap: 8rpx; }
.user-copy text:first-child { font-size: 34rpx; font-weight: 700; }
.user-copy text:last-child { color: #b0b9d5; font-size: 21rpx; }
.streak { display: flex; align-items: center; gap: 6rpx; padding: 10rpx 15rpx; border-radius: 24rpx; color: #ffd1a3; background: rgba(191, 112, 92, 0.2); }
.membership-banner { display: grid; grid-template-columns: 76rpx 1fr auto; align-items: center; gap: 16rpx; padding: 24rpx; border-color: rgba(255, 199, 221, 0.36); background: linear-gradient(120deg, rgba(110, 77, 151, 0.9), rgba(121, 69, 121, 0.76)); }
.member-icon { display: grid; place-items: center; width: 70rpx; height: 70rpx; border-radius: 24rpx; background: rgba(255, 224, 190, 0.16); }
.membership-banner > view:nth-child(2) { display: flex; flex-direction: column; gap: 7rpx; }
.membership-banner > view:nth-child(2) text:first-child { font-size: 27rpx; font-weight: 700; }
.membership-banner > view:nth-child(2) text:last-child { color: #e6cde1; font-size: 20rpx; }
.stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14rpx; margin: 24rpx 0; }
.stats-grid :deep(.glass-card) { display: flex; flex-direction: column; align-items: center; gap: 7rpx; padding: 23rpx 8rpx; }
.stats-grid text:first-child { font-size: 32rpx; font-weight: 700; }
.stats-grid text:last-child { color: #aeb7d3; font-size: 18rpx; }
.menu-card { overflow: hidden; padding: 0 24rpx; }
.menu-row { display: grid; grid-template-columns: 64rpx 1fr auto; align-items: center; gap: 16rpx; min-height: 116rpx; border-bottom: 1rpx solid rgba(185, 195, 239, 0.12); }
.menu-row:last-child { border-bottom: 0; }
.menu-icon { display: grid; place-items: center; width: 58rpx; height: 58rpx; border-radius: 19rpx; background: rgba(132, 129, 199, 0.16); }
.menu-row > view:nth-child(2) { display: flex; flex-direction: column; gap: 6rpx; }
.menu-row > view:nth-child(2) text:first-child { font-size: 25rpx; font-weight: 700; }
.menu-row > view:nth-child(2) text:last-child { color: #9da7c7; font-size: 19rpx; }
.gentle-note { display: block; margin: 34rpx 0; color: #8f99ba; font-family: Georgia, 'Songti SC', serif; font-size: 22rpx; text-align: center; }
</style>
