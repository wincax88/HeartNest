<script setup lang="ts">
import { computed, onMounted } from 'vue'
import CompanionCard from '@/components/CompanionCard.vue'
import HnBottomNav from '@/components/HnBottomNav.vue'
import HnGlassCard from '@/components/HnGlassCard.vue'
import HnPrimaryButton from '@/components/HnPrimaryButton.vue'
import HnAsyncState from '@/components/HnAsyncState.vue'
import MoodSelector from '@/components/MoodSelector.vue'
import type { CompanionId, MoodId } from '@/domain/models'
import { useAppStore } from '@/stores/app'
import { useBootstrapStore } from '@/stores/bootstrap'
import { useProfileStore } from '@/stores/profile'
import { useNetworkState } from '@/composables/useNetworkState'

const appStore = useAppStore()
const bootstrapStore = useBootstrapStore()
const profileStore = useProfileStore()
const { online } = useNetworkState()
const companions = computed(() => bootstrapStore.companions)
const moods = computed(() => bootstrapStore.moods)
const selectedMood = computed({
  get: () => appStore.selectedMoodId,
  set: (value: MoodId) => { appStore.selectMood(value).catch(showError) },
})

onMounted(() => bootstrapStore.initialize().catch(showError))

function showError(error: unknown) {
  uni.showToast({ title: error instanceof Error ? error.message : '操作失败', icon: 'none' })
}

async function openCompanion(id: CompanionId) {
  try { await appStore.selectCompanion(id) } catch (error) { showError(error); return }
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
    <image class="hn-night-bg" src="/static/heartnest/night-cat.jpg" mode="aspectFill" aria-hidden="true" />
    <view class="hn-night-shade" />
    <scroll-view scroll-y class="home-scroll">
      <view class="hn-page home-page">
        <view class="brand-row">
          <view class="brand-mark"><uni-icons type="heart-filled" :size="25" color="#ffd2d9" /></view>
          <view><text class="brand-name">心栖</text><text class="brand-en">HeartNest</text></view>
        </view>

        <view class="greeting"><text>晚上好，{{ profileStore.profile.displayName }}</text><text>让情绪有处安放</text></view>

        <HnAsyncState v-if="bootstrapStore.loading && !bootstrapStore.loaded" state="loading" title="正在同步你的数据…" />
        <HnAsyncState v-else-if="!online && !bootstrapStore.loaded" state="offline" title="当前处于离线状态" description="联网后即可载入你的陪伴者与情绪记录。" action-label="重新检查" @action="bootstrapStore.initialize(true).catch(showError)" />
        <HnAsyncState v-else-if="bootstrapStore.error && !bootstrapStore.loaded" state="error" :title="bootstrapStore.error" action-label="重试" @action="bootstrapStore.initialize(true).catch(showError)" />
        <HnAsyncState v-else-if="!online" state="offline" title="正在使用已缓存内容" description="离线时可以浏览，联网后可继续同步选择。" />

        <HnGlassCard class="mood-panel">
          <view class="panel-title"><uni-icons type="heart-filled" :size="24" color="#ffacc8" /><text>今天，你的心情是？</text></view>
          <text class="panel-subtitle">选择此刻的感受，让我更好地陪伴你</text>
          <MoodSelector v-model="selectedMood" :items="moods" />
        </HnGlassCard>

        <view class="hn-section-title">今天谁陪你</view>
        <scroll-view scroll-x class="companion-scroll" :show-scrollbar="false">
          <view class="companion-row">
            <view v-for="item in companions" :key="item.id" class="companion-frame" data-testid="companion-frame">
              <CompanionCard class="companion-card-host" :data-testid="`companion-${item.id}`" :companion="item" :featured="item.id === 'mika'" @select="openCompanion(item.id)" />
            </view>
          </view>
        </scroll-view>

        <view class="night-insight-frame" data-testid="night-insight-frame">
          <HnGlassCard class="night-insight">
            <view class="night-icon"><uni-icons type="cloud-filled" :size="32" color="#ffd2a1" /></view>
            <view class="night-copy"><text class="insight-title">你最近夜间使用比较多</text><text class="insight-copy">或许夜晚的你，更需要一个可以安心倾诉的地方。</text></view>
          </HnGlassCard>
        </view>

        <HnPrimaryButton data-testid="start-chat" label="开始说话" :disabled="!online" @click="startChat" />
      </view>
    </scroll-view>
    <HnBottomNav active="home" @navigate="navigate" />
  </view>
</template>

<style scoped lang="scss">
.home-scroll { height: 100vh; }
.home-page { padding-bottom: calc(260rpx + env(safe-area-inset-bottom)); }
.data-state { margin: -28rpx 0 28rpx; color: #aeb7d3; font-size: 21rpx; }
.data-state--error { color: #ffc1cf; cursor: pointer; }
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
.companion-row { display: inline-flex; min-width: 100%; gap: 16rpx; padding: 0 36rpx 10rpx 0; }
.companion-frame { flex: 0 0 260rpx; width: 260rpx; height: 360rpx; }
.companion-card-host { display: block; width: 100%; height: 100%; }
.night-insight-frame { display: block; width: 100%; margin: 34rpx 0; }
.night-insight { display: grid; width: 100%; grid-template-columns: 92rpx 1fr; align-items: center; gap: 20rpx; margin: 0; padding: 25rpx; }
.night-icon { display: grid; place-items: center; width: 84rpx; height: 84rpx; border-radius: 50%; background: rgba(106, 99, 205, 0.44); }
.night-copy { display: flex; min-width: 0; flex-direction: column; gap: 7rpx; }
.insight-title, .insight-copy { display: block; white-space: normal; word-break: break-word; }
.insight-title { font-size: 26rpx; font-weight: 700; }
.insight-copy { color: #bcc4df; font-size: 21rpx; line-height: 1.55; }
</style>
