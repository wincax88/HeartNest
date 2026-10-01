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
  <view class="bottom-nav" role="tablist" aria-label="主导航">
    <button
      v-for="item in items"
      :key="item.id"
      :data-testid="`nav-${item.id}`"
      class="bottom-nav__item"
      :class="{ 'is-active': active === item.id }"
      type="button"
      role="tab"
      tabindex="0"
      :aria-label="item.label"
      :aria-selected="active === item.id"
      @click="emit('navigate', item.id)"
      @keydown.enter.prevent="emit('navigate', item.id)"
      @keydown.space.prevent="emit('navigate', item.id)"
    >
      <uni-icons :type="item.icon" :size="25" :color="active === item.id ? '#efabff' : '#c2cae8'" />
      <text>{{ item.label }}</text>
    </button>
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
  justify-content: center;
  gap: 6rpx;
  min-width: 44px;
  min-height: 44px;
  margin: 0;
  padding: 4rpx 0;
  border: 0;
  border-radius: 18rpx;
  color: #c2cae8;
  font-size: 14px;
  line-height: 1.4;
  background: transparent;
}

.bottom-nav__item.is-active {
  color: #efabff;
  text-shadow: 0 0 18rpx rgba(227, 134, 255, 0.7);
}
.bottom-nav__item:active { background: rgba(181, 155, 225, .12); }
</style>
