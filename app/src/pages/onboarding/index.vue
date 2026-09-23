<script setup lang="ts">
import { ref } from 'vue'
import HnPrimaryButton from '@/components/HnPrimaryButton.vue'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
const current = ref(0)
const slides = [
  { title: '让情绪有处安放', copy: '一个懂你的关系型 AI 空间，陪你倾诉、整理、回顾情绪。' },
  { title: '看见情绪的轨迹', copy: '把那些难以命名的时刻，慢慢整理成更清楚的自己。' },
  { title: '记住重要的片段', copy: '所有记忆都由你掌控，让每一次陪伴更有温度。' },
]

function enter() {
  appStore.completeOnboarding()
  uni.reLaunch({ url: '/pages/home/index' })
}
</script>

<template>
  <view class="hn-screen onboarding">
    <image class="onboarding__bg" src="/static/heartnest/onboarding-night.jpg" mode="aspectFill" />
    <view class="onboarding__shade" />
    <view class="onboarding__brand"><uni-icons type="heart-filled" :size="27" color="#ffd2dc" /><view><text>心栖</text><text>HeartNest</text></view></view>
    <swiper class="onboarding__swiper" :current="current" @change="current = $event.detail.current">
      <swiper-item v-for="slide in slides" :key="slide.title">
        <view class="onboarding__copy"><text class="onboarding__title">{{ slide.title }}</text><text class="onboarding__text">{{ slide.copy }}</text></view>
      </swiper-item>
    </swiper>
    <view class="feature-row">
      <view><uni-icons type="heart-filled" :size="28" color="#ffb0cc" /><text>温柔陪伴</text></view>
      <view><uni-icons type="list" :size="28" color="#c6a3ff" /><text>情绪回顾</text></view>
      <view><uni-icons type="star-filled" :size="28" color="#ffd29d" /><text>长期记忆</text></view>
    </view>
    <view class="onboarding__actions">
      <HnPrimaryButton label="开始体验" @click="enter" />
      <button class="look-first" @click="enter">我先看看 <uni-icons type="right" :size="17" color="#c8cee6" /></button>
      <view class="dots"><view v-for="(_, index) in slides" :key="index" :class="{ active: index === current }" /></view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.onboarding { min-height: 100vh; color: #f8f6ff; }
.onboarding__bg, .onboarding__shade { position: absolute; inset: 0; width: 100%; height: 100%; }
.onboarding__shade { background: linear-gradient(180deg, rgba(5, 12, 35, 0.2), rgba(5, 12, 35, 0.12) 40%, rgba(5, 12, 35, 0.92) 76%, #050c20); }
.onboarding__brand { position: absolute; z-index: 2; top: calc(var(--status-bar-height, 24px) + 30rpx); left: 42rpx; display: flex; align-items: center; gap: 15rpx; }
.onboarding__brand > view { display: flex; flex-direction: column; }
.onboarding__brand text:first-child { font-size: 34rpx; font-weight: 700; }
.onboarding__brand text:last-child { color: #d8dced; font-size: 20rpx; }
.onboarding__swiper { position: absolute; z-index: 2; top: 150rpx; right: 0; left: 0; height: 390rpx; }
.onboarding__copy { display: flex; flex-direction: column; gap: 20rpx; padding: 60rpx 42rpx; }
.onboarding__title { max-width: 640rpx; font-family: Georgia, 'Songti SC', serif; font-size: 62rpx; font-weight: 700; line-height: 1.2; text-shadow: 0 4rpx 24rpx rgba(6, 12, 35, 0.8); }
.onboarding__text { max-width: 570rpx; color: #d3d8ea; font-size: 27rpx; line-height: 1.75; }
.feature-row { position: absolute; z-index: 3; right: 28rpx; bottom: 290rpx; left: 28rpx; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12rpx; }
.feature-row > view { display: flex; flex-direction: column; align-items: center; gap: 13rpx; padding: 24rpx 8rpx; border: 1rpx solid rgba(179, 192, 248, 0.24); border-radius: 28rpx; font-size: 22rpx; background: rgba(36, 46, 91, 0.7); backdrop-filter: blur(24rpx); }
.onboarding__actions { position: absolute; z-index: 3; right: 42rpx; bottom: calc(30rpx + env(safe-area-inset-bottom)); left: 42rpx; }
.look-first { display: flex; align-items: center; justify-content: center; height: 70rpx; color: #c8cee6; font-size: 23rpx; background: transparent; }
.dots { display: flex; justify-content: center; gap: 16rpx; margin-top: 6rpx; }
.dots view { width: 13rpx; height: 13rpx; border-radius: 50%; background: #77809e; }
.dots view.active { background: #d390f2; box-shadow: 0 0 15rpx #d390f2; }
</style>
