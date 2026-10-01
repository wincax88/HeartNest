<script setup lang="ts">
import { computed } from 'vue'
import type { ChatMessage } from '@/domain/models'

const props = defineProps<{ message: ChatMessage; favorite?: boolean; favoriteBusy?: boolean; disabled?: boolean; retryDisabled?: boolean }>()
defineEmits<{ retry: []; favorite: [] }>()
const time = computed(() => {
  const date = new Date(props.message.createdAt)
  return Number.isNaN(date.getTime()) ? '' : `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
})
</script>

<template>
  <view data-testid="chat-message" class="chat-row" :class="{ 'chat-row--user': message.sender === 'user' }">
    <view class="message-content">
      <view class="chat-bubble" :class="`chat-bubble--${message.sender}`">
        <text class="message-text" selectable>{{ message.content }}</text>
      </view>
      <view class="message-meta">
        <text v-if="time" class="message-time">{{ time }}</text>
        <text v-if="message.status === 'sending'" class="message-status" role="status">发送中…</text>
        <button v-else-if="message.status === 'failed'" data-testid="retry-message" class="message-action message-action--failed" type="button" role="button" :tabindex="retryDisabled || disabled ? -1 : 0" :disabled="retryDisabled || disabled" :aria-disabled="retryDisabled || disabled" aria-label="重新发送这条消息" @click="$emit('retry')" @keydown.enter.prevent="$emit('retry')" @keydown.space.prevent="$emit('retry')">发送失败 · 重试</button>
        <button v-else-if="message.status === 'sent'" class="message-action favorite-action" type="button" role="button" :tabindex="favoriteBusy || disabled ? -1 : 0" :class="{ 'is-favorite': favorite }" :disabled="favoriteBusy || disabled" :aria-disabled="favoriteBusy || disabled" :aria-pressed="Boolean(favorite)" :aria-label="favorite ? '取消收藏这条消息' : '收藏这条消息'" @click="$emit('favorite')" @keydown.enter.prevent="$emit('favorite')" @keydown.space.prevent="$emit('favorite')">
          <text aria-hidden="true">{{ favorite ? '★' : '☆' }}</text><text>{{ favoriteBusy ? '处理中…' : (favorite ? '已收藏' : '收藏') }}</text>
        </button>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as *;
.chat-row { display: flex; justify-content: flex-start; margin: 20px 0; }
.chat-row--user { justify-content: flex-end; }
.message-content { min-width: 0; max-width: 88%; }
.chat-bubble { padding: 15px 18px; border: 1px solid rgba(192, 203, 231, .16); border-radius: 20px 20px 20px 6px; color: $hn-text; background: #202c48; }
.message-text { display: block; font-size: 16px; font-weight: 400; line-height: 1.8; white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; }
.chat-bubble--user { border-color: rgba(246, 220, 238, .18); border-radius: 20px 20px 6px 20px; background: #635176; color: #fff3fa; }
.message-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 8px; min-height: 44px; padding: 0 3px; color: #bdc7df; font-size: 14px; }
.chat-row--user .message-meta { justify-content: flex-end; }
.message-action { display: flex; align-items: center; justify-content: center; gap: 5px; min-width: 64px; min-height: 44px; margin: 0; padding: 0 8px; border: 0; border-radius: 10px; color: #bdc7df; font-size: 14px; font-weight: 400; line-height: 1.4; background: transparent; }
.message-action::after { border: 0; }
.message-action.is-favorite { color: #f1c2dd; }
.message-action--failed { color: #ffc3d0; }
.message-action[disabled] { opacity: .65; }
.message-action:active { background: rgba(193, 202, 236, .1); }
.message-action:focus-visible { outline: 2px solid $hn-focus; outline-offset: 1px; }
@media (max-width: 350px) { .message-content { max-width: 94%; } .chat-bubble { padding: 14px 16px; } }
</style>
