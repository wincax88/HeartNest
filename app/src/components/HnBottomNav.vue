<script setup lang="ts">
type Destination = 'home' | 'companions' | 'review' | 'profile'

defineProps<{ active: Destination }>()
const emit = defineEmits<{ navigate: [destination: Destination] }>()

const items: Array<{ id: Destination; label: string; icon: string }> = [
  { id: 'home', label: '首页', icon: 'home-filled' },
  { id: 'companions', label: '陪伴', icon: 'heart-filled' },
  { id: 'review', label: '回顾', icon: 'list' },
  { id: 'profile', label: '我的', icon: 'person-filled' },
]
</script>

<template>
  <view class="bottom-nav">
    <view
      v-for="item in items"
      :key="item.id"
      :data-testid="`nav-${item.id}`"
      class="bottom-nav__item"
      :class="{ 'is-active': active === item.id }"
      @click="emit('navigate', item.id)"
    >
      <uni-icons :type="item.icon" :size="25" :color="active === item.id ? '#efabff' : '#c2cae8'" />
      <text>{{ item.label }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.bottom-nav {
  position: fixed;
  z-index: 20;
  right: 0;
  bottom: 0;
  left: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  width: 100%;
  max-width: 786rpx;
  margin: 0 auto;
  padding: 20rpx 18rpx calc(18rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid rgba(168, 185, 244, 0.24);
  border-radius: 42rpx 42rpx 0 0;
  background: rgba(6, 17, 43, 0.9);
  backdrop-filter: blur(28rpx);
}

.bottom-nav__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  color: #c2cae8;
  font-size: 22rpx;
}

.bottom-nav__item.is-active {
  color: #efabff;
  text-shadow: 0 0 18rpx rgba(227, 134, 255, 0.7);
}
</style>
