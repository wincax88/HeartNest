<script setup lang="ts">
defineProps<{ visible?: boolean }>()
</script>

<template>
  <view v-if="visible" class="memory-prompt">
    <view class="memory-prompt__icon"><uni-icons type="heart-filled" :size="18" color="#ffd4e4" /></view>
    <view class="memory-prompt__copy">
      <text class="memory-prompt__title">要帮你记住这一刻吗？</text>
      <text class="memory-prompt__text">之后复盘时，你可以再回来看看此刻的心情。</text>
    </view>
    <text class="memory-prompt__action">记住</text>
  </view>
</template>

<style scoped lang="scss">
.memory-prompt {
  display: grid;
  grid-template-columns: 54rpx 1fr auto;
  align-items: center;
  gap: 16rpx;
  margin: 28rpx 0;
  padding: 20rpx;
  border: 1rpx solid rgba(236, 145, 204, 0.25);
  border-radius: 24rpx;
  background: rgba(45, 48, 91, 0.58);
}
.memory-prompt__icon { display: grid; place-items: center; width: 54rpx; height: 54rpx; border-radius: 18rpx; background: rgba(236, 145, 204, 0.18); }
.memory-prompt__copy { display: flex; flex-direction: column; gap: 5rpx; }
.memory-prompt__title { color: #f8efff; font-size: 23rpx; font-weight: 700; }
.memory-prompt__text { color: #aeb7d4; font-size: 19rpx; line-height: 1.45; }
.memory-prompt__action { color: #ffc1df; font-size: 22rpx; font-weight: 700; }
</style>
