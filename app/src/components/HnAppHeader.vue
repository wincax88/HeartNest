<script setup lang="ts">
withDefaults(defineProps<{ title?: string; subtitle?: string; back?: boolean }>(), { title: '', subtitle: '', back: false })
const emit = defineEmits<{ back: [] }>()
</script>

<template>
  <view class="app-header">
    <button v-if="back" class="app-header__back" aria-label="返回" @click="emit('back')">
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
.app-header { display: flex; align-items: center; min-height: 82rpx; gap: 20rpx; }
.app-header__back { display: grid; place-items: center; width: 68rpx; height: 68rpx; padding: 0; border: 0; border-radius: 50%; background: rgba(19, 31, 68, 0.56); }
.app-header__copy { display: flex; flex-direction: column; gap: 4rpx; }
.app-header__title { color: #f9f7ff; font-size: 34rpx; font-weight: 700; }
.app-header__subtitle { color: #b6bdd8; font-size: 24rpx; }
</style>
