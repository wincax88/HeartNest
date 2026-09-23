<template>
  <view class="glass-card"><slot /></view>
</template>

<style scoped lang="scss">
.glass-card {
  border: 1rpx solid rgba(181, 194, 255, 0.26);
  border-radius: 32rpx;
  background: linear-gradient(145deg, rgba(50, 58, 111, 0.8), rgba(24, 34, 75, 0.72));
  box-shadow: 0 24rpx 70rpx rgba(1, 6, 24, 0.38), inset 0 1rpx 0 rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(26rpx);
}
</style>
