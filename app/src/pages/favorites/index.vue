<script setup lang="ts">
import { onMounted } from 'vue'
import HnAppHeader from '@/components/HnAppHeader.vue'
import HnGlassCard from '@/components/HnGlassCard.vue'
import { useFavoritesStore } from '@/stores/favorites'

const store = useFavoritesStore()
const showError = (error: unknown) => uni.showToast({ title: error instanceof Error ? error.message : '操作失败', icon: 'none' })
onMounted(() => store.load().catch(showError))
function goBack() { uni.navigateBack() }
</script>

<template>
  <view class="hn-screen favorites-screen"><view class="hn-page">
    <HnAppHeader back title="我的收藏" subtitle="被你留下的温柔片段" @back="goBack" />
    <HnGlassCard v-for="item in store.items" :key="item.id" class="favorite-card">
      <text>{{ item.content }}</text><text>{{ item.messageCreatedAt.slice(0, 10) }}</text>
      <button @click="store.remove(item.id).catch(showError)">取消收藏</button>
    </HnGlassCard>
    <HnGlassCard v-if="!store.loading && store.items.length === 0" class="empty">还没有收藏。你可以在聊天气泡下点“收藏”。</HnGlassCard>
  </view></view>
</template>

<style scoped lang="scss">
.favorites-screen { background: #071126; }.favorite-card { display: grid; gap: 14rpx; margin-top: 20rpx; padding: 26rpx; }.favorite-card text:nth-child(2) { color: #919dbc; font-size: 19rpx; }.favorite-card button { color: #f2a9c7; font-size: 20rpx; text-align: left; background: transparent; }.empty { margin-top: 40rpx; padding: 32rpx; color: #aeb7d2; text-align: center; }
</style>
