<script setup lang="ts">
import HnAction from './HnAction.vue'

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
    <HnAction v-if="actionLabel" class="async-state__action" :label="actionLabel" @activate="$emit('action')">{{ actionLabel }}</HnAction>
  </view>
</template>

<style scoped lang="scss">
.async-state { display: flex; flex-direction: column; align-items: center; gap: 12rpx; margin: 24rpx 0; padding: 28rpx; border: 1rpx solid rgba(192, 201, 244, .2); border-radius: 24rpx; text-align: center; background: rgba(28, 38, 78, .7); }
.async-state__skeleton { width: 65%; height: 18rpx; border-radius: 99rpx; background: rgba(214, 220, 248, .22); animation: hn-pulse 1.2s ease-in-out infinite; }
.async-state__title { color: #f4f1ff; font-size: 25rpx; font-weight: 700; }
.async-state__description { color: #aeb7d2; font-size: 21rpx; line-height: 1.55; }
.async-state__action { padding: 0 32rpx; border: 1rpx solid #d8b3ff; border-radius: 24rpx; color: #fff; background: rgba(128, 104, 196, .55); }
@keyframes hn-pulse { 50% { opacity: .45; } }
</style>
