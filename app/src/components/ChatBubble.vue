<script setup lang="ts">
import type { ChatMessage } from '@/domain/models'

defineProps<{ message: ChatMessage }>()
defineEmits<{ retry: [] }>()
</script>

<template>
  <view
    data-testid="chat-message"
    class="chat-row"
    :class="{ 'chat-row--user': message.sender === 'user' }"
  >
    <view class="chat-bubble" :class="`chat-bubble--${message.sender}`">
      <text>{{ message.content }}</text>
      <text v-if="message.status === 'sending'" class="message-status">发送中…</text>
      <text v-else-if="message.status === 'failed'" class="message-status message-status--failed" @click="$emit('retry')">发送失败，点击重试</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.chat-row { display: flex; justify-content: flex-start; margin: 18rpx 0; }
.chat-row--user { justify-content: flex-end; }
.chat-bubble {
  max-width: 78%;
  padding: 22rpx 26rpx;
  border: 1rpx solid rgba(205, 213, 255, 0.16);
  border-radius: 30rpx 30rpx 30rpx 8rpx;
  color: #f9f7ff;
  font-size: 28rpx;
  line-height: 1.65;
  box-shadow: 0 12rpx 36rpx rgba(3, 8, 27, 0.22);
}
.chat-bubble--companion { background: rgba(41, 50, 94, 0.82); backdrop-filter: blur(18rpx); }
.chat-bubble--user {
  border-color: rgba(255, 220, 229, 0.2);
  border-radius: 30rpx 30rpx 8rpx 30rpx;
  background: linear-gradient(135deg, rgba(129, 119, 255, 0.92), rgba(219, 126, 192, 0.9));
}
.message-status { display: block; margin-top: 6rpx; color: rgba(255, 255, 255, 0.72); font-size: 18rpx; }
.message-status--failed { color: #ffd0d8; cursor: pointer; }
</style>
