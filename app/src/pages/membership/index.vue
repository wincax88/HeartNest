<script setup lang="ts">
import HnAppHeader from '@/components/HnAppHeader.vue'
import HnPrimaryButton from '@/components/HnPrimaryButton.vue'
import { useProfileStore } from '@/stores/profile'

const profileStore = useProfileStore()
const benefits = [
  { icon: 'chatboxes-filled', title: '无限对话', copy: '不打断每一次想说话的时刻' },
  { icon: 'heart-filled', title: '长期记忆', copy: '让重要的片段被更久地记住' },
  { icon: 'cloud-filled', title: '夜间专属模式', copy: '更安静、更轻柔的深夜陪伴' },
]

function goBack() {
  uni.navigateBack()
}
</script>

<template>
  <view class="hn-screen member-screen">
    <image class="member-bg" src="/static/heartnest/onboarding-night.jpg" mode="aspectFill" />
    <view class="member-shade" />
    <scroll-view scroll-y class="member-scroll">
      <view class="hn-page member-page">
        <HnAppHeader back @back="goBack" />
        <view class="member-hero">
          <view class="crown"><uni-icons type="vip-filled" :size="42" color="#fff0c7" /></view>
          <text class="member-kicker">HEARTNEST PRO</text>
          <text class="member-title">让陪伴，记得更久一点</text>
          <text class="member-subtitle">在你需要的时候，留下一处更完整、更安静的心栖。</text>
        </view>

        <view class="benefit-list">
          <view v-for="item in benefits" :key="item.title" class="benefit-row">
            <view><uni-icons :type="item.icon" :size="25" color="#ffd4e7" /></view>
            <view><text>{{ item.title }}</text><text>{{ item.copy }}</text></view>
          </view>
        </view>

        <view class="price-card" :class="{ 'is-active': profileStore.membership.tier === 'pro' }">
          <view><text>{{ profileStore.membership.tier === 'pro' ? '心栖会员已开启' : '连续包月' }}</text><text>{{ profileStore.membership.tier === 'pro' ? '谢谢你选择更长久的陪伴' : '可随时取消 · 当前为演示体验' }}</text></view>
          <view v-if="profileStore.membership.tier !== 'pro'" class="price"><text>¥</text><text>18</text><text>/月</text></view>
          <uni-icons v-else type="checkbox-filled" :size="34" color="#74e3ae" />
        </view>

        <HnPrimaryButton
          data-testid="upgrade-membership"
          :label="profileStore.membership.tier === 'pro' ? '已解锁心栖会员' : '立即开启体验'"
          :disabled="profileStore.membership.tier === 'pro'"
          icon="vip-filled"
          @click="profileStore.upgradeLocally()"
        />
        <text class="member-note">模拟体验不会产生真实扣费</text>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.member-screen { background: #080d25; }
.member-scroll { height: 100vh; }
.member-bg { position: fixed; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.45; }
.member-shade { position: fixed; inset: 0; background: linear-gradient(180deg, rgba(14, 10, 43, 0.28), #100d2c 45%, #080d25 100%); }
.member-page { padding-bottom: 70rpx; }
.member-hero { display: flex; flex-direction: column; align-items: center; padding: 34rpx 20rpx 48rpx; text-align: center; }
.crown { display: grid; place-items: center; width: 104rpx; height: 104rpx; margin-bottom: 24rpx; border: 1rpx solid rgba(255, 226, 187, 0.44); border-radius: 36rpx; background: linear-gradient(145deg, rgba(231, 166, 194, 0.38), rgba(122, 91, 186, 0.42)); box-shadow: 0 0 54rpx rgba(235, 156, 200, 0.32); }
.member-kicker { color: #f5c4dd; font-size: 19rpx; font-weight: 700; letter-spacing: 5rpx; }
.member-title { margin-top: 16rpx; font-family: Georgia, 'Songti SC', serif; font-size: 47rpx; font-weight: 700; line-height: 1.35; }
.member-subtitle { max-width: 560rpx; margin-top: 16rpx; color: #bac1da; font-size: 23rpx; line-height: 1.7; }
.benefit-list { display: flex; flex-direction: column; gap: 16rpx; }
.benefit-row { display: grid; grid-template-columns: 72rpx 1fr; align-items: center; gap: 18rpx; padding: 22rpx 26rpx; border: 1rpx solid rgba(214, 192, 239, 0.18); border-radius: 28rpx; background: rgba(41, 43, 89, 0.62); }
.benefit-row > view:first-child { display: grid; place-items: center; width: 66rpx; height: 66rpx; border-radius: 22rpx; background: rgba(214, 127, 184, 0.17); }
.benefit-row > view:last-child { display: flex; flex-direction: column; gap: 7rpx; }
.benefit-row > view:last-child text:first-child { font-size: 26rpx; font-weight: 700; }
.benefit-row > view:last-child text:last-child { color: #aeb7d2; font-size: 20rpx; }
.price-card { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 20rpx; margin: 28rpx 0; padding: 28rpx; border: 2rpx solid rgba(247, 182, 216, 0.55); border-radius: 30rpx; background: linear-gradient(120deg, rgba(101, 72, 148, 0.75), rgba(121, 67, 120, 0.64)); }
.price-card.is-active { border-color: rgba(116, 227, 174, 0.48); }
.price-card > view:first-child { display: flex; flex-direction: column; gap: 8rpx; }
.price-card > view:first-child text:first-child { font-size: 28rpx; font-weight: 700; }
.price-card > view:first-child text:last-child { color: #d5c2da; font-size: 19rpx; }
.price { display: flex; align-items: baseline; color: #fff2dc; }
.price text:nth-child(1) { font-size: 24rpx; }
.price text:nth-child(2) { font-size: 54rpx; font-weight: 700; }
.price text:nth-child(3) { font-size: 19rpx; }
.member-note { display: block; margin-top: 18rpx; color: #8e98b8; font-size: 19rpx; text-align: center; }
</style>
