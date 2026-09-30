<script setup lang="ts">
import { ref } from 'vue'
import HnPrimaryButton from '@/components/HnPrimaryButton.vue'
import { useAuthStore } from '@/stores/auth'

const accepted = ref(false)
const authStore = useAuthStore()

function continueToLogin() {
  if (!accepted.value) return
  authStore.prepareConsent()
  uni.navigateTo({ url: '/pages/login/index' })
}
</script>

<template>
  <view class="hn-screen consent-screen">
    <view class="hn-page consent-page">
      <view class="consent-heading">
        <uni-icons type="heart-filled" :size="34" color="#ffc4dc" />
        <text>在开始前，请了解这些</text>
        <text>HeartNest 是 AI 情绪陪伴工具，不替代医生、心理咨询或紧急救助服务。</text>
      </view>
      <view class="consent-card">
        <text>对话会发送给 DeepSeek 生成陪伴回复。</text>
        <text>你可以导出数据，并申请删除全部数据与账号。</text>
        <text>危机内容会触发安全提示和求助资源。</text>
        <text>原始对话默认保存 180 天，主动保存的记忆由你管理。</text>
      </view>
      <button data-testid="consent-all" class="consent-check" :aria-checked="accepted" role="checkbox" @click="accepted = !accepted">
        <text class="check-box">{{ accepted ? '✓' : '' }}</text>
        <text>我已阅读并同意隐私政策、用户协议与 AI 数据说明</text>
      </button>
      <HnPrimaryButton data-testid="consent-continue" label="同意并继续" :disabled="!accepted" @click="continueToLogin" />
    </view>
  </view>
</template>

<style scoped lang="scss">
.consent-screen { background: radial-gradient(circle at 70% 0, rgba(124, 97, 184, 0.35), transparent 36%), #071126; }
.consent-page { display: flex; flex-direction: column; justify-content: center; min-height: 100vh; gap: 28rpx; }
.consent-heading { display: flex; flex-direction: column; gap: 18rpx; }
.consent-heading text:nth-child(2) { font-family: Georgia, 'Songti SC', serif; font-size: 46rpx; font-weight: 700; }
.consent-heading text:last-child { color: #c3cbe2; font-size: 24rpx; line-height: 1.7; }
.consent-card { display: flex; flex-direction: column; gap: 20rpx; padding: 30rpx; border: 1rpx solid rgba(188, 199, 244, 0.2); border-radius: 30rpx; color: #d9ddef; font-size: 23rpx; line-height: 1.6; background: rgba(31, 43, 82, 0.7); }
.consent-check { display: grid; grid-template-columns: 42rpx 1fr; align-items: center; gap: 16rpx; padding: 18rpx 0; color: #c6cde3; font-size: 22rpx; line-height: 1.5; text-align: left; background: transparent; }
.check-box { display: grid; place-items: center; width: 38rpx; height: 38rpx; border: 1rpx solid #ad9ee7; border-radius: 10rpx; color: #fff; background: rgba(119, 101, 187, 0.4); }
</style>
