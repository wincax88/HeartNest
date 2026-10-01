<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import HnBottomNav from '@/components/HnBottomNav.vue'
import HnGlassCard from '@/components/HnGlassCard.vue'
import HnAsyncState from '@/components/HnAsyncState.vue'
import { useReviewStore } from '@/stores/review'
import { useBootstrapStore } from '@/stores/bootstrap'
import { useAppStore } from '@/stores/app'
import { useNetworkState } from '@/composables/useNetworkState'
import { api } from '@/services/api'

const reviewStore = useReviewStore()
const bootstrapStore = useBootstrapStore()
const appStore = useAppStore()
const { online } = useNetworkState()

function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
const today = new Date()
const weekStart = new Date(today)
weekStart.setDate(today.getDate() - 6)
const filtersOpen = ref(false)
const filterFrom = ref(localDate(weekStart))
const filterTo = ref(localDate(today))
const filterMoodIndex = ref(0)
const filterLoading = ref(false)
const filterError = ref('')
const filteredRecords = ref<Awaited<ReturnType<typeof api.getReview>> | null>(null)
const appliedFilterLabel = ref('')
const moodLabels = computed(() => ['全部情绪', ...bootstrapStore.moods.map((mood) => mood.title)])
const selectedDate = ref('')
const recordedDays = computed(() => reviewStore.reviewDays.filter((day) => day.recorded))
const hasRecords = computed(() => recordedDays.value.length > 0)
const selectedDay = computed(() => reviewStore.reviewDays.find((day) => day.date === selectedDate.value)
  ?? recordedDays.value.at(-1) ?? reviewStore.reviewDays.at(-1))
const selectedChartId = computed(() => selectedDay.value ? `review-day-${selectedDay.value.date.replace(/\//g, '-')}` : '')
const dateRange = computed(() => {
  const days = reviewStore.reviewDays
  return days.length ? `${days[0].date.replace('/', '.')} — ${days.at(-1)?.date.replace('/', '.')}` : '近 7 天'
})
const trendSummary = computed(() => hasRecords.value
  ? `近 7 天记录了 ${recordedDays.value.length} 天。点击日期可以查看当天的情绪。`
  : '近 7 天暂无情绪记录。可以从今天的心情开始。')

onMounted(loadReview)

async function loadReview() {
  try { await bootstrapStore.initialize(true) }
  catch { /* The inline state provides a retry while preserving cached records. */ }
}

async function applyFilters() {
  if (filterLoading.value || !online.value) return
  filterError.value = ''
  if (filterFrom.value > filterTo.value) {
    filterError.value = '开始日期不能晚于结束日期，请调整后再查看。'
    return
  }
  filterLoading.value = true
  filteredRecords.value = null
  const mood = bootstrapStore.moods[filterMoodIndex.value - 1]
  const from = filterFrom.value
  const to = filterTo.value
  try {
    filteredRecords.value = await api.getReview({ from, to, mood: mood?.id })
    appliedFilterLabel.value = `${from.replace(/-/g, '.')} — ${to.replace(/-/g, '.')} · ${mood?.title ?? '全部情绪'}`
    filtersOpen.value = false
  } catch (error) {
    filterError.value = error instanceof Error ? error.message : '记录暂时没能加载，请再试一次。'
  } finally { filterLoading.value = false }
}

function moodTitle(id: string) {
  return bootstrapStore.moods.find((mood) => mood.id === id)?.title ?? '情绪记录'
}

function navigate(destination: string) {
  const routes: Record<string, string> = {
    home: '/pages/home/index', companions: `/pages/companion/index?id=${appStore.selectedCompanionId}`, review: '/pages/review/index', profile: '/pages/profile/index',
  }
  uni.reLaunch({ url: routes[destination] })
}

function goHome() { uni.reLaunch({ url: '/pages/home/index' }) }
</script>

<template>
  <view class="hn-screen">
    <image class="hn-night-bg" src="/static/heartnest/night-cat.jpg" mode="aspectFill" aria-hidden="true" />
    <view class="hn-night-shade" />
    <scroll-view scroll-y class="review-scroll">
      <view class="hn-page review-page">
        <view class="review-header">
          <text class="eyebrow">WEEKLY REVIEW</text>
          <text class="title">情绪回顾</text>
          <text class="header-copy">每一种感受，都值得被温柔看见</text>
        </view>

        <view class="review-toolbar">
          <view class="date-range"><uni-icons type="calendar" :size="18" color="#bec5df" /><text>{{ dateRange }}</text></view>
          <button class="filter-toggle" type="button" role="button" tabindex="0" data-testid="toggle-review-filter" :aria-expanded="filtersOpen" aria-controls="review-filters" @click="filtersOpen = !filtersOpen" @keydown.enter.prevent="filtersOpen = !filtersOpen" @keydown.space.prevent="filtersOpen = !filtersOpen">
            <uni-icons type="gear-filled" :size="17" color="#e5d4ff" /><text>{{ filtersOpen ? '收起筛选' : '筛选记录' }}</text>
          </button>
        </view>

        <view v-if="filtersOpen" id="review-filters" class="review-filters">
          <view class="filter-dates">
            <picker mode="date" :value="filterFrom" :end="filterTo" aria-label="开始日期" data-testid="review-filter-from" @change="filterFrom = $event.detail.value">
              <view class="filter-field"><text class="field-label">开始日期</text><view class="field-value"><text>{{ filterFrom.replace(/-/g, '.') }}</text><view class="field-chevron"><uni-icons type="right" :size="14" color="#bec5df" /></view></view></view>
            </picker>
            <picker mode="date" :value="filterTo" :start="filterFrom" aria-label="结束日期" data-testid="review-filter-to" @change="filterTo = $event.detail.value">
              <view class="filter-field"><text class="field-label">结束日期</text><view class="field-value"><text>{{ filterTo.replace(/-/g, '.') }}</text><view class="field-chevron"><uni-icons type="right" :size="14" color="#bec5df" /></view></view></view>
            </picker>
          </view>
          <picker :range="moodLabels" :value="filterMoodIndex" aria-label="筛选情绪" data-testid="review-filter-mood" @change="filterMoodIndex = Number($event.detail.value)">
            <view class="filter-field filter-mood"><text class="field-label">情绪</text><view class="field-value"><text>{{ moodLabels[filterMoodIndex] }}</text><view class="field-chevron"><uni-icons type="right" :size="14" color="#bec5df" /></view></view></view>
          </picker>
          <text v-if="filterError" data-testid="review-filter-error" class="filter-error" role="alert">{{ filterError }}</text>
          <button class="filter-submit" type="button" role="button" :tabindex="filterLoading || !online ? -1 : 0" data-testid="apply-review-filter" :disabled="filterLoading || !online" :loading="filterLoading" @click="applyFilters" @keydown.enter.prevent="applyFilters" @keydown.space.prevent="applyFilters">{{ filterLoading ? '正在查找…' : '查看记录' }}</button>
        </view>

        <HnAsyncState v-if="bootstrapStore.loading && !bootstrapStore.loaded" state="loading" title="正在整理你的情绪记录…" />
        <HnAsyncState v-else-if="!online && !bootstrapStore.loaded" state="offline" title="当前处于离线状态" description="联网后，就能查看你的情绪与记忆。" action-label="重新检查" @action="loadReview" />
        <HnAsyncState v-else-if="bootstrapStore.error && !bootstrapStore.loaded" state="error" title="暂时没能加载回顾" :description="bootstrapStore.error" action-label="重新加载" @action="loadReview" />
        <template v-else-if="bootstrapStore.loaded">
          <HnAsyncState v-if="!online" state="offline" title="正在查看已缓存的回顾" description="联网后可以同步新记录和使用筛选。" />
          <HnAsyncState v-else-if="bootstrapStore.error" state="error" title="新记录暂时没能同步" description="你仍可以查看上次的回顾。" action-label="重新同步" @action="loadReview" />

          <view class="trend-frame">
            <HnGlassCard fill>
              <view class="trend-layout">
                <view class="trend-heading"><text class="trend-title">这一周的心情</text><text class="record-count">{{ recordedDays.length }} 天有记录</text></view>
                <text class="trend-subtitle">{{ hasRecords ? '这是你近七天的真实记录' : '不必每天记录，想说的时候再来' }}</text>
                <text data-testid="review-summary" class="sr-only">{{ trendSummary }}</text>
                <scroll-view scroll-x class="chart-scroll" :show-scrollbar="false" :scroll-into-view="selectedChartId" :scroll-left="Math.max(0, reviewStore.reviewDays.findIndex((day) => day.date === selectedDay?.date)) * 44">
                  <view class="chart" role="group" aria-label="近七天情绪，点击日期查看详情">
                    <button v-for="day in reviewStore.reviewDays" :id="`review-day-${day.date.replace(/\//g, '-')}`" :key="day.date" data-testid="review-day" type="button" role="button" tabindex="0" class="chart-day" :class="{ 'is-selected': selectedDay?.date === day.date }" :aria-pressed="selectedDay?.date === day.date" :aria-label="`${day.weekday}，${day.date}，${day.recorded ? day.label : '无记录'}`" @click="selectedDate = day.date" @keydown.enter.prevent="selectedDate = day.date" @keydown.space.prevent="selectedDate = day.date">
                      <view class="chart-track"><view v-if="day.recorded" class="chart-bar" :style="{ height: `${24 + Math.min(4, Math.max(0, day.score)) * 16}%` }" /><view v-else class="chart-empty" /></view>
                      <text class="chart-weekday">{{ day.weekday }}</text><text class="chart-date">{{ day.date.slice(-2) }}</text>
                    </button>
                  </view>
                </scroll-view>
                <text class="chart-scroll-hint">左右滑动，查看这一周</text>
                <view class="sr-only" role="list" aria-label="近七天情绪数据">
                  <text v-for="day in reviewStore.reviewDays" :key="`row-${day.date}`" data-testid="review-data-row" role="listitem">{{ day.date }}，{{ day.recorded ? day.label : '无记录' }}</text>
                </view>
                <view v-if="selectedDay" class="day-detail" data-testid="review-day-detail" aria-live="polite">
                  <view class="day-detail-heading"><text class="day-detail-date">{{ selectedDay.weekday }} · {{ selectedDay.date.replace('/', '.') }}</text><text class="day-mood" :class="{ 'day-mood--empty': !selectedDay.recorded }">{{ selectedDay.recorded ? selectedDay.label : '未记录' }}</text></view>
                  <text class="day-summary">{{ selectedDay.recorded ? (selectedDay.summary || '这一天的感受，已经好好留下。') : '这天留白也没关系，每一种节奏都可以。' }}</text>
                </view>
                <view class="trend-footer"><uni-icons type="heart-filled" :size="15" color="#ec91cc" /><text>{{ hasRecords ? '轻触日期，重温那天的感受' : '从今天的心情开始，慢慢留下轨迹' }}</text></view>
              </view>
            </HnGlassCard>
          </view>

          <view v-if="filteredRecords !== null" class="filter-results" data-testid="review-filter-results" aria-live="polite">
            <view class="section-heading"><text class="section-title">找到的记录</text><button class="text-action" type="button" role="button" tabindex="0" aria-label="清除筛选结果" @click="filteredRecords = null" @keydown.enter.prevent="filteredRecords = null" @keydown.space.prevent="filteredRecords = null">清除</button></view>
            <text class="filter-caption">{{ appliedFilterLabel }}</text>
            <text class="filter-count">{{ filteredRecords.length ? `共 ${filteredRecords.length} 条情绪记录` : '这段时间还没有符合条件的记录' }}</text>
            <view v-for="record in filteredRecords" :key="record.id" data-testid="filtered-review-record" class="record-row">
              <view class="record-heading"><text class="record-mood">{{ moodTitle(record.moodId) }}</text><text class="record-date">{{ record.recordedAt.slice(0, 10).replace(/-/g, '.') }}</text></view>
              <text class="record-summary">{{ record.summary || '这一次的心情，已被记录。' }}</text>
            </view>
            <button v-if="!filteredRecords.length" class="text-action adjust-filter" type="button" role="button" tabindex="0" @click="filtersOpen = true" @keydown.enter.prevent="filtersOpen = true" @keydown.space.prevent="filtersOpen = true">调整筛选条件<uni-icons type="right" :size="14" color="#e5d4ff" /></button>
          </view>

          <view class="memories-section">
            <view class="section-heading"><text class="section-title">被记住的片段</text><text v-if="reviewStore.memories.length" class="section-count">{{ reviewStore.memories.length }} 个片段</text></view>
            <text class="section-copy">那些你愿意留下的话，随时可以重温</text>
            <view v-if="reviewStore.memories.length" class="memory-list">
              <view v-for="memory in reviewStore.memories" :key="memory.id" data-testid="memory-item" class="memory-frame">
                <HnGlassCard fill>
                  <view class="memory-layout">
                    <view class="memory-icon"><uni-icons :type="memory.type === 'moment' ? 'cloud-filled' : 'heart-filled'" :size="20" color="#ffc9e2" /></view>
                    <view class="memory-copy"><view class="memory-heading"><text class="memory-title">{{ memory.title }}</text><text class="memory-date">{{ memory.createdAt.slice(5, 10).replace('-', '.') }}</text></view><text class="memory-summary">{{ memory.summary }}</text></view>
                  </view>
                </HnGlassCard>
              </view>
            </view>
            <HnAsyncState v-else data-testid="review-empty" state="empty" title="还没有被记住的片段" description="对话中保存一句想留下的话，就能在这里重温。" action-label="回到首页，聊一聊" @action="goHome" />
          </view>
        </template>
      </view>
    </scroll-view>
    <HnBottomNav active="review" @navigate="navigate" />
  </view>
</template>

<style scoped lang="scss">
@use '../../styles/tokens.scss' as *;

.review-scroll { height: 100vh; }
.review-page { padding-bottom: calc(180rpx + env(safe-area-inset-bottom)); }
.review-header { display: flex; flex-direction: column; align-items: flex-start; gap: 10rpx; margin: 18rpx 0 24rpx; }
.eyebrow { color: #dc9dca; font-size: 20rpx; font-weight: 700; line-height: 1.5; letter-spacing: 4rpx; }
.title { color: $hn-text; font-family: Georgia, 'Songti SC', serif; font-size: 52rpx; font-weight: 700; line-height: 1.25; }
.header-copy { color: $hn-text-muted; font-size: 28rpx; line-height: 1.6; }
.review-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; margin-bottom: 24rpx; }
.date-range { display: flex; align-items: center; gap: 10rpx; color: $hn-text-muted; font-size: 28rpx; }
.filter-toggle, .filter-submit, .text-action { display: flex; align-items: center; justify-content: center; min-height: 44px; margin: 0; font-size: 28rpx; line-height: 1.4; }
.filter-toggle { flex-shrink: 0; gap: 10rpx; padding: 12rpx 20rpx; border: 1rpx solid $hn-line; border-radius: 22rpx; color: #e5d4ff; background: rgba(38, 45, 88, .55); }
.review-filters { display: flex; flex-direction: column; gap: 16rpx; margin-bottom: 24rpx; padding: 24rpx; border: 1rpx solid $hn-line; border-radius: $hn-radius-lg; background: rgba(24, 34, 75, .86); }
.filter-dates { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16rpx; }
.filter-field { display: flex; flex-direction: column; justify-content: center; min-height: 44px; gap: 10rpx; padding: 18rpx; border: 1rpx solid rgba(176, 190, 255, .14); border-radius: 18rpx; background: rgba(46, 55, 104, .4); }
.field-label { color: $hn-text-muted; font-size: 26rpx; line-height: 1.5; }
.field-value { display: flex; align-items: center; justify-content: space-between; gap: 8rpx; color: $hn-text; font-size: 28rpx; line-height: 1.5; }
.field-chevron { display: flex; flex-shrink: 0; transform: rotate(90deg); }
.filter-mood { flex-direction: row; align-items: center; justify-content: space-between; gap: 20rpx; }
.filter-mood .field-value { flex: 1; justify-content: flex-end; }
.filter-submit { padding: 22rpx; border: 1rpx solid rgba(216, 179, 255, .6); border-radius: 20rpx; color: $hn-text; font-weight: 600; background: rgba(128, 104, 196, .65); }
.filter-submit[disabled] { color: $hn-text-muted; opacity: .55; }
.filter-error { color: #ffc1cf; font-size: 28rpx; line-height: 1.6; }
.trend-frame, .memory-frame { display: block; width: 100%; }
.trend-layout { padding: 32rpx 24rpx 26rpx; }
.trend-heading, .section-heading { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; }
.trend-title { color: $hn-text; font-size: 34rpx; font-weight: 700; line-height: 1.5; }
.record-count { flex-shrink: 0; color: #ecc2dd; font-size: 26rpx; }
.trend-subtitle { display: block; margin-top: 8rpx; color: $hn-text-muted; font-size: 28rpx; line-height: 1.6; }
.chart-scroll { width: 100%; margin: 28rpx 0 24rpx; }
.chart-scroll-hint { display: none; margin: -8rpx 0 20rpx; color: $hn-text-muted; font-size: 26rpx; line-height: 1.5; text-align: center; }
.chart { display: grid; grid-template-columns: repeat(7, minmax(44px, 1fr)); width: 100%; min-width: 308px; }
.chart-day { display: flex; flex-direction: column; align-items: center; min-width: 44px; margin: 0; padding: 0 2rpx 10rpx; border: 0; border-radius: 18rpx; color: $hn-text-muted; line-height: 1.4; background: transparent; }
.chart-track { display: flex; align-items: flex-end; justify-content: center; width: 100%; height: 180rpx; margin-bottom: 12rpx; border-bottom: 1rpx solid rgba(192, 201, 242, .16); }
.chart-bar { width: 24rpx; border-radius: 14rpx 14rpx 5rpx 5rpx; background: linear-gradient(180deg, #f0a7d2, #9180de); }
.chart-empty { width: 18rpx; height: 4rpx; margin-bottom: 2rpx; border-radius: 4rpx; background: rgba(180, 190, 222, .4); }
.chart-weekday { font-size: 26rpx; }
.chart-date { margin-top: 4rpx; font-size: 24rpx; opacity: .85; }
.chart-day.is-selected { color: #f9d9ec; background: rgba(236, 145, 204, .1); }
.chart-day:active { background: rgba(236, 145, 204, .16); }
.day-detail { padding: 20rpx 22rpx; border-radius: 18rpx; background: rgba(7, 20, 47, .36); }
.day-detail-heading { display: flex; align-items: center; justify-content: space-between; gap: 14rpx; }
.day-detail-date { color: $hn-text-muted; font-size: 26rpx; }
.day-mood { max-width: 70%; color: #ffcae3; font-size: 28rpx; font-weight: 600; line-height: 1.5; }
.day-mood--empty { color: $hn-text-muted; font-weight: 400; }
.day-summary { display: block; margin-top: 10rpx; color: #dce0f1; font-size: 28rpx; line-height: 1.7; word-break: break-word; }
.trend-footer { display: flex; align-items: center; justify-content: center; gap: 10rpx; margin-top: 24rpx; color: $hn-text-muted; font-size: 26rpx; line-height: 1.6; }
.memories-section, .filter-results { margin-top: 38rpx; }
.section-title { color: $hn-text; font-size: 34rpx; font-weight: 700; line-height: 1.5; }
.section-count { color: $hn-text-muted; font-size: 26rpx; }
.section-copy { display: block; margin: 10rpx 0 24rpx; color: $hn-text-muted; font-size: 28rpx; line-height: 1.6; }
.memory-list { display: flex; flex-direction: column; gap: 18rpx; }
.memory-layout { display: flex; align-items: flex-start; gap: 18rpx; padding: 26rpx; }
.memory-icon { display: flex; flex: 0 0 56rpx; align-items: center; justify-content: center; width: 56rpx; height: 56rpx; border-radius: 18rpx; background: rgba(196, 126, 178, .16); }
.memory-copy { flex: 1; min-width: 0; }
.memory-heading, .record-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 16rpx; }
.memory-title { color: $hn-text; font-size: 30rpx; font-weight: 600; line-height: 1.5; word-break: break-word; }
.memory-date, .record-date { flex-shrink: 0; color: $hn-text-muted; font-size: 26rpx; }
.memory-summary, .record-summary { display: block; margin-top: 10rpx; color: #c5cce4; font-size: 28rpx; line-height: 1.7; word-break: break-word; }
.filter-caption, .filter-count { display: block; color: $hn-text-muted; font-size: 26rpx; line-height: 1.7; }
.filter-count { margin-top: 10rpx; }
.record-row { padding: 24rpx 0; border-bottom: 1rpx solid $hn-line; }
.record-mood { color: #f5c2de; font-size: 28rpx; font-weight: 600; }
.text-action { min-width: 44px; padding: 12rpx; color: #e5d4ff; background: transparent; }
.adjust-filter { justify-content: flex-start; gap: 8rpx; margin-top: 12rpx; padding-left: 0; }
.filter-toggle:active, .filter-submit:active { background: rgba(128, 104, 196, .75); }
@media (max-width: 350px) {
  .chart-scroll-hint { display: block; }
  .header-copy, .trend-subtitle, .day-summary, .section-copy, .memory-summary, .record-summary, .field-value, .filter-error, .date-range, .filter-toggle, .filter-submit, .text-action, .record-count, .day-detail-date, .day-mood, .chart-weekday, .chart-date, .chart-scroll-hint { font-size: 14px; }
  .trend-title, .section-title { font-size: 17px; }
  .field-value { flex-wrap: wrap; }
}
</style>
