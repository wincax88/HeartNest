<script setup lang="ts">
withDefaults(defineProps<{ title?: string; subtitle?: string; back?: boolean }>(), { title: '', subtitle: '', back: false })
const emit = defineEmits<{ back: [] }>()
</script>

<template>
  <view class="app-header">
    <button
      v-if="back"
      class="app-header__back"
      type="button"
      :tabindex="0"
      role="button"
      aria-label="返回"
      data-testid="app-header-back"
      @click.stop="emit('back')"
      @keydown.enter.prevent="emit('back')"
      @keydown.space.prevent="emit('back')"
    >
      <uni-icons type="left" :size="28" color="#eef0ff" />
    </button>
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
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin: 0;
  padding: 0;
  border-radius: 50%;
  background: rgba(19, 31, 68, 0.56);
  line-height: 1;
  cursor: pointer;
}
.app-header__back::after { border: 0; }
.app-header__back:active { background: rgba(53, 68, 107, .8); }
.app-header__copy { display: flex; flex-direction: column; gap: 4rpx; min-width: 0; }
.app-header__title { color: #f9f7ff; font-size: 34rpx; font-weight: 700; }
.app-header__subtitle { color: #b6bdd8; font-size: 24rpx; }
</style>
