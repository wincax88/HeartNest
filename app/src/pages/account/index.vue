<script setup lang="ts">
import HnAppHeader from '@/components/HnAppHeader.vue'
import HnGlassCard from '@/components/HnGlassCard.vue'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

function showError(error: unknown) {
  uni.showToast({ title: error instanceof Error ? error.message : '操作失败', icon: 'none' })
}

async function exportData() {
  try {
    const result = await api.createDataExport()
    uni.showModal({ title: '数据导出已就绪', content: `下载凭据将在 ${new Date(result.expiresAt).toLocaleString()} 前有效。`, showCancel: false })
  } catch (error) { showError(error) }
}

function requestDeletion() {
  uni.showModal({
    title: '申请注销账号',
    content: '提交后进入 7 天冷静期。冷静期结束后将删除业务数据；期间可以取消。',
    confirmText: '提交申请',
    success: ({ confirm }) => { if (confirm) api.requestAccountDeletion().then(() => uni.showToast({ title: '已进入冷静期', icon: 'none' })).catch(showError) },
  })
}

async function logout() {
  try { await authStore.logout(); uni.reLaunch({ url: '/pages/login/index' }) }
  catch (error) { showError(error) }
}

function goBack() {
  uni.navigateBack()
}
</script>

<template>
  <view class="hn-screen account-screen">
    <view class="hn-page">
      <HnAppHeader back title="账号与隐私" subtitle="你的数据由你掌控" @back="goBack" />
      <HnGlassCard class="account-card">
        <button data-testid="export-data" @click="exportData">导出我的数据</button>
        <button data-testid="delete-account" @click="requestDeletion">申请删除数据与账号</button>
        <button data-testid="logout" @click="logout">退出登录</button>
      </HnGlassCard>
    </view>
  </view>
</template>

<style scoped lang="scss">
.account-screen { background: #071126; }
.account-card { display: flex; flex-direction: column; margin-top: 40rpx; padding: 0 26rpx; }
.account-card button { min-height: 108rpx; border-bottom: 1rpx solid rgba(187, 197, 239, 0.12); color: #e9ebf7; font-size: 25rpx; text-align: left; background: transparent; }
.account-card button:last-child { border-bottom: 0; color: #ffb6c7; }
</style>
