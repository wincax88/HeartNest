<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import ChatBubble from '@/components/ChatBubble.vue'
import HnAppHeader from '@/components/HnAppHeader.vue'
import MemoryPrompt from '@/components/MemoryPrompt.vue'
import type { CompanionId } from '@/domain/models'
import { companionById } from '@/mocks/companions'
import { useChatStore } from '@/stores/chat'

const chatStore = useChatStore()
const draft = ref('')
const companion = computed(() => companionById[chatStore.companionId])

const currentPages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
const currentPage = currentPages[currentPages.length - 1] as { options?: Record<string, string> } | undefined
const routeId = currentPage?.options?.id as CompanionId | undefined
if (routeId && companionById[routeId]) chatStore.companionId = routeId

if (chatStore.messages.length === 0) {
  chatStore.messages.push({
    id: 'welcome-mika', sender: 'companion', content: '我在这里。',
    createdAt: new Date().toISOString(), status: 'sent',
  })
}

async function send() {
  const content = draft.value.trim()
  if (!content || chatStore.isReplying) return
  draft.value = ''
  await chatStore.send(content)
  await nextTick()
}

function goBack() {
  uni.navigateBack()
}
</script>

<template>
  <view class="hn-screen chat-screen">
    <image class="hn-night-bg" src="/static/heartnest/onboarding-night.jpg" mode="aspectFill" />
    <view class="chat-shade" />
    <view class="chat-page">
      <HnAppHeader back :title="companion.name" subtitle="在线 · 正在陪伴" @back="goBack">
        <image class="header-avatar" :src="companion.avatar" mode="aspectFill" />
      </HnAppHeader>

      <scroll-view scroll-y class="message-list">
        <view class="date-divider"><text>今晚</text></view>
        <view class="companion-note">
          <image :src="companion.avatar" mode="aspectFill" />
          <text>{{ companion.name }} 会温柔地听你说，也会尊重你不想继续的话题。</text>
        </view>

        <ChatBubble v-for="message in chatStore.messages" :key="message.id" :message="message" />
        <view v-if="chatStore.isReplying" class="typing-row">
          <view class="typing-dot" /><view class="typing-dot" /><view class="typing-dot" />
          <text>正在回应</text>
        </view>
        <MemoryPrompt :visible="chatStore.messages.length > 2" />
      </scroll-view>

      <view class="composer-wrap">
        <view class="composer">
          <input
            v-model="draft"
            data-testid="chat-input"
            class="composer-input"
            :disabled="chatStore.isReplying"
            placeholder="想说什么都可以…"
            placeholder-class="composer-placeholder"
            confirm-type="send"
            @confirm="send"
          />
          <button
            data-testid="chat-send"
            class="send-button"
            :disabled="chatStore.isReplying || !draft.trim()"
            aria-label="发送"
            @click="send"
          >
            <uni-icons type="paperplane-filled" :size="24" color="#ffffff" />
          </button>
        </view>
        <text class="privacy-note">你的对话只用于本地模拟体验</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.chat-screen { background: #050d20; }
.chat-shade { position: fixed; inset: 0; background: linear-gradient(180deg, rgba(6, 13, 38, 0.62), rgba(5, 13, 32, 0.9) 48%, #050d20 100%); }
.chat-page { position: relative; z-index: 2; display: grid; grid-template-rows: auto 1fr auto; width: 100%; max-width: 786rpx; height: 100vh; margin: 0 auto; padding: calc(var(--status-bar-height, 24px) + 12rpx) 28rpx env(safe-area-inset-bottom); }
.header-avatar { order: -1; width: 68rpx; height: 68rpx; border: 2rpx solid rgba(255, 225, 239, 0.56); border-radius: 50%; }
.message-list { height: 100%; min-height: 0; padding: 8rpx 4rpx 28rpx; }
.date-divider { display: flex; justify-content: center; margin: 20rpx 0; }
.date-divider text { padding: 8rpx 20rpx; border-radius: 22rpx; color: #9ca7c8; font-size: 18rpx; background: rgba(30, 41, 81, 0.5); }
.companion-note { display: flex; align-items: center; gap: 14rpx; margin: 0 auto 26rpx; padding: 16rpx 20rpx; border: 1rpx solid rgba(179, 188, 239, 0.14); border-radius: 24rpx; color: #b8c0dc; font-size: 20rpx; line-height: 1.45; background: rgba(19, 29, 68, 0.5); }
.companion-note image { flex: 0 0 auto; width: 44rpx; height: 44rpx; border-radius: 50%; }
.typing-row { display: flex; align-items: center; gap: 8rpx; width: fit-content; margin: 16rpx 0; padding: 18rpx 24rpx; border-radius: 28rpx 28rpx 28rpx 8rpx; color: #adb6d2; font-size: 20rpx; background: rgba(41, 50, 94, 0.78); }
.typing-dot { width: 8rpx; height: 8rpx; border-radius: 50%; background: #d7b9e7; }
.typing-row text { margin-left: 6rpx; }
.composer-wrap { padding: 18rpx 0 14rpx; border-top: 1rpx solid rgba(174, 187, 242, 0.1); background: linear-gradient(180deg, rgba(5, 13, 32, 0.4), #050d20 28%); }
.composer { display: grid; grid-template-columns: 1fr 80rpx; align-items: center; gap: 12rpx; padding: 10rpx 10rpx 10rpx 28rpx; border: 1rpx solid rgba(192, 201, 244, 0.22); border-radius: 52rpx; background: rgba(33, 43, 83, 0.78); box-shadow: 0 14rpx 42rpx rgba(2, 7, 23, 0.35); }
.composer-input { width: 100%; height: 68rpx; color: #fff; font-size: 26rpx; }
:deep(.composer-placeholder) { color: #8994b7; }
.send-button { display: grid; place-items: center; width: 68rpx; height: 68rpx; padding: 0; border: 0; border-radius: 50%; background: linear-gradient(135deg, #8177ff, #ec91cc); }
.send-button[disabled] { opacity: 0.42; }
.privacy-note { display: block; margin-top: 12rpx; color: #7883a6; font-size: 18rpx; text-align: center; }
</style>
