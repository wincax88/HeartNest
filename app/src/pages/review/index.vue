<script setup lang="ts">
import HnBottomNav from '@/components/HnBottomNav.vue'
import HnGlassCard from '@/components/HnGlassCard.vue'
import { useReviewStore } from '@/stores/review'

const reviewStore = useReviewStore()
const heights = [32, 22, 46, 36, 62, 76, 92]

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
    <scroll-view scroll-y class="review-scroll">
      <view class="hn-page review-page">
        <view class="review-header">
          <view><text class="eyebrow">WEEKLY REVIEW</text><text class="title">情绪回顾</text></view>
          <view class="calendar-chip"><uni-icons type="calendar" :size="20" color="#e5d4ff" /><text>11.10 — 11.16</text></view>
        </view>

        <HnGlassCard class="trend-card">
          <view class="trend-copy"><text>这一周，你在慢慢恢复</text><text>情绪低点之后，平静的时刻正在变多。</text></view>
          <view class="chart">
            <view v-for="(day, index) in reviewStore.reviewDays" :key="day.date" data-testid="review-day" class="chart-day">
              <view class="chart-track"><view class="chart-bar" :style="{ height: `${heights[index]}%` }"><view class="chart-dot" /></view></view>
              <text class="chart-weekday">{{ day.weekday.slice(1) }}</text>
            </view>
          </view>
          <view class="trend-footer"><uni-icons type="heart-filled" :size="18" color="#ffb6d7" /><text>比上周多了 3 个轻松时刻</text></view>
        </HnGlassCard>

        <view class="hn-section-title">被记住的片段</view>
        <view class="memory-list">
          <HnGlassCard v-for="(memory, index) in reviewStore.memories" :key="memory.id" data-testid="memory-item" class="memory-card">
            <view class="memory-icon" :class="`memory-icon--${index}`"><uni-icons :type="index === 1 ? 'cloud-filled' : 'heart-filled'" :size="23" color="#fff" /></view>
            <view class="memory-copy"><text>{{ memory.title }}</text><text>{{ memory.summary }}</text></view>
            <text class="memory-date">{{ memory.createdAt.slice(5, 10).replace('-', '.') }}</text>
          </HnGlassCard>
        </view>

        <HnGlassCard class="insight-card">
          <text class="insight-kicker">心栖发现</text>
          <text class="insight-title">夜晚，是你更需要被陪伴的时候</text>
          <text class="insight-copy">本周 68% 的对话发生在 22:00 之后。留一点缓冲给睡前的自己，也许会更舒服。</text>
        </HnGlassCard>
      </view>
    </scroll-view>
    <HnBottomNav active="review" @navigate="navigate" />
  </view>
</template>

<style scoped lang="scss">
.review-scroll { height: 100vh; }
.review-page { padding-bottom: calc(210rpx + env(safe-area-inset-bottom)); }
.review-header { display: flex; align-items: flex-end; justify-content: space-between; margin: 18rpx 0 38rpx; }
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
