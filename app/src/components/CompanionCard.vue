<script setup lang="ts">
import type { Companion } from '@/domain/models'

defineProps<{ companion: Companion; featured?: boolean }>()
const emit = defineEmits<{ select: [] }>()
</script>

<template>
  <button class="companion-card" :class="{ 'is-featured': featured }" @click="emit('select')">
    <image class="companion-card__image" :src="companion.cardImage" mode="aspectFill" />
    <view class="companion-card__shade" />
    <view v-if="featured" class="companion-card__badge"><uni-icons type="star-filled" :size="14" color="#5d3c62" /> 为你推荐</view>
    <view class="companion-card__copy">
      <view class="companion-card__name"><text>{{ companion.name }}</text><text>{{ companion.chineseName }}</text></view>
      <text class="companion-card__tagline">「{{ companion.tagline }}」</text>
      <view class="companion-card__traits"><text v-for="trait in companion.traits.slice(0, 2)" :key="trait">{{ trait }}</text></view>
    </view>
  </button>
</template>

<style scoped lang="scss">
.companion-card { position: relative; min-width: 260rpx; height: 360rpx; padding: 0; overflow: hidden; border: 1rpx solid rgba(176, 190, 255, 0.28); border-radius: 30rpx; color: #fff; text-align: left; background: #111d42; box-shadow: 0 18rpx 44rpx rgba(1, 6, 22, 0.38); }
.companion-card.is-featured { border: 3rpx solid #ff9abf; box-shadow: 0 0 32rpx rgba(240, 127, 185, 0.46); }
.companion-card__image, .companion-card__shade { position: absolute; inset: 0; width: 100%; height: 100%; }
.companion-card__shade { background: linear-gradient(180deg, transparent 32%, rgba(5, 10, 31, 0.9) 90%); }
.companion-card__badge { position: absolute; top: 0; left: 0; display: flex; align-items: center; gap: 5rpx; padding: 9rpx 14rpx; border-radius: 0 0 18rpx 0; color: #5d3c62; font-size: 20rpx; background: #ffd2a7; }
.companion-card__copy { position: absolute; right: 18rpx; bottom: 18rpx; left: 18rpx; display: flex; flex-direction: column; gap: 8rpx; }
.companion-card__name { display: flex; align-items: baseline; gap: 10rpx; font-size: 21rpx; }
.companion-card__name text:first-child { font-family: Georgia, serif; font-size: 33rpx; font-weight: 700; }
.companion-card__tagline { font-size: 21rpx; color: #e6e5f7; }
.companion-card__traits { display: flex; gap: 8rpx; }
.companion-card__traits text { padding: 5rpx 10rpx; border-radius: 99rpx; color: #cfd4ee; font-size: 18rpx; background: rgba(105, 111, 164, 0.4); }
</style>
