<script setup lang="ts">
import { ref } from 'vue'
import HnPrimaryButton from '@/components/HnPrimaryButton.vue'

const current = ref(0)
const slides = [
  { title: '让情绪有处安放', copy: '一个懂你的关系型 AI 空间，陪你倾诉、整理、回顾情绪。' },
  { title: '看见情绪的轨迹', copy: '把那些难以命名的时刻，慢慢整理成更清楚的自己。' },
  { title: '记住重要的片段', copy: '所有记忆都由你掌控，让每一次陪伴更有温度。' },
]

function enter() {
  uni.navigateTo({ url: '/pages/consent/index' })
}
</script>

<template>
  <view class="hn-screen onboarding">
    <image class="onboarding__bg" src="/static/heartnest/onboarding-night.jpg" mode="aspectFill" aria-hidden="true" />
    <view class="onboarding__shade" />
    <view class="onboarding__brand"><uni-icons type="heart-filled" :size="27" color="#ffd2dc" /><view><text>心栖</text><text>HeartNest</text></view></view>
    <swiper class="onboarding__swiper" :current="current" @change="current = $event.detail.current">
      <swiper-item v-for="slide in slides" :key="slide.title">
        <view class="onboarding__copy"><text class="onboarding__title">{{ slide.title }}</text><text class="onboarding__text">{{ slide.copy }}</text></view>
      </swiper-item>
    </swiper>
    <view class="onboarding__footer" data-testid="onboarding-footer">
      <view class="feature-row" aria-label="HeartNest 核心能力">
        <view data-testid="onboarding-feature"><uni-icons type="heart-filled" :size="26" color="#ffb0cc" /><text>温柔陪伴</text></view>
        <view data-testid="onboarding-feature"><uni-icons type="list" :size="26" color="#c6a3ff" /><text>情绪回顾</text></view>
        <view data-testid="onboarding-feature"><uni-icons type="star-filled" :size="26" color="#ffd29d" /><text>长期记忆</text></view>
      </view>
      <view class="onboarding__actions">
        <HnPrimaryButton data-testid="onboarding-primary" label="开始体验" @click="enter" />
        <button data-testid="onboarding-secondary" class="look-first" @click="enter">
          我先看看 <uni-icons type="right" :size="16" color="#c8cee6" />
        </button>
        <view class="dots" role="tablist" aria-label="欢迎页进度">
          <view
            v-for="(_, index) in slides"
            :key="index"
            data-testid="onboarding-dot"
            role="tab"
            :aria-selected="index === current"
            :class="{ active: index === current }"
          />
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.onboarding {
  min-height: 100vh;
  color: #f8f6ff;
}

.onboarding__bg,
.onboarding__shade {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.onboarding__shade {
  background: linear-gradient(180deg, rgba(5, 12, 35, 0.18), rgba(5, 12, 35, 0.1) 38%, rgba(5, 12, 35, 0.82) 70%, #050c20 100%);
}

.onboarding__brand {
  position: absolute;
  z-index: 2;
  top: calc(var(--status-bar-height, 24px) + 30rpx);
  left: 42rpx;
  display: flex;
  align-items: center;
  gap: 15rpx;
}

.onboarding__brand > view {
  display: flex;
  flex-direction: column;
}

.onboarding__brand text:first-child {
  font-size: 34rpx;
  font-weight: 700;
}

.onboarding__brand text:last-child {
  color: #d8dced;
  font-size: 20rpx;
}

.onboarding__swiper {
  position: absolute;
  z-index: 2;
  top: 150rpx;
  right: 0;
  left: 0;
  height: 390rpx;
}

.onboarding__copy {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
  padding: 60rpx 42rpx;
}

.onboarding__title {
  max-width: 640rpx;
  font-family: Georgia, 'Songti SC', serif;
  font-size: 60rpx;
  font-weight: 700;
  line-height: 1.2;
  text-shadow: 0 4rpx 24rpx rgba(6, 12, 35, 0.8);
}

.onboarding__text {
  max-width: 570rpx;
  color: #d3d8ea;
  font-size: 27rpx;
  line-height: 1.7;
}

.onboarding__footer {
  position: absolute;
  z-index: 3;
  right: 28rpx;
  bottom: calc(24rpx + env(safe-area-inset-bottom));
  left: 28rpx;
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.feature-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12rpx;
}

.feature-row > view {
  display: flex;
  min-width: 0;
  min-height: 98rpx;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 14rpx 8rpx;
  border: 1rpx solid rgba(179, 192, 248, 0.22);
  border-radius: 24rpx;
  color: #eef0ff;
  font-size: 22rpx;
  background: rgba(30, 41, 82, 0.66);
  backdrop-filter: blur(20rpx);
}

.onboarding__actions {
  display: flex;
  flex-direction: column;
  padding: 0 14rpx;
}

.look-first {
  display: flex;
  height: 64rpx;
  margin-top: 4rpx;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  color: #c8cee6;
  font-size: 23rpx;
  background: transparent;
}

.dots {
  display: flex;
  height: 18rpx;
  margin-top: 4rpx;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}

.dots view {
  width: 11rpx;
  height: 11rpx;
  border-radius: 50%;
  background: #77809e;
  transition: width 180ms ease, background-color 180ms ease;
}

.dots view.active {
  width: 34rpx;
  border-radius: 999rpx;
  background: #d390f2;
  box-shadow: 0 0 14rpx rgba(211, 144, 242, 0.72);
}

@media (max-height: 700px) {
  .onboarding__swiper {
    top: 132rpx;
    height: 330rpx;
  }

  .onboarding__copy {
    gap: 14rpx;
    padding-top: 48rpx;
  }

  .onboarding__title {
    font-size: 54rpx;
  }

  .onboarding__footer {
    bottom: calc(16rpx + env(safe-area-inset-bottom));
    gap: 12rpx;
  }

  .feature-row > view {
    min-height: 84rpx;
    gap: 5rpx;
    padding: 10rpx 6rpx;
  }

  .look-first {
    height: 58rpx;
  }
}
</style>
