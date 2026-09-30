<script setup lang="ts">
const props = withDefaults(defineProps<{ label: string; disabled?: boolean; icon?: string }>(), { disabled: false, icon: 'sound-filled' })
const emit = defineEmits<{ click: [] }>()

function activate() {
  if (!props.disabled) emit('click')
}
</script>

<template>
  <button
    class="primary-button"
    type="button"
    :disabled="props.disabled"
    role="button"
    :aria-label="props.label"
    @click="activate"
  >
    <uni-icons :type="props.icon" :size="26" color="#ffffff" />
    <text>{{ props.label }}</text>
    <view class="primary-button__arrow"><uni-icons type="right" :size="22" color="#ffffff" /></view>
  </button>
</template>

<style scoped lang="scss">
.primary-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18rpx;
  width: 100%;
  height: 104rpx;
  margin: 0;
  padding: 0 22rpx 0 56rpx;
  border: 0;
  border-radius: 58rpx;
  color: #fff;
  font-size: 32rpx;
  font-weight: 700;
  background: linear-gradient(100deg, #7682ff, #b77ce7 52%, #ffb992);
  box-shadow: 0 16rpx 48rpx rgba(180, 105, 224, 0.38);
}

.primary-button[disabled] { opacity: 0.52; }
.primary-button__arrow {
  display: grid;
  place-items: center;
  width: 64rpx;
  height: 64rpx;
  margin-left: auto;
  border: 1rpx solid rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
}
</style>
