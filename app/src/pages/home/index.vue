<script setup lang="ts">
import { computed } from 'vue'
import CompanionCard from '@/components/CompanionCard.vue'
import HnBottomNav from '@/components/HnBottomNav.vue'
import HnGlassCard from '@/components/HnGlassCard.vue'
import HnPrimaryButton from '@/components/HnPrimaryButton.vue'
import MoodSelector from '@/components/MoodSelector.vue'
import type { CompanionId, MoodId } from '@/domain/models'
import { companions } from '@/mocks/companions'
import { moods } from '@/mocks/moods'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
const selectedMood = computed({ get: () => appStore.selectedMoodId, set: (value: MoodId) => appStore.selectMood(value) })

function openCompanion(id: CompanionId) {
  appStore.selectCompanion(id)
  uni.navigateTo({ url: `/pages/companion/index?id=${id}` })
}

function startChat() {
  uni.navigateTo({ url: `/pages/chat/index?id=${appStore.selectedCompanionId}` })
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
    <image class="hn-night-bg" src="/static/heartnest/night-cat.jpg" mode="aspectFill" />
    <view class="hn-night-shade" />
    <scroll-view scroll-y class="home-scroll">
      <view class="hn-page home-page">
        <view class="brand-row">
          <view class="brand-mark"><uni-icons type="heart-filled" :size="25" color="#ffd2d9" /></view>
          <view><text class="brand-name">心栖</text><text class="brand-en">HeartNest</text></view>
        </view>

        <view class="greeting"><text>晚上好，Michael</text><text>让情绪有处安放</text></view>

        <HnGlassCard class="mood-panel">
          <view class="panel-title"><uni-icons type="heart-filled" :size="24" color="#ffacc8" /><text>今天，你的心情是？</text></view>
          <text class="panel-subtitle">选择此刻的感受，让我更好地陪伴你</text>
          <MoodSelector v-model="selectedMood" :items="moods" />
        </HnGlassCard>

        <view class="hn-section-title">今天谁陪你</view>
        <scroll-view scroll-x class="companion-scroll" :show-scrollbar="false">
          <view class="companion-row">
            <CompanionCard v-for="item in companions" :key="item.id" :data-testid="`companion-${item.id}`" :companion="item" :featured="item.id === 'mika'" @select="openCompanion(item.id)" />
          </view>
        </scroll-view>

        <HnGlassCard class="night-insight">
          <view class="night-icon"><uni-icons type="cloud-filled" :size="32" color="#ffd2a1" /></view>
          <view><text class="insight-title">你最近夜间使用比较多</text><text class="insight-copy">或许夜晚的你，更需要一个可以安心倾诉的地方。</text></view>
        </HnGlassCard>

        <HnPrimaryButton data-testid="start-chat" label="开始说话" @click="startChat" />
      </view>
    </scroll-view>
    <HnBottomNav active="home" @navigate="navigate" />
  </view>
</template>

<style scoped lang="scss">
.home-scroll { height: 100vh; }
.home-page { padding-bottom: calc(260rpx + env(safe-area-inset-bottom)); }
.brand-row { display: flex; align-items: center; gap: 18rpx; }
.brand-mark { display: grid; place-items: center; width: 66rpx; height: 66rpx; border: 3rpx solid #d6a9ff; border-radius: 22rpx; box-shadow: 0 0 22rpx rgba(238, 164, 255, 0.45); }
.brand-row > view:last-child { display: flex; flex-direction: column; }
.brand-name { font-size: 36rpx; font-weight: 700; }
.brand-en { color: #dce0f2; font-size: 22rpx; }
.greeting { display: flex; flex-direction: column; gap: 12rpx; margin: 56rpx 0 52rpx; }
.greeting text:first-child { font-family: Georgia, 'Songti SC', serif; font-size: 52rpx; font-weight: 700; }
.greeting text:last-child { color: #b9c1dc; font-size: 28rpx; letter-spacing: 5rpx; }
.mood-panel { padding: 32rpx 24rpx 26rpx; }
.panel-title { display: flex; align-items: center; gap: 13rpx; font-size: 34rpx; font-weight: 700; }
.panel-subtitle { display: block; margin: 10rpx 0 24rpx 44rpx; color: #b8bfd9; font-size: 22rpx; }
.companion-scroll { width: calc(100% + 36rpx); margin-right: -36rpx; }
.companion-row { display: flex; gap: 16rpx; width: max-content; padding: 0 36rpx 10rpx 0; }
.night-insight { display: grid; grid-template-columns: 92rpx 1fr; align-items: center; gap: 20rpx; margin: 34rpx 0; padding: 25rpx; }
.night-icon { display: grid; place-items: center; width: 84rpx; height: 84rpx; border-radius: 50%; background: rgba(106, 99, 205, 0.44); }
.night-insight > view:last-child { display: flex; flex-direction: column; gap: 7rpx; }
.insight-title { font-size: 26rpx; font-weight: 700; }
.insight-copy { color: #bcc4df; font-size: 21rpx; line-height: 1.55; }
</style>
