<script setup lang="ts">
import HnAppHeader from '@/components/HnAppHeader.vue'
import HnPrimaryButton from '@/components/HnPrimaryButton.vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

async function login() {
  try {
    await authStore.loginWithWechat()
    uni.reLaunch({ url: '/pages/home/index' })
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '登录失败', icon: 'none' })
  }
}
</script>

<template>
  <view class="hn-screen login-screen">
    <view class="hn-page login-page">
      <HnAppHeader title="登录心栖" subtitle="安全同步你的情绪、对话和记忆" />
      <view class="login-card">
        <uni-icons type="heart-filled" :size="46" color="#ffc0da" />
        <text>使用微信继续</text>
        <text>小程序、App 与微信内 H5 将通过微信身份安全关联。同一账号可以跨端恢复数据。</text>
      </view>
      <HnPrimaryButton data-testid="wechat-login" label="微信授权登录" :disabled="authStore.loading" @click="login" />
      <text class="login-note">登录仅用于账号识别，不会自动发布内容或发送消息。</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.login-screen { background: radial-gradient(circle at 50% 0, rgba(123, 96, 188, 0.38), transparent 38%), #071126; }
.login-page { display: flex; flex-direction: column; min-height: 100vh; gap: 36rpx; }
.login-card { display: flex; flex-direction: column; align-items: center; gap: 18rpx; margin-top: 100rpx; padding: 48rpx 32rpx; border: 1rpx solid rgba(190, 201, 244, 0.22); border-radius: 34rpx; background: rgba(33, 44, 85, 0.72); }
.login-card text:nth-child(2) { font-size: 34rpx; font-weight: 700; }
.login-card text:last-child { color: #b8c1dc; font-size: 22rpx; line-height: 1.7; text-align: center; }
.login-note { color: #8894b6; font-size: 19rpx; line-height: 1.5; text-align: center; }
</style>
