<script setup lang="ts">
withDefaults(defineProps<{
  label: string
  disabled?: boolean
  role?: string
  selected?: boolean
  checked?: boolean
}>(), { disabled: false, role: 'button', selected: undefined, checked: undefined })

const emit = defineEmits<{ activate: [] }>()
function activate() { emit('activate') }
</script>

<template>
  <button
    class="hn-action"
    type="button"
    :disabled="disabled"
    :role="role"
    :aria-label="label"
    :aria-selected="selected"
    :aria-checked="checked"
    @click="activate"
    @keydown.enter.prevent="activate"
    @keydown.space.prevent="activate"
  >
    <slot />
  </button>
</template>

<style scoped>
.hn-action { min-width: 44px; min-height: 44px; margin: 0; padding: 0; border: 0; color: inherit; font: inherit; background: transparent; }
.hn-action:focus-visible { outline: 3px solid #ffd0ee; outline-offset: 3px; }
.hn-action:disabled { cursor: not-allowed; opacity: .52; }
</style>
