<script setup lang="ts">
import { onMounted, ref } from 'vue'
import HnAppHeader from '@/components/HnAppHeader.vue'
import HnPrimaryButton from '@/components/HnPrimaryButton.vue'
import { useNotificationsStore } from '@/stores/notifications'

const store = useNotificationsStore()
const time = ref('20:30')
const showError = (error: unknown) => uni.showToast({ title: error instanceof Error ? error.message : '操作失败', icon: 'none' })
onMounted(() => store.load().catch(showError))
async function create() {
  try {
    await store.create({ channel: 'app', time: time.value, timeZone: 'Asia/Shanghai', quietStart: '22:00', quietEnd: '08:00', enabled: true, target: { token: 'registered-device-token' }, payload: { title: '来自心栖的温柔提醒' } })
    uni.showToast({ title: '提醒已保存', icon: 'success' })
  } catch (error) { showError(error) }
}
function goBack() { uni.navigateBack() }
</script>

<template><view class="hn-screen notification-screen"><view class="hn-page">
  <HnAppHeader back title="温柔提醒" subtitle="提醒需要平台授权后才会发送" @back="goBack" />
  <view v-if="!store.supported" class="unsupported">H5 暂不支持可靠的系统推送，请在微信小程序或 App 中设置。</view>
  <template v-else><picker mode="time" :value="time" @change="time = $event.detail.value"><view class="time-row">每日提醒时间 <text>{{ time }}</text></view></picker><HnPrimaryButton label="保存提醒" @click="create" /></template>
</view></view></template>

<style scoped lang="scss">
.notification-screen { background:#071126; }.time-row,.unsupported { margin: 50rpx 0 30rpx; padding: 30rpx; border-radius: 24rpx; color:#dfe3f4; background:rgba(35,45,83,.72); }.time-row { display:flex; justify-content:space-between; }.unsupported { color:#aeb8d6; line-height:1.7; }
</style>
