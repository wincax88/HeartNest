<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import HnBottomNav from '@/components/HnBottomNav.vue'
import HnGlassCard from '@/components/HnGlassCard.vue'
import HnAsyncState from '@/components/HnAsyncState.vue'
import { useReviewStore } from '@/stores/review'
import { useBootstrapStore } from '@/stores/bootstrap'
import { api } from '@/services/api'

const reviewStore = useReviewStore()
const bootstrapStore = useBootstrapStore()
const filterFrom = ref('2026-09-01')
const filterTo = ref('2026-09-30')
const filterMood = ref('')
const filteredCount = ref<number | null>(null)
const hasRecords = computed(() => reviewStore.reviewDays.some((day) => day.recorded))
const heights = computed(() => reviewStore.reviewDays.map((day) => day.score ? 14 + day.score * 16 : 4))
const dateRange = computed(() => {
  const days = reviewStore.reviewDays
  return days.length ? `${days[0].date} — ${days.at(-1)?.date}` : '--'
})
onMounted(() => bootstrapStore.initialize(true).catch((error) => uni.showToast({ title: error instanceof Error ? error.message : '加载失败', icon: 'none' })))

async function applyFilters() {
  try { filteredCount.value = (await api.getReview({ from: filterFrom.value, to: filterTo.value, mood: filterMood.value || undefined })).length }
  catch (error) { uni.showToast({ title: error instanceof Error ? error.message : '筛选失败', icon: 'none' }) }
}

function navigate(destination: string) {
  const routes: Record<string, string> = {
    home: '/pages/home/index', companions: '/pages/companion/index?id=mika', review: '/pages/review/index', profile: '/pages/profile/index',
  }
  uni.reLaunch({ url: routes[destination] })
}

function goHome() { uni.reLaunch({ url: '/pages/home/index' }) }
</script>

<template>
  <view class="hn-screen">
    <image class="hn-night-bg" src="/static/heartnest/night-cat.jpg" mode="aspectFill" />
    <view class="hn-night-shade" />
    <scroll-view scroll-y class="review-scroll">
      <view class="hn-page review-page">
        <view class="review-header">
          <view><text class="eyebrow">WEEKLY REVIEW</text><text class="title">情绪回顾</text></view>
          <view class="calendar-chip"><uni-icons type="calendar" :size="20" color="#e5d4ff" /><text>{{ dateRange }}</text></view>
        </view>
        <view class="review-filters">
          <picker mode="date" :value="filterFrom" @change="filterFrom = $event.detail.value"><view>从 {{ filterFrom }}</view></picker>
          <picker mode="date" :value="filterTo" @change="filterTo = $event.detail.value"><view>到 {{ filterTo }}</view></picker>
          <picker :range="['全部情绪', '平静', '难过']" @change="filterMood = ['', 'calm', 'sad'][$event.detail.value]"><view>{{ filterMood || '全部情绪' }}</view></picker>
          <button data-testid="apply-review-filter" @click="applyFilters">筛选</button>
        </view>
        <text v-if="filteredCount !== null" class="filter-result">筛选到 {{ filteredCount }} 条情绪记录</text>

        <HnGlassCard class="trend-card">
          <view class="trend-copy"><text>{{ hasRecords ? '这是你近七天的真实记录' : '这一周还没有记录' }}</text><text>{{ hasRecords ? '每一次选择的情绪都会在这里留下轨迹。' : '去首页选择此刻的感受，从今天开始。' }}</text></view>
          <view class="chart">
            <view v-for="(day, index) in reviewStore.reviewDays" :key="day.date" data-testid="review-day" class="chart-day">
              <view class="chart-track"><view class="chart-bar" :class="{ 'chart-bar--empty': !day.recorded }" :style="{ height: `${heights[index]}%` }"><view class="chart-dot" /></view></view>
              <text class="chart-weekday">{{ day.weekday.slice(1) }}</text>
            </view>
          </view>
          <view class="trend-footer"><uni-icons type="heart-filled" :size="18" color="#ffb6d7" /><text>{{ hasRecords ? '数据来自你的每日情绪选择' : '暂无可比较的记录' }}</text></view>
        </HnGlassCard>

        <view class="hn-section-title">被记住的片段</view>
        <view class="memory-list">
          <HnGlassCard v-for="(memory, index) in reviewStore.memories" :key="memory.id" data-testid="memory-item" class="memory-card">
            <view class="memory-icon" :class="`memory-icon--${index}`"><uni-icons :type="index === 1 ? 'cloud-filled' : 'heart-filled'" :size="23" color="#fff" /></view>
            <view class="memory-copy"><text>{{ memory.title }}</text><text>{{ memory.summary }}</text></view>
            <text class="memory-date">{{ memory.createdAt.slice(5, 10).replace('-', '.') }}</text>
          </HnGlassCard>
        </view>

        <HnAsyncState v-if="reviewStore.memories.length === 0" data-testid="review-empty" state="empty" title="还没有被记住的片段" description="去首页选择心情并开始一次对话。" action-label="回到首页" @action="goHome" />

      </view>
    </scroll-view>
    <HnBottomNav active="review" @navigate="navigate" />
  </view>
</template>

<style scoped lang="scss">
.review-scroll { height: 100vh; }
.review-page { padding-bottom: calc(210rpx + env(safe-area-inset-bottom)); }
.review-header { display: flex; align-items: flex-end; justify-content: space-between; margin: 18rpx 0 38rpx; }
.review-filters { display: grid; grid-template-columns: 1fr 1fr; gap: 12rpx; margin-bottom: 18rpx; }.review-filters view,.review-filters button { padding: 16rpx; border-radius: 18rpx; color: #cbd2e7; font-size: 19rpx; background: rgba(38,45,88,.7); }.filter-result { display:block; margin-bottom:18rpx; color:#aeb7d2; font-size:19rpx; }
.review-header > view:first-child { display: flex; flex-direction: column; gap: 5rpx; }
.eyebrow { color: #dc9dca; font-size: 18rpx; font-weight: 700; letter-spacing: 5rpx; }
.title { font-family: Georgia, 'Songti SC', serif; font-size: 52rpx; font-weight: 700; }
.calendar-chip { display: flex; align-items: center; gap: 8rpx; padding: 12rpx 16rpx; border: 1rpx solid rgba(199, 183, 244, 0.22); border-radius: 28rpx; color: #bec5df; font-size: 18rpx; background: rgba(38, 45, 88, 0.55); }
.trend-card { padding: 30rpx 24rpx 24rpx; }
.trend-copy { display: flex; flex-direction: column; gap: 8rpx; }
.trend-copy text:first-child { font-size: 31rpx; font-weight: 700; }
.trend-copy text:last-child { color: #adb6d2; font-size: 21rpx; }
.chart { display: grid; grid-template-columns: repeat(7, 1fr); gap: 12rpx; height: 260rpx; margin: 34rpx 0 20rpx; }
.chart-day { display: grid; grid-template-rows: 1fr auto; gap: 12rpx; align-items: end; text-align: center; }
.chart-track { display: flex; align-items: flex-end; justify-content: center; height: 100%; border-bottom: 1rpx solid rgba(192, 201, 242, 0.13); }
.chart-bar { position: relative; width: 22rpx; min-height: 20rpx; border-radius: 16rpx; background: linear-gradient(180deg, #f0a7d2, #786dff); box-shadow: 0 0 22rpx rgba(172, 118, 226, 0.35); }
.chart-bar--empty { background: rgba(140, 150, 185, 0.25); box-shadow: none; }
.chart-bar--empty .chart-dot { display: none; }
.empty-card { padding: 30rpx; color: #aeb7d2; font-size: 21rpx; line-height: 1.6; text-align: center; }
.chart-dot { position: absolute; top: -5rpx; left: 50%; width: 11rpx; height: 11rpx; border-radius: 50%; background: #fff0fa; transform: translateX(-50%); }
.chart-weekday { color: #a5aecb; font-size: 18rpx; }
.trend-footer { display: flex; align-items: center; justify-content: center; gap: 10rpx; padding-top: 20rpx; border-top: 1rpx solid rgba(192, 201, 242, 0.12); color: #d7cae6; font-size: 21rpx; }
.memory-list { display: flex; flex-direction: column; gap: 16rpx; }
.memory-card { display: grid; grid-template-columns: 70rpx 1fr auto; align-items: center; gap: 18rpx; padding: 22rpx; }
.memory-icon { display: grid; place-items: center; width: 66rpx; height: 66rpx; border-radius: 22rpx; background: linear-gradient(135deg, #d77fc0, #896cdb); }
.memory-icon--1 { background: linear-gradient(135deg, #6e80d7, #8c70c9); }
.memory-icon--2 { background: linear-gradient(135deg, #dc947c, #c475ae); }
.memory-copy { display: flex; flex-direction: column; gap: 6rpx; }
.memory-copy text:first-child { font-size: 24rpx; font-weight: 700; }
.memory-copy text:last-child { color: #aeb7d2; font-size: 20rpx; line-height: 1.5; }
.memory-date { color: #8f99ba; font-size: 18rpx; }
.insight-card { display: flex; flex-direction: column; gap: 12rpx; margin-top: 30rpx; padding: 30rpx; border-color: rgba(255, 190, 222, 0.3); }
.insight-kicker { color: #f1a8d1; font-size: 19rpx; letter-spacing: 3rpx; }
.insight-title { font-size: 28rpx; font-weight: 700; }
.insight-copy { color: #b7bfd9; font-size: 21rpx; line-height: 1.7; }
</style>
