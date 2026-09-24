<script setup lang="ts">
withDefaults(defineProps<{ title?: string; subtitle?: string; back?: boolean }>(), { title: '', subtitle: '', back: false })
const emit = defineEmits<{ back: [] }>()
</script>

<template>
  <view class="app-header">
    <view
      v-if="back"
      class="app-header__back"
      role="button"
      aria-label="返回"
      data-testid="app-header-back"
      @click.stop="emit('back')"
    >
      <uni-icons type="left" :size="28" color="#eef0ff" />
    </view>
    <slot />
    <view class="app-header__copy">
      <text v-if="title" class="app-header__title">{{ title }}</text>
      <text v-if="subtitle" class="app-header__subtitle">{{ subtitle }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.app-header {
  position: relative;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  min-height: 82rpx;
  gap: 20rpx;
}
.app-header__back {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 68rpx;
  height: 68rpx;
  margin: 0;
  padding: 0;
  border-radius: 50%;
  background: rgba(19, 31, 68, 0.56);
  line-height: 1;
  cursor: pointer;
}
.app-header__copy { display: flex; flex-direction: column; gap: 4rpx; }
.app-header__title { color: #f9f7ff; font-size: 34rpx; font-weight: 700; }
.app-header__subtitle { color: #b6bdd8; font-size: 24rpx; }
</style>
