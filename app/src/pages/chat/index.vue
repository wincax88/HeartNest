<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import ChatBubble from '@/components/ChatBubble.vue'
import HnAppHeader from '@/components/HnAppHeader.vue'
import MemoryPrompt from '@/components/MemoryPrompt.vue'
import HnAsyncState from '@/components/HnAsyncState.vue'
// #ifdef H5
import HnChatWebInput from '@/components/HnChatWebInput.vue'
// #endif
import { useNetworkState } from '@/composables/useNetworkState'
import type { ChatMessage, CompanionId } from '@/domain/models'
import { useAppStore } from '@/stores/app'
import { useBootstrapStore } from '@/stores/bootstrap'
import { useChatStore } from '@/stores/chat'
import { useProfileStore } from '@/stores/profile'

const chatStore = useChatStore()
const appStore = useAppStore()
const bootstrapStore = useBootstrapStore()
const profileStore = useProfileStore()
const draft = ref('')
const loadError = ref('')
const savingMemory = ref(false)
const favoritePending = ref<string[]>([])
const scrollTarget = ref('')
const atBottom = ref(true)
const viewportHeight = ref(0)
const keyboardOffset = ref(0)
const keyboardVisible = ref(false)
const browserHeight = ref(0)
const { online } = useNetworkState()
const companion = computed(() => bootstrapStore.companionById[chatStore.companionId])
const latestUserMessage = computed(() => [...chatStore.messages].reverse().find(message => message.sender === 'user' && message.status === 'sent'))
const canSend = computed(() => chatStore.loaded && !loadError.value && online.value && !chatStore.isReplying && Boolean(draft.value.trim()))
const statusText = computed(() => !online.value ? '离线 · 可以查看历史' : (chatStore.isReplying ? '正在回应…' : 'AI 陪伴 · 慢慢说就好'))
const screenStyle = computed(() => browserHeight.value ? { height: `${browserHeight.value}px` } : (keyboardOffset.value ? { height: `calc(100vh - ${keyboardOffset.value}px)` } : {}))
const pageStyle: { paddingTop?: string } = {}
let adjustPosition = true
// #ifdef MP-WEIXIN
const capsule = uni.getMenuButtonBoundingClientRect?.()
if (capsule?.bottom > 0) pageStyle.paddingTop = `${capsule.bottom + 12}px`
adjustPosition = false
// #endif

function dayKey(date: Date) { return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` }
function dateLabel(date: Date) {
  const today = new Date()
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  if (dayKey(date) === dayKey(today)) return '今天'
  if (dayKey(date) === dayKey(yesterday)) return '昨天'
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}
const timeline = computed(() => {
  let previous = ''
  return chatStore.messages.map(message => {
    const date = new Date(message.createdAt)
    const key = Number.isNaN(date.getTime()) ? 'unknown' : dayKey(date)
    const divider = key !== previous ? (key === 'unknown' ? '这段对话' : dateLabel(date)) : ''
    previous = key
    return { message, divider }
  })
})
const starters = ['今天有点累', '脑子里有点乱', '想分享一件小事']
const routeId = ref<CompanionId>()
onLoad(options => { routeId.value = options?.id as CompanionId | undefined })

async function loadConversation() {
  loadError.value = ''
  try {
    await bootstrapStore.initialize()
    const requestedId = routeId.value ?? appStore.selectedCompanionId
    const id = bootstrapStore.companionById[requestedId] ? requestedId : appStore.selectedCompanionId
    if (id !== appStore.selectedCompanionId) await appStore.selectCompanion(id)
    chatStore.moodId = appStore.selectedMoodId
    await chatStore.load(id)
    await scrollToLatest(true)
  } catch (error) { loadError.value = error instanceof Error ? error.message : '对话加载失败' }
}

function measureViewport() {
  uni.createSelectorQuery?.().select('#chat-message-list').boundingClientRect(result => {
    if (result && !Array.isArray(result)) viewportHeight.value = result.height || 0
  }).exec()
}
let scrollVersion = 0
async function scrollToLatest(force = false) {
  if (!force && !atBottom.value) return
  const version = ++scrollVersion
  atBottom.value = true
  scrollTarget.value = ''
  await nextTick()
  if (version !== scrollVersion) return
  measureViewport()
  scrollTarget.value = 'chat-latest'
}
function handleScroll(event: { detail: { scrollTop: number; scrollHeight: number } }) {
  if (!viewportHeight.value) return
  atBottom.value = event.detail.scrollHeight - event.detail.scrollTop - viewportHeight.value < 72
}
function handleKeyboard(event: { detail: { height: number } }) {
  const height = Math.max(0, event.detail.height || 0)
  keyboardVisible.value = height > 0
  // #ifdef MP-WEIXIN
  keyboardOffset.value = height
  // #endif
  void scrollToLatest()
}
let browserViewport: VisualViewport | undefined
function updateBrowserViewport() {
  if (!browserViewport) return
  browserHeight.value = browserViewport.height
  keyboardVisible.value = window.innerHeight - browserViewport.height > 120
  void scrollToLatest()
}
onMounted(() => {
  void loadConversation()
  // #ifdef H5
  if (typeof window !== 'undefined' && window.visualViewport) {
    browserViewport = window.visualViewport
    browserViewport.addEventListener('resize', updateBrowserViewport)
    updateBrowserViewport()
  }
  // #endif
})
onBeforeUnmount(() => { scrollVersion++; browserViewport?.removeEventListener('resize', updateBrowserViewport) })
watch(() => [chatStore.loaded, chatStore.messages.length, chatStore.messages.at(-1)?.id, chatStore.messages.at(-1)?.status, chatStore.isReplying], () => { void scrollToLatest() }, { flush: 'post' })

function showError(error: unknown) { uni.showToast({ title: error instanceof Error ? error.message : '操作失败', icon: 'none' }) }
async function send() {
  if (!canSend.value) return
  const content = draft.value.trim()
  draft.value = ''
  void scrollToLatest(true)
  try { await chatStore.send(content) }
  catch (error) { if (!draft.value) draft.value = content; showError(error) }
}
async function retry(message: ChatMessage) {
  if (!online.value || chatStore.isReplying) return
  void scrollToLatest(true)
  try { await chatStore.retry(message); if (draft.value === message.content) draft.value = '' }
  catch (error) { showError(error) }
}
async function toggleFavorite(message: ChatMessage) {
  if (!online.value || favoritePending.value.includes(message.id)) return
  favoritePending.value.push(message.id)
  try { await chatStore.toggleFavorite(message) }
  catch (error) { showError(error) }
  finally { favoritePending.value = favoritePending.value.filter(id => id !== message.id) }
}
async function saveMemory() {
  if (!online.value || !latestUserMessage.value || latestUserMessage.value.memoryId || savingMemory.value) return
  savingMemory.value = true
  try { await chatStore.saveLatestMemory(); uni.showToast({ title: '已记住，可以在回顾里查看', icon: 'success' }) }
  catch (error) { showError(error) }
  finally { savingMemory.value = false }
}
function goBack() {
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  if (pages.length > 1) { uni.navigateBack(); return }
  uni.reLaunch({ url: '/pages/home/index' })
}
</script>

<template>
  <view v-if="companion" class="hn-screen chat-screen" :style="screenStyle" :class="{ 'chat-screen--keyboard': keyboardVisible }">
    <image class="hn-night-bg" src="/static/heartnest/onboarding-night.jpg" mode="aspectFill" aria-hidden="true" />
    <view class="chat-shade" aria-hidden="true" />
    <view class="chat-page" :style="pageStyle">
      <view class="chat-header">
        <HnAppHeader back :title="companion.name" :subtitle="statusText" @back="goBack">
          <image class="header-avatar" :src="companion.avatar" mode="aspectFill" aria-hidden="true" />
        </HnAppHeader>
      </view>
      <view v-if="!online && chatStore.loaded" class="offline-note" role="status">当前离线，历史对话仍可查看。</view>
      <view class="message-region">
        <scroll-view id="chat-message-list" scroll-y class="message-list" :scroll-into-view="scrollTarget" :scroll-with-animation="false" :show-scrollbar="false" role="log" aria-label="对话记录" @scroll="handleScroll">
          <view class="message-inner">
            <HnAsyncState v-if="loadError" state="error" title="对话暂时没能加载" :description="loadError" :action-label="online ? '重新加载' : ''" @action="loadConversation" />
            <HnAsyncState v-else-if="!chatStore.loaded" :state="online ? 'loading' : 'offline'" :title="online ? '正在载入对话…' : '联网后再开始聊天'" />
            <template v-else>
              <view class="companion-note"><text>{{ companion.name }} 会认真听你说，你可以随时换个话题。</text></view>
              <view v-if="!chatStore.messages.length" data-testid="chat-empty" class="chat-empty">
                <text class="chat-empty__title">不用想好开场白</text>
                <text class="chat-empty__copy">说说今天的小事，或只是此刻的心情。<br />从一句话开始就好。</text>
                <view class="starter-list"><button v-for="starter in starters" :key="starter" class="starter-button" type="button" role="button" :tabindex="!online ? -1 : 0" :disabled="!online" @click="draft = starter" @keydown.enter.prevent="draft = starter" @keydown.space.prevent="draft = starter">{{ starter }}</button></view>
              </view>
              <view v-for="item in timeline" :key="item.message.id" class="timeline-item">
                <view v-if="item.divider" class="date-divider"><text>{{ item.divider }}</text></view>
                <ChatBubble :message="item.message" :favorite="Boolean(chatStore.favoriteByMessage[item.message.id])" :favorite-busy="favoritePending.includes(item.message.id)" :disabled="!online" :retry-disabled="chatStore.isReplying" @retry="retry(item.message)" @favorite="toggleFavorite(item.message)" />
              </view>
              <view v-if="chatStore.isReplying" class="typing-row" role="status" aria-live="polite"><view class="typing-dots" aria-hidden="true"><view /><view /><view /></view><text>正在回应，慢慢来</text></view>
              <MemoryPrompt :visible="profileStore.preferences.memoryPromptsEnabled && Boolean(latestUserMessage)" :saved="Boolean(latestUserMessage?.memoryId)" :saving="savingMemory" :disabled="!online" :excerpt="latestUserMessage?.content" @save="saveMemory" />
            </template>
            <view id="chat-latest" class="scroll-anchor" aria-hidden="true" />
          </view>
        </scroll-view>
        <button v-if="!atBottom && chatStore.messages.length" data-testid="latest-messages" class="latest-button" type="button" role="button" :tabindex="0" @click="scrollToLatest(true)" @keydown.enter.prevent="scrollToLatest(true)" @keydown.space.prevent="scrollToLatest(true)">回到最新 ↓</button>
      </view>
      <view class="composer-wrap">
        <view class="composer" :class="{ 'composer--offline': !online }">
          <!-- #ifdef H5 -->
          <HnChatWebInput v-model="draft" data-testid="chat-input" class="composer-input" :disabled="!chatStore.loaded || Boolean(loadError) || !online" :maxlength="2000" :placeholder="!online ? '联网后就能继续聊' : '想说什么，都可以…'" @confirm="send" />
          <!-- #endif -->
          <!-- #ifndef H5 -->
          <textarea v-model="draft" data-testid="chat-input" class="composer-input" aria-label="输入聊天消息" :disabled="!chatStore.loaded || Boolean(loadError) || !online" :maxlength="2000" auto-height :adjust-position="adjustPosition" :cursor-spacing="12" :show-confirm-bar="false" :fixed="true" :placeholder="!online ? '联网后就能继续聊' : '想说什么，都可以…'" placeholder-class="composer-placeholder" confirm-type="send" @confirm="send" @keyboardheightchange="handleKeyboard" />
          <!-- #endif -->
          <button data-testid="chat-send" class="send-button" type="button" role="button" :tabindex="canSend ? 0 : -1" :disabled="!canSend" :aria-disabled="!canSend" aria-label="发送消息" @click="send" @keydown.enter.prevent="send" @keydown.space.prevent="send"><view class="send-icon"><uni-icons type="paperplane-filled" :size="23" :color="canSend ? '#292139' : '#c2cadd'" /></view></button>
        </view>
        <text v-if="!keyboardVisible" class="composer-note">{{ chatStore.isReplying ? '正在回应，你可以先写下一句话。' : '你可以慢慢说，也可以随时停下来。' }}</text>
      </view>
    </view>
  </view>
  <view v-else class="hn-screen chat-screen chat-fallback"><HnAsyncState :state="loadError ? 'error' : (!online ? 'offline' : 'loading')" :title="loadError || (!online ? '当前处于离线状态' : '正在载入对话…')" :action-label="loadError && online ? '重新加载' : ''" @action="loadConversation" /></view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as *;
.chat-screen { height: 100vh; height: 100dvh; min-height: 0; background: #081126; font-family: 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif; font-weight: 400; }
.chat-fallback { display: flex; align-items: center; justify-content: center; padding: 24px; }
.chat-shade { position: fixed; inset: 0; pointer-events: none; background: linear-gradient(180deg, rgba(8, 17, 38, .66), rgba(8, 17, 38, .88) 42%, #081126 100%); }
.chat-page { position: relative; z-index: 2; display: flex; flex-direction: column; width: 100%; max-width: 720px; height: 100%; min-height: 0; margin: 0 auto; padding: calc(var(--status-bar-height, 24px) + 16px) 20px calc(12px + env(safe-area-inset-bottom)); }
.chat-header { flex: 0 0 auto; padding: 0 0 14px; }
.header-avatar { flex: 0 0 auto; width: 44px; height: 44px; border: 1px solid rgba(233, 183, 214, .48); border-radius: 50%; }
.chat-header :deep(.app-header) { gap: 12px; }
.chat-header :deep(.app-header__title) { overflow: hidden; color: $hn-text; font-size: 20px; font-weight: 600; line-height: 1.4; text-overflow: ellipsis; white-space: nowrap; }
.chat-header :deep(.app-header__subtitle) { overflow: hidden; color: #bdc7df; font-size: 14px; line-height: 1.6; text-overflow: ellipsis; white-space: nowrap; }
.offline-note { flex: 0 0 auto; margin-bottom: 10px; padding: 10px 12px; border-radius: 10px; background: #26334b; color: #eddfec; font-size: 14px; line-height: 1.6; }
.message-region { position: relative; flex: 1; min-height: 0; overflow: hidden; }
.message-list { width: 100%; height: 100%; }
.message-inner { padding: 8px 2px 0; }
.companion-note { margin-bottom: 14px; color: #bdc7df; font-size: 14px; line-height: 1.7; }
.date-divider { display: flex; align-items: center; justify-content: center; gap: 12px; margin: 18px 0 20px; color: #bdc7df; font-size: 14px; line-height: 1.5; }
.date-divider::before, .date-divider::after { content: ''; width: 28px; height: 1px; background: rgba(186, 200, 227, .22); }
.chat-empty { padding: 52px 8px 24px; }
.chat-empty__title { display: block; color: #f3dfeb; font-size: 22px; font-weight: 500; line-height: 1.5; }
.chat-empty__copy { display: block; margin-top: 14px; color: #c5cde2; font-size: 16px; line-height: 1.9; }
.starter-list { display: flex; flex-direction: column; align-items: flex-start; gap: 12px; margin-top: 28px; }
.starter-button { display: flex; align-items: center; min-height: 44px; margin: 0; padding: 10px 16px; border: 1px solid rgba(186, 200, 227, .25); border-radius: 14px; color: #e5d2e4; font-size: 14px; line-height: 1.5; background: rgba(33, 44, 72, .6); }
.typing-row { display: flex; align-items: center; gap: 12px; margin: 0 0 24px; color: #c5cde2; font-size: 14px; line-height: 1.6; }
.typing-dots { display: flex; align-items: center; gap: 5px; }
.typing-dots view { width: 5px; height: 5px; border-radius: 50%; background: #d5b7da; animation: listening 1.3s ease-in-out infinite; }
.typing-dots view:nth-child(2) { animation-delay: .18s; }
.typing-dots view:nth-child(3) { animation-delay: .36s; }
@keyframes listening { 50% { opacity: .35; } }
.scroll-anchor { height: 8px; }
.latest-button { position: absolute; right: 4px; bottom: 8px; display: flex; align-items: center; min-height: 44px; margin: 0; padding: 0 14px; border: 1px solid rgba(233, 183, 214, .35); border-radius: 14px; color: #f3dfeb; font-size: 14px; line-height: 1.5; background: #28334e; }
.composer-wrap { flex: 0 0 auto; padding-top: 12px; border-top: 1px solid rgba(186, 200, 227, .14); }
.composer { display: flex; align-items: flex-end; gap: 10px; padding: 8px; border: 1px solid rgba(186, 200, 227, .28); border-radius: 20px; background: #1b2844; }
.composer:focus-within { border-color: #d4b9dc; }
.composer-input { box-sizing: border-box; flex: 1; min-width: 0; width: 100%; min-height: 44px; max-height: 120px; margin: 0; padding: 10px 8px; border: 0; border-radius: 8px; resize: none; overflow-y: auto; color: $hn-text; font-family: inherit; font-size: 16px; font-weight: 400; line-height: 24px; background: transparent; }
.composer-input::placeholder { color: #bdc7df; }
:deep(.composer-placeholder) { color: #bdc7df; font-size: 16px; }
.send-button { flex: 0 0 auto; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; min-height: 44px; margin: 0; padding: 0; border: 0; border-radius: 14px; line-height: 1; background: #d4b9dc; }
.send-icon { display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; line-height: 1; }
.send-icon :deep(.uni-icons) { line-height: 1; }
.send-button[disabled] { background: #35415c; }
.send-button:active, .starter-button:active { opacity: .8; }
.send-button::after, .starter-button::after, .latest-button::after { border: 0; }
.send-button:focus-visible, .starter-button:focus-visible, .latest-button:focus-visible { outline: 2px solid $hn-focus; outline-offset: 3px; }
.composer-note { display: block; margin-top: 10px; color: #bdc7df; font-size: 14px; line-height: 1.6; text-align: center; }
.chat-screen--keyboard .chat-page { padding-bottom: 8px; }
@media (max-width: 350px) { .chat-page { padding-right: 16px; padding-left: 16px; } .chat-header :deep(.app-header) { gap: 8px; } .chat-empty { padding-top: 36px; } }
</style>
