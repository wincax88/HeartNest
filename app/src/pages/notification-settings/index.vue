<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import HnAsyncState from '@/components/HnAsyncState.vue'
import { useNotificationsStore } from '@/stores/notifications'
import { authorizeAppReminder, authorizeWechatReminder } from '@/services/notification-platform'
import { useNetworkState } from '@/composables/useNetworkState'

const store = useNotificationsStore()
const { online } = useNetworkState()
const time = ref('20:30')
const saving = ref(false)
const removing = ref(false)
const loadError = ref('')
const saveError = ref('')
const saved = ref(false)
const current = computed(() => store.schedules.find(item => item.channel === store.channel))
const available = computed(() => store.channel === 'wechat' ? !!store.configuration?.wechat.available : !!store.configuration?.app.available)
const busy = computed(() => saving.value || removing.value)
const disabled = computed(() => !store.loaded || !available.value || !online.value || busy.value)
const pageStyle: { paddingTop?: string } = {}
// #ifdef MP-WEIXIN
const capsule = uni.getMenuButtonBoundingClientRect?.()
if (capsule?.bottom > 0) pageStyle.paddingTop = `${capsule.bottom + 12}px`
// #endif
onMounted(load)

function message(error: unknown) {
  const failure = error as { status?: number; code?: string }
  if (failure?.status === 404) return '提醒服务正在更新，请稍后再试'
  if (failure?.code === 'NOTIFICATION_AUTH_REQUIRED') return '提醒授权已失效，请重新授权后保存'
  if (failure?.status === 0 && failure.code === 'NETWORK_ERROR') return '网络未连接，请检查网络后重试'
  return error instanceof Error ? error.message : '这次操作没能完成，请重试'
}
async function load() {
  loadError.value = ''
  try {
    await store.load()
    if (current.value) time.value = current.value.time
  } catch (error) { loadError.value = message(error) }
}
function changeTime(event: { detail: { value: string } }) {
  if (busy.value) return
  time.value = event.detail.value
  saved.value = false
  saveError.value = ''
}
async function save() {
  if (disabled.value || !store.channel) return
  saving.value = true
  saved.value = false
  saveError.value = ''
  try {
    const target = store.channel === 'wechat'
      ? await authorizeWechatReminder(store.configuration!.wechat.templateId!)
      : await authorizeAppReminder()
    await store.save({ channel: store.channel, time: time.value, timeZone: 'Asia/Shanghai', quietStart: '22:00', quietEnd: '08:00', enabled: true, target,
      payload: store.channel === 'app' ? { title: '来自心栖的温柔提醒', content: '留一点时间，和自己的心情聊聊。' } : {} })
    saved.value = true
  } catch (error) { saveError.value = message(error) }
  finally { saving.value = false }
}
async function remove() {
  if (!current.value || busy.value || !online.value) return
  removing.value = true
  saveError.value = ''
  try { await store.remove(current.value.id); saved.value = false }
  catch (error) { saveError.value = message(error) }
  finally { removing.value = false }
}
function goBack() {
  if (typeof getCurrentPages === 'function' && getCurrentPages().length <= 1) uni.reLaunch({ url: '/pages/settings/index' })
  else uni.navigateBack()
}
</script>

<template>
  <view class="hn-screen notification-screen"><view class="hn-page notification-page" :style="pageStyle">
    <view class="reminder-header">
      <button class="back-button" type="button" role="button" tabindex="0" aria-label="返回设置" @click="goBack" @keydown.enter.prevent="goBack" @keydown.space.prevent="goBack"><uni-icons type="left" :size="24" color="#eef0ff" /></button>
      <view class="header-copy"><text class="page-title">温柔提醒</text><text class="page-subtitle">给自己留一小段被陪伴的时间</text></view>
    </view>
    <HnAsyncState v-if="store.loading && !store.loaded" state="loading" title="正在载入提醒设置" description="稍等一下，你的提醒正在同步。" />
    <HnAsyncState v-else-if="loadError" state="error" title="暂时没能加载提醒" :description="loadError" :action-label="online ? '重新加载' : ''" @action="load" />
    <view v-else-if="!store.supported" class="reminder-note" data-testid="reminder-unsupported"><text class="note-title">在小程序或 App 中接收提醒</text><text class="note-copy">网页版暂不支持系统推送。你可以在微信小程序或支持推送的 App 中设置。</text></view>
    <template v-else-if="store.loaded">
      <view v-if="!available" class="reminder-note" data-testid="reminder-unavailable"><text class="note-title">提醒服务还在准备中</text><text class="note-copy">{{ store.channel === 'wechat' ? '微信提醒暂未开通，开通后你可以在这里授权和设置。' : 'App 推送提醒暂未开通，请稍后再来看看。' }}</text></view>
      <view class="reminder-section">
        <text class="section-label">{{ store.channel === 'wechat' ? '下一次提醒' : '每日提醒' }}</text>
        <picker mode="time" :value="time" :disabled="disabled" :aria-label="`选择提醒时间，当前 ${time}`" @change="changeTime"><view class="time-row" data-testid="reminder-time" :aria-disabled="disabled"><view class="time-copy"><text class="time-label">提醒时间</text><text class="time-zone">北京时间</text></view><text class="time-value">{{ time }}</text><uni-icons type="right" :size="18" color="#b6bdd8" /></view></picker>
        <text class="quiet-note">22:00–08:00 不打扰，期间的提醒会顺延到 08:00。</text>
      </view>
      <view class="delivery-note"><uni-icons type="calendar-filled" :size="23" color="#e8b7d5" /><view class="delivery-copy"><text class="note-title">{{ store.channel === 'wechat' ? '通过微信服务通知提醒你' : '通过设备通知提醒你' }}</text><text class="note-copy">{{ store.channel === 'wechat' ? '每次授权设置一条提醒。想再次收到提醒时，需要重新授权。' : '保存前需要允许系统通知。你可以随时取消提醒。' }}</text></view></view>
      <text v-if="!online" class="offline-note" role="status">当前网络未连接，连接后可以继续保存。</text>
      <text v-if="saveError" class="error-note" role="alert" data-testid="reminder-error">{{ saveError }}</text>
      <text v-if="saved" class="saved-note" role="status" data-testid="reminder-saved">提醒已保存，等待发送。</text>
      <button class="save-button" type="button" role="button" :tabindex="disabled ? -1 : 0" data-testid="save-reminder" :disabled="disabled" :aria-disabled="disabled" @click="save" @keydown.enter.prevent="save" @keydown.space.prevent="save">{{ saving ? '正在授权并保存…' : store.channel === 'wechat' ? '授权并保存提醒' : '保存提醒' }}</button>
      <view v-if="current?.enabled" class="current-reminder"><text>已保存的提醒时间：{{ current.time }}</text><button class="cancel-button" type="button" role="button" :tabindex="busy || !online ? -1 : 0" data-testid="cancel-reminder" :disabled="busy || !online" :aria-disabled="busy || !online" @click="remove" @keydown.enter.prevent="remove" @keydown.space.prevent="remove">{{ removing ? '正在取消…' : '取消提醒' }}</button></view>
    </template>
  </view></view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as *;
.notification-screen { background: radial-gradient(circle at 90% 0, rgba(111, 87, 179, .14), transparent 40%), $hn-bg-deep; }
.notification-page { padding-bottom: calc(56rpx + env(safe-area-inset-bottom)); }
.reminder-header { display: flex; align-items: center; gap: 20rpx; min-height: 88rpx; }
.header-copy { display: flex; flex-direction: column; gap: 6rpx; min-width: 0; }
.page-title { color: $hn-text; font-size: 22px; font-weight: 700; line-height: 1.4; }
.page-subtitle { color: #c1c8e0; font-size: 14px; line-height: 1.6; }
.back-button { display: flex; flex-shrink: 0; align-items: center; justify-content: center; width: 44px; height: 44px; margin: 0; padding: 0; border: 1px solid $hn-line; border-radius: 50%; background: $hn-surface-soft; }
button::after { border: 0; }
.reminder-section { margin-top: 42rpx; }
.section-label { display: block; margin-bottom: 18rpx; color: #c1c8e0; font-size: 14px; font-weight: 600; }
.time-row { display: flex; align-items: center; gap: 20rpx; min-height: 92px; padding: 28rpx; border: 1px solid $hn-line; border-radius: 24rpx; background: $hn-surface; }
.time-copy { display: flex; flex: 1; flex-direction: column; gap: 8rpx; }
.time-label { color: $hn-text; font-size: 16px; font-weight: 600; }
.time-zone, .quiet-note { color: #c1c8e0; font-size: 14px; line-height: 1.6; }
.time-value { color: #f1dfef; font-size: 28px; font-weight: 600; line-height: 1.4; }
.quiet-note { display: block; margin: 18rpx 4rpx 0; }
.reminder-note { margin-top: 36rpx; padding: 28rpx; border: 1px solid $hn-line; border-radius: 24rpx; background: $hn-surface-soft; }
.note-title { display: block; color: $hn-text; font-size: 16px; font-weight: 600; line-height: 1.5; }
.note-copy { display: block; margin-top: 8rpx; color: #c1c8e0; font-size: 14px; line-height: 1.7; }
.delivery-note { display: flex; align-items: flex-start; gap: 18rpx; margin: 38rpx 4rpx; }
.delivery-copy { flex: 1; min-width: 0; }
.save-button { display: flex; align-items: center; justify-content: center; width: 100%; min-height: 52px; margin: 24rpx 0 0; padding: 16rpx 24rpx; border: 1px solid #b59bdc; border-radius: 24rpx; color: #f9f4ff; background: #7860ac; font-size: 16px; font-weight: 600; line-height: 1.5; }
button[disabled] { opacity: .55; }
.error-note, .offline-note, .saved-note { display: block; margin-top: 22rpx; font-size: 14px; line-height: 1.7; overflow-wrap: break-word; }
.error-note { color: #ffbecd; }.offline-note { color: #f2d5a9; }.saved-note { color: #c7e6da; }
.current-reminder { display: flex; flex-direction: column; align-items: center; gap: 10rpx; margin-top: 28rpx; color: #c1c8e0; font-size: 14px; line-height: 1.6; }
.cancel-button { min-height: 44px; margin: 0; padding: 10px 18px; border: 0; color: #edb8d3; background: transparent; font-size: 14px; line-height: 1.6; }
@media (max-width: 360px) { .notification-page { padding-left: 28rpx; padding-right: 28rpx; }.time-row { gap: 16rpx; } }
</style>
