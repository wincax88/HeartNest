<script setup lang="ts">
withDefaults(defineProps<{
  state: 'loading' | 'error' | 'offline' | 'empty'
  title: string
  description?: string
  actionLabel?: string
}>(), { description: '', actionLabel: '' })

defineEmits<{ action: [] }>()
</script>

<template>
  <view class="async-state" role="status" :aria-live="state === 'error' ? 'assertive' : 'polite'" :data-state="state">
    <view v-if="state === 'loading'" class="async-state__skeleton" aria-hidden="true" />
    <text class="async-state__title">{{ title }}</text>
    <text v-if="description" class="async-state__description">{{ description }}</text>
    <button v-if="actionLabel" class="async-state__action" type="button" role="button" tabindex="0" :aria-label="actionLabel" @click="$emit('action')" @keydown.enter.prevent="$emit('action')" @keydown.space.prevent="$emit('action')"><text>{{ actionLabel }}</text></button>
  </view>
</template>

<style scoped lang="scss">
.async-state { display: flex; flex-direction: column; align-items: center; gap: 12rpx; margin: 24rpx 0; padding: 28rpx; border: 1rpx solid rgba(192, 201, 244, .2); border-radius: 24rpx; text-align: center; background: rgba(28, 38, 78, .7); }
.async-state__skeleton { width: 65%; height: 18rpx; border-radius: 99rpx; background: rgba(214, 220, 248, .22); animation: hn-pulse 1.2s ease-in-out infinite; }
.async-state__title { color: #f4f1ff; font-size: 30rpx; font-weight: 700; line-height: 1.5; }
.async-state__description { color: #bdc5e0; font-size: 28rpx; line-height: 1.65; }
.async-state__action { display: flex; align-items: center; justify-content: center; min-width: 44px; min-height: 44px; margin: 12rpx 0 0; padding: 20rpx 36rpx; border: 1rpx solid #d8b3ff; border-radius: 24rpx; color: #f8f6ff; font-size: 28rpx; font-weight: 600; line-height: 1.4; background: rgba(128, 104, 196, .55); }
.async-state__action:active { background: rgba(128, 104, 196, .8); }
@keyframes hn-pulse { 50% { opacity: .45; } }
@media (max-width: 350px) {
  .async-state__title { font-size: 16px; }
  .async-state__description, .async-state__action { font-size: 14px; }
}
</style>
