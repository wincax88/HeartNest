<script setup lang="ts">
import { ref } from 'vue'
import HnAppHeader from '@/components/HnAppHeader.vue'
import HnPrimaryButton from '@/components/HnPrimaryButton.vue'
import { useProfileStore } from '@/stores/profile'

const store = useProfileStore()
const displayName = ref(store.profile.displayName)
const avatarUrl = ref(store.profile.avatar || '')
async function save() {
  try { await store.updateProfile({ displayName: displayName.value, avatarUrl: avatarUrl.value || null }); uni.navigateBack() }
  catch (error) { uni.showToast({ title: error instanceof Error ? error.message : '保存失败', icon: 'none' }) }
}
function goBack() { uni.navigateBack() }
</script>

<template><view class="hn-screen edit-screen"><view class="hn-page">
  <HnAppHeader back title="编辑资料" subtitle="让这里更像你" @back="goBack" />
  <view class="form"><text>昵称</text><input v-model="displayName" maxlength="30" placeholder="请输入昵称" /><text>头像 HTTPS 地址</text><input v-model="avatarUrl" placeholder="可选" /></view>
  <HnPrimaryButton data-testid="save-profile" label="保存资料" @click="save" />
</view></view></template>

<style scoped lang="scss">
.edit-screen { background: #071126; }.form { display: grid; gap: 18rpx; margin: 50rpx 0; }.form text { color: #aeb8d6; font-size: 22rpx; }.form input { height: 82rpx; padding: 0 24rpx; border: 1rpx solid rgba(190,200,240,.22); border-radius: 22rpx; color: #fff; background: rgba(35,45,83,.7); }
</style>
