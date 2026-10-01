<script setup lang="ts">
defineProps<{ visible?: boolean; saved?: boolean; saving?: boolean; disabled?: boolean; excerpt?: string }>()
defineEmits<{ save: [] }>()
</script>

<template>
  <view v-if="visible" data-testid="memory-prompt" class="memory-prompt" :class="{ 'memory-prompt--saved': saved }">
    <view class="memory-prompt__heading"><uni-icons type="heart-filled" :size="18" color="#f1c2dd" /><text class="memory-prompt__title">{{ saved ? '这句话已记住' : '想记住这句话吗？' }}</text></view>
    <text v-if="excerpt" class="memory-prompt__excerpt">“{{ excerpt }}”</text>
    <view class="memory-prompt__footer">
      <text class="memory-prompt__text">{{ saved ? '可以在「回顾」里再看看。' : '留在回顾里，想起时再看看。' }}</text>
      <button data-testid="save-memory" class="memory-prompt__action" type="button" role="button" :tabindex="saved || saving || disabled ? -1 : 0" :disabled="saved || saving || disabled" :aria-disabled="saved || saving || disabled" :aria-busy="Boolean(saving)" @click="$emit('save')" @keydown.enter.prevent="$emit('save')" @keydown.space.prevent="$emit('save')">{{ saving ? '保存中…' : (saved ? '已记住' : '记住这句') }}</button>
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as *;
.memory-prompt { margin: 4px 0 24px; padding: 18px 0 12px; border-top: 1px solid rgba(233, 183, 214, .25); }
.memory-prompt__heading { display: flex; align-items: center; gap: 8px; }
.memory-prompt__title { color: #f1deed; font-size: 15px; font-weight: 600; line-height: 1.6; }
.memory-prompt__excerpt { display: -webkit-box; margin: 10px 0 0; overflow: hidden; color: #c5cde2; font-size: 14px; line-height: 1.7; -webkit-box-orient: vertical; -webkit-line-clamp: 2; word-break: break-word; }
.memory-prompt__footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.memory-prompt__text { flex: 1; min-width: 0; color: #bdc7df; font-size: 14px; line-height: 1.6; }
.memory-prompt__action { flex: 0 0 auto; display: flex; align-items: center; justify-content: center; min-width: 80px; min-height: 44px; margin: 0; padding: 0 10px; border: 0; border-radius: 10px; color: #f1c2dd; font-size: 14px; font-weight: 600; line-height: 1.4; background: transparent; }
.memory-prompt__action::after { border: 0; }
.memory-prompt__action:active { background: rgba(233, 183, 214, .1); }
.memory-prompt__action:focus-visible { outline: 2px solid $hn-focus; outline-offset: 1px; }
.memory-prompt__action[disabled] { color: #bdc7df; }
</style>
