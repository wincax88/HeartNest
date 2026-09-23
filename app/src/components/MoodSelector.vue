<script setup lang="ts">
import type { MoodId, MoodOption } from '@/domain/models'

defineProps<{ items: MoodOption[]; modelValue: MoodId }>()
const emit = defineEmits<{ 'update:modelValue': [moodId: MoodId] }>()
</script>

<template>
  <view class="mood-grid">
    <button
      v-for="item in items"
      :key="item.id"
      :data-testid="`mood-${item.id}`"
      class="mood-item"
      :class="{ 'is-selected': item.id === modelValue }"
      @click="emit('update:modelValue', item.id)"
    >
      <view class="mood-item__icon"><uni-icons :type="item.icon" :size="28" color="#e9ddff" /></view>
      <text>{{ item.title }}</text>
    </button>
  </view>
</template>

<style scoped lang="scss">
.mood-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12rpx; }
.mood-item { min-width: 0; height: 156rpx; padding: 20rpx 8rpx; border: 1rpx solid rgba(186, 196, 245, 0.2); border-radius: 28rpx; color: #f7f4ff; font-size: 24rpx; line-height: 1.25; background: rgba(78, 82, 132, 0.44); }
.mood-item.is-selected { border-color: rgba(255, 183, 206, 0.78); background: rgba(121, 104, 178, 0.58); box-shadow: 0 0 26rpx rgba(232, 139, 211, 0.3); }
.mood-item__icon { display: grid; place-items: center; width: 64rpx; height: 64rpx; margin: 0 auto 10rpx; border-radius: 50%; background: linear-gradient(145deg, #a9c5ff, #a681dc); box-shadow: 0 8rpx 24rpx rgba(91, 99, 198, 0.4); }
</style>
