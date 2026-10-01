<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import HnBottomNav from '@/components/HnBottomNav.vue'
import HnGlassCard from '@/components/HnGlassCard.vue'
import HnAsyncState from '@/components/HnAsyncState.vue'
import { useBootstrapStore } from '@/stores/bootstrap'
import { useAppStore } from '@/stores/app'
import { useProfileStore } from '@/stores/profile'
import { useNetworkState } from '@/composables/useNetworkState'

const profileStore = useProfileStore()
const bootstrapStore = useBootstrapStore()
const appStore = useAppStore()
const { online } = useNetworkState()
const avatarFailed = ref(false)
const profilePageStyle: { paddingTop?: string } = {}
// #ifdef MP-WEIXIN
const capsule = uni.getMenuButtonBoundingClientRect?.()
if (capsule && capsule.bottom > 0) profilePageStyle.paddingTop = `${capsule.bottom + 12}px`
// #endif
const companion = computed(() => bootstrapStore.companionById[profileStore.profile.preferredCompanionId])
watch(() => profileStore.profile.avatar, () => { avatarFailed.value = false })
onMounted(loadProfile)

async function loadProfile() {
  try { await bootstrapStore.initialize(true) }
  catch { /* Loading errors are displayed inline, with a retry and cached data. */ }
}

const menu = computed(() => [
  {
    id: 'companions',
    icon: 'heart-filled',
    color: '#f2a7c9',
    title: '我的陪伴者',
    subtitle: companion.value ? `偏好陪伴 · ${companion.value.name}` : '找到适合自己的陪伴',
  },
  {
    id: 'calendar',
    icon: 'calendar-filled',
    color: '#aeb8ff',
    title: '情绪日历',
    subtitle: '查看你的情绪足迹',
  },
  {
    id: 'favorites',
    icon: 'star-filled',
    color: '#ffd09a',
    title: '我的收藏',
    subtitle: '被你留下的温柔片段',
  },
] as const)

function openSettings() {
  uni.navigateTo({ url: '/pages/settings/index' })
}

function openMembership() {
  uni.navigateTo({ url: '/pages/membership/index' })
}

function openProfileEdit() { uni.navigateTo({ url: '/pages/profile-edit/index' }) }

function openMenuItem(id: 'companions' | 'calendar' | 'favorites') {
  if (id === 'companions') {
    uni.navigateTo({ url: `/pages/companion/index?id=${profileStore.profile.preferredCompanionId}` })
    return
  }
  if (id === 'calendar') {
    uni.reLaunch({ url: '/pages/review/index' })
    return
  }
  uni.navigateTo({ url: '/pages/favorites/index' })
}

function navigate(destination: string) {
  const routes: Record<string, string> = {
    home: '/pages/home/index', companions: `/pages/companion/index?id=${appStore.selectedCompanionId}`, review: '/pages/review/index', profile: '/pages/profile/index',
  }
  uni.reLaunch({ url: routes[destination] })
}
</script>

<template>
  <view class="hn-screen">
    <image class="hn-night-bg profile-bg" src="/static/heartnest/onboarding-night.jpg" mode="aspectFill" aria-hidden="true" />
    <view class="hn-night-shade" />
    <scroll-view scroll-y class="profile-scroll">
      <view class="hn-page user-page" :style="profilePageStyle">
        <view class="top-row">
          <view class="header-copy"><text class="page-title">我的</text><text class="page-subtitle">在这里，安放自己的每一天</text></view>
          <button data-testid="open-settings" class="settings-btn" type="button" role="button" tabindex="0" aria-label="设置" @click="openSettings" @keydown.enter.prevent="openSettings" @keydown.space.prevent="openSettings">
            <uni-icons type="gear-filled" :size="18" color="#e5d4ff" /><text>设置</text>
          </button>
        </view>

        <HnAsyncState v-if="bootstrapStore.loading && !bootstrapStore.loaded" state="loading" title="正在载入个人资料…" />
        <HnAsyncState v-else-if="!online && !bootstrapStore.loaded" state="offline" title="当前处于离线状态" description="联网后，就能查看你的资料与陪伴记录。" action-label="重新检查" @action="loadProfile" />
        <HnAsyncState v-else-if="bootstrapStore.error && !bootstrapStore.loaded" state="error" title="暂时没能加载个人资料" :description="bootstrapStore.error" action-label="重新加载" @action="loadProfile" />
        <template v-else-if="bootstrapStore.loaded">
          <HnAsyncState v-if="!online" state="offline" title="正在查看已缓存的资料" description="联网后会继续同步你的陪伴记录。" />
          <HnAsyncState v-else-if="bootstrapStore.error" state="error" title="新数据暂时没能同步" description="你仍可以查看上次的资料与记录。" action-label="重新同步" @action="loadProfile" />

          <button data-testid="edit-profile" class="user-card" type="button" role="button" tabindex="0" aria-label="编辑个人资料" @click="openProfileEdit" @keydown.enter.prevent="openProfileEdit" @keydown.space.prevent="openProfileEdit">
            <view class="avatar-frame">
              <image v-if="profileStore.profile.avatar && !avatarFailed" data-testid="profile-avatar" class="user-avatar" :src="profileStore.profile.avatar" mode="aspectFill" aria-hidden="true" @error="avatarFailed = true" />
              <view v-else data-testid="profile-avatar-fallback" class="avatar-placeholder"><uni-icons type="person-filled" :size="28" color="#f1c4dc" /></view>
            </view>
            <view class="user-copy"><text class="user-name">{{ profileStore.profile.displayName }}</text><view class="streak"><uni-icons v-if="profileStore.profile.streakDays" type="fire-filled" :size="15" color="#ffd1a3" /><text>{{ profileStore.profile.streakDays ? `连续相伴 ${profileStore.profile.streakDays} 天` : '很高兴在这里遇见你' }}</text></view></view>
            <view class="edit-hint"><text>编辑资料</text><uni-icons type="right" :size="14" color="#bec5df" /></view>
          </button>

          <button data-testid="open-membership" class="membership-banner" type="button" role="button" tabindex="0" :aria-label="`${profileStore.membership.title}，查看会员权益`" @click="openMembership" @keydown.enter.prevent="openMembership" @keydown.space.prevent="openMembership">
            <view class="member-icon"><uni-icons type="vip-filled" :size="25" color="#fff1c9" /></view>
            <view class="member-copy"><text class="member-title">{{ profileStore.membership.title }}</text><text class="member-description">{{ profileStore.membership.tier === 'pro' ? '查看你的会员权益' : '了解会员，留住更多重要的片段' }}</text></view>
            <view class="row-arrow"><uni-icons type="right" :size="18" color="#f8d6ec" /></view>
          </button>

          <view class="stats-frame">
            <HnGlassCard fill>
              <view class="stats-layout" aria-label="陪伴记录统计">
                <view class="stat-item" data-testid="profile-stat-conversations"><text class="stat-value">{{ profileStore.stats.conversations }}</text><text class="stat-label">累计对话</text></view>
                <view class="stat-item" data-testid="profile-stat-memories"><text class="stat-value">{{ profileStore.stats.memories }}</text><text class="stat-label">记忆片段</text></view>
                <view class="stat-item" data-testid="profile-stat-days"><text class="stat-value">{{ profileStore.stats.activeDays }}</text><text class="stat-label">相伴天数</text></view>
              </view>
            </HnGlassCard>
          </view>

          <view class="menu-section">
            <text class="section-title">我的心栖</text>
            <view class="menu-frame">
              <HnGlassCard fill>
                <view class="menu-layout">
                  <button v-for="item in menu" :key="item.id" :data-testid="`menu-${item.id}`" class="menu-row" type="button" role="button" tabindex="0" :aria-label="item.title" @click="openMenuItem(item.id)" @keydown.enter.prevent="openMenuItem(item.id)" @keydown.space.prevent="openMenuItem(item.id)">
                    <view class="menu-icon"><uni-icons :type="item.icon" :size="22" :color="item.color" /></view>
                    <view class="menu-copy"><text class="menu-title">{{ item.title }}</text><text class="menu-description">{{ item.subtitle }}</text></view>
                    <view class="row-arrow"><uni-icons type="right" :size="18" color="#bec5df" /></view>
                  </button>
                </view>
              </HnGlassCard>
            </view>
          </view>
          <text class="gentle-note">谢谢你，愿意把一些时刻留在这里。</text>
        </template>
      </view>
    </scroll-view>
    <HnBottomNav active="profile" @navigate="navigate" />
  </view>
</template>

<style scoped lang="scss">
@use '../../styles/tokens.scss' as *;

.profile-bg { opacity: 0.28; }
.profile-scroll { height: 100vh; }
.user-page { padding-bottom: calc(190rpx + env(safe-area-inset-bottom)); }
.top-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 16rpx; margin: 18rpx 0 36rpx; }
.header-copy { display: flex; flex-direction: column; gap: 12rpx; min-width: 0; }
.page-title { color: $hn-text; font-family: Georgia, 'Songti SC', serif; font-size: 52rpx; font-weight: 700; line-height: 1.25; }
.page-subtitle { color: $hn-text-muted; font-size: 28rpx; line-height: 1.6; }
.settings-btn { display: flex; flex-shrink: 0; align-items: center; justify-content: center; gap: 10rpx; min-width: 44px; min-height: 44px; margin: 0; padding: 12rpx 20rpx; border: 1rpx solid $hn-line; border-radius: 22rpx; color: #e5d4ff; font-size: 28rpx; line-height: 1.4; background: rgba(38, 45, 88, .55); }
.user-card { display: flex; align-items: center; gap: 20rpx; width: 100%; min-height: 128rpx; margin: 0 0 30rpx; padding: 0; border: 0; border-radius: 24rpx; text-align: left; line-height: 1.5; background: transparent; }
.avatar-frame { flex: 0 0 112rpx; width: 112rpx; height: 112rpx; overflow: hidden; border: 2rpx solid rgba(255, 213, 235, .4); border-radius: 34rpx; background: rgba(132, 104, 159, .3); }
.user-avatar, .avatar-placeholder { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; }
.user-copy { display: flex; flex: 1; min-width: 0; flex-direction: column; gap: 10rpx; }
.user-name { color: $hn-text; font-size: 36rpx; font-weight: 700; line-height: 1.5; word-break: break-word; }
.streak { display: flex; align-items: center; gap: 8rpx; color: #e3c1b5; font-size: 26rpx; line-height: 1.6; }
.edit-hint { display: flex; flex-shrink: 0; align-items: center; gap: 6rpx; color: $hn-text-muted; font-size: 26rpx; }
.membership-banner { display: flex; align-items: center; gap: 20rpx; width: 100%; min-height: 44px; margin: 0; padding: 28rpx 24rpx; border: 1rpx solid rgba(255, 199, 221, .32); border-radius: $hn-radius-lg; text-align: left; line-height: 1.5; background: linear-gradient(120deg, rgba(101, 76, 139, .84), rgba(102, 64, 106, .78)); }
.member-icon { display: flex; flex: 0 0 72rpx; align-items: center; justify-content: center; width: 72rpx; height: 72rpx; border: 1rpx solid rgba(255, 224, 190, .18); border-radius: 22rpx; background: rgba(255, 224, 190, .12); }
.member-copy { display: flex; flex: 1; min-width: 0; flex-direction: column; gap: 8rpx; }
.member-title { color: #fff0e0; font-size: 30rpx; font-weight: 700; line-height: 1.5; word-break: break-word; }
.member-description { color: #ecd5e8; font-size: 28rpx; line-height: 1.6; word-break: break-word; }
.row-arrow { display: flex; flex-shrink: 0; align-items: center; justify-content: center; width: 36rpx; }
.stats-frame { display: block; width: 100%; margin-top: 22rpx; }
.stats-layout { display: flex; padding: 28rpx 0; }
.stat-item { display: flex; flex: 1; min-width: 0; flex-direction: column; align-items: center; gap: 10rpx; padding: 0 8rpx; border-right: 1rpx solid rgba(185, 195, 239, .15); text-align: center; }
.stat-item:last-child { border-right: 0; }
.stat-value { color: $hn-text; font-size: 36rpx; font-weight: 700; line-height: 1.3; word-break: break-all; }
.stat-label { color: $hn-text-muted; font-size: 26rpx; line-height: 1.5; }
.menu-section { margin-top: 36rpx; }
.section-title { display: block; margin-bottom: 20rpx; color: $hn-text; font-size: 34rpx; font-weight: 700; line-height: 1.5; }
.menu-frame { display: block; width: 100%; }
.menu-layout { overflow: hidden; padding: 0 24rpx; }
.menu-row { display: flex; align-items: center; gap: 18rpx; width: 100%; min-height: 44px; margin: 0; padding: 24rpx 0; border: 0; border-bottom: 1rpx solid rgba(185, 195, 239, .15); border-radius: 0; text-align: left; line-height: 1.5; background: transparent; }
.menu-row:last-child { border-bottom: 0; }
.menu-icon { display: flex; flex: 0 0 58rpx; align-items: center; justify-content: center; width: 58rpx; height: 58rpx; border-radius: 19rpx; background: rgba(132, 129, 199, .16); }
.menu-copy { display: flex; flex: 1; min-width: 0; flex-direction: column; gap: 6rpx; }
.menu-title { color: $hn-text; font-size: 30rpx; font-weight: 600; line-height: 1.5; }
.menu-description { color: #bec7e1; font-size: 28rpx; line-height: 1.6; word-break: break-word; }
.gentle-note { display: block; margin: 34rpx 0 0; color: $hn-text-muted; font-size: 26rpx; line-height: 1.7; text-align: center; }
.settings-btn:active, .user-card:active, .menu-row:active { background: rgba(132, 129, 199, .15); }
.membership-banner:active { background: rgba(121, 83, 147, .9); }
@media (max-width: 350px) {
  .page-subtitle, .settings-btn, .streak, .edit-hint, .member-description, .stat-label, .menu-description, .gentle-note { font-size: 14px; }
  .top-row { flex-wrap: wrap; align-items: center; }
  .settings-btn { margin-left: auto; }
  .user-card { gap: 14rpx; }
  .menu-title, .member-title, .section-title { font-size: 17px; }
}
</style>
